import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Compass } from 'lucide-react';

export interface TourStep {
  selector: string;
  title: string;
  body: string;
}

const DEFAULT_STEPS: TourStep[] = [
  {
    selector: '[data-tour="new-project"]',
    title: 'Start a manuscript',
    body: 'Create a blank project or start from a template (Article, IEEE, ACM, Thesis, CV, Beamer…) and get a compiling LaTeX document in seconds.',
  },
  {
    selector: '[data-tour="file-tree"]',
    title: 'Project files',
    body: 'Your project is a real folder: .tex sources, .bib bibliographies, images and class files. Rename, delete or set the main file from here.',
  },
  {
    selector: '[data-tour="editor"]',
    title: 'The editor',
    body: 'Write with full LaTeX support: autocomplete, math preview as you type, CTAN package palette (Ctrl/Cmd+Shift+P) and an AI assistant.',
  },
  {
    selector: '[data-tour="compile"]',
    title: 'Compile',
    body: 'Compile to PDF with one click. Errors and lint warnings appear in the terminal below with click-to-jump to the offending line.',
  },
  {
    selector: '[data-tour="pdf"]',
    title: 'Review the PDF',
    body: 'Annotate pages, toggle dark-mode reading, and click any PDF text to jump back to its source line (SyncTeX-style navigation).',
  },
];

const STORAGE_KEY = 'paperly.onboardingTourSeen';

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps?: TourStep[];
}

/** Lightweight anchored tour (§33): highlights each element in turn with a
 * tooltip card; falls back to a centered card when the anchor is missing. */
export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, steps = DEFAULT_STEPS }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const anchor = useMemo(() => {
    if (!isOpen || !step.selector) return null;
    return document.querySelector<HTMLElement>(step.selector);
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStepIndex(i => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setStepIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, steps.length]);

  useEffect(() => {
    if (!isOpen) return;
    markTourSeen();
  }, [isOpen]);

  if (!isOpen) return null;

  const isLast = stepIndex >= steps.length - 1;
  const close = () => {
    markTourSeen();
    onClose();
  };
  const next = () => {
    if (isLast) close();
    else setStepIndex(i => i + 1);
  };

  const card = (
    <div className="bg-white border-2 border-slate-200 rounded-lg shadow-2xl p-4 w-80">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-widest text-[#D11111]">
          <Compass className="w-3.5 h-3.5" />
          <span>
            Tour {stepIndex + 1}/{steps.length}
          </span>
        </span>
        <button onClick={close} className="p-0.5 text-slate-400 hover:text-slate-700" aria-label="Close tour">
          <X className="w-4 h-4" />
        </button>
      </div>
      <h3 className="font-extrabold text-slate-900 text-sm mt-2">{step.title}</h3>
      <p className="text-slate-600 text-xs leading-relaxed mt-1.5">{step.body}</p>
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setStepIndex(i => Math.max(i - 1, 0))}
          disabled={stepIndex === 0}
          className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-300 disabled:opacity-40"
        >
          <ChevronLeft className="w-3 h-3" />
          <span>Back</span>
        </button>
        <button
          onClick={next}
          className="flex items-center space-x-1 px-3 py-1 bg-[#D11111] text-white font-black uppercase tracking-wider text-[10px] hover:bg-black"
        >
          <span>{isLast ? 'Done' : 'Next'}</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  if (!anchor) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/30" onClick={close}>
        <div onClick={e => e.stopPropagation()}>{card}</div>
      </div>
    );
  }

  const rect = anchor.getBoundingClientRect();
  const cardWidth = 320;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - cardWidth / 2, 12), window.innerWidth - cardWidth - 12);
  const below = rect.bottom + 12 + 170 < window.innerHeight;
  const top = below ? rect.bottom + 12 : Math.max(rect.top - 178, 12);

  return (
    <>
      <div className="fixed inset-0 z-[88] bg-slate-900/40" onClick={close} />
      <div
        className="fixed z-[89] rounded-sm border-2 border-[#D11111]/40 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] pointer-events-none"
        style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
      />
      <div className="fixed z-[90]" style={{ left, top }}>
        {card}
      </div>
    </>
  );
};