import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Search,
  Loader2,
  BookMarked,
  Check,
  FlaskConical,
  FilePlus2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { AIProviderConfig } from '../types';
import { aiGenerate } from '../services/aiEngine';
import {
  extractPdfText,
  papersToBibtex,
  searchSemanticScholar,
  SemanticScholarPaper,
  PaperExcerpt,
  combinePaperExcerpts,
  buildLiteratureReviewPrompt,
  buildFactCheckPrompt,
} from '../services/researchAssistant';
import { findNgramOverlaps, OriginalityReport } from '../services/originalityCheck';
import { registerSourcePaper, unregisterSourcePaper } from '../services/researchSources';

interface ResearchAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: AIProviderConfig[];
  onInsertLatex: (snippet: string) => void;
}

/**
 * AI research assistant (§42, §43). Flow:
 *  1. Upload a PDF → text is extracted client-side (pdf.js).
 *  2. Search literature on Semantic Scholar and add papers as BibTeX.
 *  3. Generate a LaTeX literature review (§42) or fact-check (§43) via the
 *     configured AI provider, then insert the result at the cursor.
 */
export const ResearchAssistantModal: React.FC<ResearchAssistantModalProps> = ({
  isOpen,
  onClose,
  providers,
  onInsertLatex,
}) => {
  const [pdfs, setPdfs] = useState<PaperExcerpt[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');

  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<SemanticScholarPaper[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generated, setGenerated] = useState('');
  const [lastAction, setLastAction] = useState('');
  const [originalityReport, setOriginalityReport] = useState<OriginalityReport | null>(null);

  const [factCheckInput, setFactCheckInput] = useState('');
  const [notice, setNotice] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const providerId = providers.find(p => p.isDefault)?.id ?? providers[0]?.id;

  const combinedExcerpt = combinePaperExcerpts(pdfs);

  const handlePdfFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setExtracting(true);
    setExtractError('');
    setNotice('');
    try {
      const added: PaperExcerpt[] = [];
      for (const file of files) {
        const data = await file.arrayBuffer();
        const result = await extractPdfText(data);
        added.push({
          name: file.name,
          excerpt: result.text.slice(0, 6000),
          pageCount: result.pageCount,
          wordCount: result.wordCount,
        });
      }
      setPdfs(prev => [...prev, ...added]);
      added.forEach(p => registerSourcePaper({ name: p.name, text: p.excerpt }));
      if (added.length > 0 && !query) {
        const firstLine = added[0].excerpt.split(/\n/).find(l => l.trim().length > 15);
        if (firstLine) setQuery(firstLine.trim().slice(0, 80));
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Could not read one of the PDFs.');
    } finally {
      setExtracting(false);
    }
  };

  const removePaper = (name: string) => {
    setPdfs(prev => prev.filter(p => p.name !== name));
    setOriginalityReport(null);
    unregisterSourcePaper(name);
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    try {
      const results = await searchSemanticScholar(q);
      setPapers(results);
      setSelected(new Set());
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const togglePaper = (paperId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(paperId)) next.delete(paperId);
      else next.add(paperId);
      return next;
    });
  };

  const handleAddBibliography = () => {
    const chosen = papers.filter(p => selected.has(p.paperId));
    if (chosen.length === 0) return;
    const bib = `% --- Bibliography added via Paperly research assistant (Semantic Scholar) ---\n${papersToBibtex(chosen)}\n`;
    onInsertLatex(bib);
    setNotice(`Added ${chosen.length} BibTeX entr${chosen.length === 1 ? 'y' : 'ies'} at the cursor.`);
    setLastAction('bib');
  };

  const handleGenerateReview = async () => {
    if (!providerId) {
      setGenerationError('No AI provider configured — add an API key in Settings → AI Providers.');
      return;
    }
    setGenerating(true);
    setGenerationError('');
    try {
      const chosen = papers.filter(p => selected.has(p.paperId) || selected.size === 0);
      const prompt = buildLiteratureReviewPrompt({
        topic: query.trim() || pdfs[0]?.name?.replace(/\.pdf$/i, '') || 'Research topic',
        sourceExcerpt: combinedExcerpt,
        papers: selected.size === 0 ? papers : chosen,
      });
      const result = await aiGenerate(providerId, prompt, combinedExcerpt);
      setGenerated(result.result);
      setLastAction('review');
      setNotice('');
      // §42 originality safeguard: flag 8+ word n-gram overlaps with the sources.
      setOriginalityReport(findNgramOverlaps(result.result, pdfs.map(p => ({ name: p.name, text: p.excerpt }))));
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleFactCheck = async () => {
    const claim = factCheckInput.trim();
    if (!claim) return;
    if (!providerId) {
      setGenerationError('No AI provider configured — add an API key in Settings → AI Providers.');
      return;
    }
    setGenerating(true);
    setGenerationError('');
    try {
      const prompt = buildFactCheckPrompt(claim, combinedExcerpt || 'No source PDF uploaded — answer from general knowledge.');
      const result = await aiGenerate(providerId, prompt, combinedExcerpt);
      setGenerated(result.result);
      setLastAction('factcheck');
      setOriginalityReport(null);
      setNotice('');
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Fact-check failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsertGenerated = () => {
    if (!generated) return;
    onInsertLatex(generated.trimEnd() + '\n');
    setNotice('Literature text inserted at the cursor.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        <div className="h-1.5 w-full bg-[#D11111]" />

        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-950 border border-red-700/80 flex items-center justify-center text-[#D11111]">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight leading-none">
                Research Assistant
              </h3>
              <p className="text-slate-400 text-[11px] font-mono mt-1">
                PDF → literature review → LaTeX (§42) · Semantic Scholar search + fact-check (§43)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step 1: upload PDFs */}
          <section className="space-y-2">
            <h4 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4" /> 1 · Upload papers (optional, multiple allowed)
            </h4>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []) as File[];
                if (files.length > 0) void handlePdfFiles(files);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-slate-700 hover:border-[#D11111] text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="text-sm font-bold">
                {extracting
                  ? 'Extracting text…'
                  : pdfs.length > 0
                    ? `Loaded ${pdfs.length} paper${pdfs.length === 1 ? '' : 's'} — click to add more`
                    : 'Click to upload one or more PDF papers'}
              </span>
            </button>
            {pdfs.length > 0 && (
              <div className="border-2 border-slate-800 divide-y divide-slate-800 max-h-40 overflow-y-auto">
                {pdfs.map(p => (
                  <div key={p.name} className="flex items-center justify-between p-2.5 bg-slate-800/40">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-[#D11111] shrink-0" />
                      <span className="text-slate-200 text-[12px] font-bold truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-slate-400 text-[11px] font-mono">
                        {p.wordCount.toLocaleString()} words · {p.pageCount} pages
                      </span>
                      <button
                        onClick={() => removePaper(p.name)}
                        className="text-slate-500 hover:text-[#D11111]"
                        title="Remove paper"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pdfs.length > 0 && (
              <p className="text-slate-400 text-[11px] font-mono">
                {combinePaperExcerpts(pdfs).length.toLocaleString()} characters of source text ready for the AI
              </p>
            )}
            {extractError && <p className="text-red-400 text-[11px] font-mono">{extractError}</p>}
          </section>

          {/* Step 2: literature search */}
          <section className="space-y-2">
            <h4 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center space-x-2">
              <Search className="w-4 h-4" /> 2 · Search literature (Semantic Scholar)
            </h4>
            <div className="flex space-x-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleSearch();
                }}
                placeholder="e.g. graph neural networks for citation networks"
                className="flex-1 bg-slate-800 border-2 border-slate-700 focus:border-[#D11111] outline-none px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
              />
              <button
                onClick={() => void handleSearch()}
                disabled={searching || !query.trim()}
                className="px-4 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider disabled:opacity-40 transition-colors flex items-center space-x-2"
              >
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search</span>
              </button>
            </div>
            {searchError && <p className="text-red-400 text-[11px] font-mono">{searchError}</p>}

            {papers.length > 0 && (
              <div className="border-2 border-slate-800 divide-y divide-slate-800 max-h-64 overflow-y-auto">
                {papers.map(paper => (
                  <label key={paper.paperId} className="flex items-start space-x-3 p-3 hover:bg-slate-800/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(paper.paperId)}
                      onChange={() => togglePaper(paper.paperId)}
                      className="mt-1 accent-[#D11111]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-100 text-[13px] truncate">{paper.title}</span>
                        {paper.year && <span className="text-slate-500 text-[11px] font-mono">{paper.year}</span>}
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">
                        {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                        {paper.venue ? ` · ${paper.venue}` : ''}
                        <span className="text-slate-500"> · {paper.citationCount.toLocaleString()} citations</span>
                      </p>
                      {paper.abstract && (
                        <p className="text-slate-500 text-[11px] line-clamp-2 mt-1">{paper.abstract}</p>
                      )}
                    </div>
                    {paper.url && (
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-slate-500 hover:text-[#D11111] mt-1"
                        title="Open on Semantic Scholar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </label>
                ))}
              </div>
            )}

            {papers.length > 0 && (
              <button
                onClick={handleAddBibliography}
                disabled={selected.size === 0}
                className="px-3 py-1.5 border-2 border-[#D11111] text-[#D11111] hover:bg-[#D11111] hover:text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-40 flex items-center space-x-2 transition-colors"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>Add {selected.size > 0 ? `${selected.size} selected ` : ''}to bibliography (BibTeX)</span>
              </button>
            )}
          </section>

          {/* Step 3: AI actions */}
          <section className="space-y-2">
            <h4 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center space-x-2">
              <FlaskConical className="w-4 h-4" /> 3 · Generate with AI
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void handleGenerateReview()}
                disabled={generating}
                className="p-3 bg-slate-800 border-2 border-slate-700 hover:border-[#D11111] text-left transition-colors disabled:opacity-50"
              >
                <span className="block font-bold text-slate-100 text-[13px]">Literature review section</span>
                <span className="block text-slate-500 text-[11px] mt-1">
                    §42 · synthesizes the uploaded paper + search results into {'\\section{Literature Review}'}
                </span>
              </button>
              <button
                onClick={() => void handleFactCheck()}
                disabled={generating}
                className="p-3 bg-slate-800 border-2 border-slate-700 hover:border-[#D11111] text-left transition-colors disabled:opacity-50"
              >
                <span className="block font-bold text-slate-100 text-[13px]">Fact-check a claim</span>
                <span className="block text-slate-500 text-[11px] mt-1">
                  §43 · SUPPORTED / REFUTED / UNCERTAIN against the uploaded source(s)
                </span>
              </button>
            </div>
            <input
              value={factCheckInput}
              onChange={e => setFactCheckInput(e.target.value)}
              placeholder="Claim to verify (optional for literature review; required for fact-check)"
              className="w-full bg-slate-800 border-2 border-slate-700 focus:border-[#D11111] outline-none px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
            />
            {generationError && <p className="text-red-400 text-[11px] font-mono">{generationError}</p>}

            {generated && (
              <div className="border-2 border-emerald-800 bg-emerald-950/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300 text-[11px] font-mono uppercase tracking-wider">
                    {lastAction === 'factcheck' ? 'Fact-check result' : 'Generated literature text'}
                  </span>
                  <button
                    onClick={handleInsertGenerated}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-[11px] uppercase tracking-wider transition-colors"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Insert into document</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap max-h-64 overflow-y-auto bg-slate-950 p-2">
                  {generated}
                </pre>
              </div>
            )}

            {originalityReport && lastAction === 'review' && originalityReport.overlaps.length > 0 && (
              <div className="border-2 border-amber-700 bg-amber-950/40 p-3 space-y-2">
                <div className="flex items-center space-x-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold">
                    Originality safeguard — {originalityReport.overlaps.length} passage
                    {originalityReport.overlaps.length === 1 ? '' : 's'} closely match a source
                  </span>
                </div>
                <p className="text-amber-200/80 text-[11px]">
                  The passages below match your uploaded source PDFs word-for-word (8+ consecutive
                  words). Consider rephrasing them. This is a heuristic aid, not a legal originality
                  guarantee.
                </p>
                <div className="space-y-2">
                  {originalityReport.overlaps.map((o, i) => (
                    <div key={i} className="bg-slate-950 border border-amber-900 p-2 space-y-1.5">
                      <p className="text-[11px] text-amber-300 font-mono">
                        <span className="font-bold">Generated:</span> "{o.generatedPassage}"
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        <span className="font-bold text-slate-300">Matches</span> {o.sourceName}
                        {o.wordCount > 0 ? ` (${o.wordCount} words): ` : ': '}"{o.sourcePassage}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {notice && (
            <div className="flex items-center space-x-2 p-2.5 bg-emerald-950/60 border-2 border-emerald-800 text-emerald-300 font-bold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{notice}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};