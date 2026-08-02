// One-time backfill: re-project element y/h for projects whose book size is
// NOT the 3:4 reference aspect ratio (currently only the square 21x21cm
// book). Content was originally authored against a fixed 600x800 (3:4)
// logical canvas regardless of the project's real book size, which distorts
// non-3:4 books. Going forward the app authors content against a per-project
// canvas height (see getCanvasHeight()/scaleElementsToCanvas() in
// artifacts/pergjithmone/src/lib/designs.ts) — this script aligns existing
// rows with that convention.
//
// Run once via: pnpm --filter @workspace/scripts exec tsx src/backfill-canvas-height.ts
// (add --apply to actually write; without it, runs as a dry-run report only)

import { db } from "@workspace/db";
import { projectsTable, projectPagesTable, bookSizesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DESIGN_W = 600;
const DESIGN_H = 800; // 3:4 reference height — must match designs.ts

function getCanvasHeight(widthCm: number, heightCm: number): number {
  if (!widthCm || !heightCm) return DESIGN_H;
  return Math.round((DESIGN_W * heightCm) / widthCm);
}

const APPLY = process.argv.includes("--apply");

async function main() {
  const projects = await db
    .select({
      id: projectsTable.id,
      bookSizeId: projectsTable.bookSizeId,
      widthCm: bookSizesTable.widthCm,
      heightCm: bookSizesTable.heightCm,
    })
    .from(projectsTable)
    .innerJoin(bookSizesTable, eq(projectsTable.bookSizeId, bookSizesTable.id));

  let touchedProjects = 0;
  let touchedPages = 0;

  for (const p of projects) {
    const widthCm = Number(p.widthCm);
    const heightCm = Number(p.heightCm);
    const canvasH = getCanvasHeight(widthCm, heightCm);
    if (canvasH === DESIGN_H) continue; // 3:4 books are already pixel-correct — no-op

    const k = canvasH / DESIGN_H;
    const pages = await db
      .select({ id: projectPagesTable.id, contentJson: projectPagesTable.contentJson })
      .from(projectPagesTable)
      .where(eq(projectPagesTable.projectId, p.id));

    touchedProjects++;
    for (const page of pages) {
      let elements: any;
      try {
        elements = JSON.parse(page.contentJson || "[]");
      } catch {
        continue;
      }
      if (!Array.isArray(elements) || elements.length === 0) continue;

      const scaled = elements.map((el: any) => ({
        ...el,
        y: typeof el.y === "number" ? el.y * k : el.y,
        h: typeof el.h === "number" ? el.h * k : el.h,
      }));

      console.log(
        `${APPLY ? "Updating" : "[dry-run] Would update"} project ${p.id} page ${page.id} (canvasH=${canvasH}, k=${k})`,
      );
      touchedPages++;

      if (APPLY) {
        await db
          .update(projectPagesTable)
          .set({ contentJson: JSON.stringify(scaled) })
          .where(eq(projectPagesTable.id, page.id));
      }
    }
  }

  console.log(
    `\n${APPLY ? "Applied" : "Dry-run complete"}: ${touchedProjects} non-3:4 project(s), ${touchedPages} page(s) ${APPLY ? "updated" : "would be updated"}.`,
  );
  if (!APPLY) console.log("Re-run with --apply to write changes.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
