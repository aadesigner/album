import { Router, type IRouter } from "express";
import { db } from "@workspace/db-tsconfig";
import {
  projectsTable,
  projectPagesTable,
  bookSizesTable,
  appSettingsTable,
  ordersTable,
} from "@workspace/db-tsconfig";
import { eq, and, inArray, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import { queueProjectPdfGeneration, pdfsDir, isPdfGenerationInFlight, ensureProjectPdfFile } from "../lib/generateProjectPdf";
import { getSecuritySettings } from "../lib/securitySettings";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

function calcPrice(
  pageCount: number,
  basePriceLek: number,
  minPages: number,
  extraSpreadPriceLek: number,
): number {
  // pageCount = editable inner pages only (covers/linings are not counted)
  const extraSpreads = Math.max(0, Math.ceil((pageCount - minPages) / 2));
  return basePriceLek + extraSpreads * extraSpreadPriceLek;
}

async function countInnerPages(projectId: number): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(projectPagesTable)
    .where(
      and(
        eq(projectPagesTable.projectId, projectId),
        eq(projectPagesTable.pageType, "inner"),
      ),
    );
  return Number(value) || 0;
}

async function syncInnerPageCount(projectId: number): Promise<number> {
  const innerCount = await countInnerPages(projectId);
  await db
    .update(projectsTable)
    .set({ pageCount: innerCount })
    .where(eq(projectsTable.id, projectId));
  return innerCount;
}

const COVER_PAGE_TYPES = new Set([
  "front_cover",
  "back_cover",
  "inside_cover",
  "inside_back_cover",
]);

// ── Settings cache ────────────────────────────────────────────────────────────
// appSettings is rarely written; cache it in-process for 5 minutes to avoid
// hitting the DB on every project creation / price calculation.
interface PricingSettings {
  basePriceLek: number;
  minPages: number;
  extraSpreadPriceLek: number;
  whatsappNumber: string;
  pendingBooksLimitEnabled: boolean;
  pendingBooksLimit: number;
}

const SETTINGS_TTL_MS = 5 * 60 * 1000;
let _settingsCache: { data: PricingSettings; expiresAt: number } | null = null;

async function getSettings(): Promise<PricingSettings> {
  if (_settingsCache && _settingsCache.expiresAt > Date.now()) return _settingsCache.data;
  const rows = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  const data = {
    basePriceLek: parseInt(map["base_price_lek"] || "3100", 10),
    minPages: parseInt(map["min_pages"] || "30", 10),
    extraSpreadPriceLek: parseInt(map["extra_spread_price_lek"] || "200", 10),
    whatsappNumber: map["whatsapp_number"] || "+355688755833",
    pendingBooksLimitEnabled: map["pending_books_limit_enabled"] !== "false",
    pendingBooksLimit: parseInt(map["pending_books_limit"] || "10", 10),
  } satisfies PricingSettings;
  _settingsCache = { data, expiresAt: Date.now() + SETTINGS_TTL_MS };
  return data;
}

// Admin settings updates call this so a changed/toggled limit is enforced
// immediately instead of waiting out the 5-minute TTL above.
export function invalidatePendingBooksLimitCache(): void {
  _settingsCache = null;
}

