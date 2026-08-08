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
  projects: Project[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onOpenAuth,
  onGoToDashboard,
  onLaunchEditor,
  onOpenThemeSelector,
  activeThemeId,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[#D11111] selection:text-white">
      {/* LANDING HEADER */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b-2 border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onLaunchEditor()}>
            <div className="w-9 h-9 bg-[#D11111] flex items-center justify-center font-black text-white text-xl shadow-md border border-red-500">
              TeX
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-lg tracking-tight leading-none flex items-center space-x-1">
                <span>TeXForge</span>
                <span className="bg-red-950 text-[#D11111] border border-red-800/80 text-[10px] font-black px-1.5 py-0.2 uppercase tracking-widest ml-1">
                  Scientific
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                LaTeX Publishing Workspace
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-xs font-extrabold uppercase tracking-widest text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#templates" className="hover:text-white transition-colors">
              Templates
            </a>
            <a href="#demo" className="hover:text-white transition-colors">
              Live WASM TeX
            </a>
            {currentUser && (
              <button
                onClick={onGoToDashboard}
                className="text-[#D11111] hover:text-red-400 flex items-center space-x-1 transition-colors"
              >
                <span>Dashboard (#{projects.length})</span>
              </button>
            )}
          </nav>

          {/* Right Header Action Buttons (Login / Sign Up / Dashboard) */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenThemeSelector}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors"
              title="Theme Palette"
            >
              <Palette className="w-3.5 h-3.5 text-[#D11111]" />
              <span className="hidden sm:inline">{activeThemeObj.name}</span>
            </button>

            {currentUser ? (
              <button
                onClick={onGoToDashboard}
                className="px-4 py-2 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center space-x-1.5 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-extrabold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#D11111]" />
                  <span>Log In</span>
                </button>

                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-4 py-2 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
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
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 grid-pattern-dark opacity-20 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Top Announcement Badge */}
            <div className="inline-flex items-center space-x-2 bg-red-950/70 border border-red-800/60 px-3.5 py-1 text-xs font-mono text-red-300">
              <Sparkles className="w-3.5 h-3.5 text-[#D11111] animate-pulse" />
              <span>WebAssembly pdfTeX Engine & AI Writing Assistant</span>
              <span className="text-slate-600">•</span>
              <span className="text-white font-bold">Free Academic Workspace</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
              Publish Scientific Research <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-amber-300">
                Without TeX Live Setup
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium max-w-2xl mx-auto">
              Write, compile, and publish research papers with instant client-side WASM typesetting, Monaco code editor, SyncTeX PDF preview, and automated BibTeX DOI citation sync.
            </p>

            {/* Call To Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {currentUser ? (
                <button
                  onClick={onGoToDashboard}
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2 transition-transform hover:-translate-y-0.5"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Go to My Dashboard</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2 transition-transform hover:-translate-y-0.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Account & Start</span>
                </button>
              )}

              <button
                onClick={() => onLaunchEditor()}
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all"
              >
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Open Instant Workspace</span>
              </button>
            </div>

            {/* Features checkmarks line */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Serial Project Tracking (#01, #02...)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Live PDF SyncTeX</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>5 Workspace Themes</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Crossref & PubMed DOI Sync</span>
              </div>
            </div>
          </div>

          {/* INTERACTIVE DEMO PREVIEW BOX */}
          <div id="demo" className="mt-12 max-w-5xl mx-auto border-2 border-slate-800 bg-slate-950 shadow-2xl overflow-hidden relative">
            {/* Window Top Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-xs text-slate-300 font-bold">
                  texforge_manuscript.tex — WebAssembly LaTeX Engine
                </span>
              </div>

              {/* Interactive Code Switch Tabs */}
              <div className="flex items-center space-x-1 text-[10px] font-mono">
                <button
                  onClick={() => setInteractiveTab('source')}
                  className={`px-2.5 py-1 font-bold uppercase transition-colors ${
                    interactiveTab === 'source'
                      ? 'bg-[#D11111] text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  main.tex
                </button>
                <button
                  onClick={() => setInteractiveTab('math')}
                  className={`px-2.5 py-1 font-bold uppercase transition-colors ${
                    interactiveTab === 'math'
                      ? 'bg-[#D11111] text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  equations.tex
                </button>
                <button
                  onClick={() => setInteractiveTab('bibtex')}
                  className={`px-2.5 py-1 font-bold uppercase transition-colors ${
                    interactiveTab === 'bibtex'
                      ? 'bg-[#D11111] text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  refs.bib
                </button>
              </div>
            </div>

            {/* Mock Editor + Rendered PDF Split view */}
            <div className="grid grid-cols-1 md:grid-cols-2 text-left font-mono text-xs h-80 overflow-hidden bg-slate-950">
              {/* Code Panel */}
              <div className="p-4 bg-slate-900 border-r border-slate-800 overflow-y-auto space-y-1 text-slate-300 font-mono select-none">
                {interactiveTab === 'source' && (
                  <>
                    <div className="text-slate-500">% TeXForge WASM LaTeX Source</div>
                    <div>
                      <span className="text-red-400 font-bold">\documentclass</span>[11pt]&#123;
                      <span className="text-amber-300">article</span>&#125;
                    </div>
                    <div>
                      <span className="text-red-400 font-bold">\usepackage</span>&#123;
                      <span className="text-cyan-300">amsmath, amssymb, hyperref</span>&#125;
                    </div>
                    <div className="pt-2">
                      <span className="text-red-400 font-bold">\title</span>&#123;
                      <span className="text-emerald-300 font-semibold">
                        Quantum Computing Architecture & WebAssembly
                      </span>
                      &#125;
                    </div>
                    <div>
                      <span className="text-red-400 font-bold">\author</span>&#123;
                      <span className="text-slate-200">Dr. Aris Thorne, Sophia Chen</span>&#125;
                    </div>
                    <div className="pt-2">
                      <span className="text-red-400 font-bold">\begin</span>&#123;
                      <span className="text-amber-300">document</span>&#125;
                    </div>
                    <div className="pl-4">
                      <span className="text-red-400 font-bold">\maketitle</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-red-400 font-bold">\section</span>&#123;Abstract&#125;
                    </div>
                    <div className="pl-4 text-slate-400 leading-relaxed">
                      We present a client-side WebAssembly compilation workspace that achieves near-native typesetting speed...
                    </div>
                  </>
                )}

                {interactiveTab === 'math' && (
                  <>
                    <div className="text-slate-500">% Mathematical Formulation</div>
                    <div className="text-slate-400">% Time-Dependent Schrödinger Wave Equation</div>
                    <div className="pt-2">
                      <span className="text-red-400 font-bold">\begin</span>&#123;
                      <span className="text-amber-300">equation</span>&#125;
                    </div>
                    <div className="pl-6 text-amber-200 font-bold">
                      i \hbar \frac&#123;\partial&#125;&#123;\partial t&#125; \Psi(\mathbf&#123;r&#125;,t) = \hat&#123;H&#125;\Psi(\mathbf&#123;r&#125;,t)
                    </div>
                    <div>
                      <span className="text-red-400 font-bold">\end</span>&#123;
                      <span className="text-amber-300">equation</span>&#125;
                    </div>
                    <div className="pt-2 text-slate-400">% Mass-Energy Equivalence</div>
                    <div>
                      <span className="text-red-400 font-bold">\begin</span>&#123;
                      <span className="text-amber-300">equation</span>&#125;
                    </div>
                    <div className="pl-6 text-amber-200 font-bold">
                      E = \sqrt&#123; (m_0 c^2)^2 + (pc)^2 &#125;
                    </div>
                    <div>
                      <span className="text-red-400 font-bold">\end</span>&#123;
                      <span className="text-amber-300">equation</span>&#125;
                    </div>
                  </>
                )}

                {interactiveTab === 'bibtex' && (
                  <>
                    <div className="text-slate-500">% BibTeX Bibliography File</div>
                    <div className="pt-1">
                      <span className="text-red-400 font-bold">@article</span>&#123;
                      <span className="text-amber-300">Thorne2026Wasm</span>,
                    </div>
                    <div className="pl-4">
                      author = &#123;<span className="text-emerald-300">Thorne, Aris and Chen, Sophia</span>&#125;,
                    </div>
                    <div className="pl-4">
                      title = &#123;<span className="text-emerald-300">Client-Side WASM TeX Acceleration</span>&#125;,
                    </div>
                    <div className="pl-4">
                      journal = &#123;<span className="text-emerald-300">Journal of Scientific Software</span>&#125;,
                    </div>
                    <div className="pl-4">
                      year = &#123;<span className="text-amber-200">2026</span>&#125;,
                    </div>
                    <div className="pl-4">
                      doi = &#123;<span className="text-cyan-300">10.1038/s41586-026-0001-z</span>&#125;
                    </div>
                    <div>&#125;</div>
                  </>
                )}
              </div>

              {/* Rendered PDF Preview */}
              <div className="p-6 bg-slate-100 text-slate-900 font-serif overflow-y-auto space-y-3 border-t md:border-t-0 md:border-l border-slate-300 relative select-none">
                <div className="text-center space-y-1">
                  <h2 className="text-sm font-extrabold font-serif text-slate-900 leading-snug">
                    Quantum Computing Architecture & WebAssembly
                  </h2>
                  <p className="text-[10px] text-slate-600 font-sans">
                    Dr. Aris Thorne<sup>1</sup>, Sophia Chen<sup>2</sup>
                  </p>
                  <p className="text-[9px] text-slate-400 font-sans italic">Stanford University & MIT CSAIL</p>
                </div>

                <hr className="border-slate-300" />

                <div className="text-[11px] leading-relaxed text-slate-800 space-y-2 font-serif">
                  <p className="font-sans font-bold text-[9px] uppercase tracking-wider text-slate-500">
                    1. Introduction & Formulation
                  </p>
                  <p className="text-[10px]">
                    We model state evolution using WebAssembly compiled pdfTeX. Consider the wave equation below:
                  </p>

                  <div className="p-2 bg-slate-200/80 text-center font-serif text-xs font-bold my-2 border-l-2 border-red-600">
                    i ℏ (∂Ψ / ∂t) = Ĥ Ψ(r, t) &nbsp;&nbsp;&nbsp;&nbsp;(1)
                  </div>

                  <p className="text-[9px] text-slate-500 font-sans">
                    Ref: [1] Thorne & Chen (2026), <em>Journal of Scientific Software</em>.
                  </p>
                </div>

                {/* PDF Sync Badge */}
                <div className="absolute bottom-3 right-3 bg-slate-900 text-white px-2.5 py-1 text-[9px] font-mono flex items-center space-x-1.5 border border-slate-700 shadow-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>SyncTeX Live • 38ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-[#D11111] font-mono text-xs uppercase tracking-widest font-bold">
              Integrated Scientific Stack
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Built for Researchers & Academic Authors
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              All tools required to compose, cite, and compile high-impact papers in one tab.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 space-y-3 hover:border-red-600/70 transition-colors">
              <div className="w-10 h-10 bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">WASM TeX Engine</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Zero installation. Fast pdfTeX & XeLaTeX compilation running client-side with full package support.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 space-y-3 hover:border-red-600/70 transition-colors">
              <div className="w-10 h-10 bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">Monaco Code Editor</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                LaTeX syntax highlighting, command autocompletion, bracket matching, line errors, and custom color themes.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 space-y-3 hover:border-red-600/70 transition-colors">
              <div className="w-10 h-10 bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">AI Writing Assistant</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Automated LaTeX error debugging, equation generator, abstract polishing, and custom API provider setup.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 space-y-3 hover:border-red-600/70 transition-colors">
              <div className="w-10 h-10 bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">BibTeX DOI Lookup</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Import citations instantly using DOI numbers, PubMed IDs, or Crossref lookup directly into `.bib` files.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 space-y-3 hover:border-red-600/70 transition-colors">
              <div className="w-10 h-10 bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">SyncTeX PDF Navigation</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Click any line in the PDF output to jump directly to the target LaTeX source line in Monaco editor.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 space-y-3 hover:border-red-600/70 transition-colors">
              <div className="w-10 h-10 bg-red-950/80 border border-red-700/60 flex items-center justify-center text-red-400">
                <Palette className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-base">5 Custom Color Themes</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Overleaf Dark, Overleaf Light, Nordic Polar, Solarized Warm, and Emerald Night themes with matching editor colors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TEMPLATES SHOWCASE */}
      <section id="templates" className="py-20 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-[#D11111] font-mono text-xs uppercase tracking-widest font-bold">
              Standard Document Classes
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Starter Academic Paper Templates
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Launch pre-configured document classes for journal articles, theses, and Beamer presentations.
            </p>
          </div>

          {/* Category Switcher */}
          <div className="flex items-center justify-center space-x-2 mb-8 text-xs font-bold uppercase tracking-wider overflow-x-auto pb-2">
            {['all', 'article', 'thesis', 'presentation', 'cv'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#D11111] text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
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
                className="bg-slate-950 border-2 border-slate-800 hover:border-[#D11111] p-5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5 text-red-400" />
                      <h3 className="font-extrabold text-white text-sm group-hover:text-red-400 transition-colors">
                        {template.name}
                      </h3>
                    </div>

                    <span className="bg-red-950/80 border border-red-800/80 text-red-400 font-mono text-[9px] px-2 py-0.5 uppercase">
                      {template.category}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
                    {template.description}
                  </p>
                </div>

                <button
                  onClick={() => onLaunchEditor(template)}
                  className="w-full py-2 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-1.5 transition-colors shadow-md"
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
      <footer className="mt-auto bg-slate-950 border-t border-slate-800 py-12 text-slate-400 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-[#D11111] text-white font-black flex items-center justify-center text-sm">
              TeX
            </div>
            <div>
              <p className="font-extrabold text-white text-sm tracking-tight font-sans">
                TeXForge Scientific Publishing
              </p>
              <p className="text-[10px] text-slate-500">
                WebAssembly WASM pdfTeX Engine & Citation Suite.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-[11px] text-slate-400">
            <button onClick={() => onOpenAuth('login')} className="hover:text-white transition-colors">
              Log In
            </button>
            <button onClick={() => onOpenAuth('signup')} className="hover:text-white transition-colors">
              Sign Up
            </button>
            <button onClick={() => onLaunchEditor()} className="hover:text-white transition-colors">
              Workspace Editor
            </button>
            <button onClick={onOpenThemeSelector} className="hover:text-white transition-colors">
              Themes
            </button>
          </div>

          <div className="text-[10px] text-slate-500">
            © {new Date().getFullYear()} TeXForge • Released under MIT License
          </div>
        </div>
      </footer>
    </div>
  );
};
