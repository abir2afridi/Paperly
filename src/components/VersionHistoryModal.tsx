import React, { useMemo, useState } from 'react';
import { X, History, RotateCcw, FileCode, GitCompareArrows, ArrowDown, ArrowUp } from 'lucide-react';
import { ProjectSnapshot } from '../types';
import { diffSnapshots } from '../services/snapshotDiff';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: ProjectSnapshot[];
  onRestoreSnapshot: (snapshot: ProjectSnapshot) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onRestoreSnapshot,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<ProjectSnapshot | null>(
    snapshots[0] || null
  );
  const [compareMode, setCompareMode] = useState(false);
  const [compareTarget, setCompareTarget] = useState<ProjectSnapshot | null>(
    snapshots[1] || snapshots[0] || null
  );

  const diffResult = useMemo(() => {
    if (!compareMode || !selectedSnapshot || !compareTarget || selectedSnapshot.id === compareTarget.id) {
      return null;
    }
    return diffSnapshots(selectedSnapshot, compareTarget);
  }, [compareMode, selectedSnapshot, compareTarget]);

  if (!isOpen) return null;

  const sameSnapshot = compareTarget?.id === selectedSnapshot?.id;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <History className="w-5 h-5 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">
              Version Snapshots & Source History
            </span>
          </div>
          <div className="flex items-center space-x-2 relative z-10">
            <button
              onClick={() => setCompareMode(prev => !prev)}
              className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border flex items-center space-x-1 transition-colors ${
                compareMode
                  ? 'bg-white text-[#D11111] border-white'
                  : 'text-white/80 border-white/40 hover:bg-black/20'
              }`}
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              <span>{compareMode ? 'Diff Mode' : 'Compare'}</span>
            </button>
            <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-black/20">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden text-xs">
          {/* Left Timeline Sidebar */}
          <div className="w-64 border-r-2 border-slate-200 bg-slate-50 overflow-y-auto p-3 space-y-2">
            <span className="font-black uppercase tracking-widest text-[10px] text-[#D11111] block mb-2">
              Saved Snapshots ({snapshots.length})
            </span>
            {snapshots.map(snap => (
              <button
                key={snap.id}
                onClick={() => setSelectedSnapshot(snap)}
                className={`w-full text-left p-3 border-2 transition-all ${
                  selectedSnapshot?.id === snap.id
                    ? 'bg-red-50 border-[#D11111] text-[#D11111] font-black'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                }`}
              >
                <span className="block truncate uppercase tracking-wide text-xs">{snap.title}</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal block mt-1">
                  {new Date(snap.createdAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          {/* Right Panel: Snapshot Preview OR Diff View */}
          <div className="flex-1 flex flex-col p-4 bg-white overflow-y-auto space-y-3">
            {compareMode ? (
              <>
                {/* Compare Selectors + Summary */}
                <div className="border-2 border-slate-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-24">
                      Base
                    </label>
                    <select
                      value={selectedSnapshot?.id ?? ''}
                      onChange={e => {
                        const snap = snapshots.find(s => s.id === e.target.value) ?? null;
                        setSelectedSnapshot(snap);
                      }}
                      className="flex-1 border-2 border-slate-300 px-2 py-1 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:border-[#D11111]"
                    >
                      {snapshots.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 w-24">
                      Compare
                    </label>
                    <select
                      value={compareTarget?.id ?? ''}
                      onChange={e => {
                        const snap = snapshots.find(s => s.id === e.target.value) ?? null;
                        setCompareTarget(snap);
                      }}
                      className="flex-1 border-2 border-slate-300 px-2 py-1 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:border-[#D11111]"
                    >
                      {snapshots.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {diffResult && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                        {diffResult.summary.filesChanged} files changed
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase tracking-wider flex items-center gap-0.5">
                        <ArrowUp className="w-3 h-3" /> {diffResult.summary.linesAdded} lines
                      </span>
                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] uppercase tracking-wider flex items-center gap-0.5">
                        <ArrowDown className="w-3 h-3" /> {diffResult.summary.linesRemoved} lines
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                        Word count {diffResult.summary.wordCountDelta >= 0 ? '+' : ''}
                        {diffResult.summary.wordCountDelta.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {!diffResult ? (
                  <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-wider">
                    {sameSnapshot
                      ? 'Select two different snapshots to diff.'
                      : 'Select two snapshots to see what changed.'}
                  </div>
                ) : diffResult.files.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-wider">
                    No source files changed between these snapshots.
                  </div>
                ) : (
                  diffResult.files.map(f => (
                    <div key={f.path} className="border-2 border-slate-200 overflow-hidden">
                      <div className="p-2 bg-slate-100 font-bold text-slate-800 text-xs flex items-center space-x-1.5 border-b-2 border-slate-200">
                        <FileCode className="w-3.5 h-3.5 text-[#D11111]" />
                        <span className="truncate">{f.path}</span>
                        <span
                          className={`ml-auto text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 border ${
                            f.status === 'added'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : f.status === 'removed'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>
                      <div className="bg-slate-900 max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed">
                        {f.diff.map((line, i) => (
                          <div
                            key={i}
                            className={`flex items-stretch ${
                              line.type === 'add'
                                ? 'bg-emerald-950/60 text-emerald-300'
                                : line.type === 'remove'
                                ? 'bg-red-950/60 text-red-300'
                                : 'text-slate-400'
                            }`}
                          >
                            <span className="w-9 shrink-0 text-right pr-2 select-none opacity-60">
                              {line.aIndex ?? ''}
                            </span>
                            <span className="w-9 shrink-0 text-right pr-2 select-none opacity-60">
                              {line.bIndex ?? ''}
                            </span>
                            <span className="w-4 shrink-0 select-none font-black">
                              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                            </span>
                            <span className="whitespace-pre-wrap break-all pr-2">{line.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{selectedSnapshot.title}</h4>
                    <span className="text-slate-500 font-mono text-xs">
                      {selectedSnapshot.files.length} Project files recorded
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onRestoreSnapshot(selectedSnapshot);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 bg-[#D11111] text-white font-black uppercase tracking-wider hover:bg-black flex items-center space-x-1.5 border border-red-800 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore Version</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedSnapshot.files.map(f => (
                    <div key={f.path} className="border-2 border-slate-200 overflow-hidden">
                      <div className="p-2 bg-slate-100 font-bold text-slate-800 text-xs flex items-center space-x-1.5 border-b-2 border-slate-200">
                        <FileCode className="w-3.5 h-3.5 text-[#D11111]" />
                        <span>{f.path}</span>
                      </div>
                      <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] max-h-48 overflow-y-auto leading-relaxed border-t border-slate-800">
                        {f.content}
                      </pre>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-wider">
                Select a snapshot to inspect file diffs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};