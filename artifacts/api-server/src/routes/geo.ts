import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Simple in-memory cache: ip → { country, ts }
const geoCache = new Map<string, { country: string; ts: number }>();
const GEO_TTL = 5 * 60 * 1000; // 5 minutes

// GET /geo — detect visitor country for language auto-selection
// Returns { country: "AL" | "XK" | ... } using Cloudflare header first,
// then ipapi.co as fallback.
router.get("/geo", async (req, res): Promise<void> => {
  // Cloudflare sets CF-IPCountry on every request (our reverse proxy runs behind Cloudflare)
  const cfCountry = (req.headers["cf-ipcountry"] as string | undefined)?.trim().toUpperCase();
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    res.json({ country: cfCountry });
    return;
  }

  // Fallback: ipapi.co free tier (no key required, 1k req/day)
  const ip = (req.ip || "127.0.0.1").replace(/^::ffff:/, "");

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
