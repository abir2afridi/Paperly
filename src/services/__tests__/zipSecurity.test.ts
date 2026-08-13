import { describe, it, expect } from 'vitest';
import {
  sanitizeProjectFilePath,
  validateZipImport,
  fileTypeFromPath,
  ZIP_MAX_FILES,
  ZIP_MAX_UNCOMPRESSED_BYTES,
} from '../zipSecurity';

describe('sanitizeProjectFilePath', () => {
  it('accepts a normal relative path', () => {
    expect(sanitizeProjectFilePath('main.tex')).toBe('main.tex');
    expect(sanitizeProjectFilePath('figures/chart.png')).toBe('figures/chart.png');
  });

  it('normalizes backslashes and leading ./', () => {
    expect(sanitizeProjectFilePath('.\\figs\\a.png')).toBe('figs/a.png');
    expect(sanitizeProjectFilePath('./main.tex')).toBe('main.tex');
  });

  it('rejects traversal', () => {
    expect(sanitizeProjectFilePath('../secret.txt')).toBeNull();
    expect(sanitizeProjectFilePath('a/../../etc/passwd')).toBeNull();
    expect(sanitizeProjectFilePath('..\\win.ini')).toBeNull();
  });

  it('rejects absolute paths, drive letters, UNC and null bytes', () => {
    expect(sanitizeProjectFilePath('/etc/passwd')).toBeNull();
    expect(sanitizeProjectFilePath('\\absolute\\path')).toBeNull();
    expect(sanitizeProjectFilePath('C:\\Windows\\x')).toBeNull();
    expect(sanitizeProjectFilePath('\\\\server\\share\\x')).toBeNull();
    expect(sanitizeProjectFilePath('a\u0000b.tex')).toBeNull();
  });

  it('rejects empty and dot-only paths', () => {
    expect(sanitizeProjectFilePath('')).toBeNull();
    expect(sanitizeProjectFilePath('.')).toBeNull();
    expect(sanitizeProjectFilePath('./')).toBeNull();
  });
});

describe('validateZipImport', () => {
  const okEntry = (path: string, size = 10) => ({
    path,
    isDirectory: false,
    uncompressedSize: size,
  });

  it('accepts a normal archive', () => {
    const res = validateZipImport([okEntry('main.tex'), okEntry('refs.bib')]);
    expect(res.ok).toBe(true);
    expect(res.files.map(f => f.path)).toEqual(['main.tex', 'refs.bib']);
  });

  it('rejects traversal paths in the archive', () => {
    const res = validateZipImport([okEntry('main.tex'), okEntry('../evil.sh')]);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('unsafe path');
  });

  it('rejects symlink entries', () => {
    const res = validateZipImport([
      okEntry('main.tex'),
      { path: 'link.tex', isDirectory: false, uncompressedSize: 0, unixPermissions: 0o120777 },
    ]);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('symbolic link');
  });

  it('rejects archives with too many files', () => {
    const entries = Array.from({ length: ZIP_MAX_FILES + 1 }, (_, i) => okEntry(`f${i}.tex`));
    const res = validateZipImport(entries);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('limit');
  });

  it('rejects oversized archives', () => {
    const entries = Array.from({ length: 10 }, () => okEntry('big.bin', ZIP_MAX_UNCOMPRESSED_BYTES / 5));
    const res = validateZipImport(entries);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('MB limit');
  });
});

describe('fileTypeFromPath', () => {
  it('maps extensions to FileType', () => {
    expect(fileTypeFromPath('main.tex')).toBe('TEX');
    expect(fileTypeFromPath('refs.bib')).toBe('BIB');
    expect(fileTypeFromPath('style.cls')).toBe('CLS');
    expect(fileTypeFromPath('mystyle.sty')).toBe('STY');
    expect(fileTypeFromPath('img.png')).toBe('IMAGE');
    expect(fileTypeFromPath('IMG.JPG')).toBe('IMAGE');
    expect(fileTypeFromPath('doc.pdf')).toBe('PDF');
    expect(fileTypeFromPath('notes.txt')).toBe('OTHER');
  });
});