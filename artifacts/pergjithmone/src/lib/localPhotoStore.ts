/**
 * Device-local photo library for the album builder.
 *
 * Photos stay in IndexedDB on this browser until the user orders —
 * then we upload only the images actually used in the album for print/PDF.
 * localStorage is far too small for camera photos; IndexedDB is the right store.
 */

import { compressImageFile } from './imageCompression';
import { uploadImageToApi } from './uploadImage';

export const LOCAL_PHOTO_PREFIX = 'local-photo:';

const DB_NAME = 'pergjithmone-local-photos';
const DB_VERSION = 1;
const STORE = 'photos';

type PhotoRecord = {
  id: string;
  projectId: number;
  blob: Blob;
  mime: string;
  createdAt: number;
};

const blobUrlCache = new Map<string, string>();

export function isLocalPhotoSrc(src: string | null | undefined): boolean {
  return !!src && src.startsWith(LOCAL_PHOTO_PREFIX);
}

export function localPhotoIdFromSrc(src: string): string {
  return src.slice(LOCAL_PHOTO_PREFIX.length);
}

export function toLocalPhotoSrc(id: string): string {
  return `${LOCAL_PHOTO_PREFIX}${id}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}

/** Compress + store on this device. Returns `local-photo:{uuid}` src. */
export async function storeBuilderPhoto(projectId: number, file: File | Blob): Promise<string> {
  const compressed = file instanceof File
    ? await compressImageFile(file)
    : file;
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const record: PhotoRecord = {
    id,
    projectId,
    blob: compressed,
    mime: compressed.type || 'image/jpeg',
    createdAt: Date.now(),
  };
  const db = await openDb();
  try {
    await idbReq(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record));
  } finally {
    db.close();
  }
  return toLocalPhotoSrc(id);
}

export async function getLocalPhotoBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    const row = await idbReq<PhotoRecord | undefined>(
      db.transaction(STORE, 'readonly').objectStore(STORE).get(id),
    );
    return row?.blob ?? null;
  } finally {
    db.close();
  }
}

/** Resolve a local-photo: src (or passthrough) to a browser-displayable URL. */
export async function resolveDisplayUrl(src: string): Promise<string | null> {
  if (!isLocalPhotoSrc(src)) return src;
  const cached = blobUrlCache.get(src);
  if (cached) return cached;
  const blob = await getLocalPhotoBlob(localPhotoIdFromSrc(src));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  blobUrlCache.set(src, url);
  return url;
}

export async function listLocalPhotoSrcs(projectId: number): Promise<string[]> {
  const db = await openDb();
  try {
    const idx = db.transaction(STORE, 'readonly').objectStore(STORE).index('projectId');
    const rows = await idbReq<PhotoRecord[]>(idx.getAll(projectId));
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => toLocalPhotoSrc(r.id));
  } finally {
    db.close();
  }
}

export async function deleteLocalPhotosForProject(projectId: number): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const idx = store.index('projectId');
    const rows = await idbReq<PhotoRecord[]>(idx.getAll(projectId));
    for (const row of rows) {
      const src = toLocalPhotoSrc(row.id);
      const url = blobUrlCache.get(src);
      if (url) {
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        blobUrlCache.delete(src);
      }
      store.delete(row.id);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('delete failed'));
    });
  } finally {
    db.close();
  }
}

/** Move draft photos (e.g. Album AI pre-project) onto a real project id. */
export async function reassignLocalPhotos(fromProjectId: number, toProjectId: number): Promise<void> {
  if (fromProjectId === toProjectId) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const idx = store.index('projectId');
    const rows = await idbReq<PhotoRecord[]>(idx.getAll(fromProjectId));
    for (const row of rows) {
      store.put({ ...row, projectId: toProjectId });
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('reassign failed'));
    });
  } finally {
    db.close();
  }
}

/** Draft bucket used before a project id exists (Album AI). */
export const DRAFT_PROJECT_ID = 0;

function collectLocalPhotoSrcsFromValue(value: unknown, into: Set<string>) {
  if (typeof value === 'string') {
    if (isLocalPhotoSrc(value)) into.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectLocalPhotoSrcsFromValue(v, into);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectLocalPhotoSrcsFromValue(v, into);
    }
  }
}

/**
 * Upload every `local-photo:` referenced in page content to the server and
 * rewrite srcs to `/api/uploads/files/...` so PDF/print can read them.
 */
export async function materializeLocalPhotosInPages<T extends { src?: string }>(
  pages: Record<number, T[]>,
): Promise<{ pages: Record<number, T[]>; replacements: Map<string, string> }> {
  const needed = new Set<string>();
  collectLocalPhotoSrcsFromValue(pages, needed);
  if (needed.size === 0) return { pages, replacements: new Map() };

  const uploaded = new Map<string, string>();
  for (const src of needed) {
    const id = localPhotoIdFromSrc(src);
    const blob = await getLocalPhotoBlob(id);
    if (!blob) {
      throw new Error(
        `Photo missing on this device (${id.slice(0, 8)}…). Re-add it on the device where you built the album.`,
      );
    }
    const ext = (blob.type.split('/')[1] || 'jpeg').replace('jpeg', 'jpg');
    const file = new File([blob], `${id}.${ext}`, { type: blob.type || 'image/jpeg' });
    const serverUrl = await uploadImageToApi(file);
    uploaded.set(src, serverUrl);
  }

  const rewrite = (value: unknown): unknown => {
    if (typeof value === 'string') return uploaded.get(value) ?? value;
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = rewrite(v);
      }
      return out;
    }
    return value;
  };

  return {
    pages: rewrite(pages) as Record<number, T[]>,
    replacements: uploaded,
  };
}
