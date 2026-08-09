import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import loader from '@monaco-editor/loader';
import App from './App.tsx';
import './index.css';

// Load Monaco from the locally vendored copy (public/vendor/monaco) so the app
// works fully offline in both the Web and Desktop (Tauri) shells.
loader.config({ paths: { vs: '/vendor/monaco' } });

// Preload Monaco at startup so the workspace editor opens instantly —
// without this the first mount pays the full script-loading cost.
void loader.init().catch(() => {
  console.warn('[monaco] Preload failed; the editor will load on first mount.');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
