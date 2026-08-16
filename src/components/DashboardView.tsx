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
  SlidersHorizontal,
  Check,
  Sparkles,
  Edit2,
  CheckCircle2,
  Sun,
  Moon,
  LayoutDashboard,
  FolderOpen,
  Settings as SettingsIcon,
  ChevronDown,
} from 'lucide-react';
import { Project, Template } from '../types';
import { STARTER_TEMPLATES } from '../data/templates';
import { THEMES, ThemeId } from '../services/themeService';
import { UserAvatar } from './UserAvatar';
import { DashboardSettings } from './DashboardSettings';

interface DashboardViewProps {
  user: { name: string; email: string; role: string; avatarUrl?: string };
  projects: Project[];
  isCloudUser: boolean;
  onOpenProject: (project: Project) => void;
  onCreateNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: Project) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onSelectTemplate: (template: Template) => void;
  onLogout: () => void;
  onGoHome: () => void;
  onOpenThemeSelector: () => void;
  onOpenAiSettings: () => void;
  onOpenAbout: () => void;
  onSelectTheme: (themeId: ThemeId) => void;
  activeThemeId: ThemeId;
  activeThemeMode: 'light' | 'dark';
  onToggleThemeMode: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  projects,
  isCloudUser,
  onOpenProject,
  onCreateNewProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onSelectTemplate,
  onLogout,
  onGoHome,
  onOpenThemeSelector,
  onOpenAiSettings,
  onOpenAbout,
  onSelectTheme,
  activeThemeId,
  activeThemeMode,
  onToggleThemeMode,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'projects' | 'templates' | 'settings'>('overview');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'serial_asc' | 'serial_desc' | 'updated' | 'name'>('serial_asc');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const NAV_SECTIONS: { id: 'overview' | 'projects' | 'templates' | 'settings'; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'projects', label: 'Projects', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

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

  const renderProjectCard = (proj: Project) => {
    const serialNumStr = `#${String(proj.serialNumber || 1).padStart(2, '0')}`;
    const isEditing = editingProjectId === proj.id;

    return (
      <div
        key={proj.id}
        className="bg-canvas border border-hairline hover:border-hairline-strong p-5 transition-all flex flex-col justify-between group relative rounded-xl"
      >
        <div>
          {/* Serial Tag + Compiler Badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="bg-ink text-canvas font-bold font-editorial-mono text-[10px] px-2 py-0.5 uppercase tracking-widest border border-ink rounded-md">
                SERIAL {serialNumStr}
              </span>
              <span className="border border-hairline-strong bg-paper text-ink-muted-2 font-editorial-mono text-[9px] px-1.5 py-0.5 uppercase rounded-full">
                {proj.compiler}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleStartRename(proj)}
                className="p-1 text-ink-muted-2 hover:text-ink transition-colors"
                title="Rename Project"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onDuplicateProject(proj)}
                className="p-1 text-ink-muted-2 hover:text-ink transition-colors"
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
                  className="p-1 text-ink-muted-2 hover:text-ink transition-colors"
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
                className="bg-canvas border border-ink text-ink text-xs font-bold p-1 w-full focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => handleSaveRename(proj.id)}
                className="bg-ink text-canvas p-1 hover:opacity-90"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <h3
              onClick={() => onOpenProject(proj)}
              className="font-editorial text-ink text-base tracking-tight mb-1 cursor-pointer group-hover:underline transition-colors line-clamp-1"
            >
              {proj.name}
            </h3>
          )}

          <p className="text-ink-muted text-xs line-clamp-2 mb-4 font-medium leading-relaxed">
            {proj.description || 'LaTeX research paper workspace with bibtex citations.'}
          </p>
        </div>

        {/* Card Footer Metadata & Launch Action */}
        <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-[10px] font-editorial-mono text-ink-muted-2">
            <Clock className="w-3 h-3" />
            <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>{proj.files.length} files</span>
          </div>

          <button
            onClick={() => onOpenProject(proj)}
            className="px-3.5 py-1.5 bg-canvas hover:bg-ink text-ink hover:text-canvas border border-hairline-strong hover:border-ink font-bold text-xs uppercase tracking-wider transition-colors flex items-center space-x-1.5 rounded-md"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderTemplateCard = (template: Template) => (
    <div
      key={template.id}
      className="bg-canvas border border-hairline p-4 hover:border-hairline-strong transition-colors flex flex-col justify-between rounded-xl"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-ink text-xs tracking-tight">
            {template.name}
          </span>
          <span className="border border-hairline-strong bg-paper text-ink-muted-2 font-editorial-mono text-[9px] px-1.5 py-0.2 uppercase rounded-full">
            {template.category}
          </span>
        </div>
        <p className="text-ink-muted text-xs leading-relaxed line-clamp-2 mb-3 font-medium">
          {template.description}
        </p>
      </div>

      <button
        onClick={() => onSelectTemplate(template)}
        className="w-full py-1.5 bg-canvas hover:bg-ink text-ink hover:text-canvas border border-hairline-strong hover:border-ink font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 rounded-md"
      >
        <span>Use {template.name}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-canvas text-ink font-editorial-sans flex flex-col overflow-hidden selection:bg-ink selection:text-canvas">
      {/* Dashboard Top Header — nav-bar-light: white canvas, hairline border */}
      <header className="sticky top-0 z-40 bg-canvas border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onGoHome}>
            <div className="w-9 h-9 bg-ink flex items-center justify-center text-canvas font-editorial text-xl border border-ink rounded-md">
              TeX<span className="text-primary">.</span>
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-ink text-lg tracking-tight leading-none flex items-center space-x-1">
                <span>TeXForge</span>
                <span className="border border-hairline-strong bg-paper text-ink-muted-2 font-editorial-mono text-[9px] px-1.5 py-0.5 uppercase tracking-widest ml-1 rounded-full">
                  Dashboard
                </span>
              </span>
              <span className="text-[10px] text-ink-muted-2 font-editorial-mono tracking-wider">
                Academic Document Hub
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleThemeMode}
              className="px-3 py-1.5 bg-paper hover:bg-paper-deep text-ink-muted-2 border border-hairline-strong font-bold text-xs flex items-center space-x-1.5 hover:text-ink transition-colors rounded-md"
              title={activeThemeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {activeThemeMode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-ink" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-ink" />
              )}
              <span className="hidden sm:inline text-[11px] font-editorial-mono">
                {activeThemeMode === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            <button
              onClick={onOpenThemeSelector}
              className="px-3 py-1.5 bg-paper hover:bg-paper-deep text-ink-muted-2 border border-hairline-strong font-bold text-xs flex items-center space-x-1.5 hover:text-ink transition-colors rounded-md"
              title="Change Workspace Theme"
            >
              <Palette className="w-3.5 h-3.5 text-ink" />
              <span className="hidden sm:inline text-[11px] font-editorial-mono">{activeThemeObj.name}</span>
            </button>

            <button
              onClick={onGoHome}
              className="px-3 py-1.5 bg-paper hover:bg-paper-deep text-ink-muted-2 border border-hairline-strong font-bold text-xs uppercase tracking-wider hover:text-ink transition-colors rounded-md"
            >
              Home Page
            </button>

            <div className="h-5 w-px bg-hairline hidden sm:block" />

            {/* User Badge Dropdown — Settings & Log Out under the profile */}
            <div className="relative pl-1">
              <button
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                className="flex items-center space-x-2 hover:bg-paper px-2 py-1 transition-colors"
                title="Account Menu"
              >
                <UserAvatar name={user.name} email={user.avatarUrl || user.email} size={32} />
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-ink leading-tight">{user.name}</span>
                  <span className="text-[9px] font-editorial-mono text-ink-muted-2">{user.role}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-ink-muted-2 transition-transform ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isUserMenuOpen && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />

                  <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-canvas border border-hairline-strong shadow-[0_8px_24px_rgba(0,0,0,0.12)] rounded-xl overflow-hidden">
                    {/* Profile Summary */}
                    <div className="p-3 border-b border-hairline">
                      <p className="text-xs font-bold text-ink truncate">{user.name}</p>
                      <p className="text-[10px] font-editorial-mono text-ink-muted-2 truncate">{user.email}</p>
                    </div>

                    {/* Menu Actions */}
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setActiveSection('settings');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-muted-2 hover:text-ink hover:bg-canvas flex items-center space-x-2 transition-colors text-left"
                      >
                        <SettingsIcon className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </button>

                      <button
                        onClick={onLogout}
                        className="w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-700 hover:bg-canvas flex items-center space-x-2 transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Section Tabs */}
      <div className="lg:hidden sticky top-16 z-30 bg-canvas border-b border-hairline">
        <div className="flex overflow-x-auto px-4">
          {NAV_SECTIONS.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 -mb-px flex items-center space-x-1.5 shrink-0 transition-colors ${
                  isActive
                    ? 'border-ink text-ink'
                    : 'border-transparent text-ink-muted-2 hover:text-ink'
                }`}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dashboard Container */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar — fixed height, independent internal scroll */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-hairline bg-paper">
          {/* Sidebar User Card */}
          <div className="p-4 border-b border-hairline flex items-center space-x-3">
            <UserAvatar name={user.name} email={user.avatarUrl || user.email} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink truncate">{user.name}</p>
              <p className="text-[10px] font-editorial-mono text-ink-muted-2 truncate">{user.role}</p>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV_SECTIONS.map(section => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center space-x-2.5 border transition-colors ${
                    isActive
                      ? 'bg-ink text-canvas border-ink'
                      : 'bg-transparent text-ink-muted-2 border-transparent hover:bg-canvas hover:text-ink'
                  }`}
                >
                  {section.icon}
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.id === 'projects' && (
                    <span
                      className={`text-[9px] font-editorial-mono px-1.5 py-0.5 border ${
                        isActive
                          ? 'bg-canvas text-ink border-canvas'
                          : 'bg-canvas border-ink/20 text-ink-muted-2'
                      }`}
                    >
                      {projects.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer: Sync Status + Sign Out */}
          <div className="p-3 border-t border-hairline space-y-2">
            <div className="flex items-center justify-between text-[9px] font-editorial-mono uppercase tracking-widest">
              <span className="text-ink-muted-2">Cloud Sync</span>
              <span className={isCloudUser ? 'text-ink font-bold' : 'text-ink-muted-2'}>
                {isCloudUser ? 'Connected' : 'Local'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-2 bg-canvas border border-hairline-strong hover:bg-ink hover:text-canvas hover:border-ink text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors rounded-md"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area — scrolls independently; header/sidebar/footer stay fixed */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {activeSection === 'overview' && (
              <>
                {/* User Banner Greeting & Quick Stats */}
                <div className="bg-paper border border-hairline p-6 relative overflow-hidden rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center space-x-2 border border-hairline-strong bg-canvas px-2.5 py-0.5 text-[10px] font-editorial-mono text-ink-muted-2 uppercase tracking-widest rounded-full">
                <Sparkles className="w-3 h-3 text-ink" />
                <span>Verified Academic Author Workspace</span>
              </div>

              <h1 className="font-editorial text-2xl sm:text-3xl text-ink tracking-tight">
                Welcome back, {user.name}
              </h1>

              <p className="text-ink-muted text-xs sm:text-sm font-medium leading-relaxed">
                Manage your ordered research manuscripts, BibTeX citation files, and instant browser-based LaTeX workspace.
              </p>
            </div>

            {/* Quick Action Button — primary emerald */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                data-tour="new-project"
                onClick={onCreateNewProject}
                className="px-5 py-3 bg-primary hover:bg-primary-deep text-on-primary font-bold text-xs uppercase tracking-widest flex items-center space-x-2 transition-colors rounded-md"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Project (Auto Serial)</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-hairline text-xs font-editorial-mono">
            <div className="p-3 bg-canvas border border-hairline rounded-md">
              <div className="text-ink-muted-2 uppercase text-[10px] font-bold">Total Projects</div>
              <div className="font-editorial text-xl font-bold text-ink mt-1">
                #{String(projects.length).padStart(2, '0')}
              </div>
            </div>

            <div className="p-3 bg-canvas border border-hairline rounded-md">
              <div className="text-ink-muted-2 uppercase text-[10px] font-bold">TeX Compiler Engine</div>
              <div className="text-xs font-bold text-ink mt-2 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Parser-based Engine Ready</span>
              </div>
            </div>

            <div className="p-3 bg-canvas border border-hairline rounded-md">
              <div className="text-ink-muted-2 uppercase text-[10px] font-bold">Citation Library</div>
              <div className="text-xs font-bold text-ink mt-2">BibTeX DOI Lookup Active</div>
            </div>

            <div className="p-3 bg-canvas border border-hairline rounded-md">
              <div className="text-ink-muted-2 uppercase text-[10px] font-bold">Active Theme</div>
              <div className="text-xs font-bold text-ink mt-2">{activeThemeObj.name}</div>
            </div>
          </div>
        </div>

                {/* Recent Manuscripts (Overview) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-editorial text-lg text-ink uppercase tracking-wider flex items-center space-x-2">
                        <FolderPlus className="w-5 h-5 text-ink" />
                        <span>Recent Manuscripts</span>
                      </h3>
                      <p className="text-ink-muted-2 text-xs font-editorial-mono mt-0.5">
                        Your latest serial project workspaces — open or continue editing.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveSection('projects')}
                      className="px-3 py-1.5 bg-canvas border border-hairline-strong text-ink-muted-2 hover:text-ink hover:border-ink text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors rounded-md"
                    >
                      <span>All Projects</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {indexedProjects.slice(0, 3).map(proj => renderProjectCard(proj))}
                    {indexedProjects.length === 0 && (
                      <div className="md:col-span-2 lg:col-span-3 p-12 text-center bg-paper border border-hairline space-y-3 rounded-xl">
                        <FileText className="w-10 h-10 text-ink-muted-2 mx-auto" />
                        <p className="text-ink font-bold text-sm">No projects yet — create your first manuscript.</p>
                        <button
                          onClick={onCreateNewProject}
                          className="bg-primary hover:bg-primary-deep text-on-primary px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors rounded-md"
                        >
                          Create New Project
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Templates (Overview) */}
                <div className="space-y-4 pt-4 border-t border-hairline">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-editorial text-lg text-ink uppercase tracking-wider flex items-center space-x-2">
                        <BookOpen className="w-5 h-5 text-ink" />
                        <span>Academic Templates</span>
                      </h3>
                      <p className="text-ink-muted-2 text-xs font-editorial-mono mt-0.5">
                        Quick-start scaffolds for journal & thesis formatting.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveSection('templates')}
                      className="px-3 py-1.5 bg-canvas border border-hairline-strong text-ink-muted-2 hover:text-ink hover:border-ink text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors rounded-md"
                    >
                      <span>All Templates</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {STARTER_TEMPLATES.slice(0, 3).map(template => renderTemplateCard(template))}
                  </div>
                </div>
              </>
            )}

            {activeSection === 'projects' && (
              <>
                {/* PROJECT SERIAL MANAGEMENT SECTION */}
                <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-paper border border-hairline p-4 rounded-xl">
            <div>
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-ink" />
                <h2 className="font-editorial text-lg text-ink uppercase tracking-wider">
                  Serial Project Directory
                </h2>
                <span className="border border-hairline-strong bg-canvas text-ink-muted-2 px-2 py-0.5 text-[10px] font-editorial-mono font-bold rounded-full">
                  {filteredProjects.length} Projects
                </span>
              </div>
              <p className="text-ink-muted-2 text-xs font-editorial-mono mt-0.5">
                Every document maintains its exact project serial index (#01, #02, #03...) for systematic reference.
              </p>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-muted-2 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search project or #serial..."
                  className="bg-canvas border border-hairline-strong text-ink text-xs pl-8 pr-3 py-2 w-full sm:w-56 focus:outline-none focus:border-ink placeholder:text-ink-muted-2 font-editorial-mono rounded-md"
                />
              </div>

              {/* Serial Sort Dropdown */}
              <div className="flex items-center space-x-1.5 bg-canvas border border-hairline-strong px-2.5 py-1.5 text-xs font-editorial-mono text-ink-muted-2 rounded-md">
                <SlidersHorizontal className="w-3.5 h-3.5 text-ink" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-ink font-editorial-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="serial_asc" className="bg-canvas text-ink">
                    Sort: Serial # (01 → N)
                  </option>
                  <option value="serial_desc" className="bg-canvas text-ink">
                    Sort: Serial # (N → 01)
                  </option>
                  <option value="updated" className="bg-canvas text-ink">
                    Sort: Recently Updated
                  </option>
                  <option value="name" className="bg-canvas text-ink">
                    Sort: Name (A-Z)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Project List / Grid with Serial Numbers */}
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-paper border border-hairline space-y-3 rounded-xl">
              <FileText className="w-10 h-10 text-ink-muted-2 mx-auto" />
              <p className="text-ink font-bold text-sm">No projects matched your search criteria.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-ink hover:underline font-editorial-mono"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(proj => renderProjectCard(proj))}
            </div>
          )}
                </div>
              </>
            )}

            {activeSection === 'templates' && (
              <>
                {/* STARTER TEMPLATE SCAFFOLDS SECTION */}
                <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-editorial text-lg text-ink uppercase tracking-wider flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-ink" />
                <span>Create From Official Academic Templates</span>
              </h3>
              <p className="text-ink-muted-2 text-xs font-editorial-mono mt-0.5">
                Launch a pre-formatted manuscript scaffold with IEEE, ACM, or Thesis packages.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STARTER_TEMPLATES.map(template => renderTemplateCard(template))}
          </div>
                </div>
              </>
            )}

            {activeSection === 'settings' && (
              <DashboardSettings
                user={user}
                isCloudUser={isCloudUser}
                activeThemeId={activeThemeId}
                onSelectTheme={onSelectTheme}
                onOpenAiSettings={onOpenAiSettings}
                onOpenAbout={onOpenAbout}
              />
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-canvas border-t border-hairline py-2 text-ink-muted-2 text-xs font-editorial-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-editorial text-ink">TeXForge Workspace</span>
            <span>•</span>
            <span>Project Serials System (#01 - #{String(projects.length).padStart(2, '0')})</span>
          </div>
          <div>Logged in as {user.email}</div>
        </div>
      </footer>
    </div>
  );
};
