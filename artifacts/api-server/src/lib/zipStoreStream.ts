import fs from "fs";
import type { Writable } from "stream";

/**
 * Minimal ZIP writer using STORE (method 0) — no deflate.
 * JPEGs/PNGs are already compressed; deflating them wastes CPU for ~0 size win.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n >>> 0, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function dosDateTime(d = new Date()): { time: number; date: number } {
  const year = Math.max(1980, d.getFullYear());
  const time =
    ((d.getHours() & 0x1f) << 11)
    | ((d.getMinutes() & 0x3f) << 5)
    | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const date =
    (((year - 1980) & 0x7f) << 9)
    | (((d.getMonth() + 1) & 0xf) << 5)
    | (d.getDate() & 0x1f);
  return { time, date };
}

export type ZipStoreEntry = {
  /** Path inside the archive (no leading slash, no `..`). */
  name: string;
  /** Absolute filesystem path. */
  path: string;
};

function sanitizeEntryName(name: string): string {
  const base = String(name || "file")
    .replace(/\\/g, "/")
    .split("/")
    .filter((p) => p && p !== "." && p !== "..")
    .join("/");
  return base || "file";
}

/**
 * Stream a STORE-method ZIP of local files into `out`.
 * Loads each file once (photos are typically a few MB each after server resize).
 */
export async function streamStoreZip(
  entries: ZipStoreEntry[],
  out: Writable,
): Promise<{ files: number; bytes: number }> {
  const { time, date } = dosDateTime();
  const central: Buffer[] = [];
  let offset = 0;
  let totalUncompressed = 0;
  let written = 0;

  const write = async (chunk: Buffer) => {
    written += chunk.length;
    if (!out.write(chunk)) {
      await new Promise<void>((resolve) => out.once("drain", resolve));
    }
  };

  for (const entry of entries) {
    const name = sanitizeEntryName(entry.name);
    const nameBuf = Buffer.from(name, "utf8");
    const data = await fs.promises.readFile(entry.path);
    const crc = crc32(data);
    const size = data.length;
    totalUncompressed += size;

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // store
      u16(time),
      u16(date),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuf.length),
      u16(0), // extra
      nameBuf,
    ]);

    const localOffset = offset;
    await write(localHeader);
    await write(data);
    offset += localHeader.length + size;

    central.push(Buffer.concat([
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(0),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuf.length),
      u16(0), // extra
      u16(0), // comment
      u16(0), // disk start
      u16(0), // int attrs
      u32(0), // ext attrs
      u32(localOffset),
      nameBuf,
    ]));
  }

  const centralStart = offset;
  for (const part of central) {
    await write(part);
    offset += part.length;
  }
  const centralSize = offset - centralStart;

  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralSize),
    u32(centralStart),
    u16(0),
  ]);
  await write(end);

  return { files: entries.length, bytes: totalUncompressed };
}
