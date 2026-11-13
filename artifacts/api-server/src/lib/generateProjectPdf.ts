import path from "path";
import fs from "fs";
import { db } from "@workspace/db-tsconfig";
import { projectsTable, projectPagesTable, bookSizesTable } from "@workspace/db-tsconfig";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { ensureDataDirs, getPdfsDir, getUploadsDir, pdfsDir } from "./dataDir";
import { renderProjectPdf, parsePageElements, type PdfRenderPage } from "./pdfRenderer";
import { getSecuritySettings } from "./securitySettings";
import { pageHasUnresolvedDevicePhotos } from "./pageContentBlank";
import {
  collectUploadFilenamesFromPages,
  resolveAlbumUploadFiles,
} from "./albumUploadImages";

ensureDataDirs();
export { pdfsDir };

export function projectPdfPath(projectId: number): string {
  return path.join(getPdfsDir(), `project-${projectId}.pdf`);
}

export function projectPdfExists(projectId: number): boolean {
  try {
    const p = projectPdfPath(projectId);
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  } catch {
    return false;
  }
}

/**
 * Explicitly remove a print PDF from disk. Only call from admin "Delete PDF"
 * — never from deploys, order delete, project delete, or regenerate (regen
 * uses an atomic temp→final swap and must not wipe first).
 */
export function deleteProjectPdfFile(projectId: number): void {
  try {
    const p = projectPdfPath(projectId);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      logger.info({ projectId, path: p }, "Admin deleted project PDF file");
    }
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

/** Last render failure per project — pdf-status / admin UI can surface it. */
const lastPdfErrors = new Map<number, string>();

export function isPdfGenerationInFlight(projectId: number): boolean {
  return generatingProjectIds.has(projectId) || inFlightRenders.has(projectId);
}

export function getLastPdfError(projectId: number): string | null {
  return lastPdfErrors.get(projectId) ?? null;
}

export function clearLastPdfError(projectId: number): void {
  lastPdfErrors.delete(projectId);
}

function rememberPdfError(projectId: number, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err || "PDF generation failed");
  lastPdfErrors.set(projectId, msg.slice(0, 500));
}

const PDF_URL = (projectId: number) => `/api/projects/${projectId}/pdf-download`;

export function projectPdfPublicUrl(projectId: number): string {
  return PDF_URL(projectId);
}

/**
 * Refuse to bake a print PDF when album pages reference uploads that are not
 * on disk — otherwise we silently overwrite a good PDF with blank photo slots.
 */
export function assertAlbumUploadsOnDisk(
  contentJsons: Array<string | null | undefined>,
  projectId: number,
): void {
  const unresolved = contentJsons.filter((raw) => pageHasUnresolvedDevicePhotos(raw));
  if (unresolved.length > 0) {
    throw new Error(
      `UNRESOLVED_DEVICE_PHOTOS: project ${projectId} still has device-local photos `
      + `(local-photo:) that were never uploaded. Client must order again from the `
      + "device where the album was built so photos upload before print.",
    );
  }
  const names = collectUploadFilenamesFromPages(contentJsons);
  if (names.length === 0) return;
  const found = resolveAlbumUploadFiles(names, getUploadsDir());
  const missing = names.length - found.length;
  if (missing <= 0) return;
  throw new Error(
    `MISSING_UPLOADS: ${missing} of ${names.length} album photos for project ${projectId} `
    + "are missing on disk. Refusing to render a blank print PDF. "
    + "Mount the Railway volume at /data on api-server (or restore uploads) before regenerating.",
  );
}

export type PdfGenOptions = {
  /**
   * Studio / admin recovery: render even if some photos are still `local-photo:`
   * or missing on disk. Missing slots print blank; available photos still bake in.
   * Client checkout stays strict so we don't silently ship empty albums.
   */
  allowMissingUploads?: boolean;
};

