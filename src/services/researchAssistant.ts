/**
 * Research assistant (§42, §43): client-side PDF text extraction for
 * literature review, Semantic Scholar search, BibTeX generation and an AI
 * fact-check/literature-review prompt builder. The AI call itself goes
 * through the existing /api/ai/generate proxy (see aiEngine.aiGenerate).
 */

export interface PdfTextResult {
  text: string;
  pageCount: number;
  wordCount: number;
}

const WORKER_SRC = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/** Extract plain text from a PDF binary via pdf.js (no rendering needed). */
export async function extractPdfText(data: ArrayBuffer | Blob): Promise<PdfTextResult> {
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

  const binary = data instanceof Blob ? await data.arrayBuffer() : data;
  const loadingTask = lib.getDocument({ data: binary });
  const document = await loadingTask.promise;
  try {
    const pages: string[] = [];
    for (let p = 1; p <= document.numPages; p++) {
      const page = await document.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items as unknown as { str?: string }[];
      const pageText = items.map(i => (typeof i.str === 'string' ? i.str : '')).join(' ');
      pages.push(pageText);
    }
    const text = pages.join('\n\n');
    return {
      text,
      pageCount: document.numPages,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    };
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

// ---- Multi-paper excerpt combining (§42) ----

export interface PaperExcerpt {
  name: string;
  excerpt: string;
  pageCount: number;
  wordCount: number;
}

const MAX_EXCERPT_PER_PAPER = 6000;
const MAX_EXCERPT_TOTAL = 18000;

/**
 * Combine several extracted papers into one bounded source excerpt for the AI.
 * Each paper contributes at most MAX_EXCERPT_PER_PAPER characters, and the
 * combined payload never exceeds MAX_EXCERPT_TOTAL characters (papers are
 * added in upload order, oldest first).
 */
export function combinePaperExcerpts(papers: PaperExcerpt[]): string {
  let budget = MAX_EXCERPT_TOTAL;
  const parts: string[] = [];
  for (const paper of papers) {
    const excerpt = paper.excerpt.slice(0, Math.min(MAX_EXCERPT_PER_PAPER, budget)).trim();
    if (!excerpt) continue;
    budget -= excerpt.length;
    parts.push(`--- ${paper.name} ---\n${excerpt}`);
    if (budget <= 0) break;
  }
  return parts.join('\n\n');
}

// ---- Semantic Scholar search (§43) ----

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  year?: number;
  abstract?: string;
  authors: string[];
  venue?: string;
  citationCount: number;
  url?: string;
  doi?: string;
}

interface RawScholarHit {
  paperId?: string;
  title?: string;
  year?: number;
  abstract?: string;
  venue?: string;
  citationCount?: number;
  url?: string;
  externalIds?: { DOI?: string };
  authors?: { name?: string }[];
}

/** Query the public Semantic Scholar graph API (no key needed). */
export async function searchSemanticScholar(query: string, limit = 8): Promise<SemanticScholarPaper[]> {
  const params = new URLSearchParams({
    query,
    limit: String(Math.min(Math.max(limit, 1), 20)),
    fields: 'title,abstract,year,authors,venue,citationCount,url,externalIds',
  });
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`;

  let response: Response | null = null;
  // Unauthenticated requests are rate-limited to ~1/s; retry once on 429.
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.status !== 429) break;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  if (!response || !response.ok) {
    const status = response?.status ?? 0;
    if (status === 404) return []; // No matches
    throw new Error(`Semantic Scholar request failed (HTTP ${status}).`);
  }

  const data = (await response.json()) as { data?: RawScholarHit[] };
  return (data.data || [])
    .filter(hit => hit.title)
    .map(hit => ({
      paperId: hit.paperId || '',
      title: hit.title || 'Untitled',
      year: hit.year,
      abstract: hit.abstract,
      venue: hit.venue,
      citationCount: hit.citationCount || 0,
      url: hit.url,
      doi: hit.externalIds?.DOI,
      authors: (hit.authors || []).map(a => a.name || '').filter(Boolean),
    }));
}

// ---- BibTeX generation ----

function sanitizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40) || 'ref';
}

/** Derive a cite key like "smith2020attention". */
export function paperCiteKey(paper: SemanticScholarPaper): string {
  const surname = paper.authors[0]?.split(/\s+/).pop() || 'unknown';
  const titleWord = paper.title.split(/\s+/).find(w => w.length > 3) || 'paper';
  return `${sanitizeKey(surname)}${paper.year || ''}${sanitizeKey(titleWord)}`.slice(0, 60);
}

export function papersToBibtex(papers: SemanticScholarPaper[]): string {
  return papers
    .map(paper => {
      const key = paperCiteKey(paper);
      const authors = paper.authors.length > 0 ? paper.authors.join(' and ') : 'Unknown';
      const year = paper.year ? `  year = {${paper.year}},\n` : '';
      const venue = paper.venue ? `  journal = {${paper.venue}},\n` : '';
      const doi = paper.doi ? `  doi = {${paper.doi}},\n` : '';
      const url = !paper.doi && paper.url ? `  url = {${paper.url}},\n` : '';
      return [
        `@article{${key},`,
        `  title = {${paper.title.replace(/[{}]/g, '')}},`,
        `  author = {${authors}},`,
        `${year}${venue}${doi}${url}  note = {Added via Paperly research assistant}`,
        '}',
      ]
        .filter(l => l.trim() !== '')
        .join('\n');
    })
    .join('\n\n');
}

// ---- AI prompts (§42, §43) ----

export interface LiteratureReviewInput {
  topic: string;
  /** Excerpt of the uploaded PDF (first ~4000 chars) or existing abstract. */
  sourceExcerpt: string;
  papers: SemanticScholarPaper[];
}

/** Prompt for generating a LaTeX literature-review section from the sources. */
export function buildLiteratureReviewPrompt(input: LiteratureReviewInput): string {
  const papersBlock = input.papers
    .map(p => `- [${paperCiteKey(p)}] ${p.title} (${p.authors[0] || 'Unknown'}${p.year ? `, ${p.year}` : ''})${p.abstract ? ` — ${p.abstract.slice(0, 500)}` : ''}`)
    .join('\n');

  return [
    'You are an academic ghost-writer producing a LaTeX literature review.',
    `Research topic: ${input.topic}`,
    '',
    'Uploaded paper excerpt (context):',
    input.sourceExcerpt ? input.sourceExcerpt.slice(0, 4000) : '(no PDF uploaded)',
    '',
    'Relevant literature found via Semantic Scholar:',
    papersBlock || '(none found — synthesise from your own knowledge, and say so)',
    '',
    'Write a section titled \\section{Literature Review}. Use \\cites{} citations with the',
    'BibTeX keys shown in the list above (add them via "Add to bibliography" first).',
    'Strictly do not fabricate citations. 400-700 words, LaTeX only, no preamble.',
  ].join('\n');
}

/** Prompt for the fact-check tool (§43): verify claims against a source. */
export function buildFactCheckPrompt(claim: string, sourceExcerpt: string): string {
  return [
    'You are a fact-checking assistant. Verify the following claim against the provided source text.',
    '',
    `Claim: ${claim}`,
    '',
    'Source text:',
    sourceExcerpt.slice(0, 4000),
    '',
    'Answer with three short sections: SUPPORTED / REFUTED / UNCERTAIN verdict with a one-line reason,',
    'direct quotes from the source that support your verdict, and what additional sources would settle it.',
  ].join('\n');
}