import { describe, it, expect } from 'vitest';
import { parseBibtex, formatBibtexEntry } from '../bibParser';

const SAMPLE_BIB = `@article{knuth1984,
  title = {Literate Programming},
  author = {Knuth, Donald E.},
  year = {1984},
  journal = {The Computer Journal},
  volume = {27},
  number = {2},
  pages = {97--111}
}

@inproceedings{lamport1994,
  title = {LaTeX: A Document Preparation System},
  author = {Lamport, Leslie},
  year = {1994},
  booktitle = {Addison-Wesley}
}
`;

describe('parseBibtex', () => {
  it('parses all entries with core fields', () => {
    const entries = parseBibtex(SAMPLE_BIB);
    expect(entries).toHaveLength(2);

    expect(entries[0].citeKey).toBe('knuth1984');
    expect(entries[0].type).toBe('article');
    expect(entries[0].title).toBe('Literate Programming');
    expect(entries[0].author).toBe('Knuth, Donald E.');
    expect(entries[0].year).toBe('1984');
    expect(entries[0].journal).toBe('The Computer Journal');
    expect(entries[0].rawBibtex).toContain('@article{knuth1984');

    expect(entries[1].citeKey).toBe('lamport1994');
    expect(entries[1].journal).toBe('Addison-Wesley'); // booktitle fallback
  });

  it('returns empty array for empty input', () => {
    expect(parseBibtex('')).toEqual([]);
    expect(parseBibtex('% just a comment')).toEqual([]);
  });
});

describe('formatBibtexEntry', () => {
  it('produces a valid BibTeX entry with given fields', () => {
    const bib = formatBibtexEntry({
      type: 'article',
      citeKey: 'smith2024ai',
      title: 'The Title',
      author: 'Smith, Jane',
      year: '2024',
      journal: 'JMLR',
      doi: '10.1234/xyz',
    });

    expect(bib).toContain('@article{smith2024ai,');
    expect(bib).toContain('title = {The Title},');
    expect(bib).toContain('author = {Smith, Jane},');
    expect(bib).toContain('year = {2024},');
    expect(bib).toContain('journal = {JMLR},');
    expect(bib).toContain('doi = {10.1234/xyz},');
  });

  it('omits optional fields when absent', () => {
    const bib = formatBibtexEntry({
      type: 'book',
      citeKey: 'key',
      title: 'T',
      author: 'A',
    });
    expect(bib).not.toContain('year');
    expect(bib).not.toContain('doi');
    expect(bib).not.toContain('journal');
  });
});