// GET /projects
router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId));

  if (projects.length === 0) {
    res.json(projects);
    return;
  }

  // Attach each project's front-cover contentJson so list views (e.g. the
  // dashboard) can render a real thumbnail instead of a generic placeholder.
  const frontCovers = await db
    .select({
      projectId: projectPagesTable.projectId,
      contentJson: projectPagesTable.contentJson,
    })
    .from(projectPagesTable)
    .where(
      and(
        eq(projectPagesTable.pageType, "front_cover"),
        inArray(projectPagesTable.projectId, projects.map((p) => p.id)),
      ),
    );
  const coverByProject = new Map(frontCovers.map((c) => [c.projectId, c.contentJson]));

  // Heal pageCount to editable (inner) pages only — covers + 2 linings used to
  // inflate the number shown in "Projektet e mia" / 3D viewer.
  const innerCounts = await db
    .select({
      projectId: projectPagesTable.projectId,
      value: count(),
    })
    .from(projectPagesTable)
    .where(
      and(
        eq(projectPagesTable.pageType, "inner"),
        inArray(projectPagesTable.projectId, projects.map((p) => p.id)),
      ),
    )
    .groupBy(projectPagesTable.projectId);
  const innerByProject = new Map(innerCounts.map((r) => [r.projectId, Number(r.value) || 0]));

  // Persist healed counts asynchronously so subsequent reads stay correct
  const heals = projects.filter((p) => {
    const inner = innerByProject.get(p.id);
    return inner !== undefined && inner !== p.pageCount;
  });
  if (heals.length > 0) {
    void Promise.all(
      heals.map((p) =>
        db
          .update(projectsTable)
          .set({ pageCount: innerByProject.get(p.id)! })
          .where(eq(projectsTable.id, p.id)),
      ),
    ).catch(() => undefined);
  }

  res.json(
    projects.map((p) => ({
      ...p,
      pageCount: innerByProject.get(p.id) ?? p.pageCount,
      frontCoverJson: coverByProject.get(p.id) ?? null,
    })),
  );
});

// POST /projects
router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const { bookSizeId, title, templateId } = req.body;
  if (!bookSizeId || !title) {
    res.status(400).json({ error: "bookSizeId and title are required" });
    return;
  }

  const isAdmin = req.user!.role === "admin";

  // Abuse caps apply to customers only — admins creating test albums / catalog
  // previews must not trip max-albums or pending-book limits.
  if (!isAdmin) {
    const settingsForCap = await getSecuritySettings();
    const [{ count: existingAlbums }] = await db
      .select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.userId, req.user!.id));
    if (existingAlbums >= settingsForCap.maxAlbumsPerUser) {
      res.status(403).json({
        error: `You've reached the maximum of ${settingsForCap.maxAlbumsPerUser} albums per account.`,
      });
      return;
    }
  }

  const [bookSize] = await db
    .select()
    .from(bookSizesTable)
    .where(eq(bookSizesTable.id, bookSizeId))
    .limit(1);
  if (!bookSize) {
    res.status(400).json({ error: "Invalid book size" });
    return;
  }

  const settings = await getSettings();

  if (!isAdmin && settings.pendingBooksLimitEnabled) {
    // "Pending" = not checked out. Prefer status=ordered, but also exclude any
    // project that already has an order row — heals rows whose status was
    // clobbered by an older PDF job (pdf_ready/draft after checkout).
    const userProjects = await db
      .select({ id: projectsTable.id, status: projectsTable.status })
      .from(projectsTable)
      .where(eq(projectsTable.userId, req.user!.id));
    const projectIds = userProjects.map((p) => p.id);
    const orderedByOrderRow = new Set<number>();
    if (projectIds.length > 0) {
      const orderRows = await db
        .select({ projectId: ordersTable.projectId })
        .from(ordersTable)
        .where(inArray(ordersTable.projectId, projectIds));
      for (const row of orderRows) orderedByOrderRow.add(row.projectId);
    }
    const pendingCount = userProjects.filter(
      (p) => p.status !== "ordered" && !orderedByOrderRow.has(p.id),
    ).length;
    if (pendingCount >= settings.pendingBooksLimit) {
      const limit = settings.pendingBooksLimit;
      const lang = String(req.query?.lang || req.headers['accept-language'] || '')
        .toLowerCase()
        .startsWith('sq')
        ? 'sq'
        : 'en';
      res.status(403).json({
        error: lang === 'sq'
          ? `Ke arritur limitin e ${limit} fotolibra në pritje. Përfundo ose porosite një ekzistues përpara se të fillosh një të ri.`
          : `You've reached the limit of ${limit} pending photobooks. Finish or order an existing one before starting a new one.`,
        code: "PENDING_BOOKS_LIMIT_REACHED",
        limit,
      });
      return;
    }
  }

  const minPages = bookSize.minPages || settings.minPages;
  const totalPriceLek = calcPrice(
    minPages,
    bookSize.priceBase || settings.basePriceLek,
    minPages,
    bookSize.pricePerExtraSpread || settings.extraSpreadPriceLek,
  );

  // Insert the project and its default pages atomically — if the process
  // or connection drops between the two inserts, a plain sequential write
  // would leave an orphaned project with no pages. A transaction guarantees
  // the user either gets a fully-formed project or nothing at all.
  const project = await db.transaction(async (tx) => {
    const [proj] = await tx
      .insert(projectsTable)
      .values({
        userId: req.user!.id,
        bookSizeId,
        title,
        templateId: templateId || null,
        pageCount: minPages, // editable inner pages only (excludes 4 cover/lining pages)
        totalPriceLek,
      })
      .returning();

    // Create default pages: front_cover, inside_cover, N inner pages,
    // inside_back_cover (a locked lining page distinct from the outer back
    // cover), back_cover.
    const pages = [];
    pages.push({ projectId: proj.id, pageNumber: 0, pageType: "front_cover" as const });
    pages.push({ projectId: proj.id, pageNumber: 1, pageType: "inside_cover" as const });
    for (let i = 2; i <= minPages + 1; i++) {
      pages.push({ projectId: proj.id, pageNumber: i, pageType: "inner" as const });
    }
    pages.push({
      projectId: proj.id,
      pageNumber: minPages + 2,
      pageType: "inside_back_cover" as const,
    });
    pages.push({
      projectId: proj.id,
      pageNumber: minPages + 3,
      pageType: "back_cover" as const,
    });

    await tx.insert(projectPagesTable).values(pages);
    return proj;
  });

  res.status(201).json(project);
});

