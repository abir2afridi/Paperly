# Paperly (TeXForge)

A full-stack, browser-based **LaTeX editor** with real-time PDF compilation, rich editing tools, AI-assisted writing, real-time collaboration, and a research assistant — built to run as a single Node.js process with a Supabase backend.

> This repository is tracked under the name `Paperly`; the application itself is **TeXForge**.

## ✨ Features

- **Live LaTeX Compilation** — compile `.tex` projects to a real PDF with `.log` diagnostics (error line numbers surfaced back into the editor), lint warnings, and a `CompileBackend` abstraction with a pluggable factory (`src/services/compileBackends.ts`); the backend actually used is labeled in the PDF viewer so a simplified preview is never mistaken for a real TeX run (§48)
- **Monaco Editor** — full LaTeX syntax highlighting, snippet completion, live `.bib` citation autocomplete, inline diagnostics, and LaTeX-aware spell checking (nspell, squiggly underlines, "did you mean" suggestions)
- **Visual Rich-Text Mode** — switch between source code and a visual editor view
- **PDF.js Preview** — interactive PDF rendering with zoom, rotate, search, dark mode, per-page annotations, and **SyncTeX-style source jump** (click PDF text → editor jumps to the matching source line)
- **Math Palette** — KaTeX-powered symbol picker with live preview and code insertion
- **Table Generator** — grid UI that emits `\begin{tabular}` with `booktabs` support
- **Templates** — Article, IEEE, Beamer, Thesis, CV and more, plus ZIP import/export (Overleaf-compatible, hardened against path traversal)
- **CrossRef DOI Search** — look up citations by DOI and auto-append formatted BibTeX
- **Real-Time Collaboration** — Yjs CRDT document sync over a WebSocket (y-websocket), live presence cursors, project chat room, comments, and an append-only activity feed
- **AI Assistant** — explain, fix, rewrite, and generate abstracts using your own BYO-Key providers, behind a provider-agnostic adapter (`AIProviderAdapter` with `chat()`/`testConnection()` for OpenAI-compatible, Anthropic, and custom HTTP endpoints)
- **Fix-With-AI (§49)** — per-diagnostic fix from the log panel: sends the error + surrounding context to your provider, shows the proposed change as a line diff, then Apply / Copy / Regenerate / Recompile-to-verify, with a hand-off to the AI chat
- **Agentic AI Chat (§50)** — an Agent tab with project-scoped tools (file tree, search, read-into-context); the model proposes edits as structured JSON, reviewed in a pending-changes queue (per-file diff, Apply / Discard / Edit-before-apply / Apply all, max 20 edits per turn) — nothing is written without your approval
- **Secure Provider Keys** — AES-256-GCM encrypted API keys with masked display and live connection testing
- **Research Assistant** — upload one or more PDFs (client-side text extraction via pdf.js), search Semantic Scholar, add papers as BibTeX, and generate a LaTeX literature review or fact-check a claim against the source; an n-gram originality safeguard flags passages that too closely mirror your sources, and the publication-readiness check (§44) re-runs that heuristic against registered papers
- **Version History** — snapshots (tagged by origin: human / AI / collab), diff viewing, and restore points; AI edit batches record a pre-edit snapshot so you can revert exactly the touched files (§51)
- **Session Management** — Settings → Sessions lists your logged-in devices (GoTrue admin API) with one-click revocation
- **Chat Retention** — per-user chat auto-delete (7/30/90 days or keep forever) enforced by a server-side sweep
- **PWA / Offline** — web app manifest, service worker, offline banner (production builds)
- **Onboarding Tour** — one-time guided 5-step tour plus a shortcuts cheatsheet (`Ctrl/Cmd + /`)
- **Dashboard & Landing** — project management with serial-numbered projects, login/signup UI (email + Google OAuth)
- **Editorial Paper Design** — landing, login, and dashboard pages styled as a scholarly journal: warm paper canvas (`#fcfaf7`), obsidian ink (`#191919`), serif display headings (Newsreader), and crisp 1px hairlines
- **Light / Dark Mode Toggle** — one-click Sun/Moon switch across landing, login, and dashboard (persisted in LocalStorage), plus 5 customizable workspace/editor themes

## 🧱 Tech Stack

| Layer    | Tech                                                                               |
| -------- | ---------------------------------------------------------------------------------- |
| Frontend | React 19 · TypeScript · Tailwind CSS v4 · Motion                                   |
| Editor   | Monaco Editor · KaTeX · pdfjs-dist                                                 |
| Design   | Editorial paper/ink tokens (Tailwind `@theme`) · Newsreader · Plus Jakarta Sans · JetBrains Mono |
| Backend  | Express 4 · Vite (dev middleware) · Node.js · y-websocket (collab) · Resend (email) |
| Database | Supabase (Postgres + Auth + RLS) · encrypted AI provider configs · LocalStorage drafts |
| Desktop  | Tauri 2 (optional native shell: `npm run tauri:dev`)                                |

## 📁 Project Structure

