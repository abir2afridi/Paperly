# TeXForge Architecture Map & Repository Audit

## 1. Overview & Stack Configuration
- **Name**: TeXForge
- **Environment**: Single-container Full-Stack Node.js (Express + Vite) running on port 3000.
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Motion + Monaco Editor + pdfjs-dist + KaTeX.
- **Backend**: Express v4 + REST API routes + WebSocket/polling collaboration handlers.
- **Storage**: In-memory + LocalStorage / Server-side state store for projects, file snapshots, and encrypted AI provider configurations.
- **Theme**: Red & White (`#DC2626`, `#B91C1C`, crisp white `#FFFFFF`, light neutral borders `#E2E8F0`, dark slate text `#0F172A`).

## 2. Directory Structure Plan
- `/server.ts`: Main Express server handling API routes (`/api/*`), AI provider encryption/proxies, LaTeX compilation endpoint, CrossRef DOI lookup, and Vite dev middleware.
- `/src/types.ts`: Shared Zod schemas and TypeScript interfaces (Project, File, CompileDiagnostic, AIProvider, Comment, ChatMessage, ActivityEvent).
- `/src/components/`:
  - `Navbar.tsx`: Top header with Red & White visual identity, project name editor, compile button, share link, settings, AI assistant button.
  - `Sidebar.tsx`: Left file tree manager (folders, `.tex`, `.bib`, `.png`, main file badge, ZIP import/export).
  - `MonacoEditor.tsx`: LaTeX Monaco editor with custom language tokenizer, snippet completion, citation/ref autocompletion.
  - `PdfViewer.tsx`: PDF.js canvas renderer with page virtualization, SyncTeX jump, zoom, search, dark mode toggle, and annotations.
  - `MathPalette.tsx`: KaTeX symbol palette with live math preview and code insertion.
  - `TableEditorModal.tsx`: Grid UI generating `\begin{tabular}` with `booktabs` support.
  - `AiAssistantPanel.tsx`: AI helper for error explaining, fixing, rewriting, and abstract generation using BYO-Key providers.
  - `SettingsModal.tsx`: AI provider management with key encryption, test connection, shortcuts, and sessions.
  - `DoiImportModal.tsx`: CrossRef DOI citation search and auto-BibTeX appender.
  - `TemplatesModal.tsx`: Template chooser for Article, IEEE, Beamer, Thesis, CV, etc.
  - `ChatAndActivity.tsx`: Project chat room and append-only activity feed.
  - `VersionHistoryModal.tsx`: Commit history, snapshot diff viewer, and restore points.
- `/src/services/`:
  - `latexCompiler.ts`: WASM / SwiftLaTeX / Server-based LaTeX compilation pipeline with log diagnostic parsing.
  - `aiService.ts`: BYO-Key provider client (OpenAI-compatible, Anthropic, Custom HTTP).
  - `bibParser.ts`: `.bib` file parser for live completion and BibTeX generation.

## 3. Real vs. Stubbed Components
- Real LaTeX compiler pipeline producing actual PDFs, parsing `.log` files with line numbers.
- Real Monaco LaTeX syntax highlighting, snippet completions, and live `.bib` citation parsing.
- Real CrossRef DOI fetcher returning formatted BibTeX entries.
- Real AES-256-GCM encrypted AI Provider keys with live connection test endpoints.
- Real PDF.js canvas rendering with page zoom, search, annotations, and SyncTeX source mapping.

## 4. Risk Mitigation
- WASM / Server compilation fallback ensures smooth performance without hanging the browser thread.
- Memory-safe Yjs / snapshot autosave prevents data loss during editing.
