import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') || '';

type Props = {
  /** PDF URL without cache-bust; auth via token header when provided. */
  url: string;
  token?: string | null;
  className?: string;
  title?: string;
};

/**
 * Mobile-safe multi-page PDF viewer.
 * Native iframe PDF plugins on iOS/Android often show only the first page.
 * pdf.js renders every page into a scrollable stack and paints the first page
 * before the rest finish decoding — much faster perceived load.
 *
 * Worker is NEVER loaded from Vite’s hashed /assets/*.mjs chunk — our static
 * host used to serve .mjs as octet-stream and module import failed. We ship
 * the worker as /pdf.worker.min.js (public/) and fall back to jsDelivr.
 */
export function AdminPdfViewer({ url, token, className, title }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [pagesReady, setPagesReady] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pdfDoc: { cleanup: (keepLoadedFonts?: boolean) => Promise<unknown> } | null = null;
    let loadingTask: { destroy: () => Promise<void>; promise: Promise<any> } | null = null;
    const renderTasks: Array<{ cancel: () => void }> = [];

    async function run() {
      setLoading(true);
      setError(null);
      setPageCount(0);
      setPagesReady(0);

      const host = scrollerRef.current;
      if (!host) return;
      host.replaceChildren();

      try {
        const pdfjs = await import('pdfjs-dist');
        const version = (pdfjs as { version?: string }).version || '6.5.438';
        const localWorker = `${BASE}/pdf.worker.min.js`;
        const cdnWorker = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const openDoc = (workerSrc: string) => {
          pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
          const task = pdfjs.getDocument({
            url,
            httpHeaders: Object.keys(headers).length ? headers : undefined,
            withCredentials: true,
            disableRange: false,
            disableStream: false,
          });
          loadingTask = task as typeof loadingTask;
          return task.promise;
        };

        // Try same-origin public worker first, then CDN — never Vite /assets/*.mjs.
        let pdf: any;
        try {
          pdf = await openDoc(localWorker);
        } catch (localErr) {
          console.warn('Local PDF worker failed, trying CDN', localErr);
          pdf = await openDoc(cdnWorker);
        }

        if (cancelled) {
          await pdf.cleanup();
          return;
        }
        pdfDoc = pdf;
        setPageCount(pdf.numPages);
        setLoading(false);

        const maxCssWidth = Math.min(Math.max(host.clientWidth - 16, 280), 900);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          if (cancelled) break;

          const base = page.getViewport({ scale: 1 });
          const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
          const fitScale = (maxCssWidth * dpr) / Math.max(1, base.width);
          const viewport = page.getViewport({ scale: fitScale });

          const wrap = document.createElement('div');
          wrap.className = 'mx-auto mb-3 sm:mb-4 rounded-sm shadow-md bg-white overflow-hidden';
          wrap.style.width = `${viewport.width / dpr}px`;
          wrap.style.maxWidth = '100%';

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.setAttribute('aria-label', `Page ${pageNum}`);
          wrap.appendChild(canvas);
          host.appendChild(wrap);

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) continue;

          const task = page.render({
            canvas,
            canvasContext: ctx,
            viewport,
          });
          renderTasks.push(task);
          await task.promise;
          if (cancelled) break;
          setPagesReady(pageNum);

          await new Promise((r) => setTimeout(r, 0));
        }
      } catch (err) {
        if (cancelled) return;
        console.error('AdminPdfViewer failed', err);
        setError(err instanceof Error ? err.message : 'Could not open PDF');
        setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
      for (const t of renderTasks) {
        try { t.cancel(); } catch { /* ignore */ }
      }
      if (pdfDoc) void pdfDoc.cleanup();
      if (loadingTask) void loadingTask.destroy();
    };
  }, [url, token]);

  return (
    <div className={`relative flex flex-col min-h-0 h-full ${className || ''}`}>
      {(loading || (pageCount > 0 && pagesReady < pageCount)) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 text-white text-[11px] font-medium pointer-events-none">
          <Loader2 size={12} className="animate-spin" />
          {loading ? 'Loading PDF…' : `Page ${pagesReady} / ${pageCount}`}
        </div>
      )}

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center bg-neutral-100">
          <p className="text-sm text-neutral-700 font-medium">Couldn’t display this PDF here</p>
          <p className="text-xs text-neutral-500 max-w-sm">{error}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold underline"
          >
            Open in a new tab
          </a>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-2 sm:px-4 py-3 bg-neutral-200"
          title={title}
          style={{ WebkitOverflowScrolling: 'touch' }}
        />
      )}
    </div>
  );
}

/**
 * Normalize a PDF href for the in-app viewer:
 * - resolve BASE path
 * - drop `token` / `download` (auth goes via Authorization header)
 * - keep optional `t=` cache-bust after regenerate
 */
export function pdfViewSourceUrl(pdfUrl: string, base = ''): string {
  if (!pdfUrl) return pdfUrl;
  const withBase = pdfUrl.startsWith('http')
    ? pdfUrl
    : `${base}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
  try {
    const u = new URL(withBase, typeof window !== 'undefined' ? window.location.origin : 'http://local');
    u.searchParams.delete('token');
    u.searchParams.delete('download');
    const path = `${u.pathname}${u.search}`;
    return withBase.startsWith('http') ? u.toString() : path;
  } catch {
    return withBase;
  }
}
