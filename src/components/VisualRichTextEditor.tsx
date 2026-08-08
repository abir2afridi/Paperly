import React, { useState } from 'react';
import { Type, Code, Eye, Plus, Bold, Italic, List, Hash, Binary } from 'lucide-react';

interface VisualRichTextEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onInsertLatex: (snippet: string) => void;
}

export const VisualRichTextEditor: React.FC<VisualRichTextEditorProps> = ({
  content,
  onChange,
  onInsertLatex,
}) => {
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  // Simple parser to convert LaTeX code lines/blocks into structured visual AST blocks
  const parseBlocks = (raw: string) => {
    const lines = raw.split('\n');
    const blocks: { id: number; type: 'title' | 'section' | 'subsection' | 'paragraph' | 'math' | 'environment' | 'comment'; text: string; rawText: string }[] = [];
    
    let currentBlock: string[] = [];
    let currentType: 'paragraph' | 'math' | 'environment' | 'section' | 'subsection' | 'title' | 'comment' = 'paragraph';

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('\\title{')) {
        blocks.push({ id: index, type: 'title', text: trimmed.replace('\\title{', '').replace(/}$/, ''), rawText: line });
      } else if (trimmed.startsWith('\\section{')) {
        blocks.push({ id: index, type: 'section', text: trimmed.replace('\\section{', '').replace(/}$/, ''), rawText: line });
      } else if (trimmed.startsWith('\\subsection{')) {
        blocks.push({ id: index, type: 'subsection', text: trimmed.replace('\\subsection{', '').replace(/}$/, ''), rawText: line });
      } else if (trimmed.startsWith('\\begin{')) {
        blocks.push({ id: index, type: 'environment', text: trimmed, rawText: line });
      } else if (trimmed.startsWith('$') || trimmed.startsWith('\\[') || trimmed.startsWith('\\begin{equation}')) {
        blocks.push({ id: index, type: 'math', text: trimmed, rawText: line });
      } else if (trimmed.startsWith('%')) {
        blocks.push({ id: index, type: 'comment', text: trimmed.replace(/^%/, '').trim(), rawText: line });
      } else if (trimmed.length > 0) {
        blocks.push({ id: index, type: 'paragraph', text: trimmed, rawText: line });
      }
    });

    return blocks;
  };

  const blocks = parseBlocks(content);

  const handleBlockChange = (index: number, newRaw: string) => {
    const lines = content.split('\n');
    lines[index] = newRaw;
    onChange(lines.join('\n'));
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 font-sans select-none overflow-hidden">
      {/* Visual Toolbar */}
      <div className="p-2 bg-white border-b-2 border-slate-200 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#D11111] px-2 py-1 bg-red-50 border border-red-200 mr-2">
            Visual AST Mode
          </span>
          <button
            onClick={() => onInsertLatex('\\section{New Section}')}
            className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-[#D11111] border border-slate-200 rounded text-xs font-bold flex items-center space-x-1"
            title="Insert Section"
          >
            <Hash className="w-3.5 h-3.5 text-[#D11111]" />
            <span>Section</span>
          </button>
          <button
            onClick={() => onInsertLatex('\\textbf{bold text}')}
            className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-[#D11111] border border-slate-200 rounded text-xs font-bold"
            title="Insert Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onInsertLatex('\\textit{italic text}')}
            className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-[#D11111] border border-slate-200 rounded text-xs font-bold"
            title="Insert Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onInsertLatex('\\begin{equation}\n  E = mc^2\n\\end{equation}')}
            className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-[#D11111] border border-slate-200 rounded text-xs font-bold flex items-center space-x-1"
            title="Insert Math Block"
          >
            <Binary className="w-3.5 h-3.5 text-[#D11111]" />
            <span>Equation</span>
          </button>
          <button
            onClick={() => onInsertLatex('\\begin{itemize}\n  \\item First item\n\\end{itemize}')}
            className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-[#D11111] border border-slate-200 rounded text-xs font-bold"
            title="Insert List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-[10px] font-mono text-slate-500">
          Click block to edit LaTeX source fragment
        </span>
      </div>

      {/* Visual Blocks Render Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-4">
        {blocks.map((b, idx) => (
          <div
            key={idx}
            onClick={() => setEditingBlockIndex(idx)}
            className={`p-3 border-2 transition-all cursor-pointer relative group ${
              editingBlockIndex === idx
                ? 'bg-white border-[#D11111] shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-400'
            }`}
          >
            {editingBlockIndex === idx ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#D11111] tracking-wider">Editing Source Line #{idx + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBlockIndex(null);
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-black uppercase"
                  >
                    Done
                  </button>
                </div>
                <textarea
                  value={b.rawText}
                  onChange={e => handleBlockChange(idx, e.target.value)}
                  className="w-full bg-slate-900 text-slate-100 p-2 font-mono text-xs border border-slate-800 focus:outline-hidden"
                  rows={2}
                  autoFocus
                />
              </div>
            ) : (
              <div>
                {b.type === 'title' && (
                  <h1 className="text-2xl font-black text-slate-900 border-b-2 border-slate-900 pb-1 mb-1">{b.text}</h1>
                )}
                {b.type === 'section' && (
                  <h2 className="text-lg font-extrabold text-[#D11111] mt-2 mb-1 uppercase tracking-tight flex items-center space-x-2">
                    <span className="bg-[#D11111] text-white text-xs px-1.5 py-0.5 font-mono">§</span>
                    <span>{b.text}</span>
                  </h2>
                )}
                {b.type === 'subsection' && (
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-1">{b.text}</h3>
                )}
                {b.type === 'paragraph' && (
                  <p className="text-slate-800 text-xs leading-relaxed font-normal">{b.text}</p>
                )}
                {b.type === 'math' && (
                  <div className="p-2 bg-red-50 border border-red-200 text-[#D11111] font-mono text-xs flex items-center justify-center font-bold my-1">
                    {b.text}
                  </div>
                )}
                {b.type === 'environment' && (
                  <div className="p-2 bg-slate-100 border border-slate-300 font-mono text-[11px] text-slate-700">
                    {b.text}
                  </div>
                )}
                {b.type === 'comment' && (
                  <p className="text-slate-400 italic text-[11px] font-mono">% {b.text}</p>
                )}

                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 text-slate-600 text-[9px] font-mono px-1.5 py-0.5 border border-slate-300 uppercase">
                  {b.type}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
