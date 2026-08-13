import { describe, it, expect } from 'vitest';
import { parseLatexLog } from '../latexCompiler';

describe('parseLatexLog', () => {
  it('parses a LaTeX error with line number', () => {
    const log = [
      'This is pdfTeX, Version 3.14159265 (TeX Live 2024)',
      '(./main.tex',
      '! LaTeX Error: File \'missing.sty\' not found.',
      'l.24 \\usepackage{missing}',
      '',
      '?',
    ].join('\n');

    const diags = parseLatexLog(log, []);
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe('error');
    expect(diags[0].line).toBe(24);
    expect(diags[0].file).toBe('main.tex');
    expect(diags[0].message).toContain("missing.sty");
  });

  it('parses undefined control sequence', () => {
    const log = [
      '! Undefined control sequence.',
      'l.10 \\unknowncmd',
      '',
    ].join('\n');

    const diags = parseLatexLog(log, []);
    expect(diags[0].severity).toBe('error');
    expect(diags[0].line).toBe(10);
  });

  it('parses warnings', () => {
    const log = [
      'LaTeX Warning: Citation \'ref1\' on page 3 undefined on input line 41.',
    ].join('\n');

    const diags = parseLatexLog(log, []);
    expect(diags[0].severity).toBe('warning');
    expect(diags[0].line).toBe(41);
    expect(diags[0].message).toContain('ref1');
  });

  it('parses overfull hbox info lines', () => {
    const log = [
      'Overfull \\hbox (12.34567pt too wide) in paragraph at lines 7--9',
    ].join('\n');

    const diags = parseLatexLog(log, []);
    expect(diags[0].severity).toBe('info');
    expect(diags[0].line).toBe(7);
  });

  it('returns no diagnostics for a clean log', () => {
    const log = [
      'This is pdfTeX, Version 3.14159265 (TeX Live 2024)',
      'Output written on main.pdf (3 pages).',
    ].join('\n');
    expect(parseLatexLog(log, [])).toHaveLength(0);
  });

  it('tracks file context across included files', () => {
    const log = [
      '(./main.tex',
      '! LaTeX Error: Something bad.',
      'l.5 \\bad',
      '(./chapter1.tex',
      '! LaTeX Error: Another thing.',
      'l.12 \\worse',
    ].join('\n');

    const diags = parseLatexLog(log, []);
    expect(diags[0].file).toBe('main.tex');
    expect(diags[1].file).toBe('chapter1.tex');
  });
});