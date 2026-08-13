import React from 'react';
import { FileWarning, X } from 'lucide-react';

interface DraftRestoreModalProps {
  isOpen: boolean;
  filePath: string;
  draftUpdatedAt: string | null;
  onRestore: () => void;
  onDiscard: () => void;
}

export const DraftRestoreModal: React.FC<DraftRestoreModalProps> = ({
  isOpen,
  filePath,
  draftUpdatedAt,
  onRestore,
  onDiscard,
}) => {
  if (!isOpen) return null;

  const timeText = draftUpdatedAt ? new Date(draftUpdatedAt).toLocaleString() : 'earlier';

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" onClick={onDiscard}>
      <div
        className="bg-white border-4 border-[#D11111] shadow-2xl w-full max-w-md p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FileWarning className="w-5 h-5 text-[#D11111]" />
            <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">Unsaved Draft Found</h3>
          </div>
          <button onClick={onDiscard} className="text-slate-400 hover:text-slate-700" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-slate-700 text-xs leading-relaxed mb-1">
          You have unsaved changes to <span className="font-bold font-mono text-[#D11111]">{filePath}</span> from{' '}
          <span className="font-bold">{timeText}</span>.
        </p>
        <p className="text-slate-500 text-[11px] mb-4">Restore the draft, or discard it and use the saved version?</p>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onDiscard}
            className="px-4 py-2 border-2 border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px] hover:bg-slate-50"
          >
            Discard, use saved version
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-2 bg-[#D11111] border-2 border-red-800 text-white font-black uppercase tracking-wider text-[11px] hover:bg-black"
          >
            Restore draft
          </button>
        </div>
      </div>
    </div>
  );
};