import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { bookSizesTable } from "./book-sizes";
import { templatesTable } from "./templates";
import { layoutsTable } from "./layouts";

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "pdf_generating",
  "pdf_ready",
  "ordered",
]);

export const pageTypeEnum = pgEnum("page_type", [
  "front_cover",
  "inside_cover",
  "inner",
  "inside_back_cover",
  "back_cover",
]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  templateId: integer("template_id").references(() => templatesTable.id, {
    onDelete: "set null",
  }),
  bookSizeId: integer("book_size_id")
    .notNull()
    .references(() => bookSizesTable.id),
  title: text("title").notNull(),
  status: projectStatusEnum("status").notNull().default("draft"),
  pdfUrl: text("pdf_url"),
  shareToken: text("share_token").unique(),
  pageCount: integer("page_count").notNull().default(32),
  totalPriceLek: integer("total_price_lek").notNull().default(3100),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  index("projects_user_id_idx").on(t.userId),
]);

export const projectPagesTable = pgTable("project_pages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  pageType: pageTypeEnum("page_type").notNull(),
  layoutId: integer("layout_id").references(() => layoutsTable.id, {
    onDelete: "set null",
  }),
  contentJson: text("content_json").notNull().default("{}"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  index("project_pages_project_id_idx").on(t.projectId),
]);


export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const insertProjectPageSchema = createInsertSchema(
  projectPagesTable,
).omit({ id: true, updatedAt: true });
export type InsertProjectPage = z.infer<typeof insertProjectPageSchema>;
export type ProjectPage = typeof projectPagesTable.$inferSelect;
