import { formatBibtexEntry } from './bibParser';

export interface CrossRefResult {
  doi: string;
  title: string;
  author: string;
  year?: string;
  journal?: string;
  publisher?: string;
  bibtex: string;
  citeKey: string;
}

/**
 * Fetches publication metadata by DOI or title from CrossRef public API
 */
export async function fetchCitationByDoi(query: string): Promise<CrossRefResult> {
  const cleanQuery = query.trim().replace(/^https?:\/\/doi\.org\//, '');
  
  // Try direct DOI lookup first
  const doiUrl = `https://api.crossref.org/works/${encodeURIComponent(cleanQuery)}`;
  
  try {
    const res = await fetch(doiUrl, {
      headers: {
        'User-Agent': 'TeXForge/1.0 (mailto:support@texforge.org)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const item = data.message;
      return parseCrossRefItem(item);
    }
  } catch {
    // Fall back to title search
  }

  // Fallback title query search
  const searchUrl = `https://api.crossref.org/works?query=${encodeURIComponent(cleanQuery)}&rows=1`;
  const searchRes = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'TeXForge/1.0 (mailto:support@texforge.org)',
    },
  });

  if (!searchRes.ok) {
    throw new Error(`CrossRef API returned status ${searchRes.status}. Please check the DOI or title.`);
  }

  const searchData = await searchRes.json();
  const items = searchData.message?.items;

  if (!items || items.length === 0) {
    throw new Error('No matching publications found for that DOI or title.');
  }

  return parseCrossRefItem(items[0]);
}

function parseCrossRefItem(item: Record<string, unknown>): CrossRefResult {
  const titleList = item.title as string[] | undefined;
  const title = titleList && titleList.length > 0 ? titleList[0] : 'Untitled Work';

  const authorList = item.author as { given?: string; family?: string }[] | undefined;
  let author = 'Unknown Author';
  if (authorList && authorList.length > 0) {
    author = authorList.map(a => `${a.family || ''}, ${a.given || ''}`.trim().replace(/^,|,$/g, '')).join(' and ');
  }

  const createdObj = item.created as { 'date-parts'?: number[][] } | undefined;
  const yearNum = createdObj && createdObj['date-parts']?.[0]?.[0];
  const year = yearNum ? yearNum.toString() : undefined;

  const containerList = item['container-title'] as string[] | undefined;
  const journal = containerList && containerList.length > 0 ? containerList[0] : undefined;
  const publisher = item.publisher as string | undefined;
  const doi = (item.DOI as string) || '10.0000/unknown';

  // Generate cite key e.g. "smith2024title"
  const firstAuthorSurname = authorList && authorList[0]?.family ? authorList[0].family.toLowerCase().replace(/[^a-z]/g, '') : 'ref';
  const shortTitleWord = title.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  const citeKey = `${firstAuthorSurname}${year || '2024'}${shortTitleWord}`;

  const bibtex = formatBibtexEntry({
    type: 'article',
    citeKey,
    title,
    author,
    year,
    journal,
    publisher,
    doi,
  });

  return {
    doi,
    title,
    author,
    year,
    journal,
    publisher,
    bibtex,
    citeKey,
  };
}
