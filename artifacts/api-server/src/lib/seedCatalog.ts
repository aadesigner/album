import { db } from "@workspace/db-tsconfig";
import {
  categoriesTable,
  subcategoriesTable,
  bookSizesTable,
  appSettingsTable,
  layoutsTable,
} from "@workspace/db-tsconfig";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { BUILTIN_LAYOUTS, RETIRED_LAYOUT_SLUGS } from "./builtinLayouts";
import { isPageContentSettingKey } from "./marketingPages";

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
    priceBase: 3000,
    pricePerExtraSpread: 100,
    minPages: 30,
  },
  {
    widthCm: "21.00",
    heightCm: "28.00",
    label: "Portret",
    priceBase: 3500,
    pricePerExtraSpread: 100,
    minPages: 30,
  },
] as const;

const DEFAULT_SETTINGS: Array<{ key: string; value: string }> = [
  { key: "whatsapp_number", value: "+355688755833" },
  { key: "base_price_lek", value: "3000" },
  { key: "book_creation_enabled", value: "true" },
  { key: "offer_bar_enabled", value: "true" },
  { key: "offer_bar_text_al", value: "Çmime më të lira se më parë — oferto speciale për albumin tuaj." },
  { key: "offer_bar_text_en", value: "Cheaper prices than before — a special offer on your album." },
  { key: "offer_bar_button_al", value: "Fillo tani" },
  { key: "offer_bar_button_en", value: "Start now" },
  { key: "offer_bar_href", value: "/krijo" },
  { key: "offer_bar_bg", value: "#8C3A2E" },
  { key: "offer_bar_text_color", value: "#FFF8F2" },
  { key: "offer_bar_button_bg", value: "#FFFFFF" },
  { key: "offer_bar_button_text", value: "#8C3A2E" },
  { key: "clarity_enabled", value: "false" },
  { key: "clarity_project_id", value: "" },
];

/**
 * Admin-owned JSON. Seed must never insert defaults for these — a redeploy
 * would otherwise risk wiping Design Studio / stickers / marketing pages.
 */
const PROTECTED_SETTING_KEYS = new Set([
  "design_overrides",
  "custom_designs",
  "hidden_design_ids",
  "editor_elements",
  "admin_notes",
]);

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

  const existingSizes = await db.select({ id: bookSizesTable.id }).from(bookSizesTable).limit(1);
  if (existingSizes.length === 0) {
    await db.insert(bookSizesTable).values(
      DEFAULT_BOOK_SIZES.map((s) => ({ ...s, isActive: true })),
    );
    logger.info({ count: DEFAULT_BOOK_SIZES.length }, "Seeded default book sizes");
  }

  for (const setting of DEFAULT_SETTINGS) {
    // Visual-editor JSON + Design Studio / stickers must survive deploys.
    if (isPageContentSettingKey(setting.key)) continue;
    if (PROTECTED_SETTING_KEYS.has(setting.key)) continue;
    const [existing] = await db
      .select({ id: appSettingsTable.id })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, setting.key))
      .limit(1);
    if (!existing) {
      await db.insert(appSettingsTable).values(setting);
    }
  }

  // Seed built-in page layouts on a fresh DB only. Never re-insert deleted
  // rows or overwrite grid JSON — admin edits and deletions survive deploys.
  {
    const existingLayouts = await db
      .select({ slug: layoutsTable.slug })
      .from(layoutsTable)
      .limit(1);
    if (existingLayouts.length === 0) {
      const toInsert = BUILTIN_LAYOUTS.map((l) => ({
        slug: l.slug,
        nameAl: l.nameAl,
        nameEn: l.nameEn,
        previewIcon: l.previewIcon,
        gridDefinitionJson: JSON.stringify({ cells: l.cells, category: l.category }),
        isActive: true,
      }));
      await db.insert(layoutsTable).values(toInsert);
      logger.info({ inserted: toInsert.length }, "Seeded built-in layouts");
    }
    // One-shot hide of retired slugs so an admin who re-enables one later
    // is not flipped off again on every Railway rebuild.
    const retireFlagKey = "retired_layouts_seed_v1";
    const [retireFlag] = await db
      .select({ id: appSettingsTable.id })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, retireFlagKey))
      .limit(1);
    if (!retireFlag) {
      const retired = await db
        .update(layoutsTable)
        .set({ isActive: false })
        .where(inArray(layoutsTable.slug, [...RETIRED_LAYOUT_SLUGS]))
        .returning({ slug: layoutsTable.slug });
      await db.insert(appSettingsTable).values({
        key: retireFlagKey,
        value: JSON.stringify(RETIRED_LAYOUT_SLUGS),
      });
      if (retired.length > 0) {
        logger.info({ hidden: retired.map((r) => r.slug) }, "Hid retired layouts from the client picker");
      }
    }
  }

  // One-time price refresh: only when the row still holds a known old default
  // so intentional admin price edits are preserved.
  {
    const priceBumps: Array<{ from: number; to: number }> = [
      { from: 3100, to: 3000 },
      { from: 3900, to: 3500 },
    ];
    for (const bump of priceBumps) {
      const updated = await db
        .update(bookSizesTable)
        .set({ priceBase: bump.to })
        .where(eq(bookSizesTable.priceBase, bump.from))
        .returning({ id: bookSizesTable.id, label: bookSizesTable.label });
      if (updated.length > 0) {
        logger.info(
          { from: bump.from, to: bump.to, sizes: updated.map((r) => r.label) },
          "Updated book size base price from legacy default",
        );
      }
    }
  }

  // One-time lifts of overly aggressive abuse caps. Only rewrite when the
  // stored value still equals a known old default so intentional admin tweaks
  // are preserved. Multiple `from` values cover successive prior defaults.
  const limitBumps: Array<{ key: string; from: string[]; to: string }> = [
    { key: "base_price_lek", from: ["3100"], to: "3000" },
    { key: "rate_limit_general_max", from: ["300", "2000"], to: "8000" },
    { key: "rate_limit_auth_max", from: ["20", "60"], to: "120" },
    { key: "rate_limit_analytics_max", from: ["120"], to: "400" },
    { key: "rate_limit_uploads_max", from: ["30", "60"], to: "180" },
    { key: "login_lockout_threshold", from: ["5"], to: "10" },
    { key: "login_lockout_minutes", from: ["15"], to: "5" },
    { key: "max_albums_per_user", from: ["20"], to: "50" },
    { key: "max_photos_per_album", from: ["300"], to: "500" },
    { key: "max_orders_per_day", from: ["5"], to: "15" },
    { key: "max_concurrent_pdf_generations", from: ["3"], to: "6" },
    { key: "max_upload_file_size_mb", from: ["20"], to: "25" },
    { key: "pending_books_limit", from: ["3"], to: "10" },
  ];
  for (const bump of limitBumps) {
    const [row] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, bump.key))
      .limit(1);
    if (row && bump.from.includes(row.value)) {
      await db
        .update(appSettingsTable)
        .set({ value: bump.to })
        .where(eq(appSettingsTable.key, bump.key));
      logger.info(
        { key: bump.key, from: row.value, to: bump.to },
        "Raised abuse-limit setting from legacy default",
      );
    } else if (!row) {
      await db.insert(appSettingsTable).values({ key: bump.key, value: bump.to });
    }
  }
}
