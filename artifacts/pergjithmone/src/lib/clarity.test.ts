import { describe, it, expect } from 'vitest';
import {
  shouldLoadClarity,
  clarityIsConfigured,
  extractClarityProjectId,
} from './clarity';

describe('shouldLoadClarity', () => {
  it('allows static marketing pages', () => {
    expect(shouldLoadClarity('/')).toBe(true);
    expect(shouldLoadClarity('/shembuj')).toBe(true);
    expect(shouldLoadClarity('/cmime')).toBe(true);
    expect(shouldLoadClarity('/faq')).toBe(true);
  });

  it('allows album builder routes', () => {
    expect(shouldLoadClarity('/krijo')).toBe(true);
    expect(shouldLoadClarity('/album-ai')).toBe(true);
    expect(shouldLoadClarity('/editor/42')).toBe(true);
  });

  it('excludes admin and account areas', () => {
    expect(shouldLoadClarity('/heyadmin')).toBe(false);
    expect(shouldLoadClarity('/heyadmin/cilesimet')).toBe(false);
    expect(shouldLoadClarity('/hyr')).toBe(false);
    expect(shouldLoadClarity('/regjistrohu')).toBe(false);
    expect(shouldLoadClarity('/projektet')).toBe(false);
    expect(shouldLoadClarity('/profili')).toBe(false);
  });
});

describe('clarityIsConfigured', () => {
  it('needs enable + project id', () => {
    expect(clarityIsConfigured({ clarityEnabled: true, clarityProjectId: '' })).toBe(false);
    expect(clarityIsConfigured({ clarityEnabled: false, clarityProjectId: 'abc12xyz' })).toBe(false);
    expect(clarityIsConfigured({ clarityEnabled: true, clarityProjectId: 'abc12xyz' })).toBe(true);
  });
});

describe('extractClarityProjectId', () => {
  it('pulls the id from a pasted Clarity script', () => {
    const snip = 't.src="https://www.clarity.ms/tag/AbCdEf12"; ... "clarity", "script", "AbCdEf12"';
    expect(extractClarityProjectId(snip)).toBe('AbCdEf12');
  });
});
