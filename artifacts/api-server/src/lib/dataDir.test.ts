import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  pickDataRoot,
  VOLUME_ROOT,
  hasPersistentStorage,
  isEphemeralDataPath,
} from "./dataDir";

describe("isEphemeralDataPath", () => {
  it("flags the app tree and /tmp", () => {
    expect(isEphemeralDataPath("/app", "/app")).toBe(true);
    expect(isEphemeralDataPath("/app/uploads", "/app")).toBe(true);
    expect(isEphemeralDataPath("/app/data", "/app")).toBe(true);
    expect(isEphemeralDataPath("/tmp/x", "/app")).toBe(true);
    expect(isEphemeralDataPath("/data", "/app")).toBe(false);
    expect(isEphemeralDataPath("/mnt/photos", "/app")).toBe(false);
  });
});

describe("pickDataRoot", () => {
  it("ignores ephemeral DATA_DIR when /data volume is mounted", () => {
    expect(pickDataRoot({ envDir: "/app/data", volumeExists: true, cwd: "/app" })).toBe(
      VOLUME_ROOT,
    );
    expect(pickDataRoot({ envDir: "/app/uploads", volumeExists: true, cwd: "/app" })).toBe(
      VOLUME_ROOT,
    );
  });

  it("allows a durable custom DATA_DIR over /data", () => {
    expect(pickDataRoot({ envDir: "/mnt/photos", volumeExists: true, cwd: "/app" })).toBe(
      path.resolve("/mnt/photos"),
    );
  });

  it("uses /data when a volume is mounted and DATA_DIR is unset", () => {
    expect(pickDataRoot({ envDir: "", volumeExists: true, cwd: "/app" })).toBe(VOLUME_ROOT);
  });

  it("falls back to cwd when nothing persistent is available", () => {
    expect(pickDataRoot({ envDir: undefined, volumeExists: false, cwd: "/app" })).toBe("/app");
    expect(pickDataRoot({ envDir: "/app/data", volumeExists: false, cwd: "/app" })).toBe("/app");
  });
});

describe("hasPersistentStorage", () => {
  it("is true for /data", () => {
    expect(hasPersistentStorage(VOLUME_ROOT, undefined, "/app")).toBe(true);
  });

  it("is true for a durable custom DATA_DIR root", () => {
    expect(hasPersistentStorage("/mnt/photos", "/mnt/photos", "/app")).toBe(true);
  });

  it("is false for ephemeral cwd even if DATA_DIR is set under /app", () => {
    expect(hasPersistentStorage("/app", undefined, "/app")).toBe(false);
    expect(hasPersistentStorage("/app/data", "/app/data", "/app")).toBe(false);
    expect(hasPersistentStorage("/app", "", "/app")).toBe(false);
  });
});
