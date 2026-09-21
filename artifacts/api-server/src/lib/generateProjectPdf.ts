import path from "path";
import fs from "fs";
import { db } from "@workspace/db-tsconfig";
import { projectsTable, projectPagesTable, bookSizesTable } from "@workspace/db-tsconfig";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { uploadsDir } from "../routes/uploads";
import { renderProjectPdf, type PdfRenderPage } from "./pdfRenderer";
import { getSecuritySettings } from "./securitySettings";

/** Prefer DATA_DIR (Railway volume) so PDFs survive redeploys. */
const dataRoot = process.env.DATA_DIR || process.cwd();
export const pdfsDir = path.join(dataRoot, "pdfs");
if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });
logger.info({ pdfsDir }, "PDF storage directory ready");

export function projectPdfPath(projectId: number): string {
  return path.join(pdfsDir, `project-${projectId}.pdf`);
}

export function projectPdfExists(projectId: number): boolean {
  try {
    const p = projectPdfPath(projectId);
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  } catch {
    return false;
  }
}

export function deleteProjectPdfFile(projectId: number): void {
  try {
    const p = projectPdfPath(projectId);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (err) {
    logger.warn({ err, projectId }, "Failed to delete PDF file");
  }
}

// Module-level in-process counter of PDFs currently rendering. Caps the
// admin-configurable "max concurrent PDF generations" — the render pipeline
// (@napi-rs/canvas + pdf-lib) is CPU/memory heavy enough that letting an
// unbounded number run at once can starve the whole process.
let activeGenerations = 0;

/** Project IDs with an in-flight render — used when status stays "ordered". */
const generatingProjectIds = new Set<number>();

/** Coalesce concurrent ensure/queue work for the same project. */
const inFlightRenders = new Map<number, Promise<string>>();

export function isPdfGenerationInFlight(projectId: number): boolean {
  return generatingProjectIds.has(projectId) || inFlightRenders.has(projectId);
}

const PDF_URL = (projectId: number) => `/api/projects/${projectId}/pdf-download`;

async function loadRenderInput(projectId: number): Promise<{
  bookWidthCm: number;
  bookHeightCm: number;
  pages: PdfRenderPage[];
  status: string;
}> {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const [bookSize] = await db
    .select()
    .from(bookSizesTable)
    .where(eq(bookSizesTable.id, project.bookSizeId))
    .limit(1);
  if (!bookSize) throw new Error(`Project ${projectId} has no valid book size`);

  const pages = await db
    .select()
    .from(projectPagesTable)
    .where(eq(projectPagesTable.projectId, projectId));

  const renderPages: PdfRenderPage[] = pages.map((p) => {
    let elements: PdfRenderPage["elements"] = [];
    try {
      const parsed = p.contentJson ? JSON.parse(p.contentJson) : [];
      if (Array.isArray(parsed)) elements = parsed;
    } catch {
      // Malformed content on a single page shouldn't abort the whole PDF.
    }
    return {
      pageNumber: p.pageNumber,
      role:
        p.pageType === "inside_cover"
          ? "locked_left"
          : p.pageType === "inside_back_cover"
            ? "locked_right"
            : p.pageType,
      elements,
    };
  });

  return {
    bookWidthCm: Number(bookSize.widthCm),
    bookHeightCm: Number(bookSize.heightCm),
    pages: renderPages,
    status: project.status,
  };
}

async function markPdfReady(projectId: number): Promise<void> {
  const pdfUrl = PDF_URL(projectId);
  const [current] = await db
    .select({ status: projectsTable.status })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  if (!current) return;

  if (current.status === "ordered") {
    await db
      .update(projectsTable)
      .set({ pdfUrl })
      .where(eq(projectsTable.id, projectId));
  } else {
    await db
      .update(projectsTable)
      .set({ status: "pdf_ready", pdfUrl })
      .where(eq(projectsTable.id, projectId));
  }
}

async function markPdfFailed(projectId: number): Promise<void> {
  const [current] = await db
    .select({ status: projectsTable.status })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  if (!current) return;

  if (current.status === "ordered") {
    await db
      .update(projectsTable)
      .set({ pdfUrl: null })
      .where(eq(projectsTable.id, projectId));
  } else {
    await db
      .update(projectsTable)
      .set({ status: "draft", pdfUrl: null })
      .where(eq(projectsTable.id, projectId));
  }
}

/**
 * Render the print PDF to disk and mark the project ready.
 * Returns the absolute file path.
 */
async function renderProjectPdfToDisk(projectId: number): Promise<string> {
  const existing = inFlightRenders.get(projectId);
  if (existing) return existing;

  const job = (async () => {
    generatingProjectIds.add(projectId);
    activeGenerations++;
    try {
      const input = await loadRenderInput(projectId);
      const outputPath = projectPdfPath(projectId);
      await renderProjectPdf({
        pages: input.pages,
        bookWidthCm: input.bookWidthCm,
        bookHeightCm: input.bookHeightCm,
        uploadsDir,
        outputPath,
      });

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size <= 0) {
        throw new Error(`PDF write produced an empty file for project ${projectId}`);
      }

      await markPdfReady(projectId);
      return outputPath;
    } catch (err) {
      logger.error({ err, projectId }, "PDF generation failed");
      try {
        await markPdfFailed(projectId);
      } catch (e) {
        logger.error({ err: e, projectId }, "Failed to reset project after PDF failure");
      }
      throw err;
    } finally {
      generatingProjectIds.delete(projectId);
      activeGenerations--;
      inFlightRenders.delete(projectId);
    }
  })();

  inFlightRenders.set(projectId, job);
  return job;
}

