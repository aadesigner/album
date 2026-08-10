import path from "path";
import fs from "fs";
import { db } from "@workspace/db-tsconfig";
import { projectsTable, projectPagesTable, bookSizesTable } from "@workspace/db-tsconfig";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { uploadsDir } from "../routes/uploads";
import { renderProjectPdf, type PdfRenderPage } from "./pdfRenderer";
import { getSecuritySettings } from "./securitySettings";

export const pdfsDir = path.join(process.cwd(), "pdfs");
if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });

// Module-level in-process counter of PDFs currently rendering. Caps the
// admin-configurable "max concurrent PDF generations" — the render pipeline
// (@napi-rs/canvas + pdf-lib) is CPU/memory heavy enough that letting an
// unbounded number run at once can starve the whole process.
let activeGenerations = 0;

/** Project IDs with an in-flight render — used when status stays "ordered". */
const generatingProjectIds = new Set<number>();

export function isPdfGenerationInFlight(projectId: number): boolean {
  return generatingProjectIds.has(projectId);
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
  if (activeGenerations >= settings.maxConcurrentPdfGenerations) {
    throw new Error("TOO_MANY_CONCURRENT_PDFS: PDF generation concurrency cap reached");
  }

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

  // Snapshot whether this run must preserve checkout state. Re-read at the
  // end too in case status changed mid-render, but the start snapshot decides
  // whether we ever write pdf_generating.
  const preserveOrdered = project.status === "ordered";

  if (preserveOrdered) {
    // Clear stale URL so admins/UI know a fresh render is pending, but never
    // leave "ordered" — that flag gates delete protection + pending caps.
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

  activeGenerations++;
  generatingProjectIds.add(projectId);
  void (async () => {
    try {
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

      const outputPath = path.join(pdfsDir, `project-${projectId}.pdf`);
      await renderProjectPdf({
        pages: renderPages,
        bookWidthCm: Number(bookSize.widthCm),
        bookHeightCm: Number(bookSize.heightCm),
        uploadsDir,
        outputPath,
      });

      const pdfUrl = `/api/projects/${projectId}/pdf-download`;

      // Re-read status so a project ordered while a draft PDF was rendering
      // still keeps "ordered" instead of being flipped to pdf_ready.
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
    } catch (err) {
      logger.error({ err, projectId }, "PDF generation failed");
      try {
        const [current] = await db
          .select({ status: projectsTable.status })
          .from(projectsTable)
          .where(eq(projectsTable.id, projectId))
          .limit(1);

        if (!current) return;

        if (current.status === "ordered") {
          // Stay ordered with no pdfUrl — admin can regenerate; never demote.
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
      } catch (e) {
        logger.error({ err: e, projectId }, "Failed to reset project after PDF failure");
      }
    } finally {
      generatingProjectIds.delete(projectId);
      activeGenerations--;
    }
  })();
}
