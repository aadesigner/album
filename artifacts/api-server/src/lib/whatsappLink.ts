/**
 * Build a WhatsApp click-to-chat URL that works on mobile apps + desktop Web.
 * Prefer api.whatsapp.com/send over wa.me — some clients reject / silently
 * fail wa.me deep links (especially from delayed popup tabs).
 */

export function sanitizeWhatsAppPhone(raw: string | null | undefined): string {
  let digits = String(raw || "").replace(/\D/g, "");
  // International dial prefix 00 → country code digits only.
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

/** E.164 without '+': 8–15 digits (ITU-T). */
export function isValidWhatsAppPhone(digits: string): boolean {
  return /^\d{8,15}$/.test(digits);
}

export function buildWhatsAppOrderMessage(opts: {
  orderId: number;
  lang: "sq" | "en";
  albumTitle?: string | null;
  pageCount?: number | null;
  priceLek?: number | null;
}): string {
  const title = String(opts.albumTitle || "").trim().slice(0, 80);
  const pages =
    opts.pageCount != null && Number.isFinite(Number(opts.pageCount))
      ? Math.max(0, Math.floor(Number(opts.pageCount)))
      : null;
  const price =
    opts.priceLek != null && Number.isFinite(Number(opts.priceLek))
      ? Math.max(0, Math.floor(Number(opts.priceLek)))
      : null;
  const priceLabel =
    price != null ? `${price.toLocaleString("en-US")} LEK` : null;

  if (opts.lang === "sq") {
    const head = title
      ? `Përshëndetje, dua të porosis albumin "${title}". (Porosia #${opts.orderId})`
      : `Përshëndetje, dua të porosis këtë album. (Porosia #${opts.orderId})`;
    const bits: string[] = [];
    if (pages != null) bits.push(`${pages} faqe`);
    if (priceLabel) bits.push(`totali me dorëzim: ${priceLabel}`);
    return bits.length ? `${head} — ${bits.join(", ")}.` : head;
  }

  const head = title
    ? `Hello, I would like to order the photobook "${title}". (Order #${opts.orderId})`
    : `Hello, I would like to order this photobook. (Order #${opts.orderId})`;
  const bits: string[] = [];
  if (pages != null) bits.push(`${pages} pages`);
  if (priceLabel) bits.push(`pay on delivery: ${priceLabel}`);
  return bits.length ? `${head} — ${bits.join(", ")}.` : head;
}

export function buildWhatsAppSendUrl(phoneRaw: string, message: string): string {
  const phone = sanitizeWhatsAppPhone(phoneRaw);
  if (!isValidWhatsAppPhone(phone)) {
    throw new Error(
      `INVALID_WHATSAPP_NUMBER: studio WhatsApp number is missing or invalid ("${phoneRaw || ""}"). Set a full international number in Admin → Settings.`,
    );
  }
  // Keep message modest — WhatsApp truncates / rejects extremely long text= payloads.
  const text = String(message || "").slice(0, 900);
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}
