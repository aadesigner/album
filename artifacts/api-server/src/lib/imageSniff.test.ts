import { describe, it, expect } from "vitest";
import { sniffImageFormat } from "./imageSniff";

describe("sniffImageFormat", () => {
  it("detects jpeg", () => {
    expect(sniffImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpeg");
  });

  it("detects png", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffImageFormat(buf)).toBe("png");
  });

  it("returns undefined for empty or unknown bytes", () => {
    expect(sniffImageFormat(Buffer.alloc(0))).toBeUndefined();
    expect(sniffImageFormat(Buffer.from("not-an-image!!!!"))).toBeUndefined();
  });
});
