import { describe, it, expect } from "vitest";
import { pickDataRoot, VOLUME_ROOT, hasPersistentStorage } from "./dataDir";

describe("pickDataRoot", () => {
  it("prefers DATA_DIR over a mounted volume", () => {
    expect(pickDataRoot({ envDir: "/mnt/photos", volumeExists: true, cwd: "/app" })).toBe(
      "/mnt/photos",
    );
  });

  it("uses /data when a volume is mounted and DATA_DIR is unset", () => {
    expect(pickDataRoot({ envDir: "", volumeExists: true, cwd: "/app" })).toBe(VOLUME_ROOT);
  });

  it("falls back to cwd when nothing persistent is available", () => {
    expect(pickDataRoot({ envDir: undefined, volumeExists: false, cwd: "/app" })).toBe("/app");
  });
});

describe("hasPersistentStorage", () => {
  it("is true for /data or an explicit DATA_DIR", () => {
    expect(hasPersistentStorage(VOLUME_ROOT, undefined)).toBe(true);
    expect(hasPersistentStorage("/app", "/mnt/photos")).toBe(true);
  });

  it("is false for ephemeral cwd without DATA_DIR", () => {
    expect(hasPersistentStorage("/app", undefined)).toBe(false);
    expect(hasPersistentStorage("/app", "")).toBe(false);
  });
});
