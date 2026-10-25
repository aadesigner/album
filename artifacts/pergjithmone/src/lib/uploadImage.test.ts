import { describe, it, expect } from "vitest";
import { uploadErrorMessage, UploadFailedError } from "./uploadImage";
import { ImageTooLargeError } from "./imageCompression";

describe("uploadErrorMessage", () => {
  it("explains oversized photos in both languages", () => {
    const err = new ImageTooLargeError(4.2 * 1024 * 1024);
    expect(uploadErrorMessage(err, "sq")).toMatch(/4\.2MB/);
    expect(uploadErrorMessage(err, "en")).toMatch(/4\.2MB/);
  });

  it("maps API rejections to a clear retry hint", () => {
    expect(uploadErrorMessage(new UploadFailedError("This file is not a valid or allowed image type.", 400), "sq"))
      .toMatch(/JPG|HEIC/i);
    expect(uploadErrorMessage(new UploadFailedError("Too many uploads, please slow down.", 429), "en"))
      .toMatch(/Too many uploads/i);
  });
});
