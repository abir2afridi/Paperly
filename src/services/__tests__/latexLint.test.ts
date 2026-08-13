import { describe, it, expect } from 'vitest';
import { ProjectFile } from '../../types';
import { runLatexLint } from '../latexLint';

const tex = (content: string, path = 'main.tex'): ProjectFile => ({
  id: `f-${path}`,
  projectId: 'p1',
  path,
  type: 'TEX',
  content,
  sizeBytes: content.length,
  updatedAt: new Date().toISOString(),
});

const bib = (content: string, path = 'references.bib'): ProjectFile => ({
  id: `f-${path}`,
  projectId: 'p1',
  path,
  type: 'BIB',
  content,
  sizeBytes: content.length,
  updatedAt: new Date().toISOString(),
});

const DOC = '\\documentclass{article}\n\\begin{document}\nHello.\n\\end{document}\n';

describe('runLatexLint', () => {
  it('flags citations that are not defined in any .bib file', () => {
    const files = [
      tex(`\\documentclass{article}\\begin{document}\\cite{ghost}\\end{document}`),
      bib('@article{smith2024, author={A. Smith}, title={T}}\n\\bibliography{refs}\n'),
    ];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.severity === 'warning' && f.message.includes("'ghost'"))).toBe(true);
  });

  it('does not flag citations that exist in the .bib file', () => {
    const files = [
      tex('\\documentclass{article}\\begin{document}\\cite{smith2024}\\end{document}'),
      bib('@article{smith2024, author={A. Smith}, title={T}}\n\\bibliography{refs}\n'),
    ];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.message.includes('smith2024') && f.severity === 'warning')).toBe(false);
  });

  it('warns when the document cites but there are no .bib files', () => {
    const files = [tex(`\\documentclass{article}\\begin{document}\\cite{key}\\bibliography{refs}\\end{document}`)];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.message.includes('no .bib file'))).toBe(true);
  });

  it('flags references without matching labels', () => {
    const files = [tex('\\documentclass{article}\\begin{document}\\ref{sec:missing}\\end{document}')];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.severity === 'warning' && f.message.includes('sec:missing'))).toBe(true);
  });

  it('flags duplicate labels', () => {
    const files = [
      tex('\\documentclass{article}\n\\begin{document}\n\\label{sec:a}\n\\label{sec:a}\n\\end{document}'),
    ];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.severity === 'warning' && f.message.includes('Duplicate'))).toBe(true);
  });

  it('flags unused packages whose usage can be verified', () => {
    const files = [tex(DOC + '\\usepackage{amsmath}\n')];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.severity === 'info' && f.message.includes("'amsmath'"))).toBe(true);
  });

  it('does not flag packages that are actually used', () => {
    const files = [tex('\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\n\\begin{align}x&=y\\end{align}\n\\end{document}')];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.message.includes("'amsmath'"))).toBe(false);
  });

  it('warns about a missing document environment', () => {
    const files = [tex('\\documentclass{article}\nTitle text without a body.')];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.severity === 'warning' && f.message.includes('\\begin{document}'))).toBe(true);
  });

  it('flags draft TODO leftovers', () => {
    const files = [tex('\\documentclass{article}\n% TODO: finish this section\n\\begin{document}x\\end{document}')];
    const findings = runLatexLint('main.tex', files);
    expect(findings.some(f => f.severity === 'info' && f.message.includes('TODO'))).toBe(true);
  });

  it('emits nothing for a clean document', () => {
    const files = [tex('\\documentclass{article}\n\\begin{document}\nHello.\n\\end{document}\n')];
    const findings = runLatexLint('main.tex', files);
    expect(findings).toEqual([]);
  });
});