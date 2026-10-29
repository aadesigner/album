/** Detect image type from magic bytes so we don't depend only on sharp.format. */
export function sniffImageFormat(buf: Buffer): string | undefined {
  if (!buf || buf.length < 12) return undefined;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif";
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "bmp";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12).toLowerCase();
    if (brand.startsWith("avif") || brand === "avis") return "avif";
    if (
      brand.startsWith("heic")
      || brand.startsWith("heix")
      || brand.startsWith("heif")
      || brand === "mif1"
      || brand === "msf1"
      || brand.startsWith("heim")
      || brand.startsWith("heis")
    ) {
      return "heif";
    }
  }
  if (
    (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00)
    || (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)
  ) {
    return "tiff";
  }
  return undefined;
}
