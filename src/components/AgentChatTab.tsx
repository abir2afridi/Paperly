/**
 * §50 Agentic AI chat tab — structured-output mode.
 *
 * BYO provider adapters are completion-only, so the "agent" works in the
 * plan's fallback mode: client-side editor tools (file tree / search / read,
 * scoped to the CURRENT project's in-memory files only — RLS already scopes
 * the underlying rows) plus a Zod-validated JSON edit proposal rendered
 * through a diff-review queue (Apply / Discard / Edit-then-apply / Apply all,
 * max 20 edits per turn). §51: every apply batch is preceded by an `ai`
 * snapshots so the change is individually revertible in Version History.
 */
import React, { useMemo, useRef, useState } from 'react';
import { Wand2, Loader2, FolderTree, FileText, Check, X, RotateCcw, Pencil, Files } from 'lucide-react';
import { ProjectFile, AIProviderConfig } from '../types';
import { aiGenerate } from '../services/aiEngine';
import { createEditorTools, buildAgentPrompt, parseAgentEdits, MAX_EDITS_PER_TURN } from '../services/agenticChat';
import { diffLines } from '../services/snapshotDiff';

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PendingEdit {
  path: string;
  newContent: string;
  explanation: string;
  status: 'pending' | 'applied' | 'discarded';
  reviewNote?: string;
}

interface AgentChatTabProps {
  providers: AIProviderConfig[];
  activeProvider?: AIProviderConfig;
  activeFileContent: string;
  projectFiles: ProjectFile[];
  onApplyProjectFile: (path: string, content: string) => void;
  /** §51: called before an apply batch so an `ai`-source snapshot is recorded. */
  onAiSnapshot: (title: string) => void;
  onError: (msg: string) => void;
}

