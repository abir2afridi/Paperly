import React from 'react';
import { BadgeCheck, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { PublicationFinding, PublicationSeverity } from '../services/publicationCheck';

interface PublicationCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  findings: PublicationFinding[];
}

const severityMeta: Record<PublicationSeverity, { icon: React.ReactNode; label: string; classes: string }> = {
  error: { icon: <XCircle className="w-4 h-4 text-red-600" />, label: 'Blocker', classes: 'bg-red-50 border-red-200' },
  warning: { icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, label: 'Warning', classes: 'bg-amber-50 border-amber-200' },
  info: { icon: <Info className="w-4 h-4 text-blue-500" />, label: 'Tip', classes: 'bg-blue-50 border-blue-200' },
};

export const PublicationCheckModal: React.FC<PublicationCheckModalProps> = ({ isOpen, onClose, findings }) => {
  if (!isOpen) return null;

  const blockers = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;
  const tips = findings.filter(f => f.severity === 'info').length;
  const ready = blockers === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-[560px] max-h-[80vh] flex flex-col shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <BadgeCheck className={`w-5 h-5 ${ready ? 'text-emerald-600' : 'text-[#D11111]'}`} />
            <h2 className="text-sm font-black text-slate-800">Publication Readiness Check</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center space-x-4 text-[11px]">
          {ready ? (
            <span className="flex items-center space-x-1.5 font-black text-emerald-700">
              <BadgeCheck className="w-4 h-4" />
              <span>No blockers found — good to submit (still review warnings)</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 font-black text-[#D11111]">
              <XCircle className="w-4 h-4" />
              <span>Fix {blockers} blocker(s) before submitting</span>
            </span>
          )}
          <span className="text-slate-400">·</span>
          <span>{warnings} warning{warnings === 1 ? '' : 's'}</span>
          <span className="text-slate-400">·</span>
          <span>{tips} tip{tips === 1 ? '' : 's'}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {findings.length === 0 && (
            <p className="text-sm text-slate-500">Nothing to check — the project has no source files.</p>
          )}
          {findings.map((finding, i) => {
            const meta = severityMeta[finding.severity];
            return (
              <div key={i} className={`border p-3 ${meta.classes}`}>
                <div className="flex items-start space-x-2">
                  <span className="mt-0.5 shrink-0">{meta.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{finding.category}</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 ${
                        finding.severity === 'error'
                          ? 'bg-red-100 text-red-700'
                          : finding.severity === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>{meta.label}</span>
                    </div>
                    <p className="text-[13px] font-medium text-slate-800 mt-1">{finding.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{finding.suggestion}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#D11111] text-white text-xs font-black uppercase tracking-wider hover:bg-red-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};