import fs from "fs";
import os from "os";
import path from "path";
import { Writable } from "stream";
import { describe, expect, it } from "vitest";
import { crc32, streamStoreZip } from "./zipStoreStream";

class BufferWritable extends Writable {
  chunks: Buffer[] = [];
  _write(chunk: Buffer, _enc: BufferEncoding, cb: (err?: Error | null) => void) {
    this.chunks.push(Buffer.from(chunk));
    cb();
  }
  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

describe("streamStoreZip", () => {
  it("writes a readable STORE zip with correct CRC", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zip-store-"));
    const a = path.join(dir, "one.jpg");
    const b = path.join(dir, "two.png");
    const bodyA = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]);
    const bodyB = Buffer.from("hello-png");
    fs.writeFileSync(a, bodyA);
    fs.writeFileSync(b, bodyB);

    const out = new BufferWritable();
    const result = await streamStoreZip(
      [
        { name: "one.jpg", path: a },
        { name: "two.png", path: b },
      ],
      out,
    );

    const zip = out.toBuffer();
    expect(result.files).toBe(2);
    expect(result.bytes).toBe(bodyA.length + bodyB.length);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.includes(bodyA)).toBe(true);
    expect(zip.includes(bodyB)).toBe(true);
    expect(zip.includes(Buffer.from("one.jpg"))).toBe(true);
    // End of central directory signature
    expect(zip.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
    expect(crc32(bodyA)).toBeGreaterThan(0);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
