import React, { useState } from 'react';
import { Search, X, Copy, Plus } from 'lucide-react';
import katex from 'katex';

interface MathPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLatex: (latex: string) => void;
}

interface SymbolGroup {
  category: string;
  symbols: { latex: string; name: string }[];
}

const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    category: 'Greek Letters',
    symbols: [
      { latex: '\\alpha', name: 'Alpha' },
      { latex: '\\beta', name: 'Beta' },
      { latex: '\\gamma', name: 'Gamma' },
      { latex: '\\delta', name: 'Delta' },
      { latex: '\\epsilon', name: 'Epsilon' },
      { latex: '\\theta', name: 'Theta' },
      { latex: '\\lambda', name: 'Lambda' },
      { latex: '\\mu', name: 'Mu' },
      { latex: '\\pi', name: 'Pi' },
      { latex: '\\sigma', name: 'Sigma' },
      { latex: '\\phi', name: 'Phi' },
      { latex: '\\omega', name: 'Omega' },
      { latex: '\\Gamma', name: 'Capital Gamma' },
      { latex: '\\Delta', name: 'Capital Delta' },
      { latex: '\\Sigma', name: 'Capital Sigma' },
      { latex: '\\Omega', name: 'Capital Omega' },
    ],
  },
  {
    category: 'Operators & Relations',
    symbols: [
      { latex: '\\sum_{i=1}^{n}', name: 'Summation' },
      { latex: '\\int_{a}^{b}', name: 'Integral' },
      { latex: '\\prod_{i=1}^{n}', name: 'Product' },
      { latex: '\\lim_{x \\to \\infty}', name: 'Limit' },
      { latex: '\\frac{a}{b}', name: 'Fraction' },
      { latex: '\\sqrt{x}', name: 'Square Root' },
      { latex: '\\partial', name: 'Partial Derivative' },
      { latex: '\\nabla', name: 'Nabla / Gradient' },
      { latex: '\\le', name: 'Less or Equal' },
      { latex: '\\ge', name: 'Greater or Equal' },
      { latex: '\\neq', name: 'Not Equal' },
      { latex: '\\approx', name: 'Approximately' },
      { latex: '\\infty', name: 'Infinity' },
      { latex: '\\pm', name: 'Plus Minus' },
    ],
  },
  {
    category: 'Matrices & Structures',
    symbols: [
      { latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', name: 'Bracket Matrix' },
      { latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', name: 'Parenthesis Matrix' },
      { latex: '\\begin{cases} x & \\text{if } a \\\\ y & \\text{if } b \\end{cases}', name: 'Cases Block' },
      { latex: '\\vec{v}', name: 'Vector' },
      { latex: '\\hat{x}', name: 'Hat Accent' },
    ],
  },
];

export const MathPalette: React.FC<MathPaletteProps> = ({
  isOpen,
  onClose,
  onInsertLatex,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customEquation, setCustomEquation] = useState('E = m c^2');

  if (!isOpen) return null;

  const renderKaTeX = (math: string) => {
    try {
      return {
        __html: katex.renderToString(math, {
          throwOnError: false,
          displayMode: false,
        }),
      };
    } catch {
      return { __html: math };
    }
  };

  const renderDisplayKaTeX = (math: string) => {
    try {
      return {
        __html: katex.renderToString(math, {
          throwOnError: false,
          displayMode: true,
        }),
      };
    } catch {
      return { __html: math };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <span className="font-black text-white text-sm uppercase tracking-widest">Math Symbol & Equation Palette</span>
            <span className="bg-white text-[#D11111] text-[9px] font-black px-2 py-0.5 uppercase tracking-wider">KaTeX Live</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Equation Playground */}
        <div className="p-4 bg-red-50 border-b-2 border-red-200 flex flex-col space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-800">Live Equation Sandbox:</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customEquation}
              onChange={e => setCustomEquation(e.target.value)}
              placeholder="Type LaTeX math e.g. \frac{a}{b}..."
              className="flex-1 bg-white border-2 border-[#D11111] px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-hidden"
            />
            <button
              onClick={() => onInsertLatex(`$${customEquation}$`)}
              className="px-3 py-1.5 bg-[#D11111] text-white text-xs font-black uppercase tracking-wider hover:bg-black flex items-center space-x-1 border border-red-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inline</span>
            </button>
            <button
              onClick={() => onInsertLatex(`\n\\begin{equation}\n${customEquation}\n\\end{equation}\n`)}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-black flex items-center space-x-1 border border-slate-900"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Block</span>
            </button>
          </div>

          <div className="p-3 bg-white border-2 border-slate-200 min-h-[60px] flex items-center justify-center overflow-x-auto">
            <div dangerouslySetInnerHTML={renderDisplayKaTeX(customEquation)} />
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b-2 border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search symbols (e.g., sum, matrix, alpha)..."
              className="w-full bg-slate-50 border-2 border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-[#D11111]"
            />
          </div>
        </div>

        {/* Symbols Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {SYMBOL_GROUPS.map(group => {
            const filtered = group.symbols.filter(
              s =>
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.latex.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filtered.length === 0) return null;

            return (
              <div key={group.category} className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{group.category}</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {filtered.map(item => (
                    <button
                      key={item.name}
                      onClick={() => onInsertLatex(item.latex)}
                      className="p-2.5 bg-slate-50 hover:bg-red-50 hover:border-red-300 border border-slate-200 rounded-lg flex flex-col items-center justify-center space-y-1 transition-colors group cursor-pointer"
                      title={`${item.name} (${item.latex})`}
                    >
                      <span
                        className="text-sm font-serif text-slate-800 group-hover:text-red-600"
                        dangerouslySetInnerHTML={renderKaTeX(item.latex)}
                      />
                      <span className="text-[9px] text-slate-400 truncate w-full text-center group-hover:text-red-700">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
