import { describe, it, expect } from 'vitest';
import { sanitizeForPdf, createPdfBinary } from '../pdfEngine';

function bytesToText(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(new Uint8Array(buffer));
}

describe('sanitizeForPdf', () => {
  it('escapes PDF string specials', () => {
    expect(sanitizeForPdf('a(b)c\\d')).toBe('a\\(b\\)c\\\\d');
  });

  it('transliterates non-ASCII characters', () => {
    expect(sanitizeForPdf('— “quote” 42° α')).toBe('- "quote" 42 deg alpha');
  });

  it('handles empty input', () => {
    expect(sanitizeForPdf('')).toBe('');
  });
});

describe('createPdfBinary', () => {
  it('produces a valid PDF header and trailer', () => {
    const pdf = createPdfBinary('Test Title', 'Test Author', [{ title: 'Intro', content: ['Hello world.'] }], 1, 42);
    const text = bytesToText(pdf);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('startxref');
    expect(text).toContain('%%EOF');
  });

  it('contains the document title content', () => {
    const pdf = createPdfBinary('My Paper', '', [{ title: 'Results', content: ['We found things.'] }], 0, 7);
    const text = bytesToText(pdf);
    expect(text).toContain('My Paper');
    expect(text).toContain('Results');
    expect(text).toContain('We found things.');
  });

  it('creates multiple pages for long content', () => {
    const longPara = 'word '.repeat(5000);
    const pdf = createPdfBinary('Title', '', [{ title: 'Section', content: [longPara] }], 0, 5000);
    const text = bytesToText(pdf);
    const pageCount = (text.match(/\/Type \/Page \//g) || []).length;
    expect(pageCount).toBeGreaterThan(1);
  });

  it('includes bibliography count note', () => {
    const pdf = createPdfBinary('T', '', [{ title: '', content: ['x'] }], 3, 1);
    const text = bytesToText(pdf);
    expect(text).toContain('3 bibliography entries loaded');
  });
});