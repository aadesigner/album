import { Router, type IRouter } from "express";
import { db } from "@workspace/db-tsconfig";
import { categoriesTable, subcategoriesTable } from "@workspace/db-tsconfig";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// GET /categories
router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.isActive, true))
    .orderBy(asc(categoriesTable.sortOrder));
  res.json(categories);
});

// GET /categories/:categoryId/subcategories
router.get(
  "/categories/:categoryId/subcategories",
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.categoryId)
      ? req.params.categoryId[0]
      : req.params.categoryId;
    const categoryId = parseInt(raw, 10);
    if (isNaN(categoryId)) {
      res.status(400).json({ error: "Invalid category ID" });
      return;
    }

    const subcategories = await db
      .select()
      .from(subcategoriesTable)
      .where(eq(subcategoriesTable.categoryId, categoryId))
      .orderBy(asc(subcategoriesTable.sortOrder));

    res.json(subcategories);
  },
);

export default router;
