import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A simple admin-managed IP blocklist. Enforced as early middleware in app.ts
// (via an in-memory cache — see lib/ipBlocklist.ts) so blocked IPs never reach
// any route, including auth/login.
export const ipBlocklistTable = pgTable(
  "ip_blocklist",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull().unique(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ip_blocklist_ip_idx").on(t.ip)],
);

export const insertIpBlocklistSchema = createInsertSchema(
  ipBlocklistTable,
).omit({ id: true, createdAt: true });
export type InsertIpBlocklist = z.infer<typeof insertIpBlocklistSchema>;
export type IpBlocklistEntry = typeof ipBlocklistTable.$inferSelect;
