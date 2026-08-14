import React, { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';

/**
 * Shows a slim banner when the browser reports the network is down (§32).
 * Pure event-driven UI — no storage, no polling. Dismissible per session.
 */
export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState<boolean>(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      setDismissed(false);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-amber-400 border-b-2 border-amber-600 text-amber-950 text-xs font-bold px-4 py-1.5 flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>You are offline — edits are kept as drafts and will sync when you reconnect.</span>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 hover:bg-amber-500/40 rounded-sm"
        title="Dismiss"
        aria-label="Dismiss offline notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};