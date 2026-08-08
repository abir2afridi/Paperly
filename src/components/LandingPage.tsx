import React, { useState } from 'react';
import {
  FileText,
  Zap,
  Sparkles,
  BookOpen,
  Code2,
  Cpu,
  Layers,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  FolderPlus,
  Palette,
  ExternalLink,
  ShieldCheck,
  Download,
  Copy,
  Clock,
  UserCheck,
  GraduationCap,
  LogIn,
  UserPlus,
  ChevronRight,
  Sliders,
  Terminal,
  Sun,
  Moon,
} from 'lucide-react';
import { STARTER_TEMPLATES } from '../data/templates';
import { Template, Project } from '../types';
import { THEMES, ThemeId } from '../services/themeService';

interface LandingPageProps {
  currentUser: { name: string; email: string; role: string } | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onGoToDashboard: () => void;
  onLaunchEditor: (template?: Template, projectToOpen?: Project) => void;
  onOpenThemeSelector: () => void;
  activeThemeId: ThemeId;
  activeThemeMode: 'light' | 'dark';
  onToggleThemeMode: () => void;
  projects: Project[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onOpenAuth,
  onGoToDashboard,
  onLaunchEditor,
  onOpenThemeSelector,
  activeThemeId,
  activeThemeMode,
  onToggleThemeMode,
  projects,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [interactiveTab, setInteractiveTab] = useState<'source' | 'math' | 'bibtex'>('source');

  const activeThemeObj = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

  const filteredTemplates = STARTER_TEMPLATES.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-canvas text-ink font-editorial-sans flex flex-col selection:bg-ink selection:text-canvas">
      {/* LANDING HEADER */}
      <header className="sticky top-0 z-40 bg-canvas border-b border-ink/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onLaunchEditor()}>
            <div className="w-9 h-9 bg-ink flex items-center justify-center text-canvas font-editorial font-bold text-xl">
              TeX
            </div>
            <div className="flex flex-col">
              <span className="font-editorial font-bold text-ink text-lg tracking-tight leading-none flex items-center space-x-1">
                <span>TeXForge</span>
                <span className="border border-ink/20 bg-paper text-ink-muted-2 font-editorial-mono text-[9px] px-1.5 py-0.5 uppercase tracking-widest ml-1">
                  Scientific
                </span>
              </span>
              <span className="text-[10px] text-ink-muted-2 font-editorial-mono tracking-wider">
                LaTeX Publishing Workspace
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-xs font-bold uppercase tracking-widest text-ink-muted-2">
            <a href="#features" className="hover:text-ink transition-colors">
              Features
            </a>
            <a href="#templates" className="hover:text-ink transition-colors">
              Templates
            </a>
            <a href="#demo" className="hover:text-ink transition-colors">
              Live WASM TeX
            </a>
            {currentUser && (
              <button
                onClick={onGoToDashboard}
                className="text-ink hover:text-ink-muted flex items-center space-x-1 transition-colors"
              >
                <span>Dashboard (#{projects.length})</span>
              </button>
            )}
          </nav>

          {/* Right Header Action Buttons (Login / Sign Up / Dashboard) */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleThemeMode}
              className="px-2.5 py-1.5 bg-paper border border-ink/20 text-ink-muted-2 text-xs font-editorial-mono font-bold flex items-center space-x-1.5 hover:bg-paper-deep hover:text-ink transition-colors"
              title={activeThemeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {activeThemeMode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-ink" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-ink" />
              )}
              <span className="hidden sm:inline">
                {activeThemeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>

            <button
              onClick={onOpenThemeSelector}
              className="px-2.5 py-1.5 bg-paper hover:bg-paper-deep text-ink border border-ink/20 text-xs font-editorial-mono font-bold flex items-center space-x-1.5 transition-colors"
              title="Theme Palette"
            >
              <Palette className="w-3.5 h-3.5 text-ink" />
              <span className="hidden sm:inline">{activeThemeObj.name}</span>
            </button>

            {currentUser ? (
              <button
                onClick={onGoToDashboard}
                className="px-4 py-2 bg-ink hover:opacity-90 text-canvas font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 bg-paper hover:bg-paper-deep text-ink border border-ink/20 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-ink" />
                  <span>Log In</span>
                </button>

                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-4 py-2 bg-ink hover:opacity-90 text-canvas font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-ink/15">
        {/* Faint editorial paper grid background */}
        <div className="absolute inset-0 grid-pattern-paper opacity-60 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Top Announcement Badge */}
            <div className="inline-flex items-center space-x-2 bg-paper border border-ink/20 px-3.5 py-1 text-xs font-editorial-mono text-ink-muted-2">
              <Sparkles className="w-3.5 h-3.5 text-ink" />
              <span>WebAssembly pdfTeX Engine & AI Writing Assistant</span>
              <span className="text-ink/25">•</span>
              <span className="text-ink font-bold">Free Academic Workspace</span>
            </div>

            {/* Headline */}
            <h1 className="font-editorial text-4xl sm:text-6xl font-bold text-ink tracking-tight leading-tight">
              Publish Scientific Research <br className="hidden sm:inline" />
              <span className="italic">Without TeX Live Setup</span>
            </h1>

            {/* Subtitle */}
            <p className="text-ink-muted text-sm sm:text-base leading-relaxed font-medium max-w-2xl mx-auto">
              Write, compile, and publish research papers with instant client-side WASM typesetting, Monaco code editor, SyncTeX PDF preview, and automated BibTeX DOI citation sync.
            </p>

            {/* Call To Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {currentUser ? (
                <button
                  onClick={onGoToDashboard}
                  className="w-full sm:w-auto px-7 py-3.5 bg-ink hover:opacity-90 text-canvas font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-opacity"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Go to My Dashboard</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto px-7 py-3.5 bg-ink hover:opacity-90 text-canvas font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-opacity"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Account & Start</span>
                </button>
              )}

              <button
                onClick={() => onLaunchEditor()}
                className="w-full sm:w-auto px-7 py-3.5 bg-paper hover:bg-paper-deep text-ink border border-ink/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
              >
                <Code2 className="w-4 h-4 text-ink" />
                <span>Open Instant Workspace</span>
              </button>
            </div>

            {/* Features checkmarks line */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-editorial-mono text-ink-muted-2">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-ink" />
                <span>Serial Project Tracking (#01, #02...)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-ink" />
                <span>Live PDF SyncTeX</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-ink" />
                <span>5 Workspace Themes</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-ink" />
                <span>Crossref & PubMed DOI Sync</span>
              </div>
            </div>
          </div>

          {/* INTERACTIVE DEMO PREVIEW BOX */}
          <div id="demo" className="mt-12 max-w-5xl mx-auto border border-ink/20 bg-paper relative">
            {/* Window Top Bar */}
            <div className="bg-paper-deep border-b border-ink/15 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full border border-ink/30 bg-ink/25" />
                <div className="w-3 h-3 rounded-full border border-ink/30 bg-ink/50" />
                <div className="w-3 h-3 rounded-full border border-ink/30 bg-ink/80" />
                <span className="ml-2 font-editorial-mono text-xs text-ink-muted-2 font-bold">
                  texforge_manuscript.tex — WebAssembly LaTeX Engine
                </span>
              </div>

              {/* Interactive Code Switch Tabs */}
              <div className="flex items-center space-x-1 text-[10px] font-editorial-mono">
                <button
                  onClick={() => setInteractiveTab('source')}
                  className={`px-2.5 py-1 font-bold uppercase border border-ink/20 transition-colors ${
                    interactiveTab === 'source'
                      ? 'bg-ink text-canvas'
                      : 'bg-paper text-ink-muted-2 hover:text-ink'
                  }`}
                >
                  main.tex
                </button>
                <button
                  onClick={() => setInteractiveTab('math')}
                  className={`px-2.5 py-1 font-bold uppercase border border-ink/20 transition-colors ${
                    interactiveTab === 'math'
                      ? 'bg-ink text-canvas'
                      : 'bg-paper text-ink-muted-2 hover:text-ink'
                  }`}
                >
                  equations.tex
                </button>
                <button
                  onClick={() => setInteractiveTab('bibtex')}
                  className={`px-2.5 py-1 font-bold uppercase border border-ink/20 transition-colors ${
                    interactiveTab === 'bibtex'
                      ? 'bg-ink text-canvas'
                      : 'bg-paper text-ink-muted-2 hover:text-ink'
                  }`}
                >
                  refs.bib
                </button>
              </div>
            </div>

            {/* Mock Editor + Rendered PDF Split view */}
            <div className="grid grid-cols-1 md:grid-cols-2 text-left font-editorial-mono text-xs h-80 overflow-hidden bg-canvas">
              {/* Code Panel */}
              <div className="p-4 bg-canvas border-r border-ink/15 overflow-y-auto space-y-1 text-ink-muted-2 font-editorial-mono select-none">
                {interactiveTab === 'source' && (
                  <>
                    <div className="text-ink-muted-2 italic">% TeXForge WASM LaTeX Source</div>
                    <div>
                      <span className="text-ink font-bold">\documentclass</span>[11pt]&#123;
                      <span className="text-ink-muted">article</span>&#125;
                    </div>
                    <div>
                      <span className="text-ink font-bold">\usepackage</span>&#123;
                      <span className="text-ink-muted">amsmath, amssymb, hyperref</span>&#125;
                    </div>
                    <div className="pt-2">
                      <span className="text-ink font-bold">\title</span>&#123;
                      <span className="text-ink font-semibold">
                        Quantum Computing Architecture & WebAssembly
                      </span>
                      &#125;
                    </div>
                    <div>
                      <span className="text-ink font-bold">\author</span>&#123;
                      <span className="text-ink-muted">Dr. Aris Thorne, Sophia Chen</span>&#125;
                    </div>
                    <div className="pt-2">
                      <span className="text-ink font-bold">\begin</span>&#123;
                      <span className="text-ink-muted">document</span>&#125;
                    </div>
                    <div className="pl-4">
                      <span className="text-ink font-bold">\maketitle</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-ink font-bold">\section</span>&#123;Abstract&#125;
                    </div>
                    <div className="pl-4 text-ink-muted leading-relaxed">
                      We present a client-side WebAssembly compilation workspace that achieves near-native typesetting speed...
                    </div>
                  </>
                )}

                {interactiveTab === 'math' && (
                  <>
                    <div className="text-ink-muted-2 italic">% Mathematical Formulation</div>
                    <div className="text-ink-muted-2 italic">% Time-Dependent Schrödinger Wave Equation</div>
                    <div className="pt-2">
                      <span className="text-ink font-bold">\begin</span>&#123;
                      <span className="text-ink-muted">equation</span>&#125;
                    </div>
                    <div className="pl-6 text-ink font-bold">
                      i \hbar \frac&#123;\partial&#125;&#123;\partial t&#125; \Psi(\mathbf&#123;r&#125;,t) = \hat&#123;H&#125;\Psi(\mathbf&#123;r&#125;,t)
                    </div>
                    <div>
                      <span className="text-ink font-bold">\end</span>&#123;
                      <span className="text-ink-muted">equation</span>&#125;
                    </div>
                    <div className="pt-2 text-ink-muted-2 italic">% Mass-Energy Equivalence</div>
                    <div>
                      <span className="text-ink font-bold">\begin</span>&#123;
                      <span className="text-ink-muted">equation</span>&#125;
                    </div>
                    <div className="pl-6 text-ink font-bold">
                      E = \sqrt&#123; (m_0 c^2)^2 + (pc)^2 &#125;
                    </div>
                    <div>
                      <span className="text-ink font-bold">\end</span>&#123;
                      <span className="text-ink-muted">equation</span>&#125;
                    </div>
                  </>
                )}

                {interactiveTab === 'bibtex' && (
                  <>
                    <div className="text-ink-muted-2 italic">% BibTeX Bibliography File</div>
                    <div className="pt-1">
                      <span className="text-ink font-bold">@article</span>&#123;
                      <span className="text-ink-muted">Thorne2026Wasm</span>,
                    </div>
                    <div className="pl-4">
                      author = &#123;<span className="text-ink-muted">Thorne, Aris and Chen, Sophia</span>&#125;,
                    </div>
                    <div className="pl-4">
                      title = &#123;<span className="text-ink-muted">Client-Side WASM TeX Acceleration</span>&#125;,
                    </div>
                    <div className="pl-4">
                      journal = &#123;<span className="text-ink-muted">Journal of Scientific Software</span>&#125;,
                    </div>
                    <div className="pl-4">
                      year = &#123;<span className="text-ink">2026</span>&#125;,
                    </div>
                    <div className="pl-4">
                      doi = &#123;<span className="text-ink">10.1038/s41586-026-0001-z</span>&#125;
                    </div>
                    <div>&#125;</div>
                  </>
                )}
              </div>

              {/* Rendered PDF Preview */}
              <div className="p-6 bg-[#fffdf9] text-ink font-editorial overflow-y-auto space-y-3 border-t md:border-t-0 md:border-l border-ink/15 relative select-none">
                <div className="text-center space-y-1">
                  <h2 className="text-sm font-bold font-editorial text-ink leading-snug">
                    Quantum Computing Architecture & WebAssembly
                  </h2>
                  <p className="text-[10px] text-ink-muted-2 font-editorial-sans">
                    Dr. Aris Thorne<sup>1</sup>, Sophia Chen<sup>2</sup>
                  </p>
                  <p className="text-[9px] text-ink-muted-2 font-editorial-sans italic">Stanford University & MIT CSAIL</p>
                </div>

                <hr className="border-ink/15" />

                <div className="text-[11px] leading-relaxed text-ink space-y-2 font-editorial">
                  <p className="font-editorial-sans font-bold text-[9px] uppercase tracking-wider text-ink-muted-2">
                    1. Introduction & Formulation
                  </p>
                  <p className="text-[10px]">
                    We model state evolution using WebAssembly compiled pdfTeX. Consider the wave equation below:
                  </p>

                  <div className="p-2 bg-paper text-center font-editorial text-xs font-bold my-2 border-l-2 border-ink">
                    i ℏ (∂Ψ / ∂t) = Ĥ Ψ(r, t) &nbsp;&nbsp;&nbsp;&nbsp;(1)
                  </div>

                  <p className="text-[9px] text-ink-muted-2 font-editorial-sans">
                    Ref: [1] Thorne & Chen (2026), <em>Journal of Scientific Software</em>.
                  </p>
                </div>

                {/* PDF Sync Badge */}
                <div className="absolute bottom-3 right-3 bg-ink text-canvas px-2.5 py-1 text-[9px] font-editorial-mono flex items-center space-x-1.5 border border-ink/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-canvas animate-ping" />
                  <span>SyncTeX Live • 38ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-canvas border-b border-ink/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-ink-muted-2 font-editorial-mono text-xs uppercase tracking-widest font-bold">
              Integrated Scientific Stack
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-ink uppercase tracking-tight">
              Built for Researchers & Academic Authors
            </h2>
            <p className="text-ink-muted text-xs sm:text-sm">
              All tools required to compose, cite, and compile high-impact papers in one tab.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-paper border border-ink/15 p-6 space-y-3 hover:bg-paper-deep transition-colors">
              <div className="w-10 h-10 border border-ink/20 bg-canvas flex items-center justify-center text-ink">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-editorial font-bold text-ink text-base">WASM TeX Engine</h3>
              <p className="text-ink-muted text-xs leading-relaxed">
                Zero installation. Fast pdfTeX & XeLaTeX compilation running client-side with full package support.
              </p>
            </div>

            <div className="bg-paper border border-ink/15 p-6 space-y-3 hover:bg-paper-deep transition-colors">
              <div className="w-10 h-10 border border-ink/20 bg-canvas flex items-center justify-center text-ink">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-editorial font-bold text-ink text-base">Monaco Code Editor</h3>
              <p className="text-ink-muted text-xs leading-relaxed">
                LaTeX syntax highlighting, command autocompletion, bracket matching, line errors, and custom color themes.
              </p>
            </div>

            <div className="bg-paper border border-ink/15 p-6 space-y-3 hover:bg-paper-deep transition-colors">
              <div className="w-10 h-10 border border-ink/20 bg-canvas flex items-center justify-center text-ink">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-editorial font-bold text-ink text-base">AI Writing Assistant</h3>
              <p className="text-ink-muted text-xs leading-relaxed">
                Automated LaTeX error debugging, equation generator, abstract polishing, and custom API provider setup.
              </p>
            </div>

            <div className="bg-paper border border-ink/15 p-6 space-y-3 hover:bg-paper-deep transition-colors">
              <div className="w-10 h-10 border border-ink/20 bg-canvas flex items-center justify-center text-ink">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-editorial font-bold text-ink text-base">BibTeX DOI Lookup</h3>
              <p className="text-ink-muted text-xs leading-relaxed">
                Import citations instantly using DOI numbers, PubMed IDs, or Crossref lookup directly into `.bib` files.
              </p>
            </div>

            <div className="bg-paper border border-ink/15 p-6 space-y-3 hover:bg-paper-deep transition-colors">
              <div className="w-10 h-10 border border-ink/20 bg-canvas flex items-center justify-center text-ink">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-editorial font-bold text-ink text-base">SyncTeX PDF Navigation</h3>
              <p className="text-ink-muted text-xs leading-relaxed">
                Click any line in the PDF output to jump directly to the target LaTeX source line in Monaco editor.
              </p>
            </div>

            <div className="bg-paper border border-ink/15 p-6 space-y-3 hover:bg-paper-deep transition-colors">
              <div className="w-10 h-10 border border-ink/20 bg-canvas flex items-center justify-center text-ink">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="font-editorial font-bold text-ink text-base">5 Custom Color Themes</h3>
              <p className="text-ink-muted text-xs leading-relaxed">
                Overleaf Dark, Overleaf Light, Nordic Polar, Solarized Warm, and Emerald Night themes with matching editor colors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TEMPLATES SHOWCASE */}
      <section id="templates" className="py-20 bg-paper border-b border-ink/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-ink-muted-2 font-editorial-mono text-xs uppercase tracking-widest font-bold">
              Standard Document Classes
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-ink uppercase tracking-tight">
              Starter Academic Paper Templates
            </h2>
            <p className="text-ink-muted text-xs sm:text-sm">
              Launch pre-configured document classes for journal articles, theses, and Beamer presentations.
            </p>
          </div>

          {/* Category Switcher */}
          <div className="flex items-center justify-center space-x-2 mb-8 text-xs font-bold uppercase tracking-wider overflow-x-auto pb-2">
            {['all', 'article', 'thesis', 'presentation', 'cv'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 transition-colors whitespace-nowrap border ${
                  selectedCategory === cat
                    ? 'bg-ink text-canvas font-bold border-ink'
                    : 'bg-canvas text-ink-muted-2 hover:text-ink border-ink/20'
                }`}
              >
                {cat === 'all' ? 'All Scaffolds' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template: Template) => (
              <div
                key={template.id}
                className="bg-canvas border border-ink/15 hover:border-ink/40 p-5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5 text-ink" />
                      <h3 className="font-editorial font-bold text-ink text-sm group-hover:underline transition-colors">
                        {template.name}
                      </h3>
                    </div>

                    <span className="border border-ink/20 bg-paper text-ink-muted-2 font-editorial-mono text-[9px] px-2 py-0.5 uppercase">
                      {template.category}
                    </span>
                  </div>

                  <p className="text-ink-muted text-xs leading-relaxed mb-6 font-medium">
                    {template.description}
                  </p>
                </div>

                <button
                  onClick={() => onLaunchEditor(template)}
                  className="w-full py-2 bg-ink hover:opacity-90 text-canvas font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-opacity"
                >
                  <span>Start With {template.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-canvas border-t border-ink/15 py-12 text-ink-muted-2 text-xs font-editorial-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-ink text-canvas font-editorial font-bold flex items-center justify-center text-sm">
              TeX
            </div>
            <div>
              <p className="font-editorial font-bold text-ink text-sm tracking-tight font-editorial-sans">
                TeXForge Scientific Publishing
              </p>
              <p className="text-[10px] text-ink-muted-2">
                WebAssembly WASM pdfTeX Engine & Citation Suite.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-[11px] text-ink-muted-2">
            <button onClick={() => onOpenAuth('login')} className="hover:text-ink transition-colors">
              Log In
            </button>
            <button onClick={() => onOpenAuth('signup')} className="hover:text-ink transition-colors">
              Sign Up
            </button>
            <button onClick={() => onLaunchEditor()} className="hover:text-ink transition-colors">
              Workspace Editor
            </button>
            <button onClick={onOpenThemeSelector} className="hover:text-ink transition-colors">
              Themes
            </button>
          </div>

          <div className="text-[10px] text-ink-muted-2">
            © {new Date().getFullYear()} TeXForge • Released under MIT License
          </div>
        </div>
      </footer>
    </div>
  );
};
