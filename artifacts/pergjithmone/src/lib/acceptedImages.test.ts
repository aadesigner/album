import { describe, it, expect } from "vitest";
import { ACCEPT_SAFE_IMAGES, SAFE_IMAGE_NAME } from "./acceptedImages";

describe("ACCEPT_SAFE_IMAGES", () => {
  it("lists png, webp, gif, and jpeg so pickers are not jpeg-only", () => {
    expect(ACCEPT_SAFE_IMAGES).toContain("image/png");
    expect(ACCEPT_SAFE_IMAGES).toContain(".png");
    expect(ACCEPT_SAFE_IMAGES).toContain("image/webp");
    expect(ACCEPT_SAFE_IMAGES).toContain("image/gif");
    expect(ACCEPT_SAFE_IMAGES).toContain("image/jpeg");
    expect(ACCEPT_SAFE_IMAGES).toContain(".heic");
  });

  it("recognises safe filenames", () => {
    expect(SAFE_IMAGE_NAME.test("cover.png")).toBe(true);
    expect(SAFE_IMAGE_NAME.test("shot.WEBP")).toBe(true);
    expect(SAFE_IMAGE_NAME.test("notes.pdf")).toBe(false);
  });
});
