/**
 * Auto Wiper — after an *order* ages past retention, remove server print PDF +
 * uploaded photo *files* and lock admin downloads.
 *
 * Does NOT:
 * - touch draft / unordered albums (no order row → never selected)
 * - rewrite page contentJson (ordered albums stay viewable/locked; client
 *   device cache is never touched by the server)
 * - delete anything from the user's phone/browser cache
 */
import { and, eq, isNull, lte, ne } from "drizzle-orm";
import { db } from "@workspace/db-tsconfig";
import { ordersTable, projectsTable, projectPagesTable, appSettingsTable } from "@workspace/db-tsconfig";
import { logger } from "./logger";
import { deleteProjectPdfFile } from "./generateProjectPdf";
import { collectUploadFilenamesFromPages } from "./albumUploadImages";
import { deleteUploadFiles } from "./uploadCleanup";

export type AutoWiperRetention = "off" | "7d" | "14d" | "30d";

const RETENTION_MS: Record<Exclude<AutoWiperRetention, "off">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const BATCH = 25;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function parseAutoWiperRetention(raw: unknown): AutoWiperRetention {
  const v = String(raw || "off").trim().toLowerCase();
  if (v === "7d" || v === "1w" || v === "week" || v === "1_week") return "7d";
  if (v === "14d" || v === "2w" || v === "2_weeks") return "14d";
  if (v === "30d" || v === "1m" || v === "month" || v === "1_month") return "30d";
  return "off";
}

async function readRetention(): Promise<AutoWiperRetention> {
  try {
    const [row] = await db
      .select({ value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "auto_wiper_retention"))
      .limit(1);
    return parseAutoWiperRetention(row?.value);
  } catch {
    return "off";
  }
}

async function filenamesStillNeeded(
  names: string[],
  exceptProjectId: number,
): Promise<Set<string>> {
  if (!names.length) return new Set();
  const pages = await db
    .select({
      projectId: projectPagesTable.projectId,
      contentJson: projectPagesTable.contentJson,
    })
    .from(projectPagesTable)
    .innerJoin(projectsTable, eq(projectPagesTable.projectId, projectsTable.id))
    .where(
      and(
        isNull(projectsTable.printAssetsWipedAt),
        ne(projectPagesTable.projectId, exceptProjectId),
      ),
    );
  const keep = new Set<string>();
  const want = new Set(names);
  for (const p of pages) {
    for (const n of collectUploadFilenamesFromPages([p.contentJson])) {
      if (want.has(n)) keep.add(n);
    }
  }
  return keep;
}

async function wipeProject(projectId: number): Promise<void> {
  const pages = await db
    .select({ contentJson: projectPagesTable.contentJson })
    .from(projectPagesTable)
    .where(eq(projectPagesTable.projectId, projectId));

  const names = collectUploadFilenamesFromPages(pages.map((p) => p.contentJson));
  const keep = await filenamesStillNeeded(names, projectId);
  const removable = names.filter((n) => !keep.has(n));

  // Disk only — leave album JSON so the customer can still open the locked
  // ordered album (layout + slots). Photos may still show from their device cache.
  deleteProjectPdfFile(projectId);
  if (removable.length) deleteUploadFiles(removable);

  await db
    .update(projectsTable)
    .set({
      pdfUrl: null,
      printAssetsWipedAt: new Date(),
    })
    .where(eq(projectsTable.id, projectId));
}

export async function runAutoWiperTick(): Promise<{ wiped: number; retention: AutoWiperRetention }> {
  if (running) return { wiped: 0, retention: "off" };
  running = true;
  try {
    const retention = await readRetention();
    if (retention === "off") return { wiped: 0, retention };

    const cutoff = new Date(Date.now() - RETENTION_MS[retention]);
    const aged = await db
      .select({
        projectId: ordersTable.projectId,
      })
      .from(ordersTable)
      .innerJoin(projectsTable, eq(ordersTable.projectId, projectsTable.id))
      .where(
        and(
          lte(ordersTable.createdAt, cutoff),
          isNull(projectsTable.printAssetsWipedAt),
        ),
      )
      .limit(BATCH);

    // Unique project ids (one order → one project typically).
    const seen = new Set<number>();
    const ids: number[] = [];
    for (const row of aged) {
      if (seen.has(row.projectId)) continue;
      seen.add(row.projectId);
      ids.push(row.projectId);
    }

    let wiped = 0;
    for (const projectId of ids) {
      try {
        await wipeProject(projectId);
        wiped += 1;
      } catch (err) {
        logger.warn({ err, projectId }, "Auto Wiper: project wipe failed");
      }
    }

    if (wiped > 0) {
      logger.info({ wiped, retention, cutoff: cutoff.toISOString() }, "Auto Wiper tick complete");
    }
    return { wiped, retention };
  } finally {
    running = false;
  }
}

export function startAutoWiper(): void {
  if (timer) return;
  const kick = () => {
    void runAutoWiperTick().catch((err) => logger.error({ err }, "Auto Wiper tick error"));
  };
  // After boot settle, then hourly.
  setTimeout(kick, 45_000);
  timer = setInterval(kick, 60 * 60 * 1000);
  timer.unref?.();
  logger.info("Auto Wiper scheduler started");
}

/** Shared guard for admin download / regen routes. */
export async function assertPrintAssetsAvailable(projectId: number): Promise<void> {
  const [p] = await db
    .select({ wiped: projectsTable.printAssetsWipedAt })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  if (p?.wiped) {
    const err = new Error("PRINT_ASSETS_WIPED");
    (err as any).code = "PRINT_ASSETS_WIPED";
    throw err;
  }
}
