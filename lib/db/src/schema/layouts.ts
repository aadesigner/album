import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const layoutsTable = pgTable("layouts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameAl: text("name_al").notNull(),
  nameEn: text("name_en").notNull(),
  previewIcon: text("preview_icon"),
  gridDefinitionJson: text("grid_definition_json").notNull(), // JSON string
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLayoutSchema = createInsertSchema(layoutsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLayout = z.infer<typeof insertLayoutSchema>;
export type Layout = typeof layoutsTable.$inferSelect;
