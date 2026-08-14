import { describe, it, expect } from 'vitest';
import { getCompileBackend, COMPILE_BACKEND_IDS, ParserCompileBackend } from '../compileBackends';

describe('compileBackends (§4A)', () => {
  it('exposes the parser backend as the only registered backend', () => {
    expect(COMPILE_BACKEND_IDS).toEqual(['parser']);
  });

  it('factory returns the parser backend by default', () => {
    const backend = getCompileBackend();
    expect(backend).toBeInstanceOf(ParserCompileBackend);
    expect(backend.id).toBe('parser');
    expect(backend.capabilities).toContain('pdf');
    expect(backend.capabilities).toContain('lint');
  });

  it('falls back to the parser backend for unknown ids', () => {
    expect(getCompileBackend('docker-texlive').id).toBe('parser');
  });

  it('delegates compile to the parser engine', async () => {
    const backend = getCompileBackend();
    const result = await backend.compile({
      mainFilePath: 'main.tex',
      files: [{ id: 'f1', projectId: 'p1', path: 'main.tex', type: 'TEX', content: '\\documentclass{article}\\begin{document}Hello\\end{document}', sizeBytes: 0, updatedAt: new Date().toISOString() }],
      compiler: 'PDFLATEX',
      bibTool: 'NONE',
    });
    expect(result.status).toBe('success');
    expect(result.pdfDataUrl).toBeTruthy();
  });
});