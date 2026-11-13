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

export function isPdfGenerationInFlight(projectId: number): boolean {
  return generatingProjectIds.has(projectId) || inFlightRenders.has(projectId);
}

const PDF_URL = (projectId: number) => `/api/projects/${projectId}/pdf-download`;

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

async function loadRenderInput(projectId: number): Promise<{
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
    return {
      pageNumber: p.pageNumber,
      role:
        p.pageType === "inside_cover"
          ? "locked_left"
          : p.pageType === "inside_back_cover"
            ? "locked_right"
            : p.pageType,
      elements: parsePageElements(p.contentJson),
    };
  });

  const unresolved = pages.filter((p) => pageHasUnresolvedDevicePhotos(p.contentJson));
  if (unresolved.length > 0) {
    throw new Error(
      `Project ${projectId} still has device-local photos on page(s) `
      + unresolved.map((p) => p.pageNumber).join(", ")
      + ". Re-open the album on the original device and place the order again so photos upload before print.",
    );
  }

  const contentJsons = pages.map((p) => p.contentJson);
  assertAlbumUploadsOnDisk(contentJsons, projectId);

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
async function renderProjectPdfToDisk(projectId: number): Promise<string> {
  const existing = inFlightRenders.get(projectId);
  if (existing) return existing;

  const job = (async () => {
    generatingProjectIds.add(projectId);
    activeGenerations++;
    const outputPath = projectPdfPath(projectId);
    const hadExistingFile = projectPdfExists(projectId);
    const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
    try {
      const input = await loadRenderInput(projectId);
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
      await markPdfReady(projectId);
      return outputPath;
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
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
 * Ensure the PDF file exists on disk. Regenerates if missing — but refuses to
 * invent a blank PDF when album photos are gone from disk.
 */
export async function ensureProjectPdfFile(projectId: number): Promise<string> {
  if (projectPdfExists(projectId)) {
    return projectPdfPath(projectId);
  }
  logger.warn({ projectId, pdfsDir: getPdfsDir() }, "PDF missing on disk — regenerating");
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
 * Does NOT delete the previous PDF until the new render succeeds (atomic swap).
 *
 * Throws (synchronously, before anything is queued) if the configured
 * concurrency cap is already reached — callers should surface that as a 429.
 * Also throws MISSING_UPLOADS when photos are not on disk.
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

  const pages = await db
    .select({ contentJson: projectPagesTable.contentJson })
    .from(projectPagesTable)
    .where(eq(projectPagesTable.projectId, projectId));
  // Fail before clearing anything — protects ordered albums from blank PDFs.
  assertAlbumUploadsOnDisk(pages.map((p) => p.contentJson), projectId);

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

  void renderProjectPdfToDisk(projectId).catch(() => {
    // Errors already logged + status reset inside renderProjectPdfToDisk.
  });
}
