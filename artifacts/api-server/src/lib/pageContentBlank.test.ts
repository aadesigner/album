import { describe, it, expect } from "vitest";
import { isPageContentBlank } from "./pageContentBlank";

describe("isPageContentBlank", () => {
  it("treats empty / missing as blank", () => {
    expect(isPageContentBlank(undefined)).toBe(true);
    expect(isPageContentBlank(null)).toBe(true);
    expect(isPageContentBlank([])).toBe(true);
    expect(isPageContentBlank("[]")).toBe(true);
  });

  it("ignores background-only and empty placeholders", () => {
    expect(
      isPageContentBlank([
        { type: "background", bgColor: "#fff" },
        { type: "placeholder" },
      ]),
    ).toBe(true);
  });

  it("counts image, text, and shape as content", () => {
    expect(isPageContentBlank([{ type: "image", src: "/uploads/files/a.jpg" }])).toBe(false);
    expect(isPageContentBlank([{ type: "text", text: "Hello" }])).toBe(false);
    expect(isPageContentBlank([{ type: "shape" }])).toBe(false);
    expect(isPageContentBlank([{ type: "text", text: "   " }])).toBe(true);
  });

  it("treats device-local photo refs as blank (not printable)", () => {
    expect(isPageContentBlank([{ type: "image", src: "local-photo:abc" }])).toBe(true);
    expect(isPageContentBlank([{ type: "image", src: "blob:http://localhost/x" }])).toBe(true);
  });
});
