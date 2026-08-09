import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Sparkles, FileText } from 'lucide-react';
import { platformLinks } from '../../shared/constants/platformLinks';
import { getAppVersion, openExternal, isTauri } from '../desktop/bridge';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [version, setVersion] = useState('0.0.0');

  useEffect(() => {
    if (isOpen) {
      getAppVersion().then(setVersion);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasRealUrl = !platformLinks.websiteUrl.startsWith('REPLACE_ME_');

  const handleOpen = (url: string) => {
    openExternal(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md border-2 border-slate-300 dark:border-slate-700 shadow-2xl">
        <div className="p-3 border-b-2 border-red-600 bg-[#D11111] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-black uppercase tracking-widest text-xs">About TeXForge</span>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            {isTauri() ? (
              <img src="/icon.png" alt="TeXForge" className="w-16 h-16 border-2 border-slate-300 dark:border-slate-700" />
            ) : (
              <div className="w-16 h-16 bg-[#D11111] border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h2 className="font-black text-xl text-slate-900 dark:text-white">TeXForge</h2>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Version {version}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Collaborative LaTeX editor with in-browser compilation, AI co-authoring, and version snapshots.
            Desktop edition built with Tauri.
          </p>

          {hasRealUrl && (
            <div className="space-y-2 pt-2 border-t-2 border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleOpen(platformLinks.websiteUrl)}
                className="w-full py-2 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider hover:border-[#D11111] hover:text-[#D11111] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit Website</span>
              </button>
              <button
                onClick={() => handleOpen(platformLinks.changelogUrl)}
                className="w-full py-2 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider hover:border-[#D11111] hover:text-[#D11111] flex items-center justify-center space-x-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>What's New (Changelog)</span>
              </button>
            </div>
          )}

          {!hasRealUrl && (
            <p className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-700 p-2">
              Website links pending — set values in shared/constants/platformLinks.ts
              (see docs/PLATFORM_LINKS.md).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
