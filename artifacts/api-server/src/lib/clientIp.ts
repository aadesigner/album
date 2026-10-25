import type { Request } from "express";

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function headerValue(req: Request, name: string): string | null {
  const raw = req.headers[name];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Strip port / IPv6-mapped prefix. Returns null for junk / "unknown". */
export function parseIp(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s || s === "unknown" || s === "undefined" || s === "null") return null;
  s = s.replace(/^::ffff:/i, "");
  if (s.startsWith("[")) {
    const end = s.indexOf("]");
    if (end > 1) s = s.slice(1, end);
  } else {
    const colon = s.lastIndexOf(":");
    if (colon > 0 && IPV4.test(s.slice(0, colon))) s = s.slice(0, colon);
  }
  if (IPV4.test(s)) {
    const parts = s.split(".").map(Number);
    if (parts.some((n) => n > 255)) return null;
    return s;
  }
  if (s.includes(":")) return s;
  return null;
}

/**
 * Best-effort client IP. Prefers CDN headers (Cloudflare) over X-Forwarded-For
 * so every visitor behind Railway/CF is not collapsed onto one proxy address
 * (that shared bucket is what made rate-limit feel "random").
 */
export function getClientIp(req: Request): string | null {
  const cf = parseIp(headerValue(req, "cf-connecting-ip") || headerValue(req, "true-client-ip"));
  if (cf) return cf;

  const real = parseIp(headerValue(req, "x-real-ip"));
  if (real) return real;

  const expressIp = parseIp(req.ip);
  if (expressIp) return expressIp;

  const xff = headerValue(req, "x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => parseIp(p)).filter((p): p is string => !!p);
    // Right-most hop is the one our proxy appended — leftmost is spoofable.
    if (parts.length) return parts[parts.length - 1];
  }

  return parseIp(req.socket?.remoteAddress);
}
