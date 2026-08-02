import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { logger } from "../lib/logger";
import { getSecuritySettings } from "../lib/securitySettings";

const router: IRouter = Router();

// Ensure uploads directory exists
export const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    // Cheap first-pass filter on the client-supplied MIME type, purely to
    // avoid writing obviously-wrong uploads to disk. This is NOT the real
    // security check — file.mimetype is attacker-controlled. The
    // authoritative check is the sharp-based content sniff below, which
    // inspects the actual bytes once the file is saved.
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Maps the format sharp actually detected from file bytes to a MIME type,
// so it can be compared against the admin-editable allowlist.
const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// Uploaded photos only need to look good on screen while editing and be
// sharp enough to print later; nothing in this app needs the original
// multi-megabyte phone-camera file. Capping the longest edge and
// re-encoding keeps disk usage (and later, PDF render time) sane.
const MAX_DIMENSION = 2600; // px, longest edge — comfortably print-quality
const JPEG_QUALITY = 85;
const PNG_QUALITY = 82;

async function compressUpload(
  filePath: string,
  originalMimetype: string,
): Promise<{ finalPath: string; width: number; height: number }> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const image = sharp(filePath, { failOn: "none" }).rotate(); // auto-orient from EXIF, then strip it

  const metadata = await image.metadata();
  const hasAlpha = !!metadata.hasAlpha;

  // Keep transparency (PNG) as PNG; everything else becomes JPEG, which
  // compresses photographic content far better than PNG/GIF/WEBP-lossless.
  const outputExt = hasAlpha ? ".png" : ".jpg";
  const outputPath = path.join(dir, `${base}${outputExt}`);
  const tmpPath = `${outputPath}.tmp`;

  let pipeline = image.resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });
  pipeline = hasAlpha
    ? pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 })
    : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

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
  upload.single("file"),
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

    // Real content-type sniffing: trust what sharp reads from the file's
    // actual bytes, not the client-supplied MIME header, which is trivially
    // spoofable (e.g. a renamed .exe sent with a Content-Type of image/png).
    let detectedMime: string | undefined;
    try {
      const metadata = await sharp(req.file.path, { failOn: "none" }).metadata();
      detectedMime = metadata.format ? SHARP_FORMAT_TO_MIME[metadata.format] : undefined;
    } catch {
      detectedMime = undefined;
    }
    if (!detectedMime || !settings.allowedUploadMimeTypes.includes(detectedMime)) {
      fs.unlink(req.file.path, () => {});
      res.status(400).json({ error: "This file is not a valid or allowed image type." });
      return;
    }

    try {
      const { finalPath, width, height } = await compressUpload(
        req.file.path,
        detectedMime,
      );
      const filename = path.basename(finalPath);
      res.json({
        url: `/api/uploads/files/${filename}`,
        filename,
        width,
        height,
      });
    } catch (err) {
      logger.error({ err }, "Image compression failed, serving original upload");
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
  const filePath = path.join(uploadsDir, raw);
  // Filenames are content-addressed (timestamp + random suffix) and never
  // reused for different content, so it's safe to cache these aggressively.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(filePath);
});

export default router;
