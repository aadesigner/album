import { describe, it, expect } from "vitest";
import { normalizeOfferBarWrite, readOfferBarSettings, OFFER_BAR_DEFAULTS } from "./offerBarSettings";

describe("offerBarSettings", () => {
  it("defaults on when the key is missing", () => {
    expect(readOfferBarSettings({}).offerBarEnabled).toBe(true);
    expect(readOfferBarSettings({}).offerBarHref).toBe("/krijo");
  });

  it("sanitizes writes", () => {
    expect(normalizeOfferBarWrite("offerBarHref", "javascript:alert(1)")).toBe("/krijo");
    expect(normalizeOfferBarWrite("offerBarHref", "/krijo?category=dasme")).toBe("/krijo?category=dasme");
    expect(normalizeOfferBarWrite("offerBarBg", "#abc")).toBe("#AABBCC");
    expect(normalizeOfferBarWrite("offerBarEnabled", false)).toBe("false");
    expect(normalizeOfferBarWrite("offerBarTextAl", "x".repeat(400))?.length).toBe(240);
  });

  it("honors an explicit off switch", () => {
    expect(readOfferBarSettings({ offer_bar_enabled: "false" }).offerBarEnabled).toBe(false);
    expect(readOfferBarSettings({ offer_bar_enabled: "true" }).offerBarTextEn).toBe(OFFER_BAR_DEFAULTS.offerBarTextEn);
  });
});
