import React, { useState } from 'react';
import { X, History, RotateCcw, Check, FileCode } from 'lucide-react';
import { ProjectSnapshot } from '../types';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <History className="w-5 h-5 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">Version Snapshots & Source History</span>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10">
            <X className="w-5 h-5" />
          </button>
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

          {/* Right Snapshot File Content Preview */}
          <div className="flex-1 flex flex-col p-4 bg-white overflow-y-auto space-y-3">
            {selectedSnapshot ? (
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
