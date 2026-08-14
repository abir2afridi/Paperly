import React, { useState, useCallback } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Check,
  Copy,
  FileWarning,
  RefreshCw,
  Wand2,
  MessageSquare,
} from 'lucide-react';
import { CompileDiagnostic, AIProviderConfig } from '../types';
import { aiGenerate } from '../services/aiEngine';
import { buildFixPrompt, parseAiFixResponse } from '../services/aiFix';
import { diffLines, DiffLine } from '../services/snapshotDiff';

interface FixWithAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The diagnostic the user clicked Fix on (null when closed). */
  diagnostic: CompileDiagnostic | null;
  /** Content of the file the diagnostic refers to. */
  fileContent: string;
  /** Raw compiler log. */
  rawLog: string;
  /** Which backend produced the diagnostic (§48). */
  backendUsed?: string;
  providers: AIProviderConfig[];
  onOpenSettings: () => void;
  /** Apply the fixed content back to the file. */
  onApplyFix: (newContent: string) => void;
  /** Recompile immediately after applying. */
  onRecompile: () => void;
  /** Hand the failed fix off to the persistent AI chat (§49.5). */
  onHandoffToChat: (context: string) => void;
}

const CONTEXT_LINES = 10;

/** Extract ±CONTEXT_LINES source lines around a diagnostic's line. */
function extractSourceContext(fileContent: string, line?: number): string {
  const lines = fileContent.split('\n');
  if (line == null || line < 1 || line > lines.length) {
    return lines.slice(0, CONTEXT_LINES * 2).join('\n');
  }
  const start = Math.max(0, line - 1 - CONTEXT_LINES);
  const end = Math.min(lines.length, line - 1 + CONTEXT_LINES + 1);
  return lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
}

/** Extract a raw-log excerpt near a diagnostic's line (§49.1). */
function extractLogExcerpt(rawLog: string, line?: number, maxChars = 900): string {
  const lines = rawLog.split('\n');
  if (line == null || lines.length === 0) return rawLog.slice(0, maxChars);
  const matchIdx = lines.findIndex(l => new RegExp(`l\\.${line}`).test(l) || l.includes(`:${line}`));
  const start = matchIdx >= 0 ? Math.max(0, matchIdx - 4) : 0;
  return lines.slice(start, start + 24).join('\n').slice(0, maxChars);
}

