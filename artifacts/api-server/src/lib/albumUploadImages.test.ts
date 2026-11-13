import { describe, expect, it } from "vitest";
import {
  collectUploadFilenamesFromPages,
  extractUploadFilename,
  safeZipDownloadBasename,
  zipEntryName,
} from "./albumUploadImages";

describe("extractUploadFilename", () => {
  it("parses relative and absolute upload URLs", () => {
    expect(extractUploadFilename("/api/uploads/files/171-abc.jpg")).toBe("171-abc.jpg");
    expect(extractUploadFilename("uploads/files/171-abc.jpg")).toBe("171-abc.jpg");
    expect(
      extractUploadFilename("https://example.com/api/uploads/files/171-abc.webp?x=1"),
    ).toBe("171-abc.webp");
  });

  it("ignores non-upload sources", () => {
    expect(extractUploadFilename("local-photo:abc")).toBeNull();
    expect(extractUploadFilename("blob:http://x")).toBeNull();
    expect(extractUploadFilename("data:image/png;base64,xx")).toBeNull();
    expect(extractUploadFilename("/designs/rome-cover-thumb.jpg")).toBeNull();
    expect(extractUploadFilename("https://images.unsplash.com/photo-1")).toBeNull();
    expect(extractUploadFilename("/api/uploads/files/../secret.jpg")).toBeNull();
  });
});

describe("collectUploadFilenamesFromPages", () => {
  it("dedupes uploads across pages and skips designs", () => {
    const pages = [
      JSON.stringify([
        { type: "image", src: "/api/uploads/files/a.jpg" },
        { type: "background", src: "/designs/paper.png" },
      ]),
      JSON.stringify({
        elements: [
          { type: "image", src: "/api/uploads/files/a.jpg" },
          { type: "image", src: "/api/uploads/files/b.png" },
          { type: "image", src: "local-photo:pending" },
        ],
      }),
    ];
    expect(collectUploadFilenamesFromPages(pages)).toEqual(["a.jpg", "b.png"]);
  });

  it("handles empty / invalid content", () => {
    expect(collectUploadFilenamesFromPages(["{}", null, ""])).toEqual([]);
  });
});

describe("zip naming helpers", () => {
  it("builds a safe download basename", () => {
    expect(safeZipDownloadBasename("Dasma / 2026!", 42)).toBe("order-42-Dasma_2026-photos.zip");
  });

  it("uses basename only for zip entries", () => {
    expect(zipEntryName("nested/weird.jpg")).toBe("weird.jpg");
  });
});
