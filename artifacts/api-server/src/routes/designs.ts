import { Router, type IRouter } from "express";
import { ensureDataDirs } from "../lib/dataDir";
import { findDesignAssetFile } from "../lib/pdfRenderer";

ensureDataDirs();

const router: IRouter = Router();

/** Public cover art so Design Studio / builder can load city photos if the
 *  frontend static copy 404s. */
router.get("/designs/:file", (req, res): void => {
  const raw = Array.isArray(req.params.file) ? req.params.file[0] : req.params.file;
  const found = findDesignAssetFile(raw || "");
  if (!found) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(found);
});

export default router;