// GET /projects/:projectId
router.get(
  "/projects/:projectId",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    // Fetch project metadata and its pages in parallel
    const [[project], pages] = await Promise.all([
      db
        .select()
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.id, projectId),
            eq(projectsTable.userId, req.user!.id),
          ),
        )
        .limit(1),
      db
        .select()
        .from(projectPagesTable)
        .where(eq(projectPagesTable.projectId, projectId)),
    ]);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const innerCount = pages.filter((p) => p.pageType === "inner").length;
    if (innerCount !== project.pageCount) {
      void syncInnerPageCount(projectId);
    }

    res.json({ ...project, pageCount: innerCount, pages });
  },
);

// PATCH /projects/:projectId
router.patch(
  "/projects/:projectId",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const { title, bookSizeId } = req.body;
    const updates: Partial<typeof projectsTable.$inferInsert> = {};
    if (title) updates.title = title;
    if (bookSizeId) updates.bookSizeId = bookSizeId;

    const [updated] = await db
      .update(projectsTable)
      .set(updates)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, req.user!.id),
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(updated);
  },
);

// DELETE /projects/:projectId
router.delete(
  "/projects/:projectId",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    // Fetch project first to verify ownership and status
    const [project] = await db
      .select({ id: projectsTable.id, status: projectsTable.status })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, req.user!.id),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (project.status === "ordered") {
      res.status(403).json({ error: "Cannot delete a project that has already been ordered" });
      return;
    }

    // Defense for rows whose status was overwritten by an older PDF job after
    // checkout — if an order references this project, it must not be deletable.
    const [linkedOrder] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(eq(ordersTable.projectId, projectId))
      .limit(1);
    if (linkedOrder) {
      res.status(403).json({ error: "Cannot delete a project that has already been ordered" });
      return;
    }

    await db
      .delete(projectsTable)
      .where(eq(projectsTable.id, projectId));

    res.json({ success: true });
  },
);

// POST /projects/:projectId/pages
router.post(
  "/projects/:projectId/pages",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const { pageNumber, pageType, layoutId, contentJson } = req.body;
    if (pageNumber == null || !pageType) {
      res.status(400).json({ error: "pageNumber and pageType are required" });
      return;
    }

    const [project] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, req.user!.id),
        ),
      )
      .limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [page] = await db
      .insert(projectPagesTable)
      .values({
        projectId,
        pageNumber,
        pageType,
        layoutId: layoutId || null,
        contentJson: contentJson || "{}",
      })
      .returning();

    // Update page count — editable inners only
    await syncInnerPageCount(projectId);

    res.status(201).json(page);
  },
);

