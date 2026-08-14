import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './monacoSetup.ts';
import App from './App.tsx';
import './index.css';

// PWA service worker registration (§32) — only in production builds so the
// dev server (which serves un-bundled modules) is never intercepted.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW unavailable (e.g. non-secure context) — app works fine without it.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
