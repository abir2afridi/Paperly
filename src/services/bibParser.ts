import { BibEntry } from '../types';

/**
 * Parses raw BibTeX string into structured BibEntry objects
 */
export function parseBibtex(bibContent: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)(?=\n@|\n\}$|$)/g;

  let match;
  while ((match = entryRegex.exec(bibContent)) !== null) {
    const type = match[1].toLowerCase();
    const citeKey = match[2].trim();
    const body = match[3];

    const getField = (fieldName: string): string => {
      const fieldRegex = new RegExp(`${fieldName}\\s*=\\s*[\"{]?([^\"}\\,\\n]+)[\"}]?`, 'i');
      const m = body.match(fieldRegex);
      return m ? m[1].trim() : '';
    };

    const title = getField('title') || citeKey;
    const author = getField('author') || 'Unknown Author';
    const year = getField('year');
    const journal = getField('journal') || getField('booktitle');
    const publisher = getField('publisher');

    entries.push({
      citeKey,
      type,
      title,
      author,
      year,
      journal,
      publisher,
      rawBibtex: match[0].trim(),
    });
  }

  return entries;
}

/**
 * Formats metadata into a clean BibTeX entry string
 */
export function formatBibtexEntry(entry: {
  type: string;
  citeKey: string;
  title: string;
  author: string;
  year?: string;
  journal?: string;
  publisher?: string;
  doi?: string;
}): string {
  let bib = `@${entry.type.toLowerCase()}{${entry.citeKey},\n`;
  bib += `  title = {${entry.title}},\n`;
  bib += `  author = {${entry.author}},\n`;
  if (entry.year) bib += `  year = {${entry.year}},\n`;
  if (entry.journal) bib += `  journal = {${entry.journal}},\n`;
  if (entry.publisher) bib += `  publisher = {${entry.publisher}},\n`;
  if (entry.doi) bib += `  doi = {${entry.doi}},\n`;
  bib += `}\n`;
  return bib;
}
