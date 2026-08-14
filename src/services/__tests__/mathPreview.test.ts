import { describe, it, expect } from 'vitest';
import { findMathSegmentAt, renderMathHtml } from '../mathPreview';

describe('findMathSegmentAt', () => {
  it('detects inline $...$ segments', () => {
    const seg = findMathSegmentAt('The value is $x^2 + 1$ here.', 18);
    expect(seg).toEqual({ math: 'x^2 + 1', display: false });
  });

  it('detects display $$...$$ segments', () => {
    const seg = findMathSegmentAt('$$\\int_0^1 f(x) dx$$', 6);
    expect(seg).toEqual({ math: '\\int_0^1 f(x) dx', display: true });
  });

  it('prefers $$ over $ when both delimiters are adjacent', () => {
    const seg = findMathSegmentAt('$$a+b$$', 3);
    expect(seg?.math).toBe('a+b');
    expect(seg?.display).toBe(true);
  });

  it('detects \\[ ... \\] display segments', () => {
    const seg = findMathSegmentAt('\\[ E = mc^2 \\]', 4);
    expect(seg).toEqual({ math: ' E = mc^2 ', display: true });
  });

  it('detects \\( ... \\) inline segments', () => {
    const seg = findMathSegmentAt('\\( a \\le b \\)', 4);
    expect(seg).toEqual({ math: ' a \\le b ', display: false });
  });

  it('detects \\begin{equation}...\\end{equation} bodies', () => {
    const src = '\\begin{equation}\n  \\frac{1}{2}\n\\end{equation}';
    const seg = findMathSegmentAt(src, 25);
    expect(seg?.display).toBe(true);
    expect(seg?.math).toContain('\\frac{1}{2}');
  });

  it('detects align environments with stars', () => {
    const src = '\\begin{align*}\na &= b \\\\\nc &= d\n\\end{align*}';
    const seg = findMathSegmentAt(src, 22);
    expect(seg?.display).toBe(true);
    expect(seg?.math).toContain('a &= b');
  });

  it('returns null when the cursor is outside math', () => {
    expect(findMathSegmentAt('plain text with $math$ inside', 4)).toBeNull();
    expect(findMathSegmentAt('', 0)).toBeNull();
  });

  it('ignores escaped dollar signs', () => {
    const src = 'Cost: \\$5 and $y=1$';
    const seg = findMathSegmentAt(src, 9);
    expect(seg).toBeNull();
  });

  it('does not match a stray unclosed dollar', () => {
    expect(findMathSegmentAt('price $5', 5)).toBeNull();
  });
});

describe('renderMathHtml', () => {
  it('produces MathML for screen readers (§30)', () => {
    const html = renderMathHtml('x^2', false);
    expect(html).toContain('<math');
    expect(html).toContain('<annotation');
  });

  it('renders display math with displayMode', () => {
    const html = renderMathHtml('\\frac{a}{b}', true);
    expect(html).toContain('<math');
  });

  it('never throws on malformed math', () => {
    expect(() => renderMathHtml('\\frac{', false)).not.toThrow();
  });
});