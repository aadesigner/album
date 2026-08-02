import { Router, type IRouter } from "express";
import { db } from "@workspace/db-tsconfig";
import { ordersTable, projectsTable, appSettingsTable } from "@workspace/db-tsconfig";
import { eq, and, gte, count } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { queueProjectPdfGeneration } from "../lib/generateProjectPdf";
import { logger } from "../lib/logger";
import { getSecuritySettings } from "../lib/securitySettings";

const router: IRouter = Router();

// GET /orders
router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.user!.id));
  res.json(orders);
});

// POST /orders
router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const { projectId, notes } = req.body;
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  const capSettings = await getSecuritySettings();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [{ count: ordersToday }] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.userId, req.user!.id), gte(ordersTable.createdAt, todayStart)));
  if (ordersToday >= capSettings.maxOrdersPerDay) {
    res.status(403).json({
      error: `You've reached the maximum of ${capSettings.maxOrdersPerDay} orders per day. Please try again tomorrow.`,
    });
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

  // Create the order and flip the project's status together — a partial
  // write here would either leave an order with a project stuck as "draft"
  // or (worse) silently drop the order after the project already looks
  // ordered to the user.
  const order = await db.transaction(async (tx) => {
    const [ord] = await tx
      .insert(ordersTable)
      .values({
        userId: req.user!.id,
        projectId,
        priceLek: project.totalPriceLek,
        notes: notes || null,
      })
      .returning();

    await tx
      .update(projectsTable)
      .set({ status: "ordered" })
      .where(eq(projectsTable.id, projectId));

    return ord;
  });

  // Kick off the real print-ready PDF now that the order exists — the admin
  // panel and this route both read the same project.pdfUrl once it's ready.
  queueProjectPdfGeneration(projectId).catch((err) =>
    logger.error({ err, projectId, orderId: order.id }, "Failed to queue PDF generation for order"),
  );

  res.status(201).json(order);
});

// GET /orders/:orderId
router.get("/orders/:orderId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.orderId)
    ? req.params.orderId[0]
    : req.params.orderId;
  const orderId = parseInt(raw, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      and(eq(ordersTable.id, orderId), eq(ordersTable.userId, req.user!.id)),
    )
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

// GET /orders/:orderId/whatsapp
router.get(
  "/orders/:orderId/whatsapp",
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.orderId)
      ? req.params.orderId[0]
      : req.params.orderId;
    const orderId = parseInt(raw, 10);
    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(
        and(eq(ordersTable.id, orderId), eq(ordersTable.userId, req.user!.id)),
      )
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const rows = await db.select().from(appSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    const whatsappNumber = map["whatsapp_number"] || "+355688755833";

    // Detect lang from Accept-Language header
    const acceptLang = req.headers["accept-language"] || "";
    const isAlbanian =
      acceptLang.toLowerCase().startsWith("sq") ||
      req.query.lang === "sq";

    const message = isAlbanian
      ? `Përshëndetje, dua të porosis këtë album. (Porosia #${order.id})`
      : `Hello, I would like to order this photobook. (Order #${order.id})`;

    const phone = whatsappNumber.replace(/\D/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    res.json({ url, message });
  },
);

export default router;