export const AgentChatTab: React.FC<AgentChatTabProps> = ({
  providers,
  activeProvider,
  activeFileContent,
  projectFiles,
  onApplyProjectFile,
  onAiSnapshot,
  onError,
}) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([]);
  const [preApplyContents, setPreApplyContents] = useState<{ path: string; content: string }[] | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFileTree, setShowFileTree] = useState(false);
  const [contextFiles, setContextFiles] = useState<{ path: string; content: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const tools = useMemo(() => createEditorTools(projectFiles), [projectFiles]);

  const scroll = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });
  React.useEffect(scroll, [messages, pendingEdits]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return tools.searchProject(searchQuery.trim());
  }, [searchQuery, tools]);

  const canSend = providers.length > 0 && !isBusy;

  /** §50 readFile tool: add a project file's content to the turn context. */
  const addToContext = (path: string) => {
    if (contextFiles.some(c => c.path === path)) return;
    const content = tools.readFile(path);
    if (content !== null) setContextFiles(prev => [...prev, { path, content }]);
  };

  const sendTurn = async () => {
    const text = input.trim();
    if (!text || isBusy || !activeProvider) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsBusy(true);
    setPendingEdits([]);
    setPreApplyContents(null);

    try {
      // Active file is always included (§50 default tool context).
      const active = projectFiles.find(f => f.content === activeFileContent) ?? {
        path: 'untitled.tex',
        content: activeFileContent,
      };
      const includeFiles = [
        active,
        ...contextFiles.filter(c => c.path !== active.path),
      ].filter(f => f.content.length > 0);

      const prompt = buildAgentPrompt({ userMessage: text, tools, includeFiles });
      const data = await aiGenerate(activeProvider.id, prompt, activeFileContent);
      const parsed = parseAgentEdits(data.result);

      if (!parsed.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.result }]);
        if (parsed.error) onError(parsed.error);
        return;
      }

      const edits: PendingEdit[] = parsed.edits.map(e => ({
        path: e.path,
        newContent: e.newContent,
        explanation: e.explanation,
        status: 'pending',
      }));

      const summary = parsed.edits.length
        ? `I've proposed ${parsed.edits.length} edit${parsed.edits.length === 1 ? '' : 's'} — review them in the queue below before applying.`
        : (parsed.edits.length === 0 && parsed.message ? parsed.message : 'No file edits needed.');
      setMessages(prev => [...prev, { role: 'assistant', content: summary }]);
      setPendingEdits(edits);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  };

    const applyEdits = (edits: PendingEdit[]) => {
    if (!edits.length) return;
    // §51: snapshot pre-apply state first so the AI change is revertible.
    onAiSnapshot('Before AI edit');
    setPreApplyContents(
      edits
        .map(e => ({ path: e.path, content: tools.readFile(e.path) ?? '' }))
        .filter(e => e.content !== null)
    );
    edits.forEach(e => {
      if (e.path) onApplyProjectFile(e.path, e.newContent);
    });
    setPendingEdits(prev => prev.map(e => (edits.includes(e) ? { ...e, status: 'applied' as const } : e)));
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: `Applied ${edits.length} edit${edits.length === 1 ? '' : 's'}. You can revert via the Version History (AI snapshot) or the button below.` },
    ]);
  };

  const revertBatch = () => {
    if (!preApplyContents) return;
    onAiSnapshot('Revert AI edit');
    preApplyContents.forEach(({ path, content }) => onApplyProjectFile(path, content));
    setPreApplyContents(null);
    setPendingEdits(prev => prev.map(e => ({ ...e, status: 'pending' as const })));
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: `Reverted the last AI edit batch to its pre-edit state.` },
    ]);
  };

  const allReviewed =
    pendingEdits.length > 0 && pendingEdits.every(e => e.status !== 'pending');

  return (
    <div className="space-y-3">
      <div className="p-3 bg-indigo-50 border-2 border-indigo-200 text-indigo-900 space-y-1.5">
        <div className="flex items-center space-x-1.5">
          <Wand2 className="w-3.5 h-3.5" />
          <span className="font-black uppercase tracking-wider text-[10px]">Agent Mode (§50)</span>
        </div>
        <p className="text-[11px] leading-snug">
          Basic mode (§50): tools are scoped to this project only (file tree, search, read). The
          model proposes edits as structured JSON — nothing is written until you approve it in the
          review queue.
          {providers.length === 0 && (
            <span className="text-[#D11111] font-bold block mt-1">
              No AI provider configured — add an API key in Settings.
            </span>
          )}
        </p>
      </div>

      {/* Tools */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setShowFileTree(v => !v)}
          className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center space-x-1"
        >
          <FolderTree className="w-3 h-3" />
          <span>File Tree</span>
        </button>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search project files…"
          className="flex-1 min-w-32 border-2 border-slate-300 px-2 py-1 text-[11px] font-mono"
        />
      </div>

      {showFileTree && (
        <div className="max-h-36 overflow-y-auto border-2 border-slate-200 bg-slate-50 p-2 font-mono text-[11px]">
          {projectFiles.length === 0 && <span className="text-slate-400">(empty project)</span>}
          {projectFiles.map(f => (
            <div key={f.path} className="flex items-center justify-between text-slate-700">
              <span className="flex items-center space-x-1 truncate">
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">{f.path}</span>
              </span>
              <span className="flex items-center space-x-2 shrink-0 ml-2">
                <span className="text-slate-400">{(f.content.length / 1024).toFixed(1)} KB</span>
                {contextFiles.some(c => c.path === f.path) ? (
                  <span className="text-emerald-600 font-black text-[9px] uppercase">in context</span>
                ) : (
                  <button
                    onClick={() => addToContext(f.path)}
                    className="text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800"
                  >
                    Read
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* §50 context files (readFile tool result) */}
      {contextFiles.length > 0 && (
        <div className="border-2 border-indigo-200 bg-white p-2">
          <span className="font-black uppercase tracking-wider text-[9px] text-slate-500">Files the agent can read this turn</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {contextFiles.map(c => (
              <span key={c.path} className="inline-flex items-center space-x-1 bg-indigo-100 text-indigo-900 border border-indigo-300 px-1.5 py-0.5 text-[10px] font-mono">
                <span>{c.path}</span>
                <button onClick={() => setContextFiles(prev => prev.filter(x => x.path !== c.path))} className="text-indigo-500 hover:text-[#D11111]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="max-h-36 overflow-y-auto border-2 border-slate-200 bg-white p-2 font-mono text-[11px] space-y-1">
          <span className="font-black uppercase tracking-wider text-[9px] text-slate-500">Search results</span>
          {searchResults.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-slate-700 gap-2">
              <span className="truncate">
                <span className="text-[#D11111] font-bold">{r.path}:{r.line}</span> {r.snippet}
              </span>
              <button
                onClick={() => addToContext(r.path)}
                className="text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 shrink-0"
              >
                Read file
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Conversation */}
      <div className="border-2 border-slate-200 bg-white max-h-52 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-slate-400 text-[11px] font-medium text-center py-6">
            Ask the agent to modify your document, e.g. “add an abstract section”.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-[11px] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block max-w-full px-2.5 py-1.5 border-2 whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#D11111] text-white border-red-700'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Edit review queue */}
      {pendingEdits.length > 0 && (
        <div className="border-2 border-indigo-300 bg-indigo-50 p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-black uppercase tracking-wider text-[10px] text-indigo-900 flex items-center space-x-1">
              <Files className="w-3.5 h-3.5" />
              <span>Pending AI Changes ({pendingEdits.filter(e => e.status === 'pending').length})</span>
            </span>
            <div className="flex space-x-1.5">
              <button
                onClick={() => applyEdits(pendingEdits.filter(e => e.status === 'pending'))}
                disabled={!pendingEdits.some(e => e.status === 'pending') || !providers.length}
                className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 flex items-center space-x-1"
              >
                <Check className="w-3 h-3" />
                <span>Apply All</span>
              </button>
              {preApplyContents && (
                <button
                  onClick={revertBatch}
                  className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Revert Batch</span>
                </button>
              )}
            </div>
          </div>

          {pendingEdits.map((edit, i) => {
            const oldContent = tools.readFile(edit.path) ?? '';
            const diff = diffLines(oldContent, edit.newContent);
            return (
              <div key={i} className="border-2 border-slate-200 bg-white p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] font-bold text-indigo-900 truncate">{edit.path}</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                    {edit.status === 'applied' ? '✓ Applied' : edit.status === 'discarded' ? '✕ Discarded' : 'Pending review'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mb-2">{edit.explanation}</p>

                {editingPath === edit.path ? (
                  <textarea
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    rows={6}
                    className="w-full border-2 border-slate-300 p-1.5 font-mono text-[10px] mb-1.5"
                  />
                ) : (
                  <div className="max-h-32 overflow-y-auto border border-slate-200 bg-slate-50 p-1.5 font-mono text-[10px] space-y-0.5">
                    {diff.slice(0, 60).map((line, li) => (
                      <div key={li} className={line.type === 'add' ? 'bg-emerald-100 text-emerald-900' : line.type === 'remove' ? 'bg-red-100 text-red-900 line-through' : 'text-slate-500'}>
                        {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}
                        {line.text}
                      </div>
                    ))}
                    {diff.length > 60 && <div className="text-slate-400">… {diff.length - 60} more diff lines</div>}
                  </div>
                )}

                <div className="flex space-x-1.5 mt-1.5">
                  {edit.status === 'pending' && (
                    <>
                      <button
                        onClick={() => applyEdits([edit])}
                        className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => setPendingEdits(prev => prev.map(e => (e === edit ? { ...e, status: 'discarded' as const } : e)))}
                        className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-slate-300 text-slate-700 hover:bg-slate-400"
                      >
                        Discard
                      </button>
                      <button
                        onClick={() => {
                          if (editingPath === edit.path) {
                            setPendingEdits(prev => prev.map(e => (e === edit ? { ...e, newContent: editDraft } : e)));
                            setEditingPath(null);
                          } else {
                            setEditDraft(edit.newContent);
                            setEditingPath(edit.path);
                          }
                        }}
                        className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 flex items-center space-x-1"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>{editingPath === edit.path ? 'Save Draft' : 'Edit Before Apply'}</span>
                      </button>
                    </>
                  )}
                  {edit.status === 'applied' && (
                    <span className="text-[9px] font-bold text-emerald-700">Applied — revert via Version History.</span>
                  )}
                </div>
              </div>
            );
          })}

          {allReviewed && (
            <p className="text-[10px] text-slate-500 font-medium">
              All {pendingEdits.length} edits reviewed. {preApplyContents ? 'Revert available.' : 'Apply remaining pending edits or discard them.'}
            </p>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex space-x-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendTurn()}
          placeholder="e.g. Add an abstract section after \maketitle"
          className="flex-1 border-2 border-slate-300 px-2 py-1.5 text-[11px] font-mono focus:border-indigo-500 focus:outline-hidden"
        />
        <button
          onClick={sendTurn}
          disabled={!canSend}
          className="px-3 py-1.5 bg-indigo-600 text-white font-black uppercase tracking-wider text-[10px] hover:bg-indigo-700 disabled:opacity-40 flex items-center space-x-1"
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};