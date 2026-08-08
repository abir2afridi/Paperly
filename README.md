# TeXForge

A full-stack, browser-based **LaTeX editor** with real-time PDF compilation, rich editing tools, AI-assisted writing, and collaboration — built to run as a single Node.js process.

> This repository is tracked under the name `Paperly`; the application itself is **TeXForge**.

## ✨ Features

- **Live LaTeX Compilation** — compile `.tex` projects to PDF with `.log` diagnostics (error line numbers surfaced back into the editor)
- **Monaco Editor** — full LaTeX syntax highlighting, snippet completion, live `.bib` citation autocomplete, and inline diagnostics
- **Visual Rich-Text Mode** — switch between source code and a visual editor view
- **PDF.js Preview** — interactive PDF rendering with zoom, search, dark mode, annotations, and SyncTeX source jump
- **Math Palette** — KaTeX-powered symbol picker with live preview and code insertion
- **Table Generator** — grid UI that emits `\begin{tabular}` with `booktabs` support
- **Templates** — Article, IEEE, Beamer, Thesis, CV and more, plus ZIP import/export (Overleaf-compatible)
- **CrossRef DOI Search** — look up citations by DOI and auto-append formatted BibTeX
- **AI Assistant** — explain, fix, rewrite, and generate abstracts using your own BYO-Key providers (OpenAI-compatible, Anthropic, custom HTTP)
- **Secure Provider Keys** — AES-256-GCM encrypted API keys with masked display and live connection testing
- **Collaboration** — project chat room and append-only activity feed
- **Version History** — snapshots, diff viewing, and restore points
- **Dashboard & Landing** — project management with serial-numbered projects, login/signup UI
- **Editorial Paper Design** — landing, login, and dashboard pages styled as a scholarly journal: warm paper canvas (`#fcfaf7`), obsidian ink (`#191919`), serif display headings (Newsreader), and crisp 1px hairlines
- **Light / Dark Mode Toggle** — one-click Sun/Moon switch across landing, login, and dashboard (persisted in LocalStorage), plus 5 customizable workspace/editor themes

## 🧱 Tech Stack

| Layer    | Tech                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| Frontend | React 19 · TypeScript · Tailwind CSS v4 · Motion                                   |
| Editor   | Monaco Editor · KaTeX · pdfjs-dist                                                 |
| Design   | Editorial paper/ink tokens (Tailwind `@theme`) · Newsreader · Plus Jakarta Sans · JetBrains Mono |
| Backend  | Express 4 · Vite (dev middleware) · Node.js                                        |
| Storage  | In-memory + LocalStorage (projects, file snapshots, encrypted AI provider configs) |

## 📁 Project Structure

```text
├── server.ts                      # Express server: /api/* routes, AI provider encryption/proxy,
│                                  # compile endpoint, Vite dev middleware
├── src/
│   ├── App.tsx                    # Root app: views (landing/dashboard/workspace), state
│   ├── types.ts                   # Shared Zod schemas & TypeScript interfaces
│   ├── data/templates.ts          # Starter LaTeX templates
│   ├── services/
│   │   ├── latexCompiler.ts       # LaTeX → PDF compilation pipeline + log parsing
│   │   ├── aiService.ts           # BYO-Key provider clients
│   │   ├── bibParser.ts           # .bib parsing for live completion
│   │   ├── crossrefService.ts     # CrossRef DOI → BibTeX
│   │   └── themeService.ts        # Theme persistence, light/dark toggling & DOM application
│   └── components/                # Navbar, Sidebar, MonacoEditor, PdfViewer,
│                                  # AiAssistantPanel, SettingsModal, modals, etc.
└── dist/                          # Production build output
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- npm / bun

### Install

```bash
npm install        # or: bun install
```

### Run in development

```bash
npm run dev        # tsx server.ts → http://localhost:3000
```

Serves the Vite dev server through the Express middleware — open the printed URL.

### Production build & run

```bash
npm run build      # vite build + esbuild-bundle server into dist/server.cjs
npm start          # node dist/server.cjs
```

### Other scripts

| Script            | Description                    |
| ----------------- | ------------------------------ |
| `npm run preview` | Preview the built frontend     |
| `npm run clean`   | Remove `dist/` and `server.js` |
| `npm run lint`    | Type-check with `tsc --noEmit` |

## 🤖 AI Providers

AI features use **bring-your-own-key** providers configured in **Settings → AI Providers**:

1. Add a provider (label, base URL, API key, model)
2. Supported types: OpenAI-compatible, Anthropic, custom HTTP
3. Keys are encrypted at rest (AES-256-GCM) and never returned in plaintext
4. Hit **Test Connection** to verify before use

## ⚙️ Environment Variables

| Variable            | Description                                                   | Default                              |
| ------------------- | ------------------------------------------------------------- | ------------------------------------ |
| `AI_ENCRYPTION_KEY` | Secret used to derive the AES key for provider-key encryption | `texforge-secret-encryption-key-32b` |
| `NODE_ENV`          | `production` serves built assets from `dist/`                 | —                                    |
| `DISABLE_HMR`       | Disables Vite HMR/file-watching (used in AI Studio)           | —                                    |

> ⚠️ Override `AI_ENCRYPTION_KEY` in production — do not ship with the default.

## ⌨️ Keyboard Shortcuts

| Shortcut               | Action               |
| ---------------------- | -------------------- |
| `Ctrl/Cmd + Enter`     | Compile              |
| `Ctrl/Cmd + K`         | AI Assistant         |
| `Ctrl/Cmd + M`         | Math Palette         |
| `Ctrl/Cmd + H`         | Version History      |
| `Ctrl/Cmd + Shift + D` | DOI Citation Search  |
| `Ctrl/Cmd + Shift + T` | Table Generator      |
| `Ctrl/Cmd + Shift + C` | Team Chat            |
| `Ctrl/Cmd + /`         | Shortcuts Cheatsheet |

## 📄 License

See [LICENSE](LICENSE).