// PATCH /projects/:projectId/pages/:pageId
router.patch(
  "/projects/:projectId/pages/:pageId",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawProject = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const rawPage = Array.isArray(req.params.pageId)
      ? req.params.pageId[0]
      : req.params.pageId;
    const projectId = parseInt(rawProject, 10);
    const pageId = parseInt(rawPage, 10);
    if (isNaN(projectId) || isNaN(pageId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    // Ownership check — same gate as POST pages / auto-save. Without this,
    // any authenticated user who can guess projectId+pageId can edit others'
    // pages (IDOR).
    const [owned] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, req.user!.id),
        ),
      )
      .limit(1);
    if (!owned) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const { layoutId, contentJson, pageNumber } = req.body;
    const updates: Partial<typeof projectPagesTable.$inferInsert> = {};
    if (layoutId !== undefined) updates.layoutId = layoutId;
    if (contentJson !== undefined) updates.contentJson = contentJson;
    if (pageNumber !== undefined) updates.pageNumber = pageNumber;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [page] = await db
      .update(projectPagesTable)
      .set(updates)
      .where(
        and(
          eq(projectPagesTable.id, pageId),
          eq(projectPagesTable.projectId, projectId),
        ),
      )
      .returning();

    if (!page) {
      res.status(404).json({ error: "Page not found" });
      return;
    }

    res.json(page);
  },
);

// DELETE /projects/:projectId/pages/:pageId
router.delete(
  "/projects/:projectId/pages/:pageId",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawProject = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const rawPage = Array.isArray(req.params.pageId)
      ? req.params.pageId[0]
      : req.params.pageId;
    const projectId = parseInt(rawProject, 10);
    const pageId = parseInt(rawPage, 10);
    if (isNaN(projectId) || isNaN(pageId)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [owned] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, req.user!.id),
        ),
      )
      .limit(1);
    if (!owned) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [existing] = await db
      .select({
        id: projectPagesTable.id,
        pageType: projectPagesTable.pageType,
      })
      .from(projectPagesTable)
      .where(
        and(
          eq(projectPagesTable.id, pageId),
          eq(projectPagesTable.projectId, projectId),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Page not found" });
      return;
    }

    if (COVER_PAGE_TYPES.has(existing.pageType)) {
      res.status(400).json({ error: "Cannot delete cover or lining pages" });
      return;
    }

    const [deleted] = await db
      .delete(projectPagesTable)
      .where(
        and(
          eq(projectPagesTable.id, pageId),
          eq(projectPagesTable.projectId, projectId),
        ),
      )
      .returning({ id: projectPagesTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Page not found" });
      return;
    }

    await syncInnerPageCount(projectId);

    res.json({ success: true });
  },
);

// POST /projects/:projectId/auto-save
router.post(
  "/projects/:projectId/auto-save",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const { pagesJson } = req.body;
    if (!pagesJson) {
      res.status(400).json({ error: "pagesJson is required" });
      return;
    }

    // Parse and save each page
    let pages: Array<{ id: number; contentJson: string }> = [];
    try {
      pages = JSON.parse(pagesJson);
    } catch {
      res.status(400).json({ error: "Invalid pagesJson" });
      return;
    }

    // Verify ownership once, then update pages + project timestamp in parallel
    const [owned] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, req.user!.id),
        ),
      )
      .limit(1);

    if (!owned) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Abuse cap: max photos per album. Uploaded photo URLs always contain
    // "/uploads/files/", so counting that substring across every page's
    // contentJson (existing pages + this patch's incoming ones) is a cheap,
    // good-enough proxy for "how many distinct photos are placed" without
    // needing a dedicated photos table. Admins are exempt.
    if (req.user!.role !== "admin") {
      const capSettings = await getSecuritySettings();
      if (capSettings.maxPhotosPerAlbum > 0) {
        const existingPages = await db
          .select({ id: projectPagesTable.id, contentJson: projectPagesTable.contentJson })
          .from(projectPagesTable)
          .where(eq(projectPagesTable.projectId, projectId));
        const updatedById = new Map(pages.map((p) => [p.id, p.contentJson]));
        const photoRefPattern = /\/uploads\/files\//g;
        let photoCount = 0;
        for (const page of existingPages) {
          const content = updatedById.get(page.id) ?? page.contentJson;
          photoCount += (content.match(photoRefPattern) || []).length;
        }
        if (photoCount > capSettings.maxPhotosPerAlbum) {
          res.status(403).json({
            error: `This album has reached the maximum of ${capSettings.maxPhotosPerAlbum} photos.`,
          });
          return;
        }
      }
    }

    await Promise.all([
      ...pages.map((p) =>
        db
          .update(projectPagesTable)
          .set({ contentJson: p.contentJson })
          .where(
            and(
              eq(projectPagesTable.id, p.id),
              eq(projectPagesTable.projectId, projectId),
            ),
          ),
      ),
      db
        .update(projectsTable)
        .set({ updatedAt: new Date() })
        .where(eq(projectsTable.id, projectId)),
    ]);

    res.json({ success: true });
  },
);

