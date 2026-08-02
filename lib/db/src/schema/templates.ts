import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subcategoriesTable } from "./categories";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  subcategoryId: integer("subcategory_id")
    .notNull()
    .references(() => subcategoriesTable.id, { onDelete: "cascade" }),
  nameAl: text("name_al").notNull(),
  nameEn: text("name_en").notNull(),
  coverImageUrl: text("cover_image_url").notNull(),
  backCoverImageUrl: text("back_cover_image_url"),
  themeColors: text("theme_colors").array().notNull().default([]),
  fonts: text("fonts").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
