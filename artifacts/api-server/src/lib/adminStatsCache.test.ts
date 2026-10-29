import { describe, it, expect } from "vitest";
import {
  pctChange,
  previousStatsRange,
  resolveStatsRange,
} from "./adminStatsCache";

describe("adminStatsCache helpers", () => {
  it("pctChange handles zeros and rounding", () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(90, 100)).toBe(-10);
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(8, 0)).toBeNull();
    expect(pctChange(Number.NaN, 4)).toBeNull();
  });

  it("previousStatsRange is the same length immediately before", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const month = resolveStatsRange("month", now);
    const prev = previousStatsRange(month);
    expect(prev.end.getTime()).toBe(month.start.getTime());
    expect(prev.end.getTime() - prev.start.getTime()).toBe(
      month.end.getTime() - month.start.getTime(),
    );
  });
});
