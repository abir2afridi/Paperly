import React, { useState } from 'react';
import {
  FolderPlus,
  Plus,
  Search,
  ArrowRight,
  FileText,
  Clock,
  Trash2,
  Copy,
  BookOpen,
  Palette,
  LogOut,
  User,
  SlidersHorizontal,
  Check,
  Layers,
  Sparkles,
  Zap,
  GraduationCap,
  ChevronDown,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { Project, Template } from '../types';
import { STARTER_TEMPLATES } from '../data/templates';
import { THEMES, ThemeId } from '../services/themeService';

interface DashboardViewProps {
  user: { name: string; email: string; role: string };
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onCreateNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: Project) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onSelectTemplate: (template: Template) => void;
  onLogout: () => void;
  onGoHome: () => void;
  onOpenThemeSelector: () => void;
  activeThemeId: ThemeId;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  projects,
  onOpenProject,
  onCreateNewProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onSelectTemplate,
  onLogout,
  onGoHome,
  onOpenThemeSelector,
  activeThemeId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'serial_asc' | 'serial_desc' | 'updated' | 'name'>('serial_asc');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeThemeObj = THEMES.find(t => t.id === activeThemeId) || THEMES[0];

  // Process projects with serial numbers
  const indexedProjects = projects.map((p, idx) => ({
    ...p,
    serialNumber: p.serialNumber || idx + 1,
  }));

  // Filter & Sort Projects
  const filteredProjects = indexedProjects
    .filter(p => {
      const serialStr = `#${String(p.serialNumber).padStart(2, '0')}`;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        serialStr.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'serial_asc') return (a.serialNumber || 0) - (b.serialNumber || 0);
      if (sortBy === 'serial_desc') return (b.serialNumber || 0) - (a.serialNumber || 0);
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  const handleStartRename = (proj: Project) => {
    setEditingProjectId(proj.id);
    setEditingName(proj.name);
  };

  const handleSaveRename = (projId: string) => {
    if (editingName.trim()) {
      onRenameProject(projId, editingName.trim());
    }
    setEditingProjectId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[#D11111] selection:text-white">
      {/* Dashboard Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b-2 border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onGoHome}>
            <div className="w-9 h-9 bg-[#D11111] flex items-center justify-center font-black text-white text-xl border border-red-500 shadow-md">
              TeX
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-lg tracking-tight leading-none flex items-center space-x-1">
                <span>TeXForge</span>
                <span className="bg-red-950 text-[#D11111] border border-red-800/80 text-[10px] font-black px-1.5 py-0.2 uppercase tracking-widest ml-1">
                  Dashboard
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                Academic Document Hub
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenThemeSelector}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-colors"
              title="Change Workspace Theme"
            >
              <Palette className="w-3.5 h-3.5 text-[#D11111]" />
              <span className="hidden sm:inline text-[11px] font-mono">{activeThemeObj.name}</span>
            </button>

            <button
              onClick={onGoHome}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Home Page
            </button>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* User Badge Dropdown / Logout */}
            <div className="flex items-center space-x-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-red-950 border border-red-700/80 flex items-center justify-center text-red-400 font-black text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-extrabold text-white leading-tight">{user.name}</span>
                <span className="text-[9px] font-mono text-slate-400">{user.role}</span>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors rounded"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* User Banner Greeting & Quick Stats */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-800 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-red-900/10 to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center space-x-2 bg-red-950/80 border border-red-800/80 px-2.5 py-0.5 text-[10px] font-mono text-red-400 uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-[#D11111]" />
                <span>Verified Academic Author Workspace</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome back, {user.name}
              </h1>

              <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
                Manage your ordered research manuscripts, BibTeX citation files, and WASM LaTeX compilation workspace.
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onCreateNewProject}
                className="px-5 py-3 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center space-x-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Project (Auto Serial)</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80 text-xs font-mono">
            <div className="p-3 bg-slate-950 border border-slate-800/80">
              <div className="text-slate-500 uppercase text-[10px] font-bold">Total Projects</div>
              <div className="text-xl font-black text-white mt-1">
                #{String(projects.length).padStart(2, '0')}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80">
              <div className="text-slate-500 uppercase text-[10px] font-bold">TeX Compiler Engine</div>
              <div className="text-xs font-bold text-emerald-400 mt-2 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>WASM pdfTeX Ready</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80">
              <div className="text-slate-500 uppercase text-[10px] font-bold">Citation Library</div>
              <div className="text-xs font-bold text-amber-400 mt-2">BibTeX DOI Lookup Active</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80">
              <div className="text-slate-500 uppercase text-[10px] font-bold">Active Theme</div>
              <div className="text-xs font-bold text-red-400 mt-2">{activeThemeObj.name}</div>
            </div>
          </div>
        </div>

        {/* PROJECT SERIAL MANAGEMENT SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-4 border-2 border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-[#D11111]" />
                <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">
                  Serial Project Directory
                </h2>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 text-[10px] font-mono font-bold">
                  {filteredProjects.length} Projects
                </span>
              </div>
              <p className="text-slate-400 text-xs font-mono mt-0.5">
                Every document maintains its exact project serial index (#01, #02, #03...) for systematic reference.
              </p>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search project or #serial..."
                  className="bg-slate-950 border border-slate-800 text-white text-xs pl-8 pr-3 py-2 w-full sm:w-56 focus:outline-none focus:border-[#D11111] font-mono"
                />
              </div>

              {/* Serial Sort Dropdown */}
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs font-mono text-slate-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#D11111]" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="serial_asc" className="bg-slate-900 text-white">
                    Sort: Serial # (01 → N)
                  </option>
                  <option value="serial_desc" className="bg-slate-900 text-white">
                    Sort: Serial # (N → 01)
                  </option>
                  <option value="updated" className="bg-slate-900 text-white">
                    Sort: Recently Updated
                  </option>
                  <option value="name" className="bg-slate-900 text-white">
                    Sort: Name (A-Z)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Project List / Grid with Serial Numbers */}
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border-2 border-slate-800 space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-bold text-sm">No projects matched your search criteria.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#D11111] hover:underline font-mono"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(proj => {
                const serialNumStr = `#${String(proj.serialNumber || 1).padStart(2, '0')}`;
                const isEditing = editingProjectId === proj.id;

                return (
                  <div
                    key={proj.id}
                    className="bg-slate-900 border-2 border-slate-800 hover:border-[#D11111] p-5 transition-all flex flex-col justify-between group hover:shadow-xl relative"
                  >
                    <div>
                      {/* Serial Tag + Compiler Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="bg-[#D11111] text-white font-black font-mono text-[10px] px-2 py-0.5 uppercase tracking-widest border border-red-500 shadow-xs">
                            SERIAL {serialNumStr}
                          </span>
                          <span className="bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[9px] px-1.5 py-0.5 uppercase">
                            {proj.compiler}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleStartRename(proj)}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Rename Project"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDuplicateProject(proj)}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Duplicate Project (Assigned Next Serial)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {projects.length > 1 && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete Serial ${serialNumStr} ("${proj.name}")?`)) {
                                  onDeleteProject(proj.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title Editable or Rendered */}
                      {isEditing ? (
                        <div className="flex items-center space-x-1 mb-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRename(proj.id);
                            }}
                            className="bg-slate-950 border border-red-500 text-white text-xs font-bold p-1 w-full focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(proj.id)}
                            className="bg-emerald-600 text-white p-1 hover:bg-emerald-500"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h3
                          onClick={() => onOpenProject(proj)}
                          className="font-extrabold text-white text-base tracking-tight mb-1 cursor-pointer group-hover:text-red-400 transition-colors line-clamp-1"
                        >
                          {proj.name}
                        </h3>
                      )}

                      <p className="text-slate-400 text-xs line-clamp-2 mb-4 font-medium leading-relaxed">
                        {proj.description || 'LaTeX research paper workspace with bibtex citations.'}
                      </p>
                    </div>

                    {/* Card Footer Metadata & Launch Action */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{proj.files.length} files</span>
                      </div>

                      <button
                        onClick={() => onOpenProject(proj)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-[#D11111] text-slate-200 hover:text-white font-black text-xs uppercase tracking-wider transition-colors flex items-center space-x-1.5 shadow-md"
                      >
                        <span>Launch Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* STARTER TEMPLATE SCAFFOLDS SECTION */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>Create From Official Academic Templates</span>
              </h3>
              <p className="text-slate-400 text-xs font-mono mt-0.5">
                Launch a pre-formatted manuscript scaffold with IEEE, ACM, or Thesis packages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STARTER_TEMPLATES.slice(0, 3).map((template: Template) => (
              <div
                key={template.id}
                className="bg-slate-900 border border-slate-800 p-4 hover:border-amber-500/80 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-white text-xs tracking-tight">
                      {template.name}
                    </span>
                    <span className="bg-amber-950/80 border border-amber-800/80 text-amber-300 font-mono text-[9px] px-1.5 py-0.2 uppercase">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-3 font-medium">
                    {template.description}
                  </p>
                </div>

                <button
                  onClick={() => onSelectTemplate(template)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>Use {template.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-slate-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-white">TeXForge Workspace</span>
            <span>•</span>
            <span>Project Serials System (#01 - #{String(projects.length).padStart(2, '0')})</span>
          </div>
          <div>Logged in as {user.email}</div>
        </div>
      </footer>
    </div>
  );
};
