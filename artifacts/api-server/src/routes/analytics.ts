import { Router, type IRouter } from "express";
import { db } from "@workspace/db-tsconfig";
import { siteAnalyticsTable } from "@workspace/db-tsconfig";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// POST /analytics/track — lightweight event recorder (no auth required)
router.post("/analytics/track", async (req, res): Promise<void> => {
  const { event = "page_view", path = "/" } = req.body || {};

  const rawIp =
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown";
  const ip = rawIp.replace(/^::ffff:/, "");
  const country = (req.headers["cf-ipcountry"] as string)?.toUpperCase() || null;

  // Fire-and-forget — don't block the response
  db.insert(siteAnalyticsTable)
    .values({ ip, path: String(path).slice(0, 255), event: String(event).slice(0, 64), country })
    .catch(() => {});

  res.status(204).end();
});

// GET /admin/analytics/chart — 30-day chart data (admin only)
// Called from Dashboard
router.get("/admin/analytics/chart", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT
        date_trunc('day', created_at AT TIME ZONE 'UTC')::date::text AS date,
        count(*) FILTER (WHERE event = 'page_view') AS page_views,
        count(DISTINCT ip) FILTER (WHERE event = 'page_view') AS visitors,
        count(*) FILTER (WHERE event = 'wp_click') AS wp_clicks,
        count(*) FILTER (WHERE event = 'pdf_gen') AS pdf_gens
      FROM site_analytics
      WHERE created_at >= now() - interval '29 days'
      GROUP BY date
      ORDER BY date ASC
    `);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