```text
├── server.ts                      # Express server: /api/* routes, AI provider encryption/proxy,
│                                  # session management, chat-retention sweep, collab WebSocket,
│                                  # security headers + rate limiters, Vite dev middleware
├── src/
│   ├── App.tsx                    # Root app: views (landing/dashboard/workspace), state
│   ├── types.ts                   # Shared Zod schemas & TypeScript interfaces
│   ├── data/templates.ts          # Starter LaTeX templates
│   ├── services/
│   │   ├── latexCompiler.ts       # LaTeX → PDF compilation pipeline + log parsing
│   │   ├── compileBackends.ts     # CompileBackend interface + factory (§4A)
│   │   ├── aiEngine.ts            # BYO-Key provider config + generation client
│   │   ├── aiProviderAdapter.ts   # Provider-agnostic adapters (chat/testConnection)
│   │   ├── aiFix.ts               # Fix-with-AI prompt/response parsing (§49)
│   │   ├── agenticChat.ts         # Agent chat: tools, structured-output schema (§50)
│   │   ├── researchAssistant.ts   # PDF extraction, Semantic Scholar, BibTeX, AI prompts
│   │   ├── originalityCheck.ts    # N-gram overlap safeguard (§42)
│   │   ├── researchSources.ts     # Source-paper registry for the §44 originality heuristic
│   │   ├── spellCheck.ts          # LaTeX-aware spell check (nspell)
│   │   ├── syncTexMatch.ts        # PDF text → source line matching
│   │   ├── collab.ts              # Yjs collaboration helpers
│   │   ├── sessions.ts            # Device/session management client
│   │   ├── db.ts · supabase.ts    # Supabase data + auth layer
│   │   ├── bibParser.ts           # .bib parsing for live completion
│   │   ├── crossrefService.ts     # CrossRef DOI → BibTeX
│   │   ├── themeService.ts        # Theme persistence, light/dark toggling & DOM application
│   │   └── …                      # rateLimit, zipSecurity, publicationCheck, snapshotDiff, etc.
│   ├── vendor/                    # Vendored English Hunspell dictionary (nspell)
│   └── components/                # Navbar, Sidebar, MonacoEditor, PdfViewer, OnboardingTour,
│                                  # ResearchAssistantModal, FixWithAiModal, AgentChatTab,
│                                  # SettingsModal, modals, etc.
├── supabase/migrations/           # SQL migrations (chat retention, annotations, …)
├── public/                        # Static assets, PWA manifest + service worker
├── .github/                       # Issue forms, PR template, workflows, labels,
│                                  # CONTRIBUTING / SECURITY / CODE_OF_CONDUCT / SUPPORT
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

| Script              | Description                    |
| ------------------- | ------------------------------ |
| `npm run preview`   | Preview the built frontend     |
| `npm run clean`     | Remove `dist/` and `server.js` |
| `npm run lint`      | Type-check with `tsc --noEmit` |
| `npm test`          | Run the Vitest suite (193 tests) |
| `npm run tauri:dev` | Run the Tauri desktop shell    |

## 🤖 AI Providers

AI features use **bring-your-own-key** providers configured in **Settings → AI Providers**:

1. Add a provider (label, base URL, API key, model)
2. Supported types: OpenAI-compatible, Anthropic, custom HTTP
3. Keys are encrypted at rest (AES-256-GCM) and never returned in plaintext
4. Hit **Test Connection** to verify before use

## ⚙️ Environment Variables

| Variable                | Description                                                          | Default                              |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `VITE_SUPABASE_URL`     | Supabase project URL                                                | —                                    |
| `VITE_SUPABASE_ANON_KEY`| Supabase anon/public key (safe in the client; RLS protects data)    | —                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for session management (§34) + chat-retention sweep (§40) | — (routes return honest 501s without it) |
| `VITE_COLLAB_URL`       | Collab WebSocket URL (`ws(s)://host/collab`); derived from the server host on web | —      |
| `RESEND_API_KEY`        | Transactional email for notifications (§31); optional               | —                                    |
| `EMAIL_FROM`            | Sender address for notification emails                              | `Paperly <notifications@paperly.app>` |
| `AI_ENCRYPTION_KEY`     | Secret used to derive the AES key for provider-key encryption       | `texforge-secret-encryption-key-32b` |
| `NODE_ENV`              | `production` serves built assets from `dist/`                       | —                                    |
| `DISABLE_HMR`           | Disables Vite HMR/file-watching (used in AI Studio)                 | —                                    |

> ⚠️ Override `AI_ENCRYPTION_KEY` in production — do not ship with the default. Keep
> `SUPABASE_SERVICE_ROLE_KEY` server-side only — never in the browser bundle.

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

## 🤝 Contributing

Paperly is open source — every contribution counts, from bug reports to code.

- **Community infrastructure** — structured issue forms (bug, feature, docs, security, accessibility, API, build, and more), PR template, and label system live in [`.github/`](.github/)
- **Start here** — read [CONTRIBUTING.md](.github/CONTRIBUTING.md) for setup, branching strategy, commit convention, and the pull request process
- **Report bugs / request features** — use the [issue chooser](https://github.com/abir2afridi/Paperly/issues/new/choose)
- **Support** — questions and help go to [SUPPORT.md](.github/SUPPORT.md) or GitHub Discussions
- **Code of Conduct** — [CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md) applies in all community spaces
- **Security** — report vulnerabilities privately via [SECURITY.md](.github/SECURITY.md) or GitHub Security Advisories — never as a public issue

## 📄 License

See [LICENSE](LICENSE).