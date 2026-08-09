import React, { useState } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Timer,
  FileWarning,
  ScrollText,
  ListFilter,
  Layers,
} from 'lucide-react';
import { CompilationResult, CompileDiagnostic } from '../types';

type FilterTab = 'all' | 'errors' | 'warnings' | 'raw';

interface TerminalPanelProps {
  result: CompilationResult | null;
  isOpen: boolean;
  onToggle: () => void;
  activeFilePath: string;
  onJumpToLine: (file: string, line: number) => void;
}

const SeverityIcon: React.FC<{ severity: CompileDiagnostic['severity'] }> = ({ severity }) => {
  if (severity === 'error') return <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />;
  if (severity === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
  return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />;
};

const SeverityLabel: React.FC<{ severity: CompileDiagnostic['severity'] }> = ({ severity }) => {
  if (severity === 'error') return <span className="text-red-600 font-black">ERROR</span>;
  if (severity === 'warning') return <span className="text-amber-600 font-black">WARN</span>;
  return <span className="text-blue-500 font-black">INFO</span>;
};

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  result,
  isOpen,
  onToggle,
  activeFilePath,
  onJumpToLine,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const diagnostics = result?.diagnostics || [];
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const durationSeconds = result ? (result.durationMs / 1000).toFixed(2) + 's' : '--';

  const filtered: CompileDiagnostic[] =
    activeTab === 'errors'
      ? diagnostics.filter(d => d.severity === 'error')
      : activeTab === 'warnings'
      ? diagnostics.filter(d => d.severity === 'warning')
      : diagnostics;

  const tabButton = (tab: FilterTab, label: string, count: number, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1.5 flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider transition-colors border-r border-slate-200 ${
        activeTab === tab
          ? 'bg-white text-[#D11111] shadow-sm'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span>{label}</span>
      {tab !== 'raw' && (
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            tab === 'errors' && count > 0
              ? 'bg-red-100 text-red-700'
              : tab === 'warnings' && count > 0
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="border-t-2 border-slate-200 bg-white flex flex-col shrink-0 select-none">
      {/* Header Summary Banner */}
      <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#D11111]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
              Terminal / Diagnostics
            </span>
          </div>

          {/* Compilation Status */}
          {result ? (
            result.status === 'success' ? (
              <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Succeeded</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-300 px-2 py-0.5">
                <XCircle className="w-3 h-3" />
                <span>Failed</span>
              </span>
            )
          ) : (
            <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-600 border border-slate-300 px-2 py-0.5">
              <FileWarning className="w-3 h-3" />
              <span>Not Compiled</span>
            </span>
          )}

          {/* Error Counter */}
          <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-wider text-red-600">
            <XCircle className="w-3 h-3" />
            <span>Errors: {errorCount}</span>
          </span>

          {/* Warning Counter */}
          <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-wider text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Warnings: {warningCount}</span>
          </span>

          {/* Compilation Duration */}
          <span className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">
            <Timer className="w-3 h-3" />
            <span>Duration: {durationSeconds}</span>
          </span>

          {result && (
            <span className="text-[9px] font-mono text-slate-400">
              {new Date(result.compiledAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        <button
          onClick={onToggle}
          className="p-1 text-slate-500 hover:text-[#D11111] hover:bg-red-50 transition-colors"
          title={isOpen ? 'Collapse Terminal' : 'Expand Terminal'}
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Log Filter Tabs */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50">
            {tabButton('all', 'All Messages', diagnostics.length, <Layers className="w-3 h-3" />)}
            {tabButton('errors', 'Errors', errorCount, <XCircle className="w-3 h-3" />)}
            {tabButton('warnings', 'Warnings', warningCount, <AlertTriangle className="w-3 h-3" />)}
            {tabButton('raw', 'Raw TeX Log', 0, <ScrollText className="w-3 h-3" />)}
          </div>

          {/* Content Area */}
          <div className="h-44 overflow-y-auto bg-white">
            {activeTab === 'raw' ? (
              <pre className="p-3 bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre h-full overflow-auto">
                {result ? result.log : 'No raw log available — run a compile first.'}
              </pre>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {activeTab === 'all' && !result
                  ? 'No diagnostics yet — press Compile to build your project.'
                  : activeTab === 'errors'
                  ? 'No error messages found.'
                  : activeTab === 'warnings'
                  ? 'No warnings found.'
                  : 'No diagnostics yet — press Compile to build your project.'}
              </div>
            ) : (
              <div className="flex flex-col">
                {filtered.map((d, idx) => {
                  const jumpable = d.line != null;
                  return (
                    <button
                      key={`${d.file}-${d.line}-${idx}`}
                      onClick={() => jumpable && onJumpToLine(d.file || 'main.tex', d.line!)}
                      disabled={!jumpable}
                      className={`w-full flex items-start space-x-2 px-3 py-1.5 text-left border-b border-slate-100 transition-colors ${
                        jumpable
                          ? 'hover:bg-red-50 group cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <SeverityIcon severity={d.severity} />
                      <span className="flex-1 text-[11px] font-mono text-slate-800 leading-relaxed break-words">
                        <SeverityLabel severity={d.severity} /> {d.message}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono text-slate-400 group-hover:text-[#D11111] group-hover:underline">
                        {d.file || 'main.tex'}
                        {jumpable ? `:${d.line}` : ''}
                        {jumpable && (
                          <span className="ml-1 text-[9px] uppercase tracking-wider">Jump</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
