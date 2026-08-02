import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Simple in-memory cache: ip → { country, ts }
const geoCache = new Map<string, { country: string; ts: number }>();
const GEO_TTL = 5 * 60 * 1000; // 5 minutes

// GET /geo — detect visitor country for language auto-selection
// Returns { country: "AL" | "XK" | ... } using Cloudflare header first,
// then ipapi.co as fallback.
router.get("/geo", async (req, res): Promise<void> => {
  // Cloudflare sets CF-IPCountry when the request passed through CF (or was
  // forwarded by the frontend proxy). Also accept common CDN equivalents.
  const headerCountry = [
    req.headers["cf-ipcountry"],
    req.headers["cloudfront-viewer-country"],
    req.headers["x-vercel-ip-country"],
    req.headers["x-country-code"],
  ]
    .map((v) => (typeof v === "string" ? v.trim().toUpperCase() : ""))
    .find((v) => /^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1");

  if (headerCountry) {
    res.json({ country: headerCountry });
    return;
  }

  // Prefer Cloudflare's connecting IP, then X-Forwarded-For, then socket IP.
  const forwarded = (req.headers["cf-connecting-ip"] as string | undefined)
    || (req.headers["x-real-ip"] as string | undefined)
    || (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    || req.ip
    || "127.0.0.1";
  const ip = forwarded.replace(/^::ffff:/, "");

  // Skip lookup for loopback / private ranges
  if (ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip === "::1") {
    res.json({ country: "XX" });
    return;
  }

  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < GEO_TTL) {
    res.json({ country: cached.country });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(`https://ipapi.co/${ip}/country/`, { signal: controller.signal });
    clearTimeout(timeout);
    const country = (await r.text()).trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(country)) {
      geoCache.set(ip, { country, ts: Date.now() });
      res.json({ country });
    } else {
      res.json({ country: "XX" });
    }
  } catch {
    res.json({ country: "XX" });
  }
});

export default router;
