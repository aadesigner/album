import { describe, it, expect } from 'vitest';
import { isPageContentBlank, getEmptyInnerPageNumbers } from './pageContent';

describe('isPageContentBlank', () => {
  it('treats empty as blank', () => {
    expect(isPageContentBlank(undefined)).toBe(true);
    expect(isPageContentBlank([])).toBe(true);
  });

  it('ignores background and placeholders', () => {
    expect(isPageContentBlank([
      { id: '1', type: 'background', x: 0, y: 0, w: 1, h: 1, rotation: 0, bgColor: '#fff' },
      { id: '2', type: 'placeholder', x: 0, y: 0, w: 1, h: 1, rotation: 0 },
    ] as any)).toBe(true);
  });

  it('counts real content', () => {
    expect(isPageContentBlank([
      { id: '1', type: 'image', src: '/a.jpg', x: 0, y: 0, w: 1, h: 1, rotation: 0 },
    ] as any)).toBe(false);
  });
});

describe('getEmptyInnerPageNumbers', () => {
  it('skips covers and reports blank inners', () => {
    const pages = [
      { id: 1, pageType: 'front_cover', pageNumber: 0 },
      { id: 2, pageType: 'inner', pageNumber: 1 },
      { id: 3, pageType: 'inner', pageNumber: 2 },
      { id: 4, pageType: 'back_cover', pageNumber: 99 },
    ];
    const content = {
      1: [{ id: 'c', type: 'text', text: 'Cover', x: 0, y: 0, w: 1, h: 1, rotation: 0 }],
      2: [{ id: 'b', type: 'background', x: 0, y: 0, w: 1, h: 1, rotation: 0, bgColor: '#fff' }],
      3: [{ id: 'i', type: 'image', src: '/p.jpg', x: 0, y: 0, w: 1, h: 1, rotation: 0 }],
      4: [],
    } as any;
    expect(getEmptyInnerPageNumbers(pages, content)).toEqual([1]);
  });
});
