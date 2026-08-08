import React, { useState } from 'react';
import { X, Search, BookOpen, Plus, Loader2, Check } from 'lucide-react';
import { fetchCitationByDoi, CrossRefResult } from '../services/crossrefService';

interface DoiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppendBibtex: (bibtex: string, citeKey: string) => void;
}

export const DoiImportModal: React.FC<DoiImportModalProps> = ({
  isOpen,
  onClose,
  onAppendBibtex,
}) => {
  const [query, setQuery] = useState('10.1145/3318464.3389700');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CrossRefResult | null>(null);
  const [isAppended, setIsAppended] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setIsAppended(false);

    try {
      const citation = await fetchCitationByDoi(query);
      setResult(citation);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    if (result) {
      onAppendBibtex(result.bibtex, result.citeKey);
      setIsAppended(true);
      setTimeout(() => {
        onClose();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <BookOpen className="w-5 h-5 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">CrossRef DOI Citation Search</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 font-medium">
            Paste a DOI (e.g. <code className="bg-slate-100 text-[#D11111] px-1 py-0.5 border border-slate-200 font-mono font-bold">10.1145/3318464.3389700</code>) or paper title to fetch metadata from CrossRef and format BibTeX.
          </p>

          <form onSubmit={handleSearch} className="flex space-x-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter DOI or paper title..."
              className="flex-1 bg-slate-50 border-2 border-slate-300 px-3 py-2 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#D11111]"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#D11111] text-white font-black uppercase tracking-wider hover:bg-black disabled:opacity-50 flex items-center space-x-1.5 transition-colors border border-red-800"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-50 border-2 border-red-300 text-[#D11111] font-bold">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-slate-50 border-2 border-slate-200 space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D11111] block">Found Paper</span>
                <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{result.title}</h4>
                <p className="text-slate-700 text-xs font-semibold mt-0.5">{result.author} ({result.year || 'N/A'})</p>
                {result.journal && <p className="text-slate-500 italic text-xs">{result.journal}</p>}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D11111] block mb-1">Generated BibTeX Entry</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto border-2 border-slate-800">
                  {result.bibtex}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAdd}
                  disabled={isAppended}
                  className={`px-4 py-2 font-black uppercase tracking-wider text-xs text-white flex items-center space-x-1.5 transition-colors border ${
                    isAppended ? 'bg-emerald-600 border-emerald-800' : 'bg-[#D11111] hover:bg-black border-red-800'
                  }`}
                >
                  {isAppended ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to .bib!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Append to references.bib (\cite&#123;{result.citeKey}&#125;)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
