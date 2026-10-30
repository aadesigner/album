import { Router, type IRouter } from "express";
import { db } from "@workspace/db-tsconfig";
import { bookSizesTable, layoutsTable, appSettingsTable } from "@workspace/db-tsconfig";
import { eq } from "drizzle-orm";
import { readOfferBarSettings } from "../lib/offerBarSettings";
import { setPublicCatalogCache, setNoStoreCache } from "../lib/httpCache";
import { parseJsonArray, parseJsonObject } from "../lib/securitySettingsShared";
import { parseEditorElements } from "../lib/editorElements";

const router: IRouter = Router();

// GET /book-sizes
router.get("/book-sizes", async (_req, res): Promise<void> => {
  setPublicCatalogCache(res);
  const sizes = await db
    .select()
    .from(bookSizesTable)
    .where(eq(bookSizesTable.isActive, true));
  res.json(
    sizes.map((s) => ({
      ...s,
      widthCm: parseFloat(s.widthCm as string),
      heightCm: parseFloat(s.heightCm as string),
    })),
  );
});

// GET /layouts
router.get("/layouts", async (_req, res): Promise<void> => {
  setNoStoreCache(res);
  const layouts = await db
    .select()
    .from(layoutsTable)
    .where(eq(layoutsTable.isActive, true));
  res.json(layouts);
});

// GET /settings
router.get("/settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }

  const hiddenDesignIds = parseJsonArray(map["hidden_design_ids"]).map(String);
  const designOverrides = parseJsonObject(map["design_overrides"]);
  const customDesigns = parseJsonArray(map["custom_designs"]);
  const editorElements = parseEditorElements(parseJsonArray(map["editor_elements"]));

  res.json({
    whatsappNumber: map["whatsapp_number"] || "+355688755833",
    basePriceLek: parseInt(map["base_price_lek"] || "3100", 10),
    minPages: parseInt(map["min_pages"] || "30", 10),
    extraSpreadPriceLek: parseInt(map["extra_spread_price_lek"] || "200", 10),
    siteName: map["site_name"] || "Përgjithmonë",
    siteTaglineAl: map["site_tagline_al"] || "Kujtime që mbeten",
    siteTaglineEn: map["site_tagline_en"] || "Memories that last",
    maintenanceMode: map["maintenance_mode"] === "true",
    maintenanceMessageAl: map["maintenance_message_al"] || "Jemi duke bërë mirëmbajtje. Do të kthehemi së shpejti.",
    maintenanceMessageEn: map["maintenance_message_en"] || "We're performing maintenance. We'll be back soon.",
    bookCreationEnabled: map["book_creation_enabled"] !== "false",
    bookDisabledNoticeAl: map["book_disabled_notice_al"] || "Krijimi i albumeve është përkohësisht i ndalur.",
    bookDisabledNoticeEn: map["book_disabled_notice_en"] || "Book creation is temporarily unavailable.",
    hiddenDesignIds,
    designOverrides,
    customDesigns,
    editorElements,
    requireLoginForPdf: map["require_login_for_pdf"] === "true",
    pendingBooksLimitEnabled: map["pending_books_limit_enabled"] !== "false",
    pendingBooksLimit: parseInt(map["pending_books_limit"] || "10", 10),
    ...readOfferBarSettings(map),
  });
});

export default router;
