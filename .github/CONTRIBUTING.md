# 🤝 Contributing to Paperly

Thank you for your interest in contributing to **Paperly** — a full-stack,
browser-based LaTeX editor with real-time PDF compilation, AI-assisted
writing, real-time collaboration, and a research assistant, built to run as
a single Node.js process with a Supabase backend.

Every contribution counts: bug reports, documentation, translations, tests,
and code. This guide explains how to get started and how to work with us.

## 📋 Table of Contents

- [🚀 Getting Started](#-getting-started)
- [📋 Prerequisites](#-prerequisites)
- [⌨️ Development Setup](#️-development-setup)
- [🔀 Branching Strategy](#-branching-strategy)
- [💬 Commit Convention](#-commit-convention)
- [🎨 Code Style](#-code-style)
- [🧪 Testing](#-testing)
- [🐛 Reporting Bugs](#-reporting-bugs)
- [✨ Suggesting Features](#-suggesting-features)
- [🔀 Pull Request Process](#-pull-request-process)
- [👥 Community](#-community)

## 🚀 Getting Started

To start developing Paperly:

```bash
# 1. Clone the repository
git clone https://github.com/abir2afridi/Paperly.git
cd Paperly

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (required for auth/data),
# and VITE_COLLAB_URL (required for the Tauri desktop build's collaboration).

# 4. Start the development server
npm run dev
# Open the printed URL (default http://localhost:3000)
```

> 💡 `npm run dev` starts the Express server (tsx), which serves the Vite
> dev server through its middleware — a single process is all you need.
> Use `npm run dev:vite` if you want the Vite server alone.

## 📋 Prerequisites

- **Node.js 18+** (Node 20+ recommended — see `@types/node` and tooling requirements)
- **npm 10+** (comes with recent Node.js installs)
- **Git**
- **Rust toolchain** — only needed for the optional Tauri desktop shell
  (`npm run tauri:dev` / `npm run tauri:build`), plus the platform prerequisites
  from the [Tauri docs](https://v2.tauri.app/start/prerequisites/)
- **A Supabase project** — for auth (email + Google OAuth), the database, and RLS

## ⌨️ Development Setup

The repository is a single npm project. Useful commands:

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Express dev server with Vite middleware (http://localhost:3000) |
| `npm run dev:vite` | Start only the Vite dev server |
| `npm run build` | Build the web bundle + bundle the server into `dist/server.cjs` |
| `npm start` | Run the production server (`node dist/server.cjs`) |
| `npm run preview` | Preview the built frontend |
| `npm run lint` | Type-check the whole project (`tsc --noEmit`) |
| `npm test` | Run the Vitest suite (149 tests) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run tauri:dev` | Run the Tauri desktop shell (development) |
| `npm run tauri:build` | Build the Tauri desktop app |

## 🔀 Branching Strategy

- `main` — stable, production-ready code (default branch; PRs merge here)
- Feature branches: `feat/description` (e.g., `feat/bibtex-autocomplete`)
- Bug fix branches: `fix/description` (e.g., `fix/pdf-zoom-ios`)
- Docs branches: `docs/description` (e.g., `docs/compilation-guide`)

Always branch off `main` and open a pull request targeting `main`.

## 💬 Commit Convention

This project uses **Conventional Commits**. The type must describe the change
in the imperative mood; an optional scope names the affected area:

```
<type>(<scope>): <description>
```

- `feat(editor): add research assistant and LaTeX-aware spell check`
- `fix(core): handle rate-limit responses gracefully`
- `docs: update README with project rebranding`
- `refactor(compiler): extract compile backend factory`
- `chore(deps): bump vitest`
- `test(spellcheck): cover digit-run merging`
- `ci: add stale issue workflow`

Common types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`,
`style`, `ci`. Scopes seen in this repo: `editor`, `core`, `ui`, `compiler`.

## 🎨 Code Style

- **TypeScript (strict)** — the whole project is type-checked.
- Run `npm run lint` (`tsc --noEmit`) before pushing; it must pass.
- No external formatter (Prettier/Biome) is configured — keep formatting
  consistent with the surrounding code: 2-space indentation, single quotes,
  trailing commas, no semicolons where the rest of the file uses none.
- Components live in `src/components/`, workspace views in `src/workspace/`,
  and pure logic in `src/services/`.

## 🧪 Testing

- Run the full suite: `npm test`
- Watch mode while developing: `npm run test:watch`
- Tests are colocated in `src/services/__tests__/*.test.ts` and
  `src/components/__tests__/*.test.tsx` (Vitest, Node environment).
- **Add tests for any new or changed logic** in `src/services/`. Bug fixes
  should include a regression test that fails without the fix.

## 🐛 Reporting Bugs

Bugs are tracked as GitHub Issues. Please open the
[🐛 Bug Report form](https://github.com/abir2afridi/Paperly/issues/new?template=01-bug-report.yml)
and follow it — a good bug report includes version, OS, browser, reproduction
steps, and logs.

Before filing: [search existing issues](https://github.com/abir2afridi/Paperly/issues)
to avoid duplicates. Report security vulnerabilities **privately** — see
[SECURITY.md](SECURITY.md); never open a public issue for them.

## ✨ Suggesting Features

Feature suggestions go through the
[✨ Feature Request form](https://github.com/abir2afridi/Paperly/issues/new?template=02-feature-request.yml).
Explain the **problem** first, then the solution. Check the
[feature plan](docs/plan.md) first — the idea may already be planned.

## 🔀 Pull Request Process

1. Fork the repository and clone your fork.
2. Create a branch from `main` (`feat/...`, `fix/...`, or `docs/...`).
3. Make your changes, following the code style and test guidance above.
4. Verify everything locally:
   - `npm run lint` — no type errors
   - `npm test` — all tests pass (and new ones exist where relevant)
   - `npm run build` — builds successfully
5. Commit with a Conventional Commit message and push to your fork.
6. Open a PR against `main` using the
   [pull request template](https://github.com/abir2afridi/Paperly/blob/main/.github/PULL_REQUEST_TEMPLATE.md).
   Link the issue it fixes with `Fixes #123`.
7. Respond to review feedback. A maintainer reviews within ~72 hours.

> ⚠️ Keep PRs small and focused. Large PRs are harder to review and slower to merge.

## 👥 Community

- 💬 **GitHub Discussions** — https://github.com/abir2afridi/Paperly/discussions
  (questions, ideas, and general discussion)
- 🐛 **GitHub Issues** — bugs and feature requests (use the forms above)
- 📖 **Documentation** — the [docs/ folder](docs/) and the [README](README.md)

We aim to respond to issues within **48–72 hours**. Thank you for helping
make Paperly better! 🙏
