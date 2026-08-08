import React, { useState } from 'react';
import { Palette, Check, Sun, Moon, X, Sparkles, Code2, Link2 } from 'lucide-react';
import { THEMES, ThemeId, ThemeDefinition } from '../services/themeService';
import { CODE_THEMES, CodeThemeId, CodeThemeDefinition } from '../services/codeThemeService';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  activeCodeThemeId: CodeThemeId;
  onSelectCodeTheme: (codeThemeId: CodeThemeId) => void;
}

type ModalTab = 'workspace' | 'code';

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  activeThemeId,
  onSelectTheme,
  activeCodeThemeId,
  onSelectCodeTheme,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('workspace');

  if (!isOpen) return null;

  const activeTheme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

  const ModeBadge: React.FC<{ mode: 'light' | 'dark' }> = ({ mode }) => (
    <span
      className={`text-[9px] font-black px-2 py-0.5 uppercase tracking-wider flex items-center space-x-1 ${
        mode === 'dark'
          ? 'bg-slate-800 text-slate-200 border border-slate-700'
          : 'bg-amber-100 text-amber-900 border border-amber-300'
      }`}
    >
      {mode === 'dark' ? (
        <>
          <Moon className="w-3 h-3 text-cyan-300" />
          <span>Dark</span>
        </>
      ) : (
        <>
          <Sun className="w-3 h-3 text-amber-600" />
          <span>Light</span>
        </>
      )}
    </span>
  );

  const Swatch: React.FC<{ color: string; label: string }> = ({ color, label }) => (
    <div
      className="w-4 h-4 border border-slate-300 rounded-2xs shadow-2xs"
      style={{ backgroundColor: color }}
      title={label}
    />
  );

  const renderWorkspaceCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {THEMES.map((theme: ThemeDefinition) => {
        const isSelected = activeThemeId === theme.id;

        return (
          <div
            key={theme.id}
            onClick={() => onSelectTheme(theme.id)}
            className={`p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
              isSelected
                ? 'bg-white border-[#D11111] shadow-md ring-2 ring-red-200'
                : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
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

                <ModeBadge mode={theme.mode} />
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed mb-3 font-medium">
                {theme.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono text-slate-400 mr-1">Preview:</span>
                <Swatch color={theme.colors.bgHeader} label={`Header: ${theme.colors.bgHeader}`} />
                <Swatch color={theme.colors.bgWorkspace} label={`Workspace: ${theme.colors.bgWorkspace}`} />
                <Swatch color={theme.colors.bgEditor} label={`Editor: ${theme.colors.bgEditor}`} />
                <Swatch color={theme.colors.accent} label={`Accent: ${theme.colors.accent}`} />
              </div>

              <span className="text-[10px] font-bold text-[#D11111] group-hover:underline uppercase tracking-wider">
                {isSelected ? 'Selected' : 'Apply Theme'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCodeCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {CODE_THEMES.map((codeTheme: CodeThemeDefinition) => {
        const isSelected = activeCodeThemeId === codeTheme.id;
        const isMatch = codeTheme.isDefault === true;
        const preview = isMatch
          ? {
              bg: activeTheme.colors.bgEditor,
              keyword: activeTheme.colors.accent,
              string: activeTheme.colors.textSecondary,
              comment: activeTheme.colors.border,
              function: activeTheme.colors.textPrimary,
              number: activeTheme.colors.textSecondary,
              type: activeTheme.colors.textPrimary,
            }
          : codeTheme.preview;

        return (
          <div
            key={codeTheme.id}
            onClick={() => onSelectCodeTheme(codeTheme.id)}
            className={`p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
              isSelected
                ? 'bg-white border-[#D11111] shadow-md ring-2 ring-red-200'
                : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                    {codeTheme.name}
                  </span>
                  {isSelected && (
                    <span className="bg-[#D11111] text-white font-black text-[9px] px-1.5 py-0.5 uppercase tracking-wider flex items-center space-x-0.5">
                      <Check className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                {isMatch ? (
                  <span className="text-[9px] font-black px-2 py-0.5 uppercase tracking-wider flex items-center space-x-1 bg-blue-100 text-blue-900 border border-blue-300">
                    <Link2 className="w-3 h-3 text-blue-700" />
                    <span>Default</span>
                  </span>
                ) : (
                  <ModeBadge mode={codeTheme.mode} />
                )}
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed mb-3 font-medium">
                {codeTheme.description}
                {isMatch && (
                  <span className="block mt-1 font-bold text-blue-700">
                    Currently follows: {activeTheme.name}
                  </span>
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono text-slate-400 mr-1">
                  {isMatch ? 'Syncs with:' : 'Preview:'}
                </span>
                <Swatch color={preview.bg} label="Editor background" />
                <Swatch color={preview.keyword} label="Keyword color" />
                <Swatch color={preview.string} label="String color" />
                <Swatch color={preview.comment} label="Comment color" />
                <Swatch color={preview.function} label="Function color" />
                <Swatch color={preview.number} label="Number color" />
                <Swatch color={preview.type} label="Type color" />
              </div>

              <span className="text-[10px] font-bold text-[#D11111] group-hover:underline uppercase tracking-wider">
                {isSelected ? 'Selected' : 'Apply Palette'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <Palette className="w-5 h-5 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">
              TeXForge Workspace & Editor Themes
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Description */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#D11111]" />
            <span>
              {activeTab === 'workspace'
                ? 'Select a customized theme palette for your workspace and Monaco LaTeX code editor.'
                : 'Pick a fixed VS Code-style code palette, or keep code colors synced to your workspace theme.'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 uppercase">
            {activeTab === 'workspace'
              ? `${THEMES.length} Workspace Themes`
              : `${CODE_THEMES.length} Code Palettes`}
          </span>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-100">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center space-x-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors border-r border-slate-200 ${
              activeTab === 'workspace'
                ? 'bg-white text-[#D11111] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Workspace Themes</span>
            <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {THEMES.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center space-x-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors border-r border-slate-200 ${
              activeTab === 'code'
                ? 'bg-white text-[#D11111] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code Colors</span>
            <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {CODE_THEMES.length}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-100">
          {activeTab === 'workspace' ? renderWorkspaceCards() : renderCodeCards()}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t-2 border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-[#D11111] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
