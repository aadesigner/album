import { describe, it, expect } from 'vitest';
import {
  bi, getAt, setAt, mergePageContent, txt, sanitizePageContent,
  isPageSlug, pageSettingKey, stringifyPageContent,
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
    expect(txt(merged, 'hero.cta', 'en')).toBe('Create your book');
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
});
