import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db-tsconfig";
import { appSettingsTable } from "@workspace/db-tsconfig";
import { requireAdmin } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  isEmptyPageContent,
  isPageSlug,
  overlayStoredPageContent,
  pageSettingKey,
  parseStoredPageContent,
  sanitizePageContent,
  stringifyPageContent,
} from "../lib/marketingPages";

const NO_STORE = "private, no-store, no-cache, must-revalidate";

const router: IRouter = Router();

async function readPage(slug: string) {
  if (!isPageSlug(slug)) return null;
  const key = pageSettingKey(slug);
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, key))
    .limit(1);
  return {
    slug,
    content: parseStoredPageContent(row?.value),
    updatedAt: row?.updatedAt ?? null,
  };
}

// Public — published JSON only (frontend merges with defaults).
router.get("/pages/:slug", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const page = await readPage(String(raw || ""));
  if (!page) {
    res.status(404).json({ error: "Unknown page" });
    return;
  }
  res.setHeader("Cache-Control", NO_STORE);
  res.json(page);
});

/** Register on the admin router too so PATCH is not lost if another /admin mount wins. */
export function attachAdminMarketingPageRoutes(target: IRouter) {
  target.get("/admin/pages/:slug", requireAdmin, async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const page = await readPage(String(raw || ""));
    if (!page) {
      res.status(404).json({ error: "Unknown page" });
      return;
    }
    res.setHeader("Cache-Control", NO_STORE);
    res.json(page);
  });

  target.patch("/admin/pages/:slug", requireAdmin, async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const slug = String(raw || "");
    if (!isPageSlug(slug)) {
      res.status(404).json({ error: "Unknown page" });
      return;
    }
    const incoming = sanitizePageContent(req.body?.content);
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      res.status(400).json({ error: "content must be a JSON object" });
      return;
    }
    const incomingObj = incoming as Record<string, unknown>;
    const key = pageSettingKey(slug);
    const [row] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, key))
      .limit(1);
    const previous = parseStoredPageContent(row?.value);

    if (isEmptyPageContent(incomingObj) && !isEmptyPageContent(previous)) {
      res.status(400).json({ error: "Refusing to overwrite saved page with empty content" });
      return;
    }

    const merged = overlayStoredPageContent(previous, incomingObj);
    let value: string;
    try {
      value = stringifyPageContent(merged);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || "Page content is too large" });
      return;
    }
    const now = new Date();
    await db
      .insert(appSettingsTable)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value, updatedAt: now },
      });
    const page = await readPage(slug);
    logger.info({ slug, key, bytes: value.length }, "Saved marketing page content");
    res.setHeader("Cache-Control", NO_STORE);
    res.json(page);
  });
}

attachAdminMarketingPageRoutes(router);

export default router;
