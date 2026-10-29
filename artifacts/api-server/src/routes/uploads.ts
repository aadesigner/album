import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { logger } from "../lib/logger";
import { getSecuritySettings } from "../lib/securitySettings";
import { ensureDataDirs, uploadFilePathCandidates, uploadsDir } from "../lib/dataDir";
import { sniffImageFormat } from "../lib/imageSniff";

const router: IRouter = Router();

ensureDataDirs();
export { uploadsDir };

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

// This is a hard safety-net ceiling, not the real limit — multer's own limit
// is static (set once at process start) and can't read admin settings live.
// The actual admin-editable max (Settings → Security & Limits) is enforced
// below, after the file is on disk, where it can be re-read every request.
const HARD_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: HARD_MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    // Cheap first-pass filter. Phone pickers often send an empty MIME, HEIC,
    // or application/octet-stream — sharp inspects the real bytes later.
    const mime = String(file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname || "").toLowerCase();
    const okMime = !mime || mime === "application/octet-stream" || mime.startsWith("image/");
    const okExt = [
      "", ".jpg", ".jpeg", ".jfif", ".png", ".webp", ".gif",
      ".heic", ".heif", ".avif", ".tif", ".tiff", ".bmp",
    ].includes(ext);
    if (okMime || okExt) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function receiveImage(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    const code = (err as { code?: string }).code;
    if (code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File exceeds the maximum allowed size of 50MB." });
      return;
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(400).json({ error: message });
  });
}

// Maps the format sharp actually detected from file bytes to a MIME type.
const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heif: "image/heic",
  avif: "image/avif",
  tiff: "image/tiff",
  bmp: "image/bmp",
};

/** Source formats we convert to JPEG/PNG for the editor and print PDF. */
const CONVERTIBLE_FORMATS = new Set(Object.keys(SHARP_FORMAT_TO_MIME));

// Uploaded photos only need to look good on screen while editing and be
// sharp enough to print later; nothing in this app needs the original
// multi-megabyte phone-camera file. Capping the longest edge and
// re-encoding keeps disk usage (and later, PDF render time) sane.
const MAX_DIMENSION = 3200; // px, longest edge — enough for 21×28 cm @ 300 DPI
const JPEG_QUALITY = 85;
const PNG_QUALITY = 82;

async function compressUpload(
  filePath: string,
  detectedFormat: string,
): Promise<{ finalPath: string; width: number; height: number }> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const image = sharp(filePath, { failOn: "none" }).rotate(); // auto-orient from EXIF, then strip it

  const metadata = await image.metadata();
  const hasAlpha = !!metadata.hasAlpha;
  const format = detectedFormat || metadata.format || "jpeg";

  // Keep PNG / WebP / GIF as themselves. Convert HEIC/AVIF/TIFF/BMP to JPEG
  // (or PNG when they have transparency).
  let outputExt = ".jpg";
  if (hasAlpha || format === "png") outputExt = ".png";
  else if (format === "webp") outputExt = ".webp";
  else if (format === "gif") outputExt = ".gif";
  else if (format === "jpeg") outputExt = ".jpg";

  if (format === "gif" && !hasAlpha) {
    return {
      finalPath: filePath,
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }

  const outputPath = path.join(dir, `${base}${outputExt}`);
  const tmpPath = `${outputPath}.tmp`;

  let pipeline = image.resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });
  if (outputExt === ".png") {
    pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 });
  } else if (outputExt === ".webp") {
    pipeline = pipeline.webp({ quality: JPEG_QUALITY });
  } else {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  }

  const info = await pipeline.toFile(tmpPath);

  // Only now remove the original and put the compressed file in its place —
  // if compression failed above, the original upload is left untouched.
  if (outputPath !== filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  fs.renameSync(tmpPath, outputPath);

  return { finalPath: outputPath, width: info.width, height: info.height };
}

// POST /uploads/image
// Intentionally not behind requireAuth: the AI-album flow lets a visitor
// pick a category and upload photos before they've registered, so they
// don't have to redo that work after signing up. Uploaded files aren't
// tied to a user record here — they're only ever referenced by URL once
// attached to a project, at which point that project itself is auth-gated.
router.post(
  "/uploads/image",
  receiveImage,
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const settings = await getSecuritySettings();
    const maxBytes = settings.maxUploadFileSizeMb * 1024 * 1024;
    if (req.file.size > maxBytes) {
      fs.unlink(req.file.path, () => {});
      res.status(400).json({
        error: `File exceeds the maximum allowed size of ${settings.maxUploadFileSizeMb}MB.`,
      });
      return;
    }

    // Real content-type sniffing: trust file bytes, not the client MIME.
    // Saving Settings used to JSON-encode the allowlist; splitting that
    // string on commas made `image/jpeg` never match, so every photo failed.
    let detectedFormat: string | undefined;
    let detectedMime: string | undefined;
    try {
      const metadata = await sharp(req.file.path, { failOn: "none" }).metadata();
      detectedFormat = metadata.format;
      detectedMime = detectedFormat ? SHARP_FORMAT_TO_MIME[detectedFormat] : undefined;
    } catch {
      detectedFormat = undefined;
      detectedMime = undefined;
    }
    if (!detectedFormat) {
      try {
        const head = Buffer.alloc(16);
        const fd = fs.openSync(req.file.path, "r");
        const n = fs.readSync(fd, head, 0, 16, 0);
        fs.closeSync(fd);
        detectedFormat = sniffImageFormat(head.subarray(0, n));
        detectedMime = detectedFormat ? SHARP_FORMAT_TO_MIME[detectedFormat] : undefined;
      } catch {
        /* keep undefined */
      }
    }
    if (!detectedFormat || !CONVERTIBLE_FORMATS.has(detectedFormat) || !detectedMime) {
      logger.warn(
        { size: req.file.size, mime: req.file.mimetype, name: req.file.originalname, detectedFormat },
        "Rejected upload: could not identify image bytes",
      );
      fs.unlink(req.file.path, () => {});
      res.status(400).json({ error: "This file is not a valid or allowed image type." });
      return;
    }

    try {
      const { finalPath, width, height } = await compressUpload(
        req.file.path,
        detectedFormat,
      );
      const filename = path.basename(finalPath);
      res.json({
        url: `/api/uploads/files/${filename}`,
        filename,
        width,
        height,
      });
    } catch (err) {
      logger.error({ err, format: detectedFormat }, "Image compression failed");
      if (detectedFormat === "heif" || detectedFormat === "avif") {
        fs.unlink(req.file.path, () => {});
        res.status(400).json({
          error: "This photo format needs conversion. Please try JPG, PNG, or WebP.",
        });
        return;
      }
      // Fall back to the untouched original rather than losing the upload.
      res.json({
        url: `/api/uploads/files/${req.file.filename}`,
        filename: req.file.filename,
        width: null,
        height: null,
      });
    }
  },
);

// Serve uploaded files
router.get("/uploads/files/:filename", (req, res): void => {
  const raw = Array.isArray(req.params.filename)
    ? req.params.filename[0]
    : req.params.filename;
  // Sanitize: only alphanumeric, dash, dot, underscore
  if (!/^[\w.\-]+$/.test(raw)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const filePath = uploadFilePathCandidates(raw).find((p) => fs.existsSync(p));
  if (!filePath) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  // Filenames are content-addressed (timestamp + random suffix) and never
  // reused for different content, so it's safe to cache these aggressively.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(filePath);
});

export default router;