async function loadRenderInput(
  projectId: number,
  opts: PdfGenOptions = {},
): Promise<{
  bookWidthCm: number;
  bookHeightCm: number;
  pages: PdfRenderPage[];
  status: string;
  contentJsons: string[];
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
    const elements = parsePageElements(p.contentJson).map((el) => {
      // Device-only refs are never fetchable on the server — drop so layout/text still print.
      if (el.src && (/^local-photo:/i.test(el.src) || /^blob:/i.test(el.src))) {
        return { ...el, src: undefined };
      }
      return el;
    });
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

  const contentJsons = pages.map((p) => p.contentJson);
  if (!opts.allowMissingUploads) {
    const unresolved = pages.filter((p) => pageHasUnresolvedDevicePhotos(p.contentJson));
    if (unresolved.length > 0) {
      throw new Error(
        `UNRESOLVED_DEVICE_PHOTOS: project ${projectId} still has device-local photos on page(s) `
        + unresolved.map((p) => p.pageNumber).join(", ")
        + ". Client must re-order from the device where the album was built so photos upload before print.",
      );
    }
    assertAlbumUploadsOnDisk(contentJsons, projectId);
  } else {
    const unresolved = pages.filter((p) => pageHasUnresolvedDevicePhotos(p.contentJson)).length;
    const names = collectUploadFilenamesFromPages(contentJsons);
    const found = resolveAlbumUploadFiles(names, getUploadsDir()).length;
    if (unresolved > 0 || found < names.length) {
      logger.warn(
        { projectId, unresolved, found, totalUploads: names.length },
        "Admin PDF render allowing missing/local photos — blank slots where files are gone",
      );
    }
  }

  return {
    bookWidthCm: Number(bookSize.widthCm),
    bookHeightCm: Number(bookSize.heightCm),
    pages: renderPages,
    status: project.status,
    contentJsons,
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

async function markPdfFailed(projectId: number, hadExistingFile: boolean): Promise<void> {
  const [current] = await db
    .select({ status: projectsTable.status })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  if (!current) return;

  if (current.status === "ordered") {
    // Keep pointing at the previous PDF URL if the old file survived — never
    // clear pdfUrl after a failed regen when we still have a file on disk.
    if (hadExistingFile || projectPdfExists(projectId)) {
      await db
        .update(projectsTable)
        .set({ pdfUrl: PDF_URL(projectId) })
        .where(eq(projectsTable.id, projectId));
      return;
    }
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
 * Writes to a temp file first, then replaces the previous PDF atomically so a
 * failed / blank render cannot destroy a good ordered album PDF.
 */
async function renderProjectPdfToDisk(
  projectId: number,
  opts: PdfGenOptions = {},
): Promise<string> {
  const existing = inFlightRenders.get(projectId);
  if (existing) {
    try {
      return await existing;
    } catch (err) {
      // A prior strict job may have failed on missing photos — admin recovery retries softly.
      if (!opts.allowMissingUploads) throw err;
    }
  }

  const job = (async () => {
    generatingProjectIds.add(projectId);
    activeGenerations++;
    clearLastPdfError(projectId);
    const outputPath = projectPdfPath(projectId);
    const hadExistingFile = projectPdfExists(projectId);
    const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
    try {
      const input = await loadRenderInput(projectId, opts);
      ensureDataDirs();
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      await renderProjectPdf({
        pages: input.pages,
        bookWidthCm: input.bookWidthCm,
        bookHeightCm: input.bookHeightCm,
        uploadsDir: getUploadsDir(),
        outputPath: tempPath,
      });

      if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size <= 0) {
        throw new Error(`PDF write produced an empty file for project ${projectId}`);
      }

      fs.renameSync(tempPath, outputPath);
      clearLastPdfError(projectId);
      await markPdfReady(projectId);
      return outputPath;
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
      rememberPdfError(projectId, err);
      logger.error({ err, projectId }, "PDF generation failed");
      try {
        await markPdfFailed(projectId, hadExistingFile);
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
 * Ensure the PDF file exists on disk. Regenerates if missing.
 * Admin downloads use allowMissingUploads so a stuck ordered album can still
 * produce a printable file from whatever photos remain on the server.
 */
export async function ensureProjectPdfFile(
  projectId: number,
  opts: PdfGenOptions = { allowMissingUploads: true },
): Promise<string> {
  if (projectPdfExists(projectId)) {
    return projectPdfPath(projectId);
  }
  logger.warn({ projectId, pdfsDir: getPdfsDir(), opts }, "PDF missing on disk — regenerating");
  await preparePdfGeneration(projectId, opts);
  return renderProjectPdfToDisk(projectId, opts);
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
 * Does NOT delete the previous PDF until the new render succeeds (atomic swap).
 *
 * Throws (synchronously, before anything is queued) if the configured
 * concurrency cap is already reached — callers should surface that as a 429.
 * Also throws MISSING_UPLOADS when photos are not on disk.
 */
async function preparePdfGeneration(
  projectId: number,
  opts: PdfGenOptions = {},
): Promise<{ preserveOrdered: boolean }> {
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

  const pages = await db
    .select({ contentJson: projectPagesTable.contentJson })
    .from(projectPagesTable)
    .where(eq(projectPagesTable.projectId, projectId));
  // Strict for client checkout; admin recovery may skip this.
  if (!opts.allowMissingUploads) {
    assertAlbumUploadsOnDisk(pages.map((p) => p.contentJson), projectId);
  }

  const preserveOrdered = project.status === "ordered";

  // Keep the previous PDF file until the new render renames over it.
  if (preserveOrdered) {
    // Leave pdfUrl set so View can still open the old file while regenerating.
  } else {
    await db
      .update(projectsTable)
      .set({ status: "pdf_generating" })
      .where(eq(projectsTable.id, projectId));
  }

  clearLastPdfError(projectId);
  return { preserveOrdered };
}

export async function queueProjectPdfGeneration(projectId: number): Promise<void> {
  // Client checkout: keep strict so we don't bake empty photo slots unnoticed.
  await preparePdfGeneration(projectId, { allowMissingUploads: false });
  void renderProjectPdfToDisk(projectId, { allowMissingUploads: false }).catch(() => {
    // Errors already logged + remembered inside renderProjectPdfToDisk.
  });
}

/**
 * Start (or join) a PDF render and wait until it finishes or `waitMs` elapses.
 * Used by admin "Generate PDF" so the click gets a real ready/failed answer
 * instead of a silent background job the UI never sees fail.
 *
 * Defaults to allowMissingUploads so studio can recover stuck ordered albums
 * (photos still on volume print; missing/local-photo slots stay blank).
 */
export async function queueAndWaitProjectPdfGeneration(
  projectId: number,
  waitMs = 55_000,
  opts: PdfGenOptions = { allowMissingUploads: true },
): Promise<{ status: "ready" | "generating" | "failed"; pdfUrl: string | null; error: string | null }> {
  await preparePdfGeneration(projectId, opts);
  const job = renderProjectPdfToDisk(projectId, opts);

  let settled = false;
  void job.then(
    () => { settled = true; },
    () => { settled = true; },
  );

  const deadline = Date.now() + Math.max(3_000, waitMs);
  while (Date.now() < deadline && !settled) {
    await new Promise((r) => setTimeout(r, 400));
  }

  if (projectPdfExists(projectId) && !isPdfGenerationInFlight(projectId)) {
    clearLastPdfError(projectId);
    // Ensure DB pdfUrl is set even if markPdfReady raced.
    try {
      await markPdfReady(projectId);
    } catch {
      // ignore
    }
    return { status: "ready", pdfUrl: PDF_URL(projectId), error: null };
  }

  const err = getLastPdfError(projectId);
  if (err && !isPdfGenerationInFlight(projectId)) {
    return { status: "failed", pdfUrl: null, error: err };
  }

  // Still rendering — client should keep polling pdf-status.
  return {
    status: "generating",
    pdfUrl: projectPdfExists(projectId) ? PDF_URL(projectId) : null,
    error: null,
  };
}