/**
 * Ensure the PDF file exists on disk. Regenerates if missing (e.g. after
 * ephemeral disk wipe / redeploy while pdfUrl is still set in the DB).
 */
export async function ensureProjectPdfFile(projectId: number): Promise<string> {
  if (projectPdfExists(projectId)) {
    return projectPdfPath(projectId);
  }
  logger.warn({ projectId, pdfsDir }, "PDF missing on disk — regenerating");
  return renderProjectPdfToDisk(projectId);
}

/**
 * Kicks off a real print PDF render in the background.
 *
 * Status rules (order lifecycle must not be clobbered by PDF lifecycle):
 * - If the project is already `ordered`, keep `ordered` for the whole run.
 *   Success only sets `pdfUrl`; failure never demotes back to `draft`.
 * - Otherwise flip `draft`/`pdf_ready` → `pdf_generating` → `pdf_ready`
 *   (or back to `draft` on failure), which is the pre-checkout preview path.
 *
 * Callers should not await this for HTTP responsiveness — poll
 * GET /projects/:id/pdf-status instead (which also consults
 * `isPdfGenerationInFlight` for ordered projects).
 *
 * Throws (synchronously, before anything is queued) if the configured
 * concurrency cap is already reached — callers should surface that as a 429.
 */
export async function queueProjectPdfGeneration(projectId: number): Promise<void> {
  const settings = await getSecuritySettings();
  if (activeGenerations >= settings.maxConcurrentPdfGenerations && !inFlightRenders.has(projectId)) {
    throw new Error("TOO_MANY_CONCURRENT_PDFS: PDF generation concurrency cap reached");
  }

  const [project] = await db
    .select({ id: projectsTable.id, status: projectsTable.status })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const preserveOrdered = project.status === "ordered";

  // Drop any stale file so View PDF can't serve an outdated copy while a
  // fresh render is pending.
  deleteProjectPdfFile(projectId);

  if (preserveOrdered) {
    await db
      .update(projectsTable)
      .set({ pdfUrl: null })
      .where(eq(projectsTable.id, projectId));
  } else {
    await db
      .update(projectsTable)
      .set({ status: "pdf_generating", pdfUrl: null })
      .where(eq(projectsTable.id, projectId));
  }

  void renderProjectPdfToDisk(projectId).catch(() => {
    // Errors already logged + status reset inside renderProjectPdfToDisk.
  });
}
