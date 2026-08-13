import { describe, it, expect } from 'vitest';
import { CTAN_PACKAGES, PACKAGE_LAST_ORDER, insertPackageContent, packageAlreadyLoaded } from '../ctanPackages';

const PREAMBLE = `\\documentclass[11pt]{article}
\\usepackage{geometry}
\\usepackage{amsmath}
\\begin{document}
Hello.
\\end{document}`;

describe('ctanPackages index', () => {
  it('covers all categories with unique names', () => {
    const names = CTAN_PACKAGES.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThan(100);
    expect(CTAN_PACKAGES.every(p => p.description.length > 10)).toBe(true);
  });

  it('marks order-sensitive packages in PACKAGE_LAST_ORDER', () => {
    for (const name of PACKAGE_LAST_ORDER) {
      expect(CTAN_PACKAGES.some(p => p.name === name)).toBe(true);
    }
  });
});

describe('packageAlreadyLoaded', () => {
  it('detects plain, optioned and commented surroundings', () => {
    expect(packageAlreadyLoaded('\\usepackage{tikz}', 'tikz')).toBe(true);
    expect(packageAlreadyLoaded('\\usepackage[utf8]{inputenc}', 'inputenc')).toBe(true);
    expect(packageAlreadyLoaded('\\usepackage{tikz}', 'pgfplots')).toBe(false);
  });
});

describe('insertPackageContent', () => {
  it('inserts after the last usepackage line', () => {
    const { content, inserted } = insertPackageContent(PREAMBLE, 'tcolorbox');
    expect(inserted).toBe(true);
    const lines = content.split('\n');
    expect(lines[3]).toBe('\\usepackage{tcolorbox}');
    expect(content).toContain('\\usepackage{amsmath}\n\\usepackage{tcolorbox}');
  });

  it('keeps same-named packages from being duplicated', () => {
    const { content, inserted } = insertPackageContent(PREAMBLE, 'amsmath');
    expect(inserted).toBe(false);
    expect(content).toBe(PREAMBLE);
  });

  it('appends after documentclass when no usepackage exists yet', () => {
    const bare = '\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}';
    const { content, inserted } = insertPackageContent(bare, 'amsmath');
    expect(inserted).toBe(true);
    expect(content).toBe('\\documentclass{article}\n\\usepackage{amsmath}\n\\begin{document}\nHi\n\\end{document}');
  });

  it('prepends to a preamble-less document', () => {
    const { content, inserted } = insertPackageContent('\\begin{document}Hi\\end{document}', 'amsmath');
    expect(inserted).toBe(true);
    expect(content).toMatch(/^\\usepackage\{amsmath\}\n\\begin\{document\}/);
  });

  it('places order-sensitive packages after everything, before \\begin{document}', () => {
    let doc = PREAMBLE;
    for (const name of ['xcolor', 'cleveref', 'hyperref']) {
      const r = insertPackageContent(doc, name);
      expect(r.inserted).toBe(true);
      doc = r.content;
    }
    expect(doc).toContain('\\usepackage{xcolor}');
    const lines = doc.split('\n');
    const beginIdx = lines.indexOf('\\begin{document}');
    expect(lines[beginIdx - 2]).toBe('\\usepackage{cleveref}');
    expect(lines[beginIdx - 1]).toBe('\\usepackage{hyperref}');
  });

  it('handles optioned usepackage lines when finding the insertion point', () => {
    const doc = '\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\begin{document}x\\end{document}';
    const { content } = insertPackageContent(doc, 'geometry');
    expect(content).toBe(doc.replace('\\begin{document}', '\\usepackage{geometry}\n\\begin{document}'));
  });
});