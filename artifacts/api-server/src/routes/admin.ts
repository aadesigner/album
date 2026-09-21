import { Router, type IRouter } from "express";
import { db } from "@workspace/db-tsconfig";
import {
  usersTable,
  ordersTable,
  projectsTable,
  categoriesTable,
  subcategoriesTable,
  templatesTable,
  layoutsTable,
  bookSizesTable,
  appSettingsTable,
  siteAnalyticsTable,
} from "@workspace/db-tsconfig";
import { ipBlocklistTable } from "@workspace/db-tsconfig";
import { eq, count, sql, desc, ilike, and, or, ne, inArray, gte } from "drizzle-orm";
import { requireAdmin, invalidateCachedUser, hashPassword } from "../lib/auth";
import { invalidatePendingBooksLimitCache } from "./projects";
import {
  SECURITY_SETTINGS_DEFAULTS,
  SECURITY_SETTINGS_KEY_MAP,
  invalidateSecuritySettingsCache,
  type SecuritySettings,
} from "../lib/securitySettings";
import { invalidateIpBlocklistCache } from "../lib/ipBlocklist";
import { queueProjectPdfGeneration, deleteProjectPdfFile } from "../lib/generateProjectPdf";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Operator accounts (seeded super-admin) stay out of every member-facing admin surface. */
const notHiddenUser = eq(usersTable.isHidden, false);

/** Phone-only accounts store a NOT-NULL placeholder like `3556…@ph.local` — never treat as a real email. */
function isSyntheticPhoneEmail(email: string | null | undefined): boolean {
  return !!email && /@ph\.local$/i.test(email);
}

function phoneLocalEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@ph.local`;
}

/** Hide synthetic emails from admin UI responses; keep phone as the public identifier. */
function publicAdminEmail(email: string | null | undefined): string | null {
  if (!email || isSyntheticPhoneEmail(email)) return null;
  return email;
}

async function findVisibleUser(userId: number) {
  const [user] = await db
    .select({ id: usersTable.id, isHidden: usersTable.isHidden })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), notHiddenUser))
    .limit(1);
  return user ?? null;
}

// Reads the security/limits fields out of the same key/value map the rest of
// /admin/settings already uses, so GET and PATCH share one source of truth.
function readSecuritySettings(map: Record<string, string>): SecuritySettings {
  const data: SecuritySettings = { ...SECURITY_SETTINGS_DEFAULTS };
  for (const key of Object.keys(SECURITY_SETTINGS_KEY_MAP) as (keyof SecuritySettings)[]) {
    const raw = map[SECURITY_SETTINGS_KEY_MAP[key]];
    if (raw === undefined || raw === "") continue;
    if (key === "allowedUploadMimeTypes") {
      const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) data.allowedUploadMimeTypes = list;
    } else {
      const n = parseInt(raw, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!isNaN(n) && n >= 0) (data as any)[key] = n;
    }
  }
  return data;
}

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Money that counts as "earned" once the album has left the shop.
  const earnedStatuses = inArray(ordersTable.status, ["shipped", "delivered"]);
  // Pipeline revenue excludes cancelled only.
  const activeOrder = ne(ordersTable.status, "cancelled");

  // Prefer order.price_lek; if legacy rows stored 0, fall back to project price.
  const orderAmountSql = sql<number>`coalesce(nullif(${ordersTable.priceLek}, 0), ${projectsTable.totalPriceLek}, 0)`;

  const [
    [usersCount],
    [ordersCount],
    [projectsCount],
    [ordersMonth],
    [revenue],
    [revenueMonth],
    [earned],
    [earnedMonth],
    [usersToday],
    [usersWeek],
    [visitorsToday],
    [visitorsWeek],
    [visitorsMonth],
    [wpClicksTotal],
  ] = await Promise.all([
    db.select({ count: count() }).from(usersTable).where(notHiddenUser),
    db.select({ count: count() }).from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(notHiddenUser),
    db.select({ count: count() }).from(projectsTable)
      .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
      .where(notHiddenUser),
    db.select({ count: count() }).from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(and(notHiddenUser, gte(ordersTable.createdAt, monthStart))),
    // All-time pipeline revenue (non-cancelled)
    db.select({ total: sql<number>`coalesce(sum(${orderAmountSql}), 0)` })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(ordersTable.projectId, projectsTable.id))
      .where(and(notHiddenUser, activeOrder)),
    // This calendar month — by order created date
    db.select({ total: sql<number>`coalesce(sum(${orderAmountSql}), 0)` })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(ordersTable.projectId, projectsTable.id))
      .where(and(notHiddenUser, activeOrder, gte(ordersTable.createdAt, monthStart))),
    // Earned = shipped + delivered (all time). Use updatedAt so marking shipped
    // this month counts even if the order was placed earlier.
    db.select({ total: sql<number>`coalesce(sum(${orderAmountSql}), 0)` })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(ordersTable.projectId, projectsTable.id))
      .where(and(notHiddenUser, earnedStatuses)),
    db.select({ total: sql<number>`coalesce(sum(${orderAmountSql}), 0)` })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(ordersTable.projectId, projectsTable.id))
      .where(and(notHiddenUser, earnedStatuses, gte(ordersTable.updatedAt, monthStart))),
    db.select({ count: count() }).from(usersTable).where(and(notHiddenUser, gte(usersTable.createdAt, todayStart))),
    db.select({ count: count() }).from(usersTable).where(and(notHiddenUser, gte(usersTable.createdAt, weekAgo))),
    db.select({ count: sql<number>`count(distinct ip)` }).from(siteAnalyticsTable).where(sql`${siteAnalyticsTable.event} = 'page_view' AND ${siteAnalyticsTable.createdAt} >= ${todayStart}`),
    db.select({ count: sql<number>`count(distinct ip)` }).from(siteAnalyticsTable).where(sql`${siteAnalyticsTable.event} = 'page_view' AND ${siteAnalyticsTable.createdAt} >= ${weekAgo}`),
    db.select({ count: sql<number>`count(distinct ip)` }).from(siteAnalyticsTable).where(sql`${siteAnalyticsTable.event} = 'page_view' AND ${siteAnalyticsTable.createdAt} >= ${monthStart}`),
    db.select({ count: count() }).from(siteAnalyticsTable).where(sql`${siteAnalyticsTable.event} = 'wp_click'`),
  ]);

  // These four don't depend on each other or on the batch above — run them
  // concurrently instead of paying for four sequential round trips.
  const [recentOrders, recentUsers, chartRows, regRows] = await Promise.all([
    db
      .select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        projectId: ordersTable.projectId,
        status: ordersTable.status,
        priceLek: sql<number>`${orderAmountSql}`.as("price_lek"),
        notes: ordersTable.notes,
        createdAt: ordersTable.createdAt,
        userName: usersTable.name,
        userPhone: sql<string>`${usersTable.phone}`,
        projectTitle: projectsTable.title,
      })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(ordersTable.projectId, projectsTable.id))
      .where(notHiddenUser)
      .orderBy(desc(ordersTable.createdAt))
      .limit(10),

    db
      .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, email: usersTable.email, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(notHiddenUser)
      .orderBy(desc(usersTable.createdAt))
      .limit(6),

    // 30-day chart data
    db.execute(sql`
      SELECT
        date_trunc('day', created_at AT TIME ZONE 'UTC')::date::text AS date,
        count(distinct ip) FILTER (WHERE event = 'page_view') AS visitors,
        count(*) FILTER (WHERE event = 'wp_click') AS wp_clicks
      FROM site_analytics
      WHERE created_at >= now() - interval '29 days'
      GROUP BY date ORDER BY date ASC
    `),

    db.execute(sql`
      SELECT
        date_trunc('day', created_at AT TIME ZONE 'UTC')::date::text AS date,
        count(*) AS registrations
      FROM users
      WHERE created_at >= now() - interval '29 days'
        AND is_hidden = false
      GROUP BY date ORDER BY date ASC
    `),
  ]);

  const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  res.json({
    totalUsers: usersCount.count,
    totalOrders: ordersCount.count,
    totalProjects: projectsCount.count,
    ordersThisMonth: ordersMonth.count,
    // Back-compat: `revenue` = all-time non-cancelled pipeline
    revenue: toNum(revenue.total),
    revenueMonth: toNum(revenueMonth.total),
    // Money actually earned once shipped/delivered
    earned: toNum(earned.total),
    earnedMonth: toNum(earnedMonth.total),
    usersToday: toNum(usersToday.count),
    usersWeek: toNum(usersWeek.count),
    visitorsToday: toNum(visitorsToday.count),
    visitorsWeek: toNum(visitorsWeek.count),
    visitorsMonth: toNum(visitorsMonth.count),
    wpClicksTotal: toNum(wpClicksTotal.count),
    recentOrders,
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone ?? null,
      email: publicAdminEmail(u.email),
      createdAt: u.createdAt,
    })),
    chartData: chartRows.rows,
    regChartData: regRows.rows,
  });
});

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  const searchClause = search
    ? or(ilike(usersTable.name, `%${search}%`), sql`${(usersTable as any).phone} ILIKE ${'%' + search + '%'}`)
    : undefined;
  // Hidden accounts (e.g. the auto-provisioned super-admin) never appear in this list.
  const whereClause = searchClause ? and(searchClause, notHiddenUser) : notHiddenUser;

  const [users, [total]] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: sql<string>`${(usersTable as any).phone}`,
        role: usersTable.role,
        isBanned: usersTable.isBanned,
        lastLoginAt: usersTable.lastLoginAt,
        adminNote: (usersTable as any).adminNote,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(usersTable.createdAt)),
    db.select({ count: count() }).from(usersTable).where(whereClause),
  ]);

  // Fetch order/project counts per user — these two lookups are independent
  // of each other, so run them concurrently rather than back-to-back.
  const userIds = users.map((u) => u.id);
  let orderCounts: Record<number, number> = {};
  let projectCounts: Record<number, number> = {};
  if (userIds.length > 0) {
    const [oCounts, pCounts] = await Promise.all([
      db.execute(sql`
        SELECT user_id, count(*)::int AS cnt FROM orders WHERE user_id = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]`)}) GROUP BY user_id
      `),
      db.execute(sql`
        SELECT user_id, count(*)::int AS cnt FROM projects WHERE user_id = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]`)}) GROUP BY user_id
      `),
    ]);
    for (const r of oCounts.rows as any[]) orderCounts[r.user_id] = r.cnt;
    for (const r of pCounts.rows as any[]) projectCounts[r.user_id] = r.cnt;
  }

  const enriched = users.map((u) => ({
    ...u,
    email: publicAdminEmail(u.email) ?? "",
    orderCount: orderCounts[u.id] || 0,
    projectCount: projectCounts[u.id] || 0,
  }));

  res.json({ data: enriched, total: total.count, page, limit });
});

// POST /admin/users — create user. Regular users are created by phone (matching public
// registration); admins can instead be created by email since they don't need the phone
// login flow — useful for staff/back-office accounts that shouldn't have a public phone tied to them.
router.post("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { phone, email, name, password, role = "user" } = req.body;
  if (!password) {
    res.status(400).json({ error: "Password is required" });
    return;
  }
  if (!phone && !email) {
    res.status(400).json({ error: "Either a phone number or an email is required" });
    return;
  }
  if (phone && !/^\+\d{6,15}$/.test(phone)) {
    res.status(400).json({ error: "Invalid phone number format (e.g. +35568123456)" });
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(
      phone && email
        ? or(eq((usersTable as any).phone, phone), eq(usersTable.email, email))
        : phone
          ? eq((usersTable as any).phone, phone)
          : eq(usersTable.email, email),
    );
  if (existing.length > 0) {
    res.status(409).json({ error: phone ? "Phone number already registered" : "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  // Email-only accounts (typically admins) use the email as-is; phone accounts still
  // need a synthetic email to satisfy the NOT NULL/unique constraint on that column.
  const finalEmail = email || `${phone.replace(/\D/g, "")}@ph.local`;
  const [user] = await db
    .insert(usersTable)
    .values({ email: finalEmail, phone: (phone || null) as any, name: name || null, passwordHash, role, emailVerified: true })
    .returning({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, isBanned: usersTable.isBanned, createdAt: usersTable.createdAt,
    });
  res.status(201).json({ ...user, phone: phone || null });
});

// PATCH /admin/users/:userId
router.patch(
  "/admin/users/:userId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const userId = parseInt(raw, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const { name, email, phone, role, emailVerified, isBanned, adminNote, password } = req.body;

    if (!(await findVisibleUser(userId))) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (password !== undefined && password !== null && password !== "") {
      if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }
      if (password.length > 128) {
        res.status(400).json({ error: "Password is too long" });
        return;
      }
    }

    if (phone !== undefined && phone !== null && phone !== "" && !/^\+\d{6,15}$/.test(phone)) {
      res.status(400).json({ error: "Invalid phone number format (e.g. +35568123456)" });
      return;
    }
    // Empty / omitted email is fine (phone-only members). Only validate when a real value is sent.
    const emailProvided = email !== undefined && email !== null && String(email).trim() !== "";
    if (emailProvided && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }
    if (emailProvided && isSyntheticPhoneEmail(String(email).trim())) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    const [current] = await db
      .select({
        email: usersTable.email,
        phone: usersTable.phone,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!current) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const nextPhone =
      phone !== undefined ? (phone || null) : (current.phone as string | null);
    const nextEmail = emailProvided
      ? String(email).trim().toLowerCase()
      : isSyntheticPhoneEmail(current.email) && nextPhone
        ? phoneLocalEmail(nextPhone)
        : current.email;

    // Pre-check for conflicts with OTHER users (same convention as user creation) —
    // excludes the user being edited so re-saving their own unchanged value doesn't 409.
    const conflictConds = [];
    if (nextEmail !== current.email) conflictConds.push(eq(usersTable.email, nextEmail));
    if (nextPhone && nextPhone !== current.phone) {
      conflictConds.push(eq(usersTable.phone, nextPhone));
    }
    if (conflictConds.length > 0) {
      const existing = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(ne(usersTable.id, userId), or(...conflictConds)))
        .limit(1);
      if (existing.length > 0) {
        res.status(409).json({
          error: nextEmail !== current.email ? "Email already registered" : "Phone number already registered",
        });
        return;
      }
    }

    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (nextEmail !== current.email) updates.email = nextEmail;
    if (phone !== undefined) updates.phone = nextPhone;
    if (role !== undefined) updates.role = role;
    if (emailVerified !== undefined) updates.emailVerified = emailVerified;
    if (isBanned !== undefined) {
      const nextBanned = Boolean(isBanned);
      if (nextBanned && userId === req.user!.id) {
        res.status(400).json({ error: "You cannot ban your own account" });
        return;
      }
      updates.isBanned = nextBanned;
      // Kick them out: revoke refresh session so they can't mint a new access token.
      if (nextBanned) {
        updates.refreshToken = null;
      }
    }
    if (adminNote !== undefined) (updates as any).adminNote = adminNote || null;

    // Admin-set password: hash with bcrypt (12) and kill all existing sessions.
    if (typeof password === "string" && password.length >= 8) {
      updates.passwordHash = await hashPassword(password);
      updates.refreshToken = null;
      updates.resetPasswordToken = null;
      updates.resetPasswordExpires = null;
      updates.failedLoginAttempts = 0;
      updates.lockedUntil = null;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No updates provided" });
      return;
    }

    let user: any;
    try {
      [user] = await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.id, userId))
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          phone: usersTable.phone,
          role: usersTable.role,
          isBanned: usersTable.isBanned,
          adminNote: (usersTable as any).adminNote,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
        });
    } catch (err: any) {
      const code = err?.code ?? err?.cause?.code;
      if (code === "23505") {
        res.status(409).json({ error: "Email or phone number already registered" });
        return;
      }
      throw err;
    }

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    invalidateCachedUser(userId);
    if (typeof password === "string" && password.length >= 8) {
      logger.info({ userId, adminId: req.user!.id }, "Admin reset user password");
    }
    res.json({ ...user, email: publicAdminEmail(user.email) ?? "" });
  },
);

// DELETE /admin/users/:userId
router.delete(
  "/admin/users/:userId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const userId = parseInt(raw, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    if (!(await findVisibleUser(userId))) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  },
);

// GET /admin/orders
router.get("/admin/orders", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const status = req.query.status as string | undefined;
  const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
  const offset = (page - 1) * limit;

  const clauses = [notHiddenUser];
  if (status) clauses.push(eq(ordersTable.status, status as typeof ordersTable.status._.data));
  if (userId && !isNaN(userId)) clauses.push(eq(ordersTable.userId, userId));
  const whereClause = and(...clauses);

  const [orders, [total]] = await Promise.all([
    db
      .select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        projectId: ordersTable.projectId,
        status: ordersTable.status,
        priceLek: ordersTable.priceLek,
        notes: ordersTable.notes,
        adminNote: (ordersTable as any).adminNote,
        createdAt: ordersTable.createdAt,
        userName: usersTable.name,
        userPhone: sql<string>`${usersTable.phone}`,
        projectTitle: projectsTable.title,
        projectPageCount: projectsTable.pageCount,
        pdfUrl: projectsTable.pdfUrl,
      })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(ordersTable.projectId, projectsTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(ordersTable.createdAt)),
    db.select({ count: count() })
      .from(ordersTable)
      .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(whereClause),
  ]);

  res.json({ data: orders, total: total.count, page, limit });
});

// DELETE /admin/orders/:orderId/pdf — clear PDF for an order's project
router.delete(
  "/admin/orders/:orderId/pdf",
  requireAdmin,
  async (req, res): Promise<void> => {
    const orderId = parseInt(req.params.orderId as string, 10);
    if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order ID" }); return; }
    const [order] = await db.select({ projectId: ordersTable.projectId }).from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    // Clear URL + delete the file so the next View/Generate can't serve a
    // stale print PDF. Never demote status to draft — ordered projects must
    // stay ordered for delete protection and pending-book accounting.
    deleteProjectPdfFile(order.projectId);
    await db
      .update(projectsTable)
      .set({ pdfUrl: null })
      .where(eq(projectsTable.id, order.projectId));
    res.json({ success: true });
  },
);

// POST /admin/orders/:orderId/regenerate-pdf — re-queue print PDF (e.g. after
// a failed generation left pdfUrl null while the order row exists).
router.post(
  "/admin/orders/:orderId/regenerate-pdf",
  requireAdmin,
  async (req, res): Promise<void> => {
    const orderId = parseInt(req.params.orderId as string, 10);
    if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order ID" }); return; }
    const [order] = await db
      .select({ projectId: ordersTable.projectId })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    // Ensure checkout status sticks even if an older PDF job demoted it.
    await db
      .update(projectsTable)
      .set({ status: "ordered" })
      .where(eq(projectsTable.id, order.projectId));

    try {
      await queueProjectPdfGeneration(order.projectId);
    } catch (err) {
      const isCap = err instanceof Error && err.message.startsWith("TOO_MANY_CONCURRENT_PDFS");
      if (!isCap) logger.error({ err, orderId, projectId: order.projectId }, "Admin PDF regenerate failed");
      res.status(isCap ? 429 : 400).json({
        error: isCap
          ? "Too many PDFs generating right now. Try again in a moment."
          : "Unable to queue PDF generation",
      });
      return;
    }
    res.json({ success: true, status: "generating" });
  },
);

// PATCH /admin/orders/:orderId
router.patch(
  "/admin/orders/:orderId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.orderId)
      ? req.params.orderId[0]
      : req.params.orderId;
    const orderId = parseInt(raw, 10);
    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const { status, notes, adminNote } = req.body;
    const updates: Partial<typeof ordersTable.$inferInsert> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (adminNote !== undefined) (updates as any).adminNote = adminNote || null;

    const [order] = await db
      .update(ordersTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId))
      .returning();

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json(order);
  },
);

// DELETE /admin/orders/:orderId — permanently remove the order (not soft-cancel).
// Also unlocks the linked project back to draft and deletes any print PDF.
router.delete(
  "/admin/orders/:orderId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const orderId = parseInt(req.params.orderId as string, 10);
    if (isNaN(orderId)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const [order] = await db
      .select({
        id: ordersTable.id,
        projectId: ordersTable.projectId,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await db.delete(ordersTable).where(eq(ordersTable.id, orderId));

    // Free the album so the customer can edit / re-order it.
    deleteProjectPdfFile(order.projectId);
    await db
      .update(projectsTable)
      .set({ status: "draft", pdfUrl: null, updatedAt: new Date() })
      .where(eq(projectsTable.id, order.projectId));

    invalidatePendingBooksLimitCache();

    res.json({ success: true });
  },
);

// GET /admin/categories
router.get(
  "/admin/categories",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(categoriesTable.sortOrder);
    res.json(categories);
  },
);

// POST /admin/categories
router.post(
  "/admin/categories",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { slug, nameAl, nameEn, iconEmoji, coverImage, sortOrder, isActive } =
      req.body;
    if (!slug || !nameAl || !nameEn || !iconEmoji) {
      res.status(400).json({ error: "slug, nameAl, nameEn, iconEmoji required" });
      return;
    }

    const [cat] = await db
      .insert(categoriesTable)
      .values({ slug, nameAl, nameEn, iconEmoji, coverImage, sortOrder: sortOrder ?? 0, isActive: isActive ?? true })
      .returning();

    res.status(201).json(cat);
  },
);

// PATCH /admin/categories/:categoryId
router.patch(
  "/admin/categories/:categoryId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.categoryId)
      ? req.params.categoryId[0]
      : req.params.categoryId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    // Whitelist updatable fields — prevent mass assignment
    const { slug, nameAl, nameEn, iconEmoji, coverImage, sortOrder, isActive } = req.body;
    const patch: Record<string, unknown> = {};
    if (slug      !== undefined) patch.slug      = String(slug);
    if (nameAl    !== undefined) patch.nameAl    = String(nameAl);
    if (nameEn    !== undefined) patch.nameEn    = String(nameEn);
    if (iconEmoji !== undefined) patch.iconEmoji = String(iconEmoji);
    if (coverImage  !== undefined) patch.coverImage  = coverImage  ? String(coverImage)  : null;
    if (sortOrder !== undefined) patch.sortOrder = Number(sortOrder);
    if (isActive  !== undefined) patch.isActive  = Boolean(isActive);
    if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }

    const [cat] = await db
      .update(categoriesTable)
      .set(patch)
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!cat) { res.status(404).json({ error: "Not found" }); return; }
    res.json(cat);
  },
);

// DELETE /admin/categories/:categoryId
router.delete(
  "/admin/categories/:categoryId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.categoryId)
      ? req.params.categoryId[0]
      : req.params.categoryId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ success: true });
  },
);

// POST /admin/subcategories
router.post(
  "/admin/subcategories",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { categoryId, slug, nameAl, nameEn, previewImage, sortOrder, isActive } = req.body;
    if (!categoryId || !slug || !nameAl || !nameEn) {
      res.status(400).json({ error: "categoryId, slug, nameAl, nameEn required" });
      return;
    }
    const [sub] = await db
      .insert(subcategoriesTable)
      .values({ categoryId, slug, nameAl, nameEn, previewImage, sortOrder: sortOrder ?? 0, isActive: isActive ?? true })
      .returning();
    res.status(201).json(sub);
  },
);

// PATCH /admin/subcategories/:subcategoryId
router.patch(
  "/admin/subcategories/:subcategoryId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.subcategoryId)
      ? req.params.subcategoryId[0]
      : req.params.subcategoryId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { categoryId, slug, nameAl, nameEn, previewImage, sortOrder, isActive } = req.body;
    const patch: Record<string, unknown> = {};
    if (categoryId    !== undefined) patch.categoryId    = Number(categoryId);
    if (slug          !== undefined) patch.slug          = String(slug);
    if (nameAl        !== undefined) patch.nameAl        = String(nameAl);
    if (nameEn        !== undefined) patch.nameEn        = String(nameEn);
    if (previewImage  !== undefined) patch.previewImage  = previewImage ? String(previewImage) : null;
    if (sortOrder     !== undefined) patch.sortOrder     = Number(sortOrder);
    if (isActive      !== undefined) patch.isActive      = Boolean(isActive);
    if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }

    const [sub] = await db
      .update(subcategoriesTable)
      .set(patch)
      .where(eq(subcategoriesTable.id, id))
      .returning();
    if (!sub) { res.status(404).json({ error: "Not found" }); return; }
    res.json(sub);
  },
);

// DELETE /admin/subcategories/:subcategoryId
router.delete(
  "/admin/subcategories/:subcategoryId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.subcategoryId)
      ? req.params.subcategoryId[0]
      : req.params.subcategoryId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, id));
    res.json({ success: true });
  },
);

// GET /admin/templates
router.get(
  "/admin/templates",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const templates = await db.select().from(templatesTable);
    res.json(templates);
  },
);

// POST /admin/templates
router.post(
  "/admin/templates",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { subcategoryId, nameAl, nameEn, coverImageUrl, backCoverImageUrl, themeColors, fonts, isActive } = req.body;
    if (!subcategoryId || !nameAl || !nameEn || !coverImageUrl) {
      res.status(400).json({ error: "subcategoryId, nameAl, nameEn, coverImageUrl required" });
      return;
    }
    const [template] = await db
      .insert(templatesTable)
      .values({ subcategoryId, nameAl, nameEn, coverImageUrl, backCoverImageUrl, themeColors: themeColors || [], fonts: fonts || [], isActive: isActive ?? true })
      .returning();
    res.status(201).json(template);
  },
);

// PATCH /admin/templates/:templateId
router.patch(
  "/admin/templates/:templateId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.templateId)
      ? req.params.templateId[0]
      : req.params.templateId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const { subcategoryId, nameAl, nameEn, coverImageUrl, backCoverImageUrl, themeColors, fonts, isActive } = req.body;
    const patch: Record<string, unknown> = {};
    if (subcategoryId    !== undefined) patch.subcategoryId    = Number(subcategoryId);
    if (nameAl           !== undefined) patch.nameAl           = String(nameAl);
    if (nameEn           !== undefined) patch.nameEn           = String(nameEn);
    if (coverImageUrl    !== undefined) patch.coverImageUrl    = String(coverImageUrl);
    if (backCoverImageUrl !== undefined) patch.backCoverImageUrl = backCoverImageUrl ? String(backCoverImageUrl) : null;
    if (themeColors      !== undefined) patch.themeColors      = Array.isArray(themeColors) ? themeColors : [];
    if (fonts            !== undefined) patch.fonts            = Array.isArray(fonts) ? fonts : [];
    if (isActive         !== undefined) patch.isActive         = Boolean(isActive);
    if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No valid fields" }); return; }

    const [template] = await db
      .update(templatesTable)
      .set(patch)
      .where(eq(templatesTable.id, id))
      .returning();
    if (!template) { res.status(404).json({ error: "Not found" }); return; }
    res.json(template);
  },
);

// DELETE /admin/templates/:templateId
router.delete(
  "/admin/templates/:templateId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.templateId)
      ? req.params.templateId[0]
      : req.params.templateId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(templatesTable).where(eq(templatesTable.id, id));
    res.json({ success: true });
  },
);

// GET /admin/settings
router.get(
  "/admin/settings",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(appSettingsTable);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    let hiddenDesignIds: string[] = [];
    try { hiddenDesignIds = JSON.parse(map["hidden_design_ids"] || "[]"); } catch { hiddenDesignIds = []; }
    let designOverrides: Record<string, unknown> = {};
    try { designOverrides = JSON.parse(map["design_overrides"] || "{}"); } catch { designOverrides = {}; }
    let customDesigns: unknown[] = [];
    try { customDesigns = JSON.parse(map["custom_designs"] || "[]"); } catch { customDesigns = []; }

    res.json({
      whatsappNumber: map["whatsapp_number"] || "+355688755833",
      basePriceLek: parseInt(map["base_price_lek"] || "3100", 10),
      minPages: parseInt(map["min_pages"] || "30", 10),
      extraSpreadPriceLek: parseInt(map["extra_spread_price_lek"] || "200", 10),
      siteName: map["site_name"] || "Përgjithmonë",
      siteTaglineAl: map["site_tagline_al"] || "Kujtimet tua, përgjithmonë",
      siteTaglineEn: map["site_tagline_en"] || "Your memories, forever kept",
      maintenanceMode: map["maintenance_mode"] === "true",
      maintenanceMessageAl: map["maintenance_message_al"] || "Jemi duke bërë mirëmbajtje. Do të kthehemi së shpejti.",
      maintenanceMessageEn: map["maintenance_message_en"] || "We're performing maintenance. We'll be back soon.",
      bookCreationEnabled: map["book_creation_enabled"] !== "false",
      bookDisabledNoticeAl: map["book_disabled_notice_al"] || "Krijimi i albumeve është përkohësisht i ndalur.",
      bookDisabledNoticeEn: map["book_disabled_notice_en"] || "Book creation is temporarily unavailable.",
      hiddenDesignIds,
      designOverrides,
      customDesigns,
      requireLoginForPdf: map["require_login_for_pdf"] === "true",
      pendingBooksLimitEnabled: map["pending_books_limit_enabled"] !== "false",
      pendingBooksLimit: parseInt(map["pending_books_limit"] || "10", 10),
      ...readSecuritySettings(map),
    });
  },
);

// PATCH /admin/settings
router.patch(
  "/admin/settings",
  requireAdmin,
  async (req, res): Promise<void> => {
    const keyMap: Record<string, string> = {
      whatsappNumber: "whatsapp_number",
      basePriceLek: "base_price_lek",
      minPages: "min_pages",
      extraSpreadPriceLek: "extra_spread_price_lek",
      siteName: "site_name",
      siteTaglineAl: "site_tagline_al",
      siteTaglineEn: "site_tagline_en",
      maintenanceMode: "maintenance_mode",
      maintenanceMessageAl: "maintenance_message_al",
      maintenanceMessageEn: "maintenance_message_en",
      bookCreationEnabled: "book_creation_enabled",
      bookDisabledNoticeAl: "book_disabled_notice_al",
      bookDisabledNoticeEn: "book_disabled_notice_en",
      hiddenDesignIds: "hidden_design_ids",
      designOverrides: "design_overrides",
      customDesigns: "custom_designs",
      requireLoginForPdf: "require_login_for_pdf",
      pendingBooksLimitEnabled: "pending_books_limit_enabled",
      pendingBooksLimit: "pending_books_limit",
      ...SECURITY_SETTINGS_KEY_MAP,
    };

    for (const [jsKey, dbKey] of Object.entries(keyMap)) {
      if (req.body[jsKey] !== undefined) {
        const raw = req.body[jsKey];
        let value: string;
        if (typeof raw === "string") value = raw;
        else if (Array.isArray(raw) || (raw && typeof raw === "object")) value = JSON.stringify(raw);
        else value = String(raw);

        // Soft QA limits for custom cover designs
        if (jsKey === "customDesigns") {
          let list: unknown[] = [];
          try { list = typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); } catch {
            res.status(400).json({ error: "customDesigns must be a JSON array" });
            return;
          }
          if (list.length > 80) {
            res.status(400).json({ error: "Too many custom designs (max 80)" });
            return;
          }
          for (const item of list) {
            if (!item || typeof item !== "object") {
              res.status(400).json({ error: "Invalid custom design entry" });
              return;
            }
            const d = item as Record<string, unknown>;
            if (typeof d.id !== "string" || !d.id.startsWith("custom-")) {
              res.status(400).json({ error: "Custom design id must start with custom-" });
              return;
            }
            const front = Array.isArray(d.frontElements) ? d.frontElements : [];
            const back = Array.isArray(d.backElements) ? d.backElements : [];
            if (front.length > 80 || back.length > 80) {
              res.status(400).json({ error: "A cover can have at most 80 elements" });
              return;
            }
          }
          value = JSON.stringify(list);
        }

        await db
          .insert(appSettingsTable)
          .values({ key: dbKey, value })
          .onConflictDoUpdate({ target: appSettingsTable.key, set: { value } });
      }
    }
    invalidateSecuritySettingsCache();

    const rows2 = await db.select().from(appSettingsTable);
    const map2: Record<string, string> = {};
    for (const row of rows2) map2[row.key] = row.value;
    let hiddenDesignIds2: string[] = [];
    try { hiddenDesignIds2 = JSON.parse(map2["hidden_design_ids"] || "[]"); } catch { hiddenDesignIds2 = []; }
    let designOverrides2: Record<string, unknown> = {};
    try { designOverrides2 = JSON.parse(map2["design_overrides"] || "{}"); } catch { designOverrides2 = {}; }
    let customDesigns2: unknown[] = [];
    try { customDesigns2 = JSON.parse(map2["custom_designs"] || "[]"); } catch { customDesigns2 = []; }

    res.json({
      whatsappNumber: map2["whatsapp_number"] || "+355688755833",
      basePriceLek: parseInt(map2["base_price_lek"] || "3100", 10),
      minPages: parseInt(map2["min_pages"] || "30", 10),
      extraSpreadPriceLek: parseInt(map2["extra_spread_price_lek"] || "200", 10),
      siteName: map2["site_name"] || "Përgjithmonë",
      siteTaglineAl: map2["site_tagline_al"] || "Kujtimet tua, përgjithmonë",
      siteTaglineEn: map2["site_tagline_en"] || "Your memories, forever kept",
      maintenanceMode: map2["maintenance_mode"] === "true",
      maintenanceMessageAl: map2["maintenance_message_al"] || "Jemi duke bërë mirëmbajtje. Do të kthehemi së shpejti.",
      maintenanceMessageEn: map2["maintenance_message_en"] || "We're performing maintenance. We'll be back soon.",
      bookCreationEnabled: map2["book_creation_enabled"] !== "false",
      bookDisabledNoticeAl: map2["book_disabled_notice_al"] || "Krijimi i albumeve është përkohësisht i ndalur.",
      bookDisabledNoticeEn: map2["book_disabled_notice_en"] || "Book creation is temporarily unavailable.",
      hiddenDesignIds: hiddenDesignIds2,
      designOverrides: designOverrides2,
      customDesigns: customDesigns2,
      requireLoginForPdf: map2["require_login_for_pdf"] === "true",
      pendingBooksLimitEnabled: map2["pending_books_limit_enabled"] !== "false",
      pendingBooksLimit: parseInt(map2["pending_books_limit"] || "10", 10),
      ...readSecuritySettings(map2),
    });

    // Settings are cached in-process by the projects route (5 min TTL) —
    // drop it immediately so a lowered/raised/toggled limit takes effect
    // on the very next book-creation request instead of up to 5 min later.
    invalidatePendingBooksLimitCache();
  },
);

// ── IP blocklist ─────────────────────────────────────────────────────────
// GET /admin/ip-blocklist
router.get(
  "/admin/ip-blocklist",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const entries = await db
      .select()
      .from(ipBlocklistTable)
      .orderBy(desc(ipBlocklistTable.createdAt));
    res.json(entries);
  },
);

// POST /admin/ip-blocklist
router.post(
  "/admin/ip-blocklist",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { ip, reason } = req.body;
    if (!ip || typeof ip !== "string") {
      res.status(400).json({ error: "ip is required" });
      return;
    }
    const [entry] = await db
      .insert(ipBlocklistTable)
      .values({ ip: ip.trim(), reason: reason || null })
      .returning();
    invalidateIpBlocklistCache();
    res.status(201).json(entry);
  },
);

// DELETE /admin/ip-blocklist/:id
router.delete(
  "/admin/ip-blocklist/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [deleted] = await db
      .delete(ipBlocklistTable)
      .where(eq(ipBlocklistTable.id, id))
      .returning({ id: ipBlocklistTable.id });
    invalidateIpBlocklistCache();
    if (!deleted) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.json({ success: true });
  },
);

// ── Security visibility ───────────────────────────────────────────────────
// GET /admin/security/events — recent 429 (rate-limited) and blocked-IP hits,
// so the site owner can see abuse attempts without a dedicated events table.
router.get(
  "/admin/security/events",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const events = await db
      .select({
        id: siteAnalyticsTable.id,
        ip: siteAnalyticsTable.ip,
        path: siteAnalyticsTable.path,
        event: siteAnalyticsTable.event,
        createdAt: siteAnalyticsTable.createdAt,
      })
      .from(siteAnalyticsTable)
      .where(inArray(siteAnalyticsTable.event, ["rate_limited", "blocked_ip"]))
      .orderBy(desc(siteAnalyticsTable.createdAt))
      .limit(100);
    res.json(events);
  },
);

// GET /admin/layouts
router.get(
  "/admin/layouts",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const layouts = await db.select().from(layoutsTable);
    res.json(layouts);
  },
);

// POST /admin/layouts
router.post(
  "/admin/layouts",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { slug, nameAl, nameEn, gridDefinitionJson, previewIcon, isActive } = req.body;
    if (!slug || !nameAl || !nameEn || !gridDefinitionJson) {
      res.status(400).json({ error: "slug, nameAl, nameEn, gridDefinitionJson required" });
      return;
    }
    const [layout] = await db
      .insert(layoutsTable)
      .values({ slug, nameAl, nameEn, gridDefinitionJson, previewIcon, isActive: isActive ?? true })
      .returning();
    res.status(201).json(layout);
  },
);

// PATCH /admin/layouts/:layoutId
router.patch(
  "/admin/layouts/:layoutId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.layoutId)
      ? req.params.layoutId[0]
      : req.params.layoutId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [layout] = await db
      .update(layoutsTable)
      .set(req.body)
      .where(eq(layoutsTable.id, id))
      .returning();
    if (!layout) { res.status(404).json({ error: "Not found" }); return; }
    res.json(layout);
  },
);

// DELETE /admin/layouts/:layoutId
router.delete(
  "/admin/layouts/:layoutId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.layoutId)
      ? req.params.layoutId[0]
      : req.params.layoutId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(layoutsTable).where(eq(layoutsTable.id, id));
    res.json({ success: true });
  },
);

// GET /admin/book-sizes
router.get(
  "/admin/book-sizes",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const sizes = await db.select().from(bookSizesTable);
    res.json(
      sizes.map((s) => ({
        ...s,
        widthCm: parseFloat(s.widthCm as string),
        heightCm: parseFloat(s.heightCm as string),
      })),
    );
  },
);

// POST /admin/book-sizes
router.post(
  "/admin/book-sizes",
  requireAdmin,
  async (req, res): Promise<void> => {
    const { widthCm, heightCm, label, priceBase, minPages, pricePerExtraSpread, isActive } = req.body;
    if (!widthCm || !heightCm || !label || !priceBase) {
      res.status(400).json({ error: "widthCm, heightCm, label, priceBase required" });
      return;
    }
    const [size] = await db
      .insert(bookSizesTable)
      .values({ widthCm: String(widthCm), heightCm: String(heightCm), label, priceBase, minPages: minPages ?? 30, pricePerExtraSpread: pricePerExtraSpread ?? 200, isActive: isActive ?? true })
      .returning();
    res.status(201).json({ ...size, widthCm: parseFloat(size.widthCm as string), heightCm: parseFloat(size.heightCm as string) });
  },
);

// PATCH /admin/book-sizes/:sizeId
router.patch(
  "/admin/book-sizes/:sizeId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.sizeId)
      ? req.params.sizeId[0]
      : req.params.sizeId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const updates = { ...req.body };
    if (updates.widthCm) updates.widthCm = String(updates.widthCm);
    if (updates.heightCm) updates.heightCm = String(updates.heightCm);
    const [size] = await db
      .update(bookSizesTable)
      .set(updates)
      .where(eq(bookSizesTable.id, id))
      .returning();
    if (!size) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...size, widthCm: parseFloat(size.widthCm as string), heightCm: parseFloat(size.heightCm as string) });
  },
);

// DELETE /admin/book-sizes/:sizeId
router.delete(
  "/admin/book-sizes/:sizeId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.sizeId)
      ? req.params.sizeId[0]
      : req.params.sizeId;
    const id = parseInt(raw, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(bookSizesTable).where(eq(bookSizesTable.id, id));
    res.json({ success: true });
  },
);

// GET /admin/projects
router.get(
  "/admin/projects",
  requireAdmin,
  async (req, res): Promise<void> => {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const offset = (page - 1) * limit;

    // Join user + book size in the single listing query instead of looking
    // each one up per row — the previous version returned bare projects and
    // left any consumer wanting the owner's name/book size to N+1-query it.
    const [projects, [total]] = await Promise.all([
      db
        .select({
          id: projectsTable.id,
          userId: projectsTable.userId,
          templateId: projectsTable.templateId,
          bookSizeId: projectsTable.bookSizeId,
          title: projectsTable.title,
          status: projectsTable.status,
          pdfUrl: projectsTable.pdfUrl,
          shareToken: projectsTable.shareToken,
          pageCount: projectsTable.pageCount,
          totalPriceLek: projectsTable.totalPriceLek,
          createdAt: projectsTable.createdAt,
          updatedAt: projectsTable.updatedAt,
          userName: usersTable.name,
          userEmail: usersTable.email,
          bookSizeLabel: bookSizesTable.label,
        })
        .from(projectsTable)
        .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
        .leftJoin(bookSizesTable, eq(projectsTable.bookSizeId, bookSizesTable.id))
        .where(notHiddenUser)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(projectsTable.createdAt)),
      db.select({ count: count() })
        .from(projectsTable)
        .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
        .where(notHiddenUser),
    ]);

    res.json({ data: projects, total: total.count, page, limit });
  },
);

export default router;
