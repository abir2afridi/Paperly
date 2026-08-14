import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Key,
  Shield,
  Loader2,
  RefreshCw,
  Edit2,
  Keyboard,
  User,
  LogOut,
  Palette,
  Check,
  Sun,
  Moon,
  Download,
} from 'lucide-react';
import { AIProviderConfig } from '../types';
import { THEMES, ThemeId, ThemeDefinition } from '../services/themeService';
import { createProvider, deleteProvider, aiTestProvider } from '../services/aiEngine';
import {
  DeviceSession,
  deviceLabelFromUserAgent,
  listSessions,
  revokeOtherSessions,
  revokeSession,
} from '../services/sessions';
import { getChatRetentionDays, setChatRetentionDays } from '../services/db';
import { isSpellCheckEnabled, setSpellCheckEnabled } from '../services/spellCheck';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: AIProviderConfig[];
  onRefreshProviders: () => void;
  activeThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  autosaveEnabled: boolean;
  autosaveIntervalMs: number;
  onChangeAutosave: (enabled: boolean) => void;
  onChangeAutosaveInterval: (ms: number) => void;
  onExportAccountData?: () => Promise<boolean>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  providers,
  onRefreshProviders,
  activeThemeId,
  onSelectTheme,
  autosaveEnabled,
  autosaveIntervalMs,
  onChangeAutosave,
  onChangeAutosaveInterval,
  onExportAccountData,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance' | 'shortcuts' | 'sessions' | 'editor' | 'privacy'>('ai');

  // New Provider Form State
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('OpenRouter Key');
  const [providerType, setProviderType] = useState<'openai' | 'anthropic' | 'custom'>('openai');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('anthropic/claude-3.5-sonnet');
  const [isDefault, setIsDefault] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [spellCheckEnabled, setSpellCheck] = useState(() => isSpellCheckEnabled());

  const handleExportAccountData = async () => {
    if (!onExportAccountData) return;
    setIsExporting(true);
    setExportDone(false);
    const ok = await onExportAccountData();
    setIsExporting(false);
    setExportDone(ok);
  };

  useEffect(() => {
    if (isOpen) {
      onRefreshProviders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !baseUrl || !apiKey || !model) return;

    setIsLoading(true);

    try {
      const created = await createProvider({ label, providerType, baseUrl, apiKey, model, isDefault });
      onRefreshProviders();
      setIsAdding(false);
      setApiKey('');

      // Immediately test connection
      handleTestConnection(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error adding provider: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestResults(prev => ({ ...prev, [id]: { ok: false, msg: 'Testing...' } }));

    try {
      const data = await aiTestProvider(id);
      setTestResults(prev => ({ ...prev, [id]: { ok: true, msg: data.message } }));
      onRefreshProviders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResults(prev => ({ ...prev, [id]: { ok: false, msg } }));
    }
  };

  const handleDeleteProvider = async (id: string) => {
    await deleteProvider(id);
    onRefreshProviders();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <Key className="w-5 h-5 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">TeXForge Platform Settings</span>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b-2 border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider overflow-x-auto">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'ai' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
            }`}
          >
            AI Providers (BYO)
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'appearance' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
            }`}
          >
            Themes & Palette
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'shortcuts' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
            }`}
          >
            Shortcuts
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'editor' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'privacy' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
            }`}
          >
            Privacy
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2.5 transition-colors whitespace-nowrap ${
              activeTab === 'sessions' ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black' : 'hover:bg-slate-200'
            }`}
          >
            Sessions
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Configured AI Providers</h4>
                  <p className="text-slate-500 font-mono text-[11px]">
                    API keys are encrypted at rest with AES-256-GCM.
                  </p>
                </div>
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 bg-[#D11111] text-white font-black uppercase tracking-wider hover:bg-black flex items-center space-x-1 border border-red-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Provider</span>
                </button>
              </div>

              {/* Form to Add Provider */}
              {isAdding && (
                <form onSubmit={handleAddProvider} className="p-4 bg-red-50 border-2 border-red-300 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Label</label>
                      <input
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        className="w-full bg-white border-2 border-slate-300 px-2.5 py-1 text-slate-900 font-medium focus:border-[#D11111]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Type</label>
                      <select
                        value={providerType}
                        onChange={e => setProviderType(e.target.value as 'openai' | 'anthropic' | 'custom')}
                        className="w-full bg-white border-2 border-slate-300 px-2.5 py-1 text-slate-900 font-medium focus:border-[#D11111]"
                      >
                        <option value="openai">OpenAI / OpenRouter / Compatible</option>
                        <option value="anthropic">Anthropic Claude API</option>
                        <option value="custom">Custom Endpoint</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Base URL</label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                        className="w-full bg-white border-2 border-slate-300 px-2.5 py-1 text-slate-900 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Model Name</label>
                      <input
                        type="text"
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        className="w-full bg-white border-2 border-slate-300 px-2.5 py-1 text-slate-900 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-white border-2 border-slate-300 px-2.5 py-1 text-slate-900 font-mono"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1.5 text-slate-700 hover:text-slate-900 font-bold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-1.5 bg-[#D11111] text-white font-black uppercase tracking-widest hover:bg-black border border-red-800"
                    >
                      Save Key
                    </button>
                  </div>
                </form>
              )}

              {/* Provider List */}
              <div className="space-y-3">
                {providers.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 border-2 border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 text-sm">{p.label}</span>
                        {p.isDefault && (
                          <span className="bg-[#D11111] text-white font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wider">
                            Default
                          </span>
                        )}
                        {p.isVerified ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-1.5 py-0.5 border border-emerald-300 uppercase tracking-wider flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1.5 py-0.5 border border-amber-300 uppercase tracking-wider">
                            Unverified
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 font-mono text-[11px] mt-0.5 font-medium">
                        {p.baseUrl} ({p.model})
                      </p>

                      {testResults[p.id] && (
                        <p
                          className={`mt-1 font-bold text-[10px] ${
                            testResults[p.id].ok ? 'text-emerald-700' : 'text-[#D11111]'
                          }`}
                        >
                          {testResults[p.id].msg}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTestConnection(p.id)}
                        className="px-2.5 py-1 bg-white border-2 border-slate-300 text-slate-800 hover:bg-slate-100 text-[11px] font-black uppercase tracking-wider flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3 text-[#D11111]" />
                        <span>Test</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(p.id)}
                        className="p-1 text-slate-400 hover:text-[#D11111]"
                        title="Delete Provider"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Workspace & Editor Theme Palette</h4>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  Choose a theme to customize both the TeXForge application layout and Monaco LaTeX editor syntax colors.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEMES.map((theme: ThemeDefinition) => {
                  const isSelected = activeThemeId === theme.id;

                  return (
                    <div
                      key={theme.id}
                      onClick={() => onSelectTheme(theme.id)}
                      className={`p-3 border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'bg-white border-[#D11111] shadow-md ring-2 ring-red-100'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                            {theme.name}
                          </span>
                          {isSelected && (
                            <span className="bg-[#D11111] text-white font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wider flex items-center space-x-0.5">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        <p className="text-slate-600 text-[11px] mb-2 leading-relaxed font-medium">
                          {theme.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <div
                            className="w-3.5 h-3.5 border border-slate-300 rounded-2xs"
                            style={{ backgroundColor: theme.colors.bgHeader }}
                          />
                          <div
                            className="w-3.5 h-3.5 border border-slate-300 rounded-2xs"
                            style={{ backgroundColor: theme.colors.bgWorkspace }}
                          />
                          <div
                            className="w-3.5 h-3.5 border border-slate-300 rounded-2xs"
                            style={{ backgroundColor: theme.colors.bgEditor }}
                          />
                          <div
                            className="w-3.5 h-3.5 border border-slate-300 rounded-2xs"
                            style={{ backgroundColor: theme.colors.accent }}
                          />
                        </div>

                        <span className="text-[10px] font-bold text-[#D11111] uppercase tracking-wider">
                          {isSelected ? 'Selected' : 'Use Theme'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider mb-2">Keyboard Shortcuts Cheat Sheet</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border-2 border-slate-200 flex justify-between items-center font-bold">
                  <span>Compile Document</span>
                  <kbd className="bg-white px-2 py-0.5 border-2 border-slate-300 text-[10px] font-mono text-slate-800">Ctrl + Enter</kbd>
                </div>
                <div className="p-2.5 bg-slate-50 border-2 border-slate-200 flex justify-between items-center font-bold">
                  <span>Math Symbol Palette</span>
                  <kbd className="bg-white px-2 py-0.5 border-2 border-slate-300 text-[10px] font-mono text-slate-800">Ctrl + M</kbd>
                </div>
                <div className="p-2.5 bg-slate-50 border-2 border-slate-200 flex justify-between items-center font-bold">
                  <span>Jump to TeX Line</span>
                  <kbd className="bg-white px-2 py-0.5 border-2 border-slate-300 text-[10px] font-mono text-slate-800">Double Click PDF</kbd>
                </div>
                <div className="p-2.5 bg-slate-50 border-2 border-slate-200 flex justify-between items-center font-bold">
                  <span>Autocomplete \cite{}</span>
                  <kbd className="bg-white px-2 py-0.5 border-2 border-slate-300 text-[10px] font-mono text-slate-800">Ctrl + Space</kbd>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <SessionsTab />
          )}

{activeTab === 'editor' && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Editor</h4>

              <div className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-200">
                <div>
                  <span className="font-bold text-slate-900">Autosave</span>
                  <p className="text-slate-500 font-mono text-[11px]">
                    {autosaveEnabled
                      ? 'On — edits are persisted to your project file after you stop typing.'
                      : 'Off — edits are kept as drafts until you press Ctrl/Cmd+S.'}
                  </p>
                </div>
                <button
                  onClick={() => onChangeAutosave(!autosaveEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    autosaveEnabled ? 'bg-[#D11111]' : 'bg-slate-300'
                  }`}
                  title={autosaveEnabled ? 'Turn autosave off' : 'Turn autosave on'}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                      autosaveEnabled ? 'left-7' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-200">
                <div>
                  <span className="font-bold text-slate-900">LaTeX-aware spell check (§28)</span>
                  <p className="text-slate-500 font-mono text-[11px]">
                    {spellCheckEnabled
                      ? 'On — squiggly underlines flag misspelled prose; commands, math and citations are skipped.'
                      : 'Off — only compile diagnostics are shown in the editor.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !spellCheckEnabled;
                    setSpellCheck(next);
                    setSpellCheckEnabled(next);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    spellCheckEnabled ? 'bg-[#D11111]' : 'bg-slate-300'
                  }`}
                  title={spellCheckEnabled ? 'Turn spell check off' : 'Turn spell check on'}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                      spellCheckEnabled ? 'left-7' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <span className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">Save interval (debounce)</span>
                <div className="flex flex-wrap gap-2">
                  {[2000, 5000, 10000, 30000].map(ms => (
                    <button
                      key={ms}
                      onClick={() => onChangeAutosaveInterval(ms)}
                      className={`px-3 py-1.5 border-2 font-bold uppercase tracking-wider text-[10px] transition-colors ${
                        autosaveIntervalMs === ms
                          ? 'bg-[#D11111] text-white border-red-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {ms / 1000}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Privacy & Data Portability</h4>
              <RetentionSetting />
              <p className="text-slate-500 font-mono text-[11px] leading-relaxed">
                Download a GDPR-style archive of everything we store for your account: profile, projects
                and their files, comments, chat, activity, snapshots, PDF annotations, drafts and
                notifications. The ZIP is a standard LaTeX project — it compiles with plain{' '}
                <code className="bg-slate-100 px-1">pdflatex</code> outside Paperly.
              </p>
              <div className="p-3 bg-slate-50 border-2 border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">Export my data</span>
                  <p className="text-slate-500 font-mono text-[11px]">Prepared on demand, downloads as a ZIP archive.</p>
                </div>
                <button
                  onClick={handleExportAccountData}
                  disabled={isExporting || !onExportAccountData}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#D11111] text-white font-black uppercase tracking-wider text-[11px] hover:bg-black disabled:opacity-50 border border-red-800"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Preparing…</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download everything</span>
                    </>
                  )}
                </button>
              </div>
              {exportDone && (
                <div className="flex items-center space-x-2 p-2.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-800 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Archive downloaded. It opens as a plain LaTeX project.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Sessions tab (§34) ----

const RETENTION_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Keep forever', days: null },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

const RetentionSetting: React.FC = () => {
  const [days, setDays] = useState<number | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getChatRetentionDays().then(value => setDays(value));
  }, []);

  const apply = async (value: number | null) => {
    setSaving(true);
    setMessage(null);
    const result = await setChatRetentionDays(value);
    setSaving(false);
    if (result.ok) {
      setDays(value);
      setMessage(value === null ? 'Retention disabled — chat is kept until the project is deleted.' : `Chat older than ${value} days will be swept automatically.`);
    } else {
      setMessage(result.error);
    }
  };

  return (
    <div className="p-3 bg-slate-50 border-2 border-slate-200">
      <span className="block font-bold text-slate-900 text-sm">Chat history retention</span>
      <p className="text-slate-500 font-mono text-[11px] mt-0.5 mb-2">
        Automatically delete project chat messages older than the selected window.
      </p>
      <div className="flex flex-wrap gap-2">
        {RETENTION_OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => apply(opt.days)}
            disabled={saving || days === opt.days}
            className={`px-3 py-1.5 border-2 font-bold uppercase tracking-wider text-[10px] transition-colors ${
              days === opt.days
                ? 'bg-[#D11111] text-white border-red-800'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {saving && <p className="mt-2 text-slate-500 font-mono text-[10px]">Saving…</p>}
      {message && <p className="mt-2 text-slate-600 font-mono text-[10px]">{message}</p>}
    </div>
  );
};

const SessionsTab: React.FC = () => {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await listSessions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await revokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session.');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingAll(true);
    try {
      const current = sessions.find(s => s.current);
      await revokeOtherSessions(current?.id || '');
      setSessions(prev => prev.filter(s => s.current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke other sessions.');
    } finally {
      setRevokingAll(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Active Author Sessions</h4>
        <button
          onClick={load}
          className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-500"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-2.5 bg-amber-50 border-2 border-amber-300 text-amber-800 font-bold text-[11px]">
          <Shield className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-slate-500 font-mono text-[11px] py-4">No sessions found for this account.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="p-3 bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 truncate">{deviceLabelFromUserAgent(s.userAgent)}</span>
                  {s.current && (
                    <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 border border-emerald-300 uppercase tracking-wider shrink-0">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5 truncate">
                  {s.ip || 'IP unknown'} · Active {formatDate(s.updatedAt)}
                </p>
              </div>
              {!s.current && (
                <button
                  onClick={() => handleRevoke(s.id)}
                  disabled={revoking === s.id}
                  className="flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-50 shrink-0"
                >
                  {revoking === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                  <span>Revoke</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {sessions.length > 1 && (
        <button
          onClick={handleRevokeOthers}
          disabled={revokingAll}
          className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 border-2 border-red-300 text-red-700 font-black uppercase tracking-wider text-[11px] hover:bg-red-50 disabled:opacity-50"
        >
          {revokingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          <span>Sign out all other devices</span>
        </button>
      )}
    </div>
  );
};
