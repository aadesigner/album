import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Allow up to 60 s per suite (canvas rendering + JPEG encode is CPU-bound)
    testTimeout: 60_000,
    pool: "forks",
  },
});
