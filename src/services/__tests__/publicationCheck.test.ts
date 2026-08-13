import { describe, it, expect } from 'vitest';
import { ProjectFile } from '../../types';
import { runPublicationCheck } from '../publicationCheck';

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

describe('runPublicationCheck', () => {
  it('flags a missing main file', () => {
    const findings = runPublicationCheck('main.tex', []);
    expect(findings.some(f => f.severity === 'error' && f.message.includes('not found'))).toBe(true);
  });

  it('flags missing title and author', () => {
    const findings = runPublicationCheck('main.tex', [tex('\\documentclass{article}\\begin{document}Text.\\end{document}')]);
    expect(findings.some(f => f.category === 'metadata' && f.severity === 'error' && f.message.includes('\\title'))).toBe(true);
    expect(findings.some(f => f.category === 'metadata' && f.severity === 'error' && f.message.includes('\\author'))).toBe(true);
  });

  it('flags a missing abstract', () => {
    const findings = runPublicationCheck('main.tex', [
      tex('\\documentclass{article}\n\\title{T}\\author{A}\n\\begin{document}\\maketitle\nContent.\\end{document}'),
    ]);
    expect(findings.some(f => f.message.includes('no abstract'))).toBe(true);
  });

  it('flags references without labels as blockers', () => {
    const findings = runPublicationCheck('main.tex', [
      tex('\\documentclass{article}\\begin{document}\\ref{sec:x}\\end{document}'),
    ]);
    expect(findings.some(f => f.severity === 'error' && f.category === 'citations' && f.message.includes('sec:x'))).toBe(true);
  });

  it('flags duplicate labels as warnings', () => {
    const findings = runPublicationCheck('main.tex', [
      tex('\\documentclass{article}\\begin{document}\\label{a}\\label{a}\\end{document}'),
    ]);
    expect(findings.some(f => f.severity === 'warning' && f.message.includes('Duplicate'))).toBe(true);
  });

  it('notes when the document never cites anything', () => {
    const findings = runPublicationCheck('main.tex', [
      tex('\\documentclass{article}\\begin{document}No citations.\\end{document}'),
      bib('@article{x2024, author={X}, title={Y}}'),
    ]);
    expect(findings.some(f => f.category === 'citations' && f.severity === 'info' && f.message.includes('does not cite'))).toBe(true);
  });

  it('reports a well-formed document as ready', () => {
    const files = [
      tex(
        '\\documentclass{article}\n\\title{Complete Paper}\n\\author{A. Author}\n\\date{2024}\n' +
          '\\begin{document}\n\\maketitle\n\\begin{abstract}Summary here.\\end{abstract}\n' +
          '\\section{Intro}\nSome intro text with enough words to pass the length check without being too short and triggering the guidance.' +
          ' More text follows so the body comfortably exceeds the minimum threshold used by this check.\n' +
          '\\cite{smith2024}\n\\label{sec:intro}\n\\section{Method}\nRefer to \\ref{sec:intro}.\n\\end{document}\n'
      ),
      bib('@article{smith2024, author={A. Smith}, title={Done}}'),
    ];
    const findings = runPublicationCheck('main.tex', files);
    expect(findings.filter(f => f.severity === 'error')).toHaveLength(0);
  });
});