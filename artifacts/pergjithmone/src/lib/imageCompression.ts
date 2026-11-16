import { SAFE_IMAGE_NAME } from './acceptedImages';

// Client-side photo compression — runs before IndexedDB cache (builder) and
// before any order-time server upload.
//
// Why: phone cameras routinely produce 8-20MB photos. Shrinking to
// print-quality dimensions (3400px longest edge, matching server sharp —
// covers 21×28 cm @ 300 DPI) and a high-quality JPEG keeps the device cache
// small and order uploads fast, without visible quality loss for screen
// editing + print PDF export.
//
// Builder photos stay on-device (IndexedDB). We MUST store a browser-displayable
// JPEG/PNG/WebP — never raw HEIC passthrough — or the album canvas goes blank.

const MAX_DIMENSION = 3400;
const HARD_LIMIT_BYTES = 4 * 1024 * 1024; // 4MB — room for 3400px print JPEGs
const PASSTHROUGH_LIMIT_BYTES = 20 * 1024 * 1024;
const QUALITY_STEPS = [0.92, 0.88, 0.85, 0.78, 0.7, 0.6];

export class ImageTooLargeError extends Error {
  constructor(public sizeBytes: number) {
    super(`Photo is ${(sizeBytes / (1024 * 1024)).toFixed(1)}MB even after compression (limit 4MB).`);
    this.name = 'ImageTooLargeError';
  }
}

export class ImageUndecodableError extends Error {
  constructor() {
    super('Could not decode this photo in the browser');
    this.name = 'ImageUndecodableError';
  }
}

function isLikelyImageFile(file: File): boolean {
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  if (!type || type === 'application/octet-stream') return true;
  return SAFE_IMAGE_NAME.test(file.name || '');
}

function fileLooksLike(file: File, mime: string, ext: RegExp): boolean {
  return String(file.type || '').toLowerCase() === mime || ext.test(file.name || '');
}

function looksLikeHeic(file: File): boolean {
  const type = String(file.type || '').toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name || '');
}

async function sniffHeicBrand(file: Blob): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (head.length < 12) return false;
    // ISO-BMFF ftyp box — HEIC/HEIF brands in bytes 8..
    const asAscii = String.fromCharCode(...head.subarray(4, 8));
    if (asAscii !== 'ftyp') return false;
    const brands = String.fromCharCode(...head.subarray(8, Math.min(head.length, 32))).toLowerCase();
    return /heic|heix|heif|mif1|msf1|heim|heis/.test(brands);
  } catch {
    return false;
  }
}

async function decodeToBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // Prefer EXIF/HEIF orientation when the browser supports the option.
      const bmp = await (createImageBitmap as any)(file, { imageOrientation: 'from-image' })
        .catch(() => createImageBitmap(file));
      if (bmp && bmp.width > 0 && bmp.height > 0) return bmp;
      if (bmp && 'close' in bmp) bmp.close();
    } catch {
      // Fall through to the <img> path / HEIC WASM below.
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

/** Lazy WASM fallback — only downloaded when native HEIC decode fails. */
async function decodeHeicWithWasm(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  const { heicTo } = await import('heic-to');
  const jpegBlob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 }) as Blob;
  return decodeToBitmap(jpegBlob);
}

async function decodeBuilderSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await decodeToBitmap(file);
  } catch (nativeErr) {
    const heic = looksLikeHeic(file) || (await sniffHeicBrand(file));
    if (!heic) throw nativeErr;
    try {
      return await decodeHeicWithWasm(file);
    } catch {
      throw new ImageUndecodableError();
    }
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
 * Resizes + re-encodes entirely in the browser for the album builder cache.
 * Always returns a displayable JPEG/PNG/WebP File — never raw HEIC.
 */
export async function compressImageFile(file: File): Promise<File> {
  const keepGif = fileLooksLike(file, 'image/gif', /\.gif$/i);
  const keepPng = fileLooksLike(file, 'image/png', /\.png$/i);
  const keepWebp = fileLooksLike(file, 'image/webp', /\.webp$/i);
  if (!isLikelyImageFile(file) || keepGif) {
    if (file.size > HARD_LIMIT_BYTES) throw new ImageTooLargeError(file.size);
    // GIF: keep as-is when small enough (animation). Still displayable.
    if (keepGif) return file;
    // Unknown non-image — reject rather than caching junk.
    throw new ImageUndecodableError();
  }
  // Stickers / logos: never flatten alpha through a JPEG round-trip.
  if ((keepPng || keepWebp) && file.size <= HARD_LIMIT_BYTES) return file;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decodeBuilderSource(file);
  } catch (err) {
    if (err instanceof ImageUndecodableError) throw err;
    // Last chance: if it already looks like JPEG and is under the cap, keep it.
    if (/image\/(jpeg|jpg|png|webp)/i.test(file.type) && file.size <= HARD_LIMIT_BYTES) return file;
    if (file.size > PASSTHROUGH_LIMIT_BYTES) throw new ImageTooLargeError(file.size);
    throw new ImageUndecodableError();
  }

  const { w, h } = getSize(source);
  if (!w || !h) {
    if ('close' in source) (source as ImageBitmap).close();
    throw new ImageUndecodableError();
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    if ('close' in source) (source as ImageBitmap).close();
    throw new ImageUndecodableError();
  }
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(source as any, 0, 0, targetW, targetH);
  if ('close' in source) (source as ImageBitmap).close();

  const hasAlpha = (keepPng || keepWebp) && (await pngHasAlpha(canvas, ctx));
  let mime = keepPng || hasAlpha ? 'image/png' : 'image/jpeg';
  let ext = keepPng || hasAlpha ? 'png' : 'jpg';

  let blob: Blob | null = null;
  if (keepPng || hasAlpha) {
    blob = await canvasToBlob(canvas, mime);
    if (!hasAlpha && blob.size > HARD_LIMIT_BYTES) {
      for (const q of QUALITY_STEPS) {
        blob = await canvasToBlob(canvas, 'image/jpeg', q);
        if (blob.size <= HARD_LIMIT_BYTES) break;
      }
      mime = 'image/jpeg';
      ext = 'jpg';
    }
  } else {
    for (const q of QUALITY_STEPS) {
      blob = await canvasToBlob(canvas, mime, q);
      if (blob.size <= HARD_LIMIT_BYTES) break;
    }
  }

  if (!blob) throw new ImageUndecodableError();

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

  // Prefer compressed when smaller; for HEIC sources always use the JPEG we made
  // so IndexedDB holds something every browser can paint.
  if (blob.size >= file.size && !looksLikeHeic(file) && !(await sniffHeicBrand(file))) {
    if (/image\/(jpeg|jpg|png|webp)/i.test(file.type) || SAFE_IMAGE_NAME.test(file.name || '')) {
      return file;
    }
  }

  const newName = (file.name || 'photo').replace(/\.[^.]+$/, '') + `.${ext}`;
  return new File([blob], newName, { type: mime, lastModified: Date.now() });
}

async function pngHasAlpha(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<boolean> {
  try {
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } catch {
    return true;
  }
}
