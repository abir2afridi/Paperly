import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Table as TableIcon } from 'lucide-react';

interface TableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLatex: (latex: string) => void;
}

export const TableEditorModal: React.FC<TableEditorModalProps> = ({
  isOpen,
  onClose,
  onInsertLatex,
}) => {
  const [caption, setCaption] = useState('Experimental Evaluation Metrics');
  const [label, setLabel] = useState('tab:metrics');
  const [useBooktabs, setUseBooktabs] = useState(true);
  const [alignment, setAlignment] = useState<'l' | 'c' | 'r'>('c');

  const [grid, setGrid] = useState<string[][]>([
    ['Model / Method', 'Accuracy (%)', 'Latency (ms)'],
    ['Baseline Transformer', '84.2', '120'],
    ['TeXForge WASM Engine', '96.8', '45'],
    ['Distributed Cloud Cluster', '98.1', '85'],
  ]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const colCount = grid[0]?.length || 3;
    setGrid(prev => [...prev, new Array(colCount).fill('Cell')]);
  };

  const handleAddCol = () => {
    setGrid(prev => prev.map(row => [...row, 'Cell']));
  };

  const handleDeleteRow = (index: number) => {
    if (grid.length <= 1) return;
    setGrid(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteCol = (index: number) => {
    if (grid[0]?.length <= 1) return;
    setGrid(prev => prev.map(row => row.filter((_, i) => i !== index)));
  };

  const handleCellChange = (r: number, c: number, value: string) => {
    const nextGrid = grid.map(row => [...row]);
    nextGrid[r][c] = value;
    setGrid(nextGrid);
  };

  const generateLatexTable = () => {
    const cols = grid[0].length;
    const colAlignStr = new Array(cols).fill(alignment).join(useBooktabs ? ' ' : ' | ');

    let code = `\\begin{table}[h]\n`;
    code += `\\centering\n`;
    if (caption) code += `\\caption{${caption}}\n`;
    if (label) code += `\\label{${label}}\n`;
    code += `\\begin{tabular}{${useBooktabs ? colAlignStr : `| ${colAlignStr} |`}}\n`;

    if (useBooktabs) {
      code += `\\toprule\n`;
    } else {
      code += `\\hline\n`;
    }

    // Header Row
    code += grid[0].map(cell => `\\textbf{${cell}}`).join(' & ') + ` \\\\\n`;

    if (useBooktabs) {
      code += `\\midrule\n`;
    } else {
      code += `\\hline\n`;
    }

    // Data Rows
    for (let i = 1; i < grid.length; i++) {
      code += grid[i].join(' & ') + ` \\\\\n`;
    }

    if (useBooktabs) {
      code += `\\bottomrule\n`;
    } else {
      code += `\\hline\n`;
    }

    code += `\\end{tabular}\n`;
    code += `\\end{table}\n`;

    return code;
  };

  const handleInsert = () => {
    onInsertLatex(generateLatexTable());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <TableIcon className="w-5 h-5 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">Visual LaTeX Table Generator</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Options */}
        <div className="p-4 border-b-2 border-slate-200 grid grid-cols-2 gap-3 text-xs bg-slate-50">
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Caption</label>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 px-2.5 py-1 text-slate-900 font-medium focus:border-[#D11111]"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 px-2.5 py-1 text-slate-900 font-mono focus:border-[#D11111]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="booktabs"
              checked={useBooktabs}
              onChange={e => setUseBooktabs(e.target.checked)}
              className="accent-[#D11111]"
            />
            <label htmlFor="booktabs" className="font-bold text-slate-700 cursor-pointer">
              Use <code className="text-[#D11111] font-mono">booktabs</code> style
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Align:</span>
            {(['l', 'c', 'r'] as const).map(align => (
              <button
                key={align}
                onClick={() => setAlignment(align)}
                className={`px-2.5 py-0.5 text-xs uppercase font-black ${
                  alignment === align ? 'bg-[#D11111] text-white border border-red-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Grid */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D11111]">Grid Dimensions</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddRow}
                className="px-2.5 py-1 bg-white border-2 border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3 text-[#D11111]" />
                <span>Add Row</span>
              </button>
              <button
                onClick={handleAddCol}
                className="px-2.5 py-1 bg-white border-2 border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3 text-[#D11111]" />
                <span>Add Column</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border-2 border-slate-300 bg-white shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-red-50 border-b-2 border-red-200">
                  {grid[0].map((_, colIdx) => (
                    <th key={colIdx} className="p-2 border-r-2 border-slate-200 text-center font-black text-[#D11111] uppercase tracking-wider">
                      Col {colIdx + 1}
                      <button
                        onClick={() => handleDeleteCol(colIdx)}
                        className="ml-1 text-slate-400 hover:text-[#D11111]"
                        title="Delete Column"
                      >
                        ×
                      </button>
                    </th>
                  ))}
                  <th className="p-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {grid.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-slate-200">
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="p-1 border-r border-slate-200">
                        <input
                          type="text"
                          value={cell}
                          onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                          className={`w-full p-1 text-xs border border-transparent focus:border-[#D11111] focus:bg-white ${
                            rowIdx === 0 ? 'font-bold text-slate-900 bg-slate-50' : 'text-slate-800'
                          }`}
                        />
                      </td>
                    ))}
                    <td className="p-1 text-center">
                      <button
                        onClick={() => handleDeleteRow(rowIdx)}
                        className="p-1 text-slate-400 hover:text-[#D11111]"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Generated Code Preview */}
          <div className="mt-4">
            <span className="text-[10px] font-black text-[#D11111] uppercase tracking-widest block mb-1">Generated LaTeX Code Preview</span>
            <pre className="p-3 bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto border-2 border-slate-800">
              {generateLatexTable()}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t-2 border-slate-200 flex justify-end space-x-2 bg-slate-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 font-bold uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            className="px-4 py-1.5 text-xs bg-[#D11111] text-white font-black uppercase tracking-widest hover:bg-black flex items-center space-x-1.5 transition-colors border border-red-800"
          >
            <Check className="w-4 h-4" />
            <span>Insert Table Code</span>
          </button>
        </div>
      </div>
    </div>
  );
};