export const FixWithAiModal: React.FC<FixWithAiModalProps> = ({
  isOpen,
  onClose,
  diagnostic,
  fileContent,
  rawLog,
  backendUsed,
  providers,
  onOpenSettings,
  onApplyFix,
  onRecompile,
  onHandoffToChat,
}) => {
  const [explanation, setExplanation] = useState<string>('');
  const [fixedContent, setFixedContent] = useState<string>('');
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(true);

  const defaultProvider = providers.find(p => p.isDefault) || providers[0];
  const hasProvider = providers.length > 0;

  const handleFix = useCallback(async () => {
    if (!diagnostic || !hasProvider) return;
    setGenerating(true);
    setErrorMsg(null);
    setApplied(false);
    setExplanation('');
    setFixedContent('');
    setDiff([]);
    try {
      const prompt = buildFixPrompt({
        message: diagnostic.message,
        severity: diagnostic.severity,
        file: diagnostic.file || 'main.tex',
        line: diagnostic.line,
        sourceContext: extractSourceContext(fileContent, diagnostic.line),
        logExcerpt: extractLogExcerpt(rawLog, diagnostic.line),
        backendUsed,
      });
      const data = await aiGenerate(defaultProvider?.id, prompt, fileContent);
      const parsed = parseAiFixResponse(data.result);
      setExplanation(parsed.explanation || data.result);
      if (parsed.parsed) {
        setFixedContent(parsed.fixedContent);
        setDiff(diffLines(fileContent, parsed.fixedContent));
      } else {
        setFixedContent('');
        setDiff([]);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }, [diagnostic, hasProvider, defaultProvider?.id, fileContent, rawLog, backendUsed]);

  if (!isOpen || !diagnostic) return null;

  const changedLines = diff.filter(d => d.type !== 'same').length;
  const canApply = fixedContent.length > 0 && !applied;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-[640px] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-4 h-4 text-[#D11111]" />
            <h2 className="text-sm font-black text-slate-800">Fix with AI</h2>
            <span className="text-[10px] font-mono text-slate-400 ml-1 truncate max-w-[220px]">
              {diagnostic.file || 'main.tex'}
              {diagnostic.line ? `:${diagnostic.line}` : ''}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Diagnostic */}
          <div className="p-3 bg-red-50 border-2 border-red-200 text-red-900">
            <div className="flex items-start space-x-2">
              <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600">
                  {diagnostic.severity.toUpperCase()}
                </span>
                <p className="text-[13px] font-mono mt-0.5">{diagnostic.message}</p>
              </div>
            </div>
          </div>

          {/* Provider gating */}
          {!hasProvider && (
            <div className="p-3 bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs text-slate-600 mb-2">
                No AI provider configured — Fix with AI needs a configured, verified provider (§8A).
              </p>
              <button
                onClick={onOpenSettings}
                className="px-3 py-1.5 bg-[#D11111] text-white text-xs font-black uppercase tracking-wider hover:bg-red-800"
              >
                Configure an AI provider
              </button>
            </div>
          )}

          {hasProvider && (
            <button
              onClick={() => void handleFix()}
              disabled={generating}
              className="w-full py-2.5 bg-[#D11111] text-white font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 flex items-center justify-center space-x-1.5 transition-colors border border-red-700"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{generating ? 'Analyzing…' : explanation ? 'Regenerate Fix' : 'Generate Fix'}</span>
            </button>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border-2 border-red-300 text-[#D11111] text-xs">
              <span className="font-bold block mb-1 uppercase tracking-wider text-[10px]">Error:</span>
              {errorMsg}
            </div>
          )}

          {/* Result: explanation → diff → actions */}
          {explanation && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900 text-slate-100 border-2 border-slate-800">
                <span className="text-[10px] font-black text-[#D11111] uppercase tracking-wider block mb-1.5">
                  Explanation
                </span>
                <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{explanation}</p>
              </div>

              {canApply && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Proposed change — {changedLines} line{changedLines === 1 ? '' : 's'} touched
                    </span>
                    <button
                      onClick={() => setShowDiff(s => !s)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#D11111] hover:text-black"
                    >
                      {showDiff ? 'Hide diff' : 'Show diff'}
                    </button>
                  </div>
                  {showDiff && (
                    <div className="max-h-52 overflow-y-auto border-2 border-slate-200 font-mono text-[11px]">
                      {diff.map((d, i) => (
                        <div
                          key={i}
                          className={`flex items-start px-2 py-0.5 whitespace-pre-wrap break-all ${
                            d.type === 'add'
                              ? 'bg-emerald-50 text-emerald-900'
                              : d.type === 'remove'
                                ? 'bg-red-50 text-red-800'
                                : 'text-slate-500'
                          }`}
                        >
                          <span className="w-6 shrink-0 text-right mr-2 opacity-60">
                            {d.type === 'add' ? '+' : d.type === 'remove' ? '−' : ''}
                          </span>
                          <span>{d.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fixedContent).catch(() => undefined);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  disabled={!canApply}
                  className="px-3 py-1.5 border-2 border-slate-300 text-slate-600 text-xs font-black uppercase tracking-wider hover:border-slate-500 disabled:opacity-40 flex items-center space-x-1.5"
                  title="Copy the fixed content to the clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => {
                    onApplyFix(fixedContent);
                    setApplied(true);
                  }}
                  disabled={!canApply}
                  className="px-3 py-1.5 bg-[#D11111] text-white text-xs font-black uppercase tracking-wider hover:bg-red-800 disabled:opacity-40 flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to Editor</span>
                </button>
              </div>

              {/* §49.4: close the error→fix→verify loop with a Recompile button */}
              {applied && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-300 space-y-2">
                  <p className="text-xs font-bold text-emerald-800">Fix applied to the editor.</p>
                  <button
                    onClick={() => {
                      onRecompile();
                      onClose();
                    }}
                    className="w-full py-2 bg-emerald-700 text-white font-black uppercase tracking-widest hover:bg-emerald-800 flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recompile to verify</span>
                  </button>
                  {/* §49.5: don't dead-end if the fix didn't work — hand off to chat */}
                  <button
                    onClick={() => {
                      const context = `I tried to fix this LaTeX error and it still fails (or needs more work):\n\n` +
                        `${diagnostic.severity.toUpperCase()}: ${diagnostic.message} (${diagnostic.file || 'main.tex'}${diagnostic.line ? `:${diagnostic.line}` : ''})\n\n` +
                        `My attempted fix was:\n${fixedContent}\n\n` +
                        `Can you help me iterate further on this error?`;
                      onHandoffToChat(context);
                      onClose();
                    }}
                    className="w-full py-2 border-2 border-slate-300 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center space-x-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Still failing? Continue in AI Chat</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#D11111] text-white text-xs font-black uppercase tracking-wider hover:bg-red-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};