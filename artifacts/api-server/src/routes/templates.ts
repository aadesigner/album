import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { templatesTable, subcategoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// GET /templates
router.get("/templates", async (req, res): Promise<void> => {
  const subcategoryId = req.query.subcategoryId
    ? parseInt(req.query.subcategoryId as string, 10)
    : null;
  const categoryId = req.query.categoryId
    ? parseInt(req.query.categoryId as string, 10)
    : null;

  if (subcategoryId && !isNaN(subcategoryId)) {
    const templates = await db
      .select()
      .from(templatesTable)
      .where(
        and(
          eq(templatesTable.subcategoryId, subcategoryId),
          eq(templatesTable.isActive, true),
        ),
      );
    res.json(templates);
    return;
  }

  if (categoryId && !isNaN(categoryId)) {
    const templates = await db
      .select({
        id: templatesTable.id,
        subcategoryId: templatesTable.subcategoryId,
        nameAl: templatesTable.nameAl,
        nameEn: templatesTable.nameEn,
        coverImageUrl: templatesTable.coverImageUrl,
        backCoverImageUrl: templatesTable.backCoverImageUrl,
        themeColors: templatesTable.themeColors,
        fonts: templatesTable.fonts,
        isActive: templatesTable.isActive,
        createdAt: templatesTable.createdAt,
        updatedAt: templatesTable.updatedAt,
      })
      .from(templatesTable)
      .innerJoin(
        subcategoriesTable,
        eq(templatesTable.subcategoryId, subcategoriesTable.id),
      )
      .where(
        and(
          eq(subcategoriesTable.categoryId, categoryId),
          eq(templatesTable.isActive, true),
        ),
      );
    res.json(templates);
    return;
  }

  const templates = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.isActive, true));
  res.json(templates);
});

// GET /templates/:templateId
router.get("/templates/:templateId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.templateId)
    ? req.params.templateId[0]
    : req.params.templateId;
  const templateId = parseInt(raw, 10);
  if (isNaN(templateId)) {
    res.status(400).json({ error: "Invalid template ID" });
    return;
  }

  const [template] = await db
    .select()
    .from(templatesTable)
    .where(eq(templatesTable.id, templateId))
    .limit(1);

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(template);
});

export default router;
