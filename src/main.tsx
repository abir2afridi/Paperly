import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import loader from '@monaco-editor/loader';
import App from './App.tsx';
import './index.css';

// Load Monaco from the locally vendored copy (public/vendor/monaco) so the app
// works fully offline in both the Web and Desktop (Tauri) shells.
loader.config({ paths: { vs: '/vendor/monaco' } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
