/** User-facing copy for create-project errors keyed by API `code`. */

export function pendingBooksLimitMessage(
  lang: 'sq' | 'en',
  limit: number = 3,
): string {
  if (lang === 'sq') {
    return `Ke arritur kufirin e ${limit} albumeve në pritje. Përfundo ose porosite një, pastaj fillo tjetrin.`;
  }
  return `You've reached the limit of ${limit} albums in progress. Finish or order one before starting another.`;
}

/** Prefer a localized message when the API returns PENDING_BOOKS_LIMIT_REACHED. */
export function createProjectErrorMessage(
  err: any,
  lang: 'sq' | 'en',
): string | null {
  const code = err?.data?.code ?? err?.code;
  const limit = Number(err?.data?.limit ?? err?.limit ?? 3) || 3;
  if (code === 'PENDING_BOOKS_LIMIT_REACHED') {
    return pendingBooksLimitMessage(lang, limit);
  }
  // Fallback: detect English limit text from older API responses
  const raw = String(err?.data?.error || err?.message || '');
  if (/pending photobooks|PENDING_BOOKS_LIMIT/i.test(raw)) {
    const m = raw.match(/limit of (\d+)/i);
    return pendingBooksLimitMessage(lang, m ? Number(m[1]) : limit);
  }
  return raw || null;
}
