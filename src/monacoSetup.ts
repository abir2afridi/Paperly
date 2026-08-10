import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

// ESM integration: monaco is bundled by Vite and handed directly to the
// @monaco-editor/react loader, so no AMD loader, no CDN and no vendored
// scripts are involved. loader.init() resolves instantly with this instance,
// which also eliminates the React 19 StrictMode double-mount race that could
// leave the editor stuck on "Initializing LaTeX editor…".
loader.config({ monaco });

// Wire up the Web Workers Vite emits for each language bundle.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

export default monaco;
