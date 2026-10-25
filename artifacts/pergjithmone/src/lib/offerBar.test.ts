import { describe, it, expect } from "vitest";
import { parseOfferBar, safeOfferHref, sanitizeHexColor, offerBarCopy, OFFER_BAR_DEFAULTS } from "./offerBar";

describe("offerBar", () => {
  it("keeps relative builder links and rejects unsafe hrefs", () => {
    expect(safeOfferHref("/krijo")).toBe("/krijo");
    expect(safeOfferHref("/krijo?category=dasme")).toBe("/krijo?category=dasme");
    expect(safeOfferHref("javascript:alert(1)")).toBe("/krijo");
    expect(safeOfferHref("//evil.test")).toBe("/krijo");
    expect(safeOfferHref("https://evil.test")).toBe("/krijo");
  });

  it("normalizes hex colors", () => {
    expect(sanitizeHexColor("#8c3a2e", "#000000")).toBe("#8C3A2E");
    expect(sanitizeHexColor("#abc", "#000000")).toBe("#AABBCC");
    expect(sanitizeHexColor("red", "#8C3A2E")).toBe("#8C3A2E");
  });

  it("uses bilingual defaults when settings are empty", () => {
    const bar = parseOfferBar(undefined);
    expect(bar.enabled).toBe(true);
    expect(bar.href).toBe("/krijo");
    expect(offerBarCopy(bar, "sq").text).toBe(OFFER_BAR_DEFAULTS.textAl);
    expect(offerBarCopy(bar, "en").button).toBe(OFFER_BAR_DEFAULTS.buttonEn);
  });

  it("honors an explicit off switch", () => {
    expect(parseOfferBar({ offerBarEnabled: false }).enabled).toBe(false);
  });
});
