import { describe, it, expect, vi } from 'vitest';
import {
  bi, img, getAt, setAt, mergePageContent, txt, imgSrc, sanitizePageContent,
  isPageSlug, pageSettingKey, stringifyPageContent, preparePageContentForSave,
  fetchPublishedPage, MAX_PAGE_JSON_CHARS,
} from './marketingPages';
import { PAGE_DEFAULTS } from './marketingPages.defaults';

describe('marketingPages helpers', () => {
  it('recognizes slugs and setting keys', () => {
    expect(isPageSlug('home')).toBe(true);
    expect(isPageSlug('wizard')).toBe(false);
    expect(pageSettingKey('how-it-works')).toBe('page_content_how_it_works');
  });

  it('getAt / setAt walk dotted paths', () => {
    const tree = { hero: { title: bi('A', 'B') }, steps: [{ title: bi('1', 'one') }] };
    expect(txt(tree, 'hero.title', 'en')).toBe('B');
    expect(getAt(tree, 'steps.0.title')).toEqual(bi('1', 'one'));
    const next = setAt(tree, 'hero.title.en', 'Hello');
    expect(txt(next, 'hero.title', 'en')).toBe('Hello');
    expect(txt(tree, 'hero.title', 'en')).toBe('B');
  });

  it('merge keeps defaults when saved is empty and applies bilingual edits', () => {
    const defaults = PAGE_DEFAULTS.home;
    expect(mergePageContent(defaults, null)).toBe(defaults);
    const merged = mergePageContent(defaults, {
      hero: { headline: { sq: 'X', en: 'Y', font: 'Georgia, serif' } },
      extraUnknown: { nope: true },
    });
    expect(txt(merged, 'hero.headline', 'sq')).toBe('X');
    expect(txt(merged, 'hero.headline', 'en')).toBe('Y');
    expect((getAt(merged, 'hero.headline') as { font?: string }).font).toBe('Georgia, serif');
    expect(txt(merged, 'hero.cta', 'en')).toBe('Create your album');
    expect((merged as Record<string, unknown>).extraUnknown).toBeUndefined();
  });

  it('merge does not wipe a section when saved array is empty', () => {
    const defaults = { items: [bi('a', 'A'), bi('b', 'B')] };
    const merged = mergePageContent(defaults, { items: [] });
    expect(merged.items).toHaveLength(2);
  });

  it('sanitize strips prototype keys and caps arrays', () => {
    const dirty = JSON.parse('{"hero":{"sq":"ok"},"__proto__":{"polluted":true}}');
    const clean = sanitizePageContent(dirty) as Record<string, unknown>;
    expect(clean.hero).toEqual({ sq: 'ok' });
    expect(Object.prototype.hasOwnProperty.call(clean, '__proto__')).toBe(false);
    const many = sanitizePageContent({ items: Array.from({ length: 80 }, () => 'x') }) as { items: string[] };
    expect(many.items).toHaveLength(40);
  });

  it('stringify rejects oversized payloads', () => {
    expect(() => stringifyPageContent('x'.repeat(500_000))).toThrow(/too large/i);
  });

  it('merge does not blank bilingual copy when both languages are empty', () => {
    const defaults = PAGE_DEFAULTS.home;
    const merged = mergePageContent(defaults, {
      hero: { headline: { sq: '', en: '   ' } },
    });
    expect(txt(merged, 'hero.headline', 'sq')).toBe('Ruaj kujtimet');
    expect(txt(merged, 'hero.headline', 'en')).toBe('Keep the memories');
    expect(txt(merged, 'hero.cta', 'en')).toBe('Create your album');
  });

  it('merge keeps a one-language edit and does not blank images', () => {
    const defaults = {
      title: bi('A', 'B'),
      photo: img('https://example.com/a.jpg'),
    };
    const merged = mergePageContent(defaults, {
      title: { sq: 'New', en: '' },
      photo: { src: '   ' },
    });
    expect(txt(merged, 'title', 'sq')).toBe('New');
    expect(txt(merged, 'title', 'en')).toBe('New');
    expect(imgSrc(merged, 'photo', 'fallback')).toBe('https://example.com/a.jpg');
  });

  it('setAt patches nested array items without mutating the original', () => {
    const tree = { styles: [{ line: bi('old', 'old-en') }, { line: bi('b', 'b-en') }] };
    const next = setAt(tree, 'styles.0.line', bi('new', 'new-en'));
    expect(txt(next, 'styles.0.line', 'sq')).toBe('new');
    expect(txt(tree, 'styles.0.line', 'sq')).toBe('old');
    expect(txt(next, 'styles.1.line', 'en')).toBe('b-en');
  });

  it('preparePageContentForSave restores defaults around a single edit', () => {
    const prepared = preparePageContentForSave(PAGE_DEFAULTS.home, {
      hero: { headline: { sq: 'X', en: 'Y' } },
    });
    expect(txt(prepared, 'hero.headline', 'en')).toBe('Y');
    expect(txt(prepared, 'hero.cta', 'en')).toBe('Create your album');
    expect(txt(prepared, 'process.steps.0.title', 'sq')).toBe('Zgjidhni stilin');
    const json = stringifyPageContent(prepared);
    expect(json.length).toBeLessThan(MAX_PAGE_JSON_CHARS);
  });

  it('every page default document is within the save size cap', () => {
    for (const [slug, doc] of Object.entries(PAGE_DEFAULTS)) {
      expect(() => stringifyPageContent(doc)).not.toThrow();
      expect(stringifyPageContent(doc).length).toBeLessThan(MAX_PAGE_JSON_CHARS);
      expect(slug).toBeTruthy();
    }
  });

  it('fetchPublishedPage throws on HTTP errors instead of returning empty content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchPublishedPage('home')).rejects.toThrow(/502/);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: { hero: { headline: { sq: 'A', en: 'B' } } }, updatedAt: '2026-01-01' }),
    });
    await expect(fetchPublishedPage('home')).resolves.toEqual({
      content: { hero: { headline: { sq: 'A', en: 'B' } } },
      updatedAt: '2026-01-01',
    });
    vi.unstubAllGlobals();
  });
});
