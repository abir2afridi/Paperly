import { describe, it, expect } from 'vitest';
import { diffLines, diffSnapshots, texWordCount } from '../snapshotDiff';
import { ProjectSnapshot } from '../../types';

const snap = (id: string, files: { path: string; content: string }[]): ProjectSnapshot => ({
  id,
  projectId: 'p1',
  title: id,
  createdAt: new Date().toISOString(),
  files,
});

describe('diffLines', () => {
  it('returns identical lines as "same"', () => {
    const out = diffLines('a\nb\nc', 'a\nb\nc');
    expect(out.every(l => l.type === 'same')).toBe(true);
    expect(out).toHaveLength(3);
  });

  it('marks insertions and deletions', () => {
    const out = diffLines('a\nb\nc', 'a\nx\nc');
    expect(out.filter(l => l.type === 'add').map(l => l.text)).toEqual(['x']);
    expect(out.filter(l => l.type === 'remove').map(l => l.text)).toEqual(['b']);
  });

  it('handles empty inputs', () => {
    expect(diffLines('', '')).toEqual([]);
    expect(diffLines('', 'x')).toEqual([{ type: 'add', text: 'x', bIndex: 1 }]);
    expect(diffLines('x', '')).toEqual([{ type: 'remove', text: 'x', aIndex: 1 }]);
  });

  it('ignores a trailing newline difference', () => {
    const out = diffLines('a\nb\n', 'a\nb');
    expect(out.filter(l => l.type !== 'same')).toHaveLength(0);
  });

  it('falls back to full replace for huge inputs', () => {
    const big = Array.from({ length: 5000 }, (_, i) => `line${i}`).join('\n');
    const out = diffLines(big, 'x');
    expect(out.filter(l => l.type === 'add').length).toBe(1);
    expect(out.filter(l => l.type === 'remove').length).toBe(5000);
  });
});

describe('texWordCount', () => {
  it('counts words and skips commands/comments/math', () => {
    const n = texWordCount([
      { path: 'main.tex', content: '% comment\n\\section{Intro}\nThis is a test sentence.\n$E = mc^2$\n' },
    ]);
    expect(n).toBe(5); // This is a test sentence.
  });

  it('ignores non-tex files', () => {
    expect(texWordCount([{ path: 'notes.txt', content: 'lots of words here' }])).toBe(0);
  });
});

describe('diffSnapshots', () => {
  const base = snap('v1', [
    { path: 'main.tex', content: '\\title{T}\nHello world.\n' },
    { path: 'refs.bib', content: '@article{a, title={A}}' },
  ]);
  const next = snap('v2', [
    { path: 'main.tex', content: '\\title{T}\nHello brave world.\n' },
    { path: 'refs.bib', content: '@article{a, title={A}}' },
    { path: 'new.tex', content: '\\section{New}\n' },
  ]);

  it('reports changed files with statuses', () => {
    const { files } = diffSnapshots(base, next);
    const byPath = Object.fromEntries(files.map(f => [f.path, f.status]));
    expect(byPath['main.tex']).toBe('modified');
    expect(byPath['new.tex']).toBe('added');
    expect(byPath['refs.bib']).toBeUndefined();
  });

  it('summarizes line and word deltas', () => {
    const { summary } = diffSnapshots(base, next);
    expect(summary.filesChanged).toBe(2);
    expect(summary.linesAdded).toBe(2); // "brave world." + new.tex section
    expect(summary.linesRemoved).toBe(1); // "Hello world." -> "Hello brave world."
    expect(summary.wordCountDelta).toBe(1); // "brave" added
  });

  it('detects removed files', () => {
    const { files } = diffSnapshots(next, base);
    expect(files.find(f => f.path === 'new.tex')?.status).toBe('removed');
  });

  it('returns empty diff for identical snapshots', () => {
    const { files, summary } = diffSnapshots(base, snap('copy', base.files));
    expect(files).toHaveLength(0);
    expect(summary.filesChanged).toBe(0);
  });
});