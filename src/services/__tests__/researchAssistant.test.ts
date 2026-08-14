import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildFactCheckPrompt,
  buildLiteratureReviewPrompt,
  paperCiteKey,
  papersToBibtex,
  searchSemanticScholar,
  extractPdfText,
} from '../researchAssistant';

const originalFetch = globalThis.fetch;

function mockFetchOnce(status: number, body: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

const PAPER: import('../researchAssistant').SemanticScholarPaper = {
  paperId: 'p1',
  title: 'Attention Is All You Need',
  year: 2017,
  authors: ['Ashish Vaswani', 'Noam Shazeer'],
  venue: 'NeurIPS',
  citationCount: 120000,
  url: 'https://arxiv.org/abs/1706.03762',
  doi: '10.48550/arXiv.1706.03762',
};

describe('searchSemanticScholar (§43)', () => {
  it('normalizes the graph API response', async () => {
    mockFetchOnce(200, {
      data: [
        {
          paperId: 'abc',
          title: 'Attention Is All You Need',
          year: 2017,
          venue: 'NeurIPS',
          citationCount: 99,
          url: 'https://x/y',
          externalIds: { DOI: '10.1/x' },
          authors: [{ name: 'A Vaswani' }, { name: 'N Shazeer' }],
        },
        { title: 'Untitled hit without authors' },
      ],
    });

    const results = await searchSemanticScholar('attention');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      paperId: 'abc',
      title: 'Attention Is All You Need',
      year: 2017,
      venue: 'NeurIPS',
      citationCount: 99,
      url: 'https://x/y',
      doi: '10.1/x',
      authors: ['A Vaswani', 'N Shazeer'],
      abstract: undefined,
    });
    expect(results[1].authors).toEqual([]);
  });

  it('returns [] on 404 (no matches) and throws on other failures', async () => {
    mockFetchOnce(404, {});
    expect(await searchSemanticScholar('zzz-nothing')).toEqual([]);

    mockFetchOnce(500, {});
    await expect(searchSemanticScholar('boom')).rejects.toThrow('HTTP 500');
  });

  it('retries once when rate limited (429)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}), text: () => Promise.resolve('') } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: [{ title: 'T', authors: [] }] }) } as Response);
    globalThis.fetch = fetchMock;

    const results = await searchSemanticScholar('retry me');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
  });
});

describe('papersToBibtex / paperCiteKey', () => {
  it('derives a stable cite key from author, year and title words', () => {
    expect(paperCiteKey(PAPER)).toBe('vaswani2017attention');
  });

  it('falls back gracefully for anonymous papers', () => {
    expect(paperCiteKey({ ...PAPER, authors: [] })).toMatch(/^unknown/);
  });

  it('renders a compilable @article entry', () => {
    const bib = papersToBibtex([PAPER]);
    expect(bib).toContain('@article{vaswani2017attention,');
    expect(bib).toContain('author = {Ashish Vaswani and Noam Shazeer}');
    expect(bib).toContain('year = {2017}');
    expect(bib).toContain('doi = {10.48550/arXiv.1706.03762}');
    expect(bib).toContain('title = {Attention Is All You Need}');
  });
});

describe('AI prompts (§42/§43)', () => {
  it('builds a literature review prompt with citations and no fabrication rule', () => {
    const prompt = buildLiteratureReviewPrompt({
      topic: 'Transformers',
      sourceExcerpt: 'Abstract excerpt.',
      papers: [PAPER],
    });
    expect(prompt).toContain('\\section{Literature Review}');
    expect(prompt).toContain('vaswani2017attention');
    expect(prompt).toContain('Strictly do not fabricate citations.');
  });

  it('builds a fact-check prompt with verdict structure', () => {
    const prompt = buildFactCheckPrompt('Transformers use attention', 'Source says transformers use attention.');
    expect(prompt).toContain('Claim: Transformers use attention');
    expect(prompt).toContain('SUPPORTED / REFUTED / UNCERTAIN');
  });
});

describe('extractPdfText (§42)', () => {
  it('extracts text from a PDF via pdf.js (module mocked)', async () => {
    const fakePage = {
      getTextContent: () => Promise.resolve({ items: [{ str: 'Hello' }, { str: 'world' }, { str: '!' }] }),
    };
    const fakeDoc = {
      numPages: 1,
      getPage: () => Promise.resolve(fakePage),
      destroy: () => Promise.resolve(),
    };
    const pdfMock = {
      GlobalWorkerOptions: { workerSrc: '' },
      getDocument: vi.fn().mockReturnValue({
        promise: Promise.resolve(fakeDoc),
        destroy: vi.fn().mockResolvedValue(undefined),
      }),
    };
    vi.doMock('pdfjs-dist', () => pdfMock);
    vi.resetModules();
    const { extractPdfText: extract } = await import('../researchAssistant');

    const result = await extract(new ArrayBuffer(8));
    expect(result.text).toBe('Hello world !');
    expect(result.pageCount).toBe(1);
    expect(result.wordCount).toBe(3);
    expect(pdfMock.GlobalWorkerOptions.workerSrc).toContain('pdf.worker');
    expect(pdfMock.getDocument).toHaveBeenCalledWith({ data: expect.any(ArrayBuffer) });
  });
});