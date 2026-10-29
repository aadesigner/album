import { describe, it, expect } from "vitest";
import { parseAllowedUploadMimeTypes, SECURITY_SETTINGS_DEFAULTS } from "./securitySettingsShared";

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
});
