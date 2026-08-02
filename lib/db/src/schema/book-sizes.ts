import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookSizesTable = pgTable("book_sizes", {
  id: serial("id").primaryKey(),
  widthCm: numeric("width_cm", { precision: 5, scale: 2 }).notNull(),
  heightCm: numeric("height_cm", { precision: 5, scale: 2 }).notNull(),
  label: text("label").notNull(),
  priceBase: integer("price_base").notNull(), // in LEK
  pricePerExtraSpread: integer("price_per_extra_spread").notNull().default(0),
  minPages: integer("min_pages").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBookSizeSchema = createInsertSchema(bookSizesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBookSize = z.infer<typeof insertBookSizeSchema>;
export type BookSize = typeof bookSizesTable.$inferSelect;
