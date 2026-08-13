import React, { useMemo, useState } from 'react';
import { Search, X, Plus, AlertTriangle } from 'lucide-react';
import { CTAN_PACKAGES, PACKAGE_CATEGORIES } from '../services/ctanPackages';

interface CtanPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertPackage: (name: string) => void;
}

export const CtanPackageModal: React.FC<CtanPackageModalProps> = ({
  isOpen,
  onClose,
  onInsertPackage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CTAN_PACKAGES.filter(pkg => {
      if (category !== 'all' && pkg.category !== category) return false;
      if (!q) return true;
      return (
        pkg.name.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q) ||
        pkg.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, category]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <span className="font-black text-white text-sm uppercase tracking-widest">CTAN Package Palette</span>
            <span className="bg-white text-[#D11111] text-[9px] font-black px-2 py-0.5 uppercase tracking-wider">Static Index</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="p-3 bg-amber-50 border-b-2 border-amber-200 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-800">
            The package must be <strong>installed in the compile sandbox&apos;s TeX Live</strong> for the build to
            succeed — this palette is a searchable index, not an installer.
          </p>
        </div>

        {/* Search + Category Filter */}
        <div className="p-3 border-b-2 border-slate-200 bg-white space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search packages (e.g., hyperref, tables, colors)..."
              className="w-full bg-slate-50 border-2 border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#D11111]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory('all')}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-colors ${
                category === 'all'
                  ? 'bg-[#D11111] text-white border-[#D11111]'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
              }`}
            >
              All ({CTAN_PACKAGES.length})
            </button>
            {PACKAGE_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(category === cat ? 'all' : cat)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-colors ${
                  category === cat
                    ? 'bg-[#D11111] text-white border-[#D11111]'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No packages match &quot;{searchQuery}&quot;.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map(pkg => (
                <li key={pkg.name} className="py-2.5 flex items-start justify-between space-x-3 group">
                  <div className="min-w-0">
                    <div className="flex items-baseline space-x-2">
                      <code className="text-xs font-mono font-bold text-slate-900">\usepackage&#123;{pkg.name}&#125;</code>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{pkg.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{pkg.description}</p>
                  </div>
                  <button
                    onClick={() => onInsertPackage(pkg.name)}
                    className="shrink-0 px-2.5 py-1.5 bg-[#D11111] text-white text-[10px] font-black uppercase tracking-wider hover:bg-black flex items-center space-x-1 border border-red-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insert</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};