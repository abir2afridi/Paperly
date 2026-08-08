import React from 'react';
import { X, FileText, Check, Sparkles } from 'lucide-react';
import { STARTER_TEMPLATES } from '../data/templates';
import { Template } from '../types';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-slate-900 shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b-2 border-red-600 flex items-center justify-between bg-[#D11111] text-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern-dark pointer-events-none opacity-20" />
          <div className="flex items-center space-x-2 relative z-10">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="font-black text-white text-sm uppercase tracking-widest">LaTeX Academic & Professional Templates</span>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-black/20 relative z-10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STARTER_TEMPLATES.map(tmpl => (
            <div
              key={tmpl.id}
              className="p-4 bg-slate-50 border-2 border-slate-200 hover:border-[#D11111] hover:bg-red-50/40 flex flex-col justify-between transition-all group cursor-pointer"
              onClick={() => {
                onSelectTemplate(tmpl);
                onClose();
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-slate-900 text-sm group-hover:text-[#D11111]">
                    {tmpl.name}
                  </span>
                  <span className="text-[9px] bg-[#D11111] text-white font-black px-2 py-0.5 uppercase tracking-wider">
                    {tmpl.category}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed font-medium">{tmpl.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-slate-200 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">pdflatex • bibtex</span>
                <span className="text-xs font-black text-[#D11111] group-hover:underline flex items-center space-x-1 uppercase tracking-wider">
                  <span>Use Template</span>
                  <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
