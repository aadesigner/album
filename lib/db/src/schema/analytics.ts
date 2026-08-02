import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const siteAnalyticsTable = pgTable("site_analytics", {
  id: serial("id").primaryKey(),
  ip: text("ip"),
  path: text("path").notNull().default("/"),
  event: text("event").notNull().default("page_view"),
  country: text("country"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [
  // Dashboard charts group by day and filter by event (page_view / wp_click) —
  // this composite index covers both the WHERE and the date_trunc/ORDER BY.
  index("site_analytics_event_created_at_idx").on(t.event, t.createdAt),
]);

export type SiteAnalytics = typeof siteAnalyticsTable.$inferSelect;
