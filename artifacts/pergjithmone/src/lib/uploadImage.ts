import { compressImageFile, ImageTooLargeError } from './imageCompression';
import { authFetch } from './authFetch';

export class UploadFailedError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'UploadFailedError';
  }
}

function parseErrorBody(raw: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return String(data.error || data.message || '').trim();
  } catch {
    return text.slice(0, 180);
  }
}

/** Upload a photo through the same path the builder, AI album, and studio use. */
export async function uploadImageToApi(file: File, _token?: string | null): Promise<string> {
  const compressed = await compressImageFile(file);
  const fd = new FormData();
  fd.append('file', compressed);
  // authFetch attaches a fresh access token (and retries once after refresh).
  const r = await authFetch('/api/uploads/image', {
    method: 'POST',
    body: fd,
    ...(typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? { signal: AbortSignal.timeout(120_000) }
      : {}),
  });
  const raw = await r.text().catch(() => '');
  if (!r.ok) {
    throw new UploadFailedError(parseErrorBody(raw) || `Upload failed (${r.status})`, r.status);
  }
  let data: { url?: string } = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new UploadFailedError('Upload returned an invalid response', r.status);
  }
  if (!data.url) throw new UploadFailedError('Upload returned no URL', r.status);
  return data.url;
}

export function uploadErrorMessage(err: unknown, lang: 'sq' | 'en'): string {
  if (err instanceof ImageTooLargeError) {
    const mb = (err.sizeBytes / (1024 * 1024)).toFixed(1);
    return lang === 'sq'
      ? `Fotoja është ${mb}MB edhe pas ngjeshjes (limiti 3MB). Provoni një foto më të vogël.`
      : `Photo is ${mb}MB even after compression (limit 3MB). Try a smaller photo.`;
  }
  const raw = err instanceof Error ? err.message : '';
  if (/too many uploads|slow down|429/i.test(raw)) {
    return lang === 'sq'
      ? 'Shumë ngarkime njëherësh. Pritni pak dhe provoni përsëri.'
      : 'Too many uploads at once. Wait a moment and try again.';
  }
  if (/not a valid or allowed|only image/i.test(raw)) {
    return lang === 'sq'
      ? 'Ky format fotoje nuk u pranua. Provoni JPG, PNG, WebP, GIF ose HEIC nga telefoni.'
      : 'That photo format was rejected. Try JPG, PNG, WebP, GIF, or a phone HEIC.';
  }
  if (/too large|exceeds the maximum/i.test(raw)) {
    return lang === 'sq'
      ? 'Fotoja është shumë e madhe. Provoni një version më të vogël.'
      : 'That photo is too large. Try a smaller version.';
  }
  if (
    /abort|timeout|timed out/i.test(raw)
    || (typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'TimeoutError')
  ) {
    return lang === 'sq'
      ? 'Ngarkimi zgjati shumë. Provoni një foto më të vogël ose lidhjen e rrjetit.'
      : 'Upload timed out. Try a smaller photo or check your connection.';
  }
  return lang === 'sq'
    ? 'Ngarkimi dështoi. Provoni përsëri ose një foto tjetër (JPG, PNG, WebP).'
    : 'Upload failed. Try again or pick another photo (JPG, PNG, WebP).';
}
