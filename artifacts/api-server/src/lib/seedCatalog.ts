import { db } from "@workspace/db-tsconfig";
import {
  categoriesTable,
  subcategoriesTable,
  bookSizesTable,
  appSettingsTable,
} from "@workspace/db-tsconfig";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

/** Default catalog so a fresh Railway/Postgres deploy can show Create Album. */
const DEFAULT_CATEGORIES = [
  { slug: "dasme", nameAl: "Dasmë", nameEn: "Wedding", iconEmoji: "💍", sortOrder: 1 },
  { slug: "udhetime", nameAl: "Udhëtime", nameEn: "Travel", iconEmoji: "✈️", sortOrder: 2 },
  { slug: "familje", nameAl: "Familje", nameEn: "Family", iconEmoji: "👨‍👩‍👧‍👦", sortOrder: 3 },
  { slug: "ditelindje", nameAl: "Ditëlindje", nameEn: "Birthday", iconEmoji: "🎂", sortOrder: 4 },
  { slug: "miqesi", nameAl: "Miqësi", nameEn: "Friendship", iconEmoji: "🤝", sortOrder: 5 },
  { slug: "festash", nameAl: "Festash", nameEn: "Celebrations", iconEmoji: "🎉", sortOrder: 6 },
] as const;

const DEFAULT_SUBCATEGORIES: Array<{
  categorySlug: string;
  slug: string;
  nameAl: string;
  nameEn: string;
  sortOrder: number;
}> = [
  { categorySlug: "udhetime", slug: "paris", nameAl: "Paris", nameEn: "Paris", sortOrder: 1 },
  { categorySlug: "udhetime", slug: "rom", nameAl: "Romë", nameEn: "Rome", sortOrder: 2 },
  { categorySlug: "udhetime", slug: "londres", nameAl: "Londër", nameEn: "London", sortOrder: 3 },
  { categorySlug: "udhetime", slug: "tokio", nameAl: "Tokio", nameEn: "Tokyo", sortOrder: 4 },
  { categorySlug: "udhetime", slug: "plazh", nameAl: "Plazh", nameEn: "Beach", sortOrder: 5 },
  { categorySlug: "dasme", slug: "klasik", nameAl: "Klasik", nameEn: "Classic", sortOrder: 1 },
  { categorySlug: "dasme", slug: "romantik", nameAl: "Romantik", nameEn: "Romantic", sortOrder: 2 },
  { categorySlug: "dasme", slug: "floral", nameAl: "Floral", nameEn: "Floral", sortOrder: 3 },
  { categorySlug: "ditelindje", slug: "femije", nameAl: "Fëmijë", nameEn: "Kids", sortOrder: 1 },
  { categorySlug: "ditelindje", slug: "i-rritur", nameAl: "I rritur", nameEn: "Adult", sortOrder: 2 },
  { categorySlug: "familje", slug: "verore", nameAl: "Verore", nameEn: "Summer", sortOrder: 1 },
  { categorySlug: "familje", slug: "dimrore", nameAl: "Dimërore", nameEn: "Winter", sortOrder: 2 },
  { categorySlug: "miqesi", slug: "aventure", nameAl: "Aventurë", nameEn: "Adventure", sortOrder: 1 },
  { categorySlug: "festash", slug: "krishtlindje", nameAl: "Krishtlindje", nameEn: "Christmas", sortOrder: 1 },
];

const DEFAULT_BOOK_SIZES = [
  {
    widthCm: "21.00",
    heightCm: "21.00",
    label: "Katror",
    priceBase: 3100,
    pricePerExtraSpread: 100,
    minPages: 30,
  },
  {
    widthCm: "21.00",
    heightCm: "28.00",
    label: "Portret",
    priceBase: 3900,
    pricePerExtraSpread: 100,
    minPages: 30,
  },
] as const;

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  { key: "whatsapp_number", value: "+355688755833" },
  { key: "base_price_lek", value: "3100" },
  { key: "book_creation_enabled", value: "true" },
];

export async function seedCatalog(): Promise<void> {
  const existingCategories = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .limit(1);

  if (existingCategories.length === 0) {
    const inserted = await db
      .insert(categoriesTable)
      .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, isActive: true })))
      .returning({ id: categoriesTable.id, slug: categoriesTable.slug });

    const bySlug = new Map(inserted.map((c) => [c.slug, c.id]));
    const subRows = DEFAULT_SUBCATEGORIES.flatMap((s) => {
      const categoryId = bySlug.get(s.categorySlug);
      if (!categoryId) return [];
      return [
        {
          categoryId,
          slug: s.slug,
          nameAl: s.nameAl,
          nameEn: s.nameEn,
          sortOrder: s.sortOrder,
          isActive: true,
        },
      ];
    });
    if (subRows.length > 0) {
      await db.insert(subcategoriesTable).values(subRows);
    }
    logger.info(
      { categories: inserted.length, subcategories: subRows.length },
      "Seeded default categories",
    );
  }

  const existingSizes = await db.select().from(bookSizesTable);
  if (existingSizes.length === 0) {
    await db.insert(bookSizesTable).values(
      DEFAULT_BOOK_SIZES.map((s) => ({ ...s, isActive: true })),
    );
    logger.info({ count: DEFAULT_BOOK_SIZES.length }, "Seeded default book sizes");
  } else {
    // Keep labels/prices in sync with the product catalog on restart.
    for (const wanted of DEFAULT_BOOK_SIZES) {
      const match = existingSizes.find(
        (s) =>
          parseFloat(String(s.widthCm)) === parseFloat(wanted.widthCm) &&
          parseFloat(String(s.heightCm)) === parseFloat(wanted.heightCm),
      );
      if (!match) {
        await db.insert(bookSizesTable).values({ ...wanted, isActive: true });
        continue;
      }
      if (
        match.label !== wanted.label ||
        match.priceBase !== wanted.priceBase ||
        match.pricePerExtraSpread !== wanted.pricePerExtraSpread ||
        !match.isActive
      ) {
        await db
          .update(bookSizesTable)
          .set({
            label: wanted.label,
            priceBase: wanted.priceBase,
            pricePerExtraSpread: wanted.pricePerExtraSpread,
            isActive: true,
          })
          .where(eq(bookSizesTable.id, match.id));
      }
    }
  }

  for (const setting of DEFAULT_SETTINGS) {
    const [existing] = await db
      .select({ id: appSettingsTable.id })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, setting.key))
      .limit(1);
    if (!existing) {
      await db.insert(appSettingsTable).values(setting);
    }
  }
}
