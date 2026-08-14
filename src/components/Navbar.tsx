import React from 'react';
import {
  FileText,
  Play,
  Share2,
  Settings,
  Sparkles,
  BookOpen,
  Table,
  Sigma,
  History,
  MessageSquare,
  Download,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Palette,
  Sun,
  Moon,
  Home,
  Keyboard,
  Bell,
  CheckCheck,
  Sparkle,
  AlertTriangle,
  MessageSquareText,
  Mail,
  FileWarning,
  HelpCircle,
  FlaskConical,
} from 'lucide-react';
import { Project, CompilationResult, AppNotification } from '../types';

interface NavbarProps {
  project: Project;
  onUpdateProjectName: (newName: string) => void;
  onCompile: () => void;
  isCompiling: boolean;
  compilationResult: CompilationResult | null;
  onOpenSettings: () => void;
  onOpenThemeSelector: () => void;
  onOpenTemplates: () => void;
  onToggleThemeMode: () => void;
  activeThemeMode: 'light' | 'dark';
  onOpenDoiModal: () => void;
  onOpenMathPalette: () => void;
  onOpenTableEditor: () => void;
  onOpenHistory: () => void;
  onOpenShortcuts?: () => void;
  onOpenTour?: () => void;
  onOpenResearch?: () => void;
  onToggleAiPanel: () => void;
  isAiPanelOpen: boolean;
  onToggleChatPanel: () => void;
  isChatPanelOpen: boolean;
  onExportZip: () => void;
  onImportZip: () => void;
  onNewProject: () => void;
  onGoHome?: () => void;
  notifications?: AppNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  onUpdateProjectName,
  onCompile,
  isCompiling,
  compilationResult,
  onOpenSettings,
  onOpenThemeSelector,
  onOpenTemplates,
  onToggleThemeMode,
  activeThemeMode,
  onOpenDoiModal,
  onOpenMathPalette,
  onOpenTableEditor,
  onOpenHistory,
  onOpenShortcuts,
  onOpenTour,
  onOpenResearch,
  onToggleAiPanel,
  isAiPanelOpen,
  onToggleChatPanel,
  isChatPanelOpen,
  onExportZip,
  onImportZip,
  onNewProject,
  onGoHome,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(project.name);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  const notificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'ai_complete':
        return <Sparkle className="w-3.5 h-3.5 text-violet-600" />;
      case 'save_error':
        return <FileWarning className="w-3.5 h-3.5 text-rose-600" />;
      case 'mention':
        return <MessageSquareText className="w-3.5 h-3.5 text-blue-600" />;
      case 'invite':
      case 'review_request':
        return <Mail className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  React.useEffect(() => {
    setNameInput(project.name);
  }, [project.name]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateProjectName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-14 bg-white border-b-2 border-red-600 flex items-center justify-between px-3 select-none text-slate-800 shadow-xs z-20 sticky top-0 relative overflow-hidden">
      {/* Background Subtle Accent Pattern */}
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-20" />

      {/* Brand & Project Name */}
      <div className="flex items-center space-x-3 relative z-10">
        <button
          onClick={onGoHome}
          className="flex items-center space-x-2 bg-[#D11111] hover:bg-red-700 text-white px-3 py-1 font-black text-sm tracking-wider uppercase border border-red-700 shadow-2xs transition-colors"
          title="Return to Home Landing Page"
        >
          <Home className="w-4 h-4 text-white" />
          <span className="tracking-widest">TeXForge</span>
        </button>

        <div className="h-5 w-px bg-slate-300" />

        {isEditingName ? (
          <form onSubmit={handleNameSubmit} className="flex items-center">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleNameSubmit}
              autoFocus
              className="text-xs font-bold text-slate-900 border-2 border-[#D11111] bg-red-50/80 px-2 py-0.5 focus:outline-hidden"
            />
          </form>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="text-xs font-bold uppercase tracking-wide text-slate-800 hover:text-[#D11111] hover:bg-red-50/80 px-2 py-1 transition-colors flex items-center space-x-1.5"
            title="Click to rename project"
          >
            <span className="truncate max-w-[200px]">{project.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">({project.mainFile})</span>
          </button>
        )}

        <button
          onClick={onNewProject}
          className="text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-[#D11111] hover:bg-red-50 px-2 py-1 rounded-none border border-slate-200 hover:border-red-300 flex items-center space-x-1 transition-colors"
          title="Create New Project"
        >
          <Plus className="w-3.5 h-3.5 text-[#D11111]" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      {/* Main Action Bar (Compile & Status) */}
      <div className="flex items-center space-x-2 relative z-10">
        <button
          data-tour="compile"
          onClick={onCompile}
          disabled={isCompiling}
          className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-white transition-all shadow-xs ${
            isCompiling
              ? 'bg-red-400 cursor-not-allowed'
              : 'bg-[#D11111] hover:bg-black active:scale-98 border border-red-700'
          }`}
        >
          {isCompiling ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Compiling…</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current text-white" />
              <span>Compile</span>
            </>
          )}
        </button>

        {compilationResult && (
          <div className="hidden md:flex items-center space-x-1.5 text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-300 px-2.5 py-1">
            {compilationResult.status === 'success' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-800 font-bold uppercase tracking-wider text-[10px]">Ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-[#D11111]" />
                <span className="text-[#D11111] font-bold uppercase tracking-wider text-[10px]">
                  {compilationResult.diagnostics.length} Error{compilationResult.diagnostics.length > 1 ? 's' : ''}
                </span>
              </>
            )}
            <span className="text-slate-400 text-[10px]">({compilationResult.durationMs}ms)</span>
          </div>
        )}
      </div>

      {/* Auxiliary Tools & Modals */}
      <div className="flex items-center space-x-1 relative z-10">
        <button
          onClick={onOpenMathPalette}
          className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          title="Math Symbol Palette"
        >
          <Sigma className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenTableEditor}
          className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          title="Visual Table Generator"
        >
          <Table className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenDoiModal}
          className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          title="CrossRef DOI Citation Search"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenHistory}
          className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          title="Version History & Diff"
        >
          <History className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <button
          onClick={onExportZip}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Download Project ZIP"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onImportZip}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Import Overleaf / LaTeX ZIP"
        >
          <Upload className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenTemplates}
          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
        >
          Templates
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <button
          onClick={onToggleChatPanel}
          className={`p-1.5 transition-colors border ${
            isChatPanelOpen ? 'bg-red-50 border-red-300 text-[#D11111] font-bold' : 'border-transparent text-slate-600 hover:bg-slate-100'
          }`}
          title="Project Chat & Activity"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleAiPanel}
          className={`flex items-center space-x-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all border ${
            isAiPanelOpen
              ? 'bg-[#D11111] text-white border-red-800'
              : 'bg-red-50 text-[#D11111] border-red-200 hover:bg-red-100'
          }`}
          title="TeXForge AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-current" />
          <span className="hidden sm:inline">AI Helper</span>
        </button>

        <button
          onClick={onToggleThemeMode}
          className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          title={activeThemeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {activeThemeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        <button
          onClick={onOpenThemeSelector}
          className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
          title="Switch Workspace & Editor Theme"
        >
          <Palette className="w-4 h-4 text-[#D11111]" />
        </button>

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
            title="Keyboard Shortcuts Cheatsheet (Cmd/Ctrl + /)"
          >
            <Keyboard className="w-4 h-4 text-slate-700" />
          </button>
        )}

        {onOpenTour && (
          <button
            onClick={onOpenTour}
            className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
            title="Show onboarding tour"
          >
            <HelpCircle className="w-4 h-4 text-slate-700" />
          </button>
        )}

        {onOpenResearch && (
          <button
            onClick={onOpenResearch}
            className="p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
            title="Research assistant (PDF → literature review, Semantic Scholar, fact-check)"
          >
            <FlaskConical className="w-4 h-4 text-slate-700" />
          </button>
        )}

        {notifications && (
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              className="relative p-1.5 text-slate-600 hover:text-[#D11111] hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-[#D11111] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
                <div className="absolute right-0 top-9 z-40 w-80 bg-white border-2 border-slate-300 shadow-2xl">
                  <div className="flex items-center justify-between px-3 py-2 border-b-2 border-slate-200 bg-slate-50">
                    <span className="font-black uppercase tracking-wider text-[10px] text-slate-800">
                      Notifications{unreadCount > 0 ? ` (${unreadCount} new)` : ''}
                    </span>
                    <button
                      onClick={() => {
                        onMarkAllNotificationsRead?.();
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#D11111]"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 && (
                      <div className="p-6 text-center text-slate-400 text-[11px] font-mono">
                        No notifications yet.
                      </div>
                    )}
                    {notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead) onMarkNotificationRead?.(n.id);
                        }}
                        className={`w-full flex items-start space-x-2.5 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                          n.isRead ? 'opacity-60' : ''
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{notificationIcon(n.type)}</span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold text-slate-800 truncate">{n.title}</span>
                          {n.body && <span className="block text-[10px] text-slate-500 leading-snug truncate">{n.body}</span>}
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </span>
                        {!n.isRead && <span className="ml-auto mt-1.5 w-2 h-2 rounded-full bg-[#D11111] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Settings & AI Providers"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
