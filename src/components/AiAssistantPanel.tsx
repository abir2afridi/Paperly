import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  AlertTriangle,
  RefreshCw,
  Wand2,
  FileText,
  HelpCircle,
  Copy,
  ChevronRight,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { CompileDiagnostic, AIProviderConfig } from '../types';

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: CompileDiagnostic[];
  activeFileContent: string;
  onApplyFix: (newContent: string) => void;
  providers: AIProviderConfig[];
  onOpenSettings: () => void;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  isOpen,
  onClose,
  diagnostics,
  activeFileContent,
  onApplyFix,
  providers,
  onOpenSettings,
}) => {
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'explain' | 'fix' | 'rewrite' | 'abstract'>('explain');
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultProvider = providers.find(p => p.isDefault) || providers[0];
  const activeProvider = providers.find(p => p.id === selectedProviderId) || defaultProvider;

  const handleGenerate = async (type: string, customContext?: string) => {
    if (!providers || providers.length === 0) {
      setErrorMsg('No AI provider configured. Please add an API key in Settings.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setAiResult(null);

    let prompt = '';
    let context = customContext || activeFileContent;

    if (type === 'explain') {
      const errorList = diagnostics.map(d => `${d.severity.toUpperCase()}: ${d.message} (Line ${d.line || '?'})`).join('\n');
      prompt = `Explain the following LaTeX compilation error diagnostics clearly and suggest how to fix them:\n${errorList}`;
    } else if (type === 'fix') {
      const errorList = diagnostics.map(d => `${d.severity.toUpperCase()}: ${d.message} (Line ${d.line || '?'})`).join('\n');
      prompt = `Fix the LaTeX code to resolve these compilation errors:\n${errorList}\n\nReturn ONLY the revised complete LaTeX document without conversational markdown wrappings if possible.`;
    } else if (type === 'rewrite') {
      prompt = `Improve and polish the language of the following LaTeX section for academic publication: ${promptInput}`;
    } else if (type === 'abstract') {
      prompt = `Generate a concise 150-word academic abstract for this LaTeX document based on the introduction and sections.`;
    }

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: activeProvider?.id,
          prompt,
          context,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI generation failed.');
      }

      setAiResult(data.result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyToEditor = () => {
    if (aiResult) {
      onApplyFix(aiResult);
    }
  };

  return (
    <aside className="w-80 bg-white border-l-2 border-slate-200 flex flex-col h-full z-20 shadow-2xl text-xs">
      {/* Header */}
      <div className="p-3 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
        <div className="flex items-center space-x-2 relative z-10">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="font-black text-white text-xs uppercase tracking-widest">TeXForge AI Helper</span>
        </div>
        <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Provider Selector */}
      <div className="p-3 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between font-mono">
        <div className="flex items-center space-x-1.5 flex-1 mr-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Key:</span>
          {providers.length > 0 ? (
            <select
              value={activeProvider?.id || ''}
              onChange={e => setSelectedProviderId(e.target.value)}
              className="bg-white border-2 border-slate-300 px-2 py-1 text-xs text-slate-800 flex-1 truncate font-sans font-semibold focus:border-[#D11111]"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.model})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[#D11111] font-bold truncate text-[11px]">No Key Configured</span>
          )}
        </div>

        <button
          onClick={onOpenSettings}
          className="text-[#D11111] hover:text-black font-black uppercase tracking-wider text-[10px]"
        >
          Manage
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b-2 border-slate-200 bg-slate-100 font-bold text-slate-700 text-[10px] uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('explain')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'explain' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
          }`}
        >
          Explain
        </button>
        <button
          onClick={() => setActiveTab('fix')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'fix' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
          }`}
        >
          Auto-Fix
        </button>
        <button
          onClick={() => setActiveTab('rewrite')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'rewrite' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
          }`}
        >
          Rewrite
        </button>
        <button
          onClick={() => setActiveTab('abstract')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'abstract' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
          }`}
        >
          Abstract
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'explain' && (
          <div className="space-y-3">
            <p className="text-slate-600 font-medium">
              Analyze current compilation diagnostics and receive step-by-step resolution advice.
            </p>

            <div className="p-3 bg-red-50 border-2 border-red-300 text-red-900">
              <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">Detected Diagnostics ({diagnostics.length}):</span>
              {diagnostics.length > 0 ? (
                diagnostics.slice(0, 3).map((d, i) => (
                  <p key={i} className="font-mono text-[11px] truncate">
                    Line {d.line || '?'}: {d.message}
                  </p>
                ))
              ) : (
                <p className="text-emerald-700 font-bold">✓ No active errors detected in document.</p>
              )}
            </div>

            <button
              onClick={() => handleGenerate('explain')}
              disabled={isGenerating || diagnostics.length === 0}
              className="w-full py-2.5 bg-[#D11111] text-white font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors border border-red-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>Explain Errors</span>
            </button>
          </div>
        )}

        {activeTab === 'fix' && (
          <div className="space-y-3">
            <p className="text-slate-600 font-medium">
              Auto-generate a corrected version of the document fixing syntax and environment errors.
            </p>

            <button
              onClick={() => handleGenerate('fix')}
              disabled={isGenerating || diagnostics.length === 0}
              className="w-full py-2.5 bg-[#D11111] text-white font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors border border-red-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>Auto-Fix & Preview</span>
            </button>
          </div>
        )}

        {activeTab === 'rewrite' && (
          <div className="space-y-3">
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">Paragraph to Polish:</label>
            <textarea
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder="Paste raw text or paragraph..."
              rows={4}
              className="w-full bg-slate-50 border-2 border-slate-300 p-2 text-slate-900 focus:outline-hidden focus:border-[#D11111] font-mono text-xs"
            />
            <button
              onClick={() => handleGenerate('rewrite')}
              disabled={isGenerating || !promptInput.trim()}
              className="w-full py-2.5 bg-[#D11111] text-white font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors border border-red-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>Polish Academic Prose</span>
            </button>
          </div>
        )}

        {activeTab === 'abstract' && (
          <div className="space-y-3">
            <p className="text-slate-600 font-medium">
              Summarize project sections into a standard publication abstract.
            </p>
            <button
              onClick={() => handleGenerate('abstract')}
              disabled={isGenerating}
              className="w-full py-2.5 bg-[#D11111] text-white font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors border border-red-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>Generate Abstract</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border-2 border-red-300 text-[#D11111]">
            <span className="font-bold block mb-1 uppercase tracking-wider text-[10px]">Error:</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Generated Response Output */}
        {aiResult && (
          <div className="p-3 bg-slate-900 text-slate-100 space-y-2 font-mono text-[11px] relative border-2 border-slate-800">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
              <span className="font-sans font-bold text-[#D11111] uppercase tracking-wider text-[10px]">AI Response</span>
              <span className="text-[10px]">{activeProvider?.model}</span>
            </div>

            <div className="max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {aiResult}
            </div>

            <div className="flex justify-end pt-2 space-x-2 font-sans">
              <button
                onClick={handleApplyToEditor}
                className="px-3 py-1 bg-[#D11111] text-white font-bold uppercase tracking-wider text-xs hover:bg-red-700 flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Editor</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="p-3 border-t-2 border-slate-200 bg-slate-50 text-[10px] text-slate-500 font-mono">
        TeXForge BYO-Key Client. Encrypted at rest.
      </div>
    </aside>
  );
};