// POST /projects/:projectId/generate-pdf
router.post(
  "/projects/:projectId/generate-pdf",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const [project] = await db
      .select()
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, req.user!.id),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const shareToken = project.shareToken || uuidv4();
    if (!project.shareToken) {
      await db
        .update(projectsTable)
        .set({ shareToken })
        .where(eq(projectsTable.id, projectId));
    }

    try {
      await queueProjectPdfGeneration(projectId);
    } catch (err) {
      const isCapError = err instanceof Error && err.message.startsWith("TOO_MANY_CONCURRENT_PDFS");
      if (!isCapError) logger.error({ err, projectId }, "Failed to queue PDF generation");
      res.status(isCapError ? 429 : 400).json({
        error: isCapError
          ? "Too many albums are being generated right now. Please try again in a moment."
          : "Unable to generate PDF for this project",
      });
      return;
    }

    res.json({ status: "generating", pdfUrl: null, shareToken, error: null });
  },
);

// GET /projects/:projectId/pdf-download
router.get(
  "/projects/:projectId/pdf-download",
  // <iframe>/<a href> can't set Authorization. Allow ?token=<accessToken>
  // so the admin PDF viewer can open the file in a new tab/iframe.
  (req, _res, next) => {
    if (!req.headers.authorization && typeof req.query.token === "string" && req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
  },
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const [project] = await db
      .select({ userId: projectsTable.userId, title: projectsTable.title })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (!project || (project.userId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    let filePath: string;
    try {
      // Ephemeral disks / redeploys can wipe pdfsDir while pdfUrl remains set.
      filePath = await ensureProjectPdfFile(projectId);
    } catch (err) {
      console.error("PDF ensure failed", projectId, err);
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const filename = `${(project.title || "album").replace(/[^a-z0-9_\-]/gi, "_")}.pdf`;
    res.download(filePath, filename);
  },
);

// GET /projects/:projectId/pdf-status
router.get(
  "/projects/:projectId/pdf-status",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;
    const projectId = parseInt(raw, 10);
    if (isNaN(projectId)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const [project] = await db
      .select({
        status: projectsTable.status,
        pdfUrl: projectsTable.pdfUrl,
        shareToken: projectsTable.shareToken,
        userId: projectsTable.userId,
      })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (!project || (project.userId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // PDF readiness is orthogonal to checkout. Ordered projects keep
    // status="ordered" while a render runs; report generating via the
    // in-flight set instead of overwriting status.
    let pollStatus: string;
    if (isPdfGenerationInFlight(projectId) || project.status === "pdf_generating") {
      pollStatus = "generating";
    } else if (project.pdfUrl || project.status === "pdf_ready") {
      pollStatus = "ready";
    } else {
      // draft, or ordered with a missing/failed PDF
      pollStatus = "pending";
    }

    res.json({
      status: pollStatus,
      pdfUrl: project.pdfUrl,
      shareToken: project.shareToken,
      error: null,
    });
  },
);

export default router;
