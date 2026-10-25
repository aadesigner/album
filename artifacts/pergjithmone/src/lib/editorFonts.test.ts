import { describe, it, expect } from 'vitest';
import {
  EDITOR_FONTS,
  EDITOR_FONTS_STYLESHEET,
  normalizeEditorFont,
  searchEditorFonts,
  isEditorSingleCutFont,
} from './editorFonts';

describe('editorFonts', () => {
  it('stylesheet includes all album script faces used on covers', () => {
    expect(EDITOR_FONTS_STYLESHEET).toContain('Great+Vibes');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Londrina+Solid');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Dancing+Script');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Pacifico');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Playfair+Display');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Cormorant+Garamond');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Allura');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Inter');
  });

  it('has a large searchable catalog', () => {
    expect(EDITOR_FONTS.length).toBeGreaterThanOrEqual(50);
    expect(searchEditorFonts('playfair').map(f => f.id)).toContain('playfair');
    expect(searchEditorFonts('', 'script').every(f => f.category === 'script')).toBe(true);
  });

  it('normalizes known font stacks', () => {
    expect(normalizeEditorFont("'Great Vibes', cursive")).toBe("'Great Vibes', cursive");
    expect(normalizeEditorFont('Great Vibes')).toBe("'Great Vibes', cursive");
    expect(normalizeEditorFont('unknown-face')).toBe('Georgia, serif');
    expect(isEditorSingleCutFont("'Pacifico', cursive")).toBe(true);
    expect(isEditorSingleCutFont("'Inter', sans-serif")).toBe(false);
  });
});
