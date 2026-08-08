import React from 'react';
import { Palette, Check, Sun, Moon, X, Sparkles } from 'lucide-react';
import { THEMES, ThemeId, ThemeDefinition } from '../services/themeService';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  activeThemeId,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

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
            <span>Select a customized theme palette for your workspace and Monaco LaTeX code editor.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 uppercase">5 Themes Available</span>
        </div>

        {/* Theme List Grid */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-100">
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
                    {/* Header line of card */}
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

                      <span
                        className={`text-[9px] font-black px-2 py-0.5 uppercase tracking-wider flex items-center space-x-1 ${
                          theme.mode === 'dark'
                            ? 'bg-slate-800 text-slate-200 border border-slate-700'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {theme.mode === 'dark' ? (
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
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 text-[11px] leading-relaxed mb-3 font-medium">
                      {theme.description}
                    </p>
                  </div>

                  {/* Swatch Preview Bar */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono text-slate-400 mr-1">Preview:</span>
                      <div
                        className="w-4 h-4 border border-slate-300 rounded-2xs shadow-2xs"
                        style={{ backgroundColor: theme.colors.bgHeader }}
                        title={`Header: ${theme.colors.bgHeader}`}
                      />
                      <div
                        className="w-4 h-4 border border-slate-300 rounded-2xs shadow-2xs"
                        style={{ backgroundColor: theme.colors.bgWorkspace }}
                        title={`Workspace: ${theme.colors.bgWorkspace}`}
                      />
                      <div
                        className="w-4 h-4 border border-slate-300 rounded-2xs shadow-2xs"
                        style={{ backgroundColor: theme.colors.bgEditor }}
                        title={`Editor: ${theme.colors.bgEditor}`}
                      />
                      <div
                        className="w-4 h-4 border border-slate-300 rounded-2xs shadow-2xs"
                        style={{ backgroundColor: theme.colors.accent }}
                        title={`Accent: ${theme.colors.accent}`}
                      />
                    </div>

                    <span className="text-[10px] font-bold text-[#D11111] group-hover:underline uppercase tracking-wider">
                      {isSelected ? 'Selected' : 'Apply Theme'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
