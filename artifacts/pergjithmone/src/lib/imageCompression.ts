// Client-side photo compression — runs before any upload leaves the browser.
//
// Why: phone cameras routinely produce 8-20MB photos. Uploading those in full
// over a slow connection is what makes "uploading" feel like it hangs, and it
// also means the server has to receive, store, and re-encode a huge original
// just to throw most of it away. Shrinking to print-quality dimensions and a
// high-quality JPEG *before* the network request keeps uploads fast and caps
// what we ever send, without any visible quality loss for anything this app
// does with a photo (screen editing + print-resolution PDF export).
//
// The server (artifacts/api-server/src/routes/uploads.ts) still re-compresses
// on receipt as a second safety net (e.g. for non-browser clients), but doing
// it here first is what actually fixes upload speed.

// Matches the server's MAX_DIMENSION so we never resize twice in a way that
// could compound artifacts — this is the single source of truth for "how
// large does a photo ever need to be in this app".
const MAX_DIMENSION = 2600;
const HARD_LIMIT_BYTES = 3 * 1024 * 1024; // 3MB per photo, per product requirement
const QUALITY_STEPS = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5];

export class ImageTooLargeError extends Error {
  constructor(public sizeBytes: number) {
    super(`Photo is ${(sizeBytes / (1024 * 1024)).toFixed(1)}MB even after compression (limit 3MB).`);
    this.name = 'ImageTooLargeError';
  }
}

async function decodeToBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> path below (some formats/browsers reject createImageBitmap).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getSize(src: ImageBitmap | HTMLImageElement) {
  return 'width' in src && 'height' in src
    ? { w: (src as any).width as number, h: (src as any).height as number }
    : { w: 0, h: 0 };
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas encoding failed'))), mime, quality);
  });
}

/**
 * Resizes + re-encodes an image file entirely in the browser, aiming for the
 * smallest file that still looks essentially identical, and never returning
 * something larger than 3MB. Non-image files, GIFs (to preserve animation),
 * and anything the browser can't decode are passed through untouched — the
 * server-side pipeline and hard-limit check are the backstop for those.
 */
export async function compressImageFile(file: File): Promise<File> {
  // Animated GIFs would be flattened to a single frame by a canvas re-encode —
  // leave them alone and let the size-limit check below gate them instead.
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    if (file.size > HARD_LIMIT_BYTES) throw new ImageTooLargeError(file.size);
    return file;
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decodeToBitmap(file);
  } catch {
    // Couldn't decode client-side (e.g. an unsupported format) — fall back to
    // just enforcing the size limit and let the server have a go at it.
    if (file.size > HARD_LIMIT_BYTES) throw new ImageTooLargeError(file.size);
    return file;
  }

  const { w, h } = getSize(source);
  if (!w || !h) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(source as any, 0, 0, targetW, targetH);
  if ('close' in source) (source as ImageBitmap).close();

  // PNGs with real transparency should stay PNG so we don't crush alpha to a
  // flat color; everything else compresses far better as JPEG.
  const hasAlpha = file.type === 'image/png' && (await pngHasAlpha(canvas, ctx));
  const mime = hasAlpha ? 'image/png' : 'image/jpeg';
  const ext = hasAlpha ? 'png' : 'jpg';

  let blob: Blob | null = null;
  if (hasAlpha) {
    // PNG quality isn't a simple 0-1 knob in the Canvas API — resizing alone
    // (already done above) is the main lever here.
    blob = await canvasToBlob(canvas, mime);
  } else {
    for (const q of QUALITY_STEPS) {
      blob = await canvasToBlob(canvas, mime, q);
      if (blob.size <= HARD_LIMIT_BYTES) break;
    }
  }

  if (!blob) return file;

  // Resizing to MAX_DIMENSION handles the overwhelming majority of cases;
  // this loop is just a defensive backstop for unusually dense/detailed
  // images that are still too big even at the lowest quality step.
  let attemptCanvas = canvas, attemptW = targetW, attemptH = targetH;
  while (blob.size > HARD_LIMIT_BYTES && Math.max(attemptW, attemptH) > 800) {
    attemptW = Math.round(attemptW * 0.8);
    attemptH = Math.round(attemptH * 0.8);
    attemptCanvas = document.createElement('canvas');
    attemptCanvas.width = attemptW;
    attemptCanvas.height = attemptH;
    const c2 = attemptCanvas.getContext('2d');
    if (!c2) break;
    c2.drawImage(canvas, 0, 0, attemptW, attemptH);
    blob = await canvasToBlob(attemptCanvas, mime, hasAlpha ? undefined : QUALITY_STEPS[QUALITY_STEPS.length - 1]);
  }

  if (blob.size > HARD_LIMIT_BYTES) throw new ImageTooLargeError(blob.size);

  // Only use the compressed result if it's actually smaller — for already-
  // small/efficiently-encoded files, re-encoding can occasionally lose.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
  return new File([blob], newName, { type: mime, lastModified: Date.now() });
}

// Cheap alpha-channel check: sample the canvas's pixel data for any
// non-opaque pixel. Only called for PNGs, and only once per upload.
async function pngHasAlpha(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<boolean> {
  try {
    const { width, height } = canvas;
    // Sampling the full image is cheap enough at these resolutions and this
    // only runs once per PNG upload.
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch {
    // getImageData can throw on tainted canvases; assume alpha to be safe.
    return true;
  }
}
