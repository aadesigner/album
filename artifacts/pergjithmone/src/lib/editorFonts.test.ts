import { describe, it, expect } from 'vitest';
import { EDITOR_FONTS_STYLESHEET } from './editorFonts';

describe('editorFonts', () => {
  it('stylesheet includes all album script faces used on covers', () => {
    expect(EDITOR_FONTS_STYLESHEET).toContain('Great+Vibes');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Londrina+Solid');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Dancing+Script');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Pacifico');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Playfair+Display');
    expect(EDITOR_FONTS_STYLESHEET).toContain('Cormorant+Garamond');
  });
});
