import { describe, it, expect } from 'vitest';
import { findBestSourceLine, lcsLength, normalizeSourceLine, normalizeTextFragment } from '../syncTexMatch';

describe('syncTexMatch', () => {
  it('normalizes a text fragment (strips commands, braces, case)', () => {
    expect(normalizeTextFragment('The \\textbf{quick} brown fox')).toBe('the quick brown fox');
    expect(normalizeTextFragment('  Multi   space\nand $math$')).toBe('multi space and math');
  });

  it('normalizes a source line (comments, math, environments, commands)', () => {
    expect(normalizeSourceLine('  The \\emph{quick} % inline comment')).toBe('the quick');
    expect(normalizeSourceLine('\\begin{equation} x = y \\end{equation}')).toBe('x y');
    expect(normalizeSourceLine('A $\\alpha$-helix motif')).toBe('a helix motif');
  });

  it('computes a bounded longest common substring', () => {
    expect(lcsLength('abcdef', 'xxabcxx')).toBe(3);
    expect(lcsLength('abc', 'xyz')).toBe(0);
    expect(lcsLength('', 'abc')).toBe(0);
  });

  it('finds the best matching source line', () => {
    const tex = [
      '\\documentclass{article}',
      '\\begin{document}',
      '\\section{Introduction}',
      'Here we study the behaviour of quantum dots.',
      '\\section{Methods}',
      'We used a scanning tunnelling microscope.',
      '\\end{document}',
    ].join('\n');

    const match = findBestSourceLine(tex, 'We used a scanning tunnelling microscope');
    expect(match).not.toBeNull();
    expect(match!.line).toBe(6);
  });

  it('prefers the longer overlap over an earlier weaker one', () => {
    const tex = 'First mention of quantum dots.\nLater, a fuller discussion of quantum dot behaviour and size.';
    const match = findBestSourceLine(tex, 'quantum dot behaviour');
    expect(match).not.toBeNull();
    expect(match!.line).toBe(2);
  });

  it('returns null for fragments too short or with no overlap', () => {
    const tex = 'One two three four five.';
    expect(findBestSourceLine(tex, 'no')).toBeNull();
    expect(findBestSourceLine(tex, 'zzz')).toBeNull();
    expect(findBestSourceLine(tex, '')).toBeNull();
  });

  it('ignores empty/commented source lines', () => {
    const tex = '% just a comment\n\\begin{document}\nActual content here.';
    const match = findBestSourceLine(tex, 'Actual content here');
    expect(match).not.toBeNull();
    expect(match!.line).toBe(3);
  });
});