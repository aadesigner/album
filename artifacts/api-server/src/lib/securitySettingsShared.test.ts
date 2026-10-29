import { describe, it, expect } from "vitest";
import {
  parseAllowedUploadMimeTypes,
  parseJsonArray,
  parseJsonObject,
  serializeAllowedUploadMimeTypes,
  SECURITY_SETTINGS_DEFAULTS,
} from "./securitySettingsShared";

describe("parseAllowedUploadMimeTypes", () => {
  it("reads a JSON array saved by PATCH /admin/settings", () => {
    expect(parseAllowedUploadMimeTypes('["image/jpeg","image/png","image/webp","image/gif"]')).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
  });

  it("still reads a comma-separated string", () => {
    expect(parseAllowedUploadMimeTypes("image/jpeg, image/png")).toEqual(["image/jpeg", "image/png"]);
  });

  it("normalizes jpg / jpeg aliases", () => {
    expect(parseAllowedUploadMimeTypes("jpg, image/jpg, jpeg")).toEqual(["image/jpeg"]);
  });

  it("falls back to defaults when empty", () => {
    expect(parseAllowedUploadMimeTypes("")).toEqual(SECURITY_SETTINGS_DEFAULTS.allowedUploadMimeTypes);
    expect(parseAllowedUploadMimeTypes([])).toEqual(SECURITY_SETTINGS_DEFAULTS.allowedUploadMimeTypes);
  });

  it("recovers tokens left by a comma-split of a JSON array", () => {
    expect(parseAllowedUploadMimeTypes('["image/jpeg"')).toEqual(["image/jpeg"]);
  });

  it("serializes to a comma list, never a JSON array", () => {
    const stored = serializeAllowedUploadMimeTypes(["image/jpeg", "image/png"]);
    expect(stored.startsWith("[")).toBe(false);
    expect(stored).toBe("image/jpeg, image/png");
    expect(serializeAllowedUploadMimeTypes('["image/jpeg","image/png"]')).toBe("image/jpeg, image/png");
  });
});

describe("parseJsonArray / parseJsonObject", () => {
  it("reads JSON and double-encoded JSON", () => {
    expect(parseJsonArray('["barcelona","paris"]')).toEqual(["barcelona", "paris"]);
    expect(parseJsonArray(JSON.stringify('["barcelona"]'))).toEqual(["barcelona"]);
    expect(parseJsonArray("not-json")).toEqual([]);
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonObject("[1]")).toEqual({});
  });
});
