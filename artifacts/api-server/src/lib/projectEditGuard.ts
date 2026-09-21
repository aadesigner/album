import { db } from "@workspace/db-tsconfig";
import { projectsTable, projectPagesTable, ordersTable } from "@workspace/db-tsconfig";
import { and, eq } from "drizzle-orm";
import { isPageContentBlank } from "./pageContentBlank";

export { isPageContentBlank } from "./pageContentBlank";

const ORDERED_EDIT_ERROR =
  "This album has already been ordered and can no longer be edited.";

/**
 * Reject mutations on ordered albums (and rows that still have an order after a
 * status glitch). Returns an HTTP-ready error or null when editable.
 */
export async function getProjectEditBlock(
  projectId: number,
  userId: number,
): Promise<{ status: number; error: string } | null> {
  const [project] = await db
    .select({
      id: projectsTable.id,
      status: projectsTable.status,
      userId: projectsTable.userId,
    })
    .from(projectsTable)
    .where(
      and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)),
    )
    .limit(1);

  if (!project) {
    return { status: 404, error: "Project not found" };
  }

  if (project.status === "ordered") {
    return { status: 403, error: ORDERED_EDIT_ERROR };
  }

  const [linkedOrder] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.projectId, projectId))
    .limit(1);

  if (linkedOrder) {
    return { status: 403, error: ORDERED_EDIT_ERROR };
  }

  return null;
}

/** Inner pages that still need photos/text before checkout (covers/linings skipped). */
export async function findEmptyInnerPageNumbers(
  projectId: number,
): Promise<number[]> {
  const pages = await db
    .select({
      pageNumber: projectPagesTable.pageNumber,
      contentJson: projectPagesTable.contentJson,
    })
    .from(projectPagesTable)
    .where(
      and(
        eq(projectPagesTable.projectId, projectId),
        eq(projectPagesTable.pageType, "inner"),
      ),
    );

  const empty: number[] = [];
  for (const p of pages) {
    if (isPageContentBlank(p.contentJson)) empty.push(p.pageNumber);
  }
  return empty.sort((a, b) => a - b);
}
