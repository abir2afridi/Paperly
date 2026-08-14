import React, { useState, useEffect } from 'react';
import { Search, X, Command, Keyboard, Sparkles } from 'lucide-react';
import { SHORTCUTS, SHORTCUT_CATEGORIES } from '../services/shortcutsRegistry';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ['All', ...SHORTCUT_CATEGORIES];

  const filteredShortcuts = SHORTCUTS.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      s.action.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query) ||
      s.keys.some(k => k.toLowerCase().includes(query)) ||
      s.category.toLowerCase().includes(query);

    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;

    return matchesQuery && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header Bar */}
        <div className="h-1.5 w-full bg-[#D11111]" />

        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-950 border border-red-700/80 flex items-center justify-center text-[#D11111]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-white text-base tracking-tight leading-none">
                  Keyboard Shortcuts Cheatsheet
                </h3>
                <span className="bg-red-950 text-red-400 border border-red-800 text-[10px] font-mono font-bold px-1.5 py-0.2 uppercase">
                  Cmd / Ctrl + /
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                TeXForge Editor Efficiency Shortcuts & Action Commands
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search shortcut name, key combo (e.g. Ctrl, Enter), or description..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-[#D11111] text-white text-xs font-mono pl-9 pr-8 py-2.5 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-mono font-bold">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 whitespace-nowrap transition-colors uppercase tracking-wider ${
                  selectedCategory === cat
                    ? 'bg-[#D11111] text-white font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-950">
          {filteredShortcuts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2">
              <Command className="w-8 h-8 mx-auto text-slate-700" />
              <p>No shortcuts matched your query "{searchQuery}".</p>
            </div>
          ) : (
            filteredShortcuts.map(shortcut => (
              <div
                key={shortcut.id}
                className="bg-slate-900 border border-slate-800 hover:border-red-600/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-white text-xs group-hover:text-red-400 transition-colors">
                      {shortcut.action}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-950 border border-slate-800 px-1.5 py-0.2 uppercase">
                      {shortcut.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {shortcut.description}
                  </p>
                </div>

                {/* Keyboard Badges */}
                <div className="flex items-center space-x-1 shrink-0 font-mono text-xs">
                  {shortcut.keys.map((key, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-slate-600 font-black">+</span>}
                      <kbd className="px-2 py-1 bg-slate-950 border-2 border-slate-700 text-amber-300 font-black rounded text-[11px] shadow-inner">
                        {key === 'Ctrl' ? 'Ctrl / ⌘' : key}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D11111]" />
            <span>Pro Tip: Press <kbd className="px-1 bg-slate-800 text-white font-bold border border-slate-700">Cmd/Ctrl + /</kbd> anytime in workspace to view this cheatsheet</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase tracking-wider transition-colors"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
