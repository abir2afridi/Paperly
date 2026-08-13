import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCitationByDoi } from '../crossrefService';

const crossrefItem = {
  DOI: '10.1145/3290605.3300766',
  title: ['A Great Paper About Things'],
  author: [
    { given: 'Jane', family: 'Smith' },
    { given: 'John', family: 'Doe' },
  ],
  'container-title': ['Proceedings of Example 2024'],
  publisher: 'Example Press',
  created: { 'date-parts': [[2024, 3, 1]] },
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCitationByDoi', () => {
  it('resolves a DOI via the CrossRef works endpoint', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: crossrefItem }));

    const result = await fetchCitationByDoi('10.1145/3290605.3300766');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.crossref.org/works/10.1145%2F3290605.3300766',
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.stringContaining('TeXForge') }) })
    );
    expect(result.title).toBe('A Great Paper About Things');
    expect(result.author).toContain('Smith, Jane');
    expect(result.year).toBe('2024');
    expect(result.citeKey).toBe('smith2024a'); // surname + year + first-title-word
    expect(result.bibtex).toContain('@article{smith2024a,');
    expect(result.bibtex).toContain('doi = {10.1145/3290605.3300766},');
  });

  it('normalizes a doi.org URL prefix', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: crossrefItem }));

    await fetchCitationByDoi('https://doi.org/10.1145/3290605.3300766');
    expect(fetchMock.mock.calls[0][0]).toContain('/works/10.1145');
  });

  it('falls back to title search when DOI lookup fails', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(jsonResponse({ message: { items: [crossrefItem] } }));

    const result = await fetchCitationByDoi('A Great Paper About Things');
    expect(result.title).toBe('A Great Paper About Things');
  });

  it('throws a specific error when CrossRef has no results', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, false, 404))
      .mockResolvedValueOnce(jsonResponse({ message: { items: [] } }));

    await expect(fetchCitationByDoi('nothing exists anywhere')).rejects.toThrow(
      'No matching publications found'
    );
  });
});