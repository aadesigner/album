import { describe, expect, it } from "vitest";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppSendUrl,
  isValidWhatsAppPhone,
  sanitizeWhatsAppPhone,
} from "./whatsappLink";

describe("sanitizeWhatsAppPhone", () => {
  it("strips non-digits and 00 prefix", () => {
    expect(sanitizeWhatsAppPhone("+355 68 875 5833")).toBe("355688755833");
    expect(sanitizeWhatsAppPhone("00355688755833")).toBe("355688755833");
  });
});

describe("isValidWhatsAppPhone", () => {
  it("accepts E.164 digit lengths", () => {
    expect(isValidWhatsAppPhone("355688755833")).toBe(true);
    expect(isValidWhatsAppPhone("1234567")).toBe(false);
    expect(isValidWhatsAppPhone("")).toBe(false);
  });
});

describe("buildWhatsAppSendUrl", () => {
  it("builds api.whatsapp.com send links", () => {
    const url = buildWhatsAppSendUrl("+355688755833", "Hello #42");
    expect(url.startsWith("https://api.whatsapp.com/send?phone=355688755833&text=")).toBe(true);
    expect(url).toContain(encodeURIComponent("Hello #42"));
  });

  it("rejects invalid numbers", () => {
    expect(() => buildWhatsAppSendUrl("123", "hi")).toThrow(/INVALID_WHATSAPP_NUMBER/);
  });
});

describe("buildWhatsAppOrderMessage", () => {
  it("includes order id and optional title", () => {
    expect(buildWhatsAppOrderMessage({ orderId: 9, lang: "en" })).toContain("#9");
    expect(buildWhatsAppOrderMessage({ orderId: 9, lang: "sq", albumTitle: "Dasma" })).toContain("Dasma");
  });
});
