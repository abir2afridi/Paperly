/**
 * WorkspaceView — the main LaTeX editing workspace.
 *
 * Owns the workspace-local UI state (editor mode, panels, modals, terminal,
 * annotations) and keyboard/menu-event wiring, while domain state (project,
 * compilation, collaboration streams) and all project handlers live in App
 * and arrive here as props — mirroring how DashboardView is wired.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Code, Eye, PanelRight, PanelRightClose, BadgeCheck, PackageSearch } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { PublicationCheckModal } from '../components/PublicationCheckModal';
import { CtanPackageModal } from '../components/CtanPackageModal';
import { runPublicationCheck } from '../services/publicationCheck';
import { MonacoEditor, MonacoEditorApi } from '../components/MonacoEditor';
import { TerminalPanel } from '../components/TerminalPanel';
import { VisualRichTextEditor } from '../components/VisualRichTextEditor';
import { PdfViewer } from '../components/PdfViewer';
import { MathPalette } from '../components/MathPalette';
import { TableEditorModal } from '../components/TableEditorModal';
import { DoiImportModal } from '../components/DoiImportModal';
import { AiAssistantPanel } from '../components/AiAssistantPanel';
import { ChatAndActivity } from '../components/ChatAndActivity';
import { TemplatesModal } from '../components/TemplatesModal';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { ShortcutsModal } from '../components/ShortcutsModal';
import { AboutModal } from '../components/AboutModal';
import { parseBibtex } from '../services/bibParser';
import { MenuEventPayload } from '../desktop/bridge';
import { CollabStatus, CollabUser } from '../services/collab';
import { fetchAnnotations, addAnnotation } from '../services/db';
import type * as Y from 'yjs';
import {
  Project,
  ProjectFile,
  CodeComment,
  CompilationResult,
  AIProviderConfig,
  PdfAnnotation,
  ChatMessage,
  ActivityEvent,
  ProjectSnapshot,
  Template,
  SaveStatus,
  AppNotification,
} from '../types';
import { AuthUser } from '../components/AuthPage';
import { ThemeDefinition } from '../services/themeService';
import { CodeThemeId } from '../services/codeThemeService';

/** Bridge used by App's desktop-menu event handler to reach workspace-local actions. */
export interface WorkspaceMenuBridge {
  handleMenuEvent: (event: MenuEventPayload) => void;
}

interface WorkspaceViewProps {
  project: Project;
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  isCompiling: boolean;
  compilationResult: CompilationResult | null;
  onCompile: () => void;
  onUpdateProjectName: (name: string) => void;
  currentUser: AuthUser | null;
  onGoHome: () => void;
  onOpenSettings: () => void;
  onOpenThemeSelector: () => void;
  isAboutOpen: boolean;
  onCloseAbout: () => void;
  activeTheme: ThemeDefinition;
  activeCodeThemeId: CodeThemeId;
  onToggleThemeMode: () => void;
  onExportZip: () => void;
  onImportZip: () => void;
  onNewProject: () => void;
  providers: AIProviderConfig[];
  onSetMainFile: (path: string) => void;
  onCreateFile: (path: string, type: ProjectFile['type']) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
  onUpdateFileContent: (content: string) => void;
  onInsertLatex: (snippet: string) => void;
  onInsertPackage: (name: string) => void;
  onAppendBibtex: (bibtex: string, citeKey: string) => void;
  onSelectTemplate: (template: Template) => void;
  collab?: { doc: Y.Doc; awareness: unknown } | null;
  collabUsers: CollabUser[];
  collabStatus: CollabStatus;
  comments: CodeComment[];
  onAddComment: (comment: { filePath: string; anchorLine?: number; authorName: string; body: string }) => void;
  onToggleCommentResolve: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  chatMessages: ChatMessage[];
  onSendChatMessage: (body: string) => void;
  activities: ActivityEvent[];
  snapshots: ProjectSnapshot[];
  onCreateSnapshot: (title: string) => void;
  onRestoreSnapshot: (snapshot: ProjectSnapshot) => void;
  saveStatus: SaveStatus;
  onManualSave: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onAiTaskComplete: (summary: string) => void;
  menuBridgeRef: React.MutableRefObject<WorkspaceMenuBridge | null>;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  project,
  activeFilePath,
  onSelectFile,
  isCompiling,
  compilationResult,
  onCompile,
  onUpdateProjectName,
  currentUser,
  onGoHome,
  onOpenSettings,
  onOpenThemeSelector,
  isAboutOpen,
  onCloseAbout,
  activeTheme,
  activeCodeThemeId,
  onToggleThemeMode,
  onExportZip,
  onImportZip,
  onNewProject,
  providers,
  onSetMainFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onUpdateFileContent,
  onInsertLatex,
  onInsertPackage,
  onAppendBibtex,
  onSelectTemplate,
  collab,
  collabUsers,
  collabStatus,
  comments,
  onAddComment,
  onToggleCommentResolve,
  onDeleteComment,
  chatMessages,
  onSendChatMessage,
  activities,
  snapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  saveStatus,
  onManualSave,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onAiTaskComplete,
  menuBridgeRef,
}) => {
  // Editor Mode State (Code vs Visual AST)
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');

  // Terminal / Diagnostic Log Panel State
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const editorApiRef = useRef<MonacoEditorApi | null>(null);

  // Publication Readiness Check (plan §44)
  const [isPubCheckOpen, setIsPubCheckOpen] = useState(false);
  const pubCheckFindings = useMemo(
    () => runPublicationCheck(project.mainFile, project.files),
    [project.mainFile, project.files]
  );

  // Auto-expand the terminal panel when a compile produces errors
  useEffect(() => {
    if (compilationResult && compilationResult.diagnostics.some(d => d.severity === 'error')) {
      setIsTerminalOpen(true);
    }
  }, [compilationResult]);

  // Jump the Monaco editor to a specific file + line from the diagnostics panel
  const handleJumpToLine = useCallback(
    (file: string, line: number) => {
      if (file && file !== activeFilePath) {
        onSelectFile(file);
      }
      if (editorMode !== 'code') {
        setEditorMode('code');
      }
      // Give the editor a moment to mount/switch before jumping
      setTimeout(() => editorApiRef.current?.jumpToLine(line), 80);
    },
    [activeFilePath, editorMode, onSelectFile]
  );

  // Annotations on the PDF preview (persisted to Supabase when signed in, §23)
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (currentUser && project?.id) {
      fetchAnnotations(project.id).then(list => {
        if (!cancelled && list) setAnnotations(list);
      });
    } else {
      setAnnotations([]);
    }
    return () => {
      cancelled = true;
    };
  }, [currentUser, project?.id]);

  const handleAddAnnotation = useCallback(
    async (ann: Omit<PdfAnnotation, 'id' | 'createdAt'>) => {
      const local: PdfAnnotation = {
        ...ann,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setAnnotations(prev => [...prev, local]);
      if (currentUser && project?.id) {
        const saved = await addAnnotation({ projectId: project.id, ...ann });
        if (saved) {
          setAnnotations(prev => prev.map(a => (a.id === local.id ? saved : a)));
        }
      }
    },
    [currentUser, project?.id]
  );

  // Panels & Modals Toggles
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isMathPaletteOpen, setIsMathPaletteOpen] = useState(false);
  const [isCtanPaletteOpen, setIsCtanPaletteOpen] = useState(false);
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [isDoiModalOpen, setIsDoiModalOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Responsive layout: collapsed sidebar + PDF panel visibility
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('texforge.sidebarCollapsed');
      if (saved !== null) return saved === 'true';
    } catch {
      /* ignore */
    }
    return window.innerWidth < 1200;
  });
  const [isPdfPanelOpen, setIsPdfPanelOpen] = useState<boolean>(() => window.innerWidth >= 1200);

  useEffect(() => {
    try {
      localStorage.setItem('texforge.sidebarCollapsed', String(isSidebarCollapsed));
    } catch {
      /* ignore */
    }
  }, [isSidebarCollapsed]);

  // Auto-collapse sidebar + hide PDF preview on narrow windows
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1199px)');
    const handleChange = (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) {
        setIsSidebarCollapsed(true);
        setIsPdfPanelOpen(false);
      } else {
        setIsPdfPanelOpen(true);
      }
    };
    handleChange(mq);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Active File object + parsed BibTeX entries for autocomplete
  const activeFile = project.files.find(f => f.path === activeFilePath) || project.files[0];
  const bibFile = project.files.find(f => f.path.endsWith('.bib'));
  const bibEntries = bibFile && bibFile.content ? parseBibtex(bibFile.content) : [];

  // Route desktop-menu events that target workspace-local actions
  useEffect(() => {
    menuBridgeRef.current = {
      handleMenuEvent: event => {
        switch (event.type) {
          case 'compile':
            onCompile();
            break;
          case 'toggle-pdf':
            setIsTerminalOpen(prev => !prev);
            break;
          case 'toggle-ai':
            setIsAiPanelOpen(prev => !prev);
            break;
          case 'shortcuts':
            setIsShortcutsOpen(prev => !prev);
            break;
          default:
            break;
        }
      },
    };
    return () => {
      menuBridgeRef.current = null;
    };
  }, [onCompile, menuBridgeRef]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + / -> Cheatsheet Modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
      // Cmd/Ctrl + Enter -> Compile
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onCompile();
      }
      // Cmd/Ctrl + S -> Manual save (commit draft to the real file)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onManualSave();
      }
      // Cmd/Ctrl + M -> Math Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMathPaletteOpen(prev => !prev);
      }
      // Cmd/Ctrl + Shift + P -> CTAN Package Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCtanPaletteOpen(prev => !prev);
      }
      // Cmd/Ctrl + K -> AI Assistant
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsAiPanelOpen(prev => !prev);
      }
      // Cmd/Ctrl + H -> Version History
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsHistoryOpen(prev => !prev);
      }
      // Cmd/Ctrl + Shift + D -> DOI Citation Search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDoiModalOpen(prev => !prev);
      }
      // Cmd/Ctrl + Shift + T -> Table Generator
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setIsTableEditorOpen(prev => !prev);
      }
      // Cmd/Ctrl + Shift + C -> Team Discussion Stream
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsChatPanelOpen(prev => !prev);
      }
      // Cmd/Ctrl + B -> Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
      // Cmd/Ctrl + J -> Toggle Terminal Panel (VS Code style)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCompile, onManualSave]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans">
      {/* Red & White Navigation Bar */}
      <Navbar
        project={project}
        onUpdateProjectName={onUpdateProjectName}
        onCompile={onCompile}
        isCompiling={isCompiling}
        compilationResult={compilationResult}
        onOpenSettings={onOpenSettings}
        onOpenThemeSelector={onOpenThemeSelector}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onToggleThemeMode={onToggleThemeMode}
        activeThemeMode={activeTheme.mode}
        onOpenDoiModal={() => setIsDoiModalOpen(true)}
        onOpenMathPalette={() => setIsMathPaletteOpen(true)}
        onOpenTableEditor={() => setIsTableEditorOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
        isAiPanelOpen={isAiPanelOpen}
        onToggleChatPanel={() => setIsChatPanelOpen(!isChatPanelOpen)}
        isChatPanelOpen={isChatPanelOpen}
        onExportZip={onExportZip}
        onImportZip={onImportZip}
        onNewProject={onNewProject}
        onGoHome={onGoHome}
        notifications={notifications}
        onMarkNotificationRead={onMarkNotificationRead}
        onMarkAllNotificationsRead={onMarkAllNotificationsRead}
      />

      {/* Main Split Workspace */}
      <div
        className={`${
          isTerminalMaximized ? 'hidden' : 'flex-1'
        } flex overflow-hidden relative`}
      >
        {/* Left Sidebar File Explorer */}
        <Sidebar
          files={project.files}
          activeFilePath={activeFilePath}
          mainFilePath={project.mainFile}
          onSelectFile={onSelectFile}
          onSetMainFile={onSetMainFile}
          onCreateFile={onCreateFile}
          onRenameFile={onRenameFile}
          onDeleteFile={onDeleteFile}
          onFileUpload={() => {}}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          userName={currentUser?.name}
          comments={currentUser ? comments : undefined}
          onAddComment={currentUser ? onAddComment : undefined}
          onToggleResolveComment={currentUser ? onToggleCommentResolve : undefined}
          onDeleteComment={currentUser ? onDeleteComment : undefined}
          chatMessages={currentUser ? chatMessages : undefined}
          onSendChatMessage={currentUser ? onSendChatMessage : undefined}
          activities={currentUser ? activities : undefined}
          snapshots={currentUser ? snapshots : undefined}
          onCreateSnapshot={currentUser ? onCreateSnapshot : undefined}
          onRestoreSnapshot={onRestoreSnapshot}
          activeFileContent={activeFile?.content || ''}
        />

        {/* Center Monaco LaTeX Editor / Visual Rich Text Editor */}
        <main className="flex-1 min-w-0 h-full relative overflow-hidden bg-white flex flex-col">
          {/* Editor Sub-header Mode Switcher & Workspace Theme Selector */}
          <div className="h-8 bg-slate-100 border-b-2 border-slate-200 flex items-center justify-between px-3 text-[10px] font-bold select-none">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setEditorMode('code')}
                className={`px-2.5 py-1 flex items-center space-x-1 uppercase tracking-wider transition-colors ${
                  editorMode === 'code'
                    ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Code Source</span>
              </button>
              <button
                onClick={() => setEditorMode('visual')}
                className={`px-2.5 py-1 flex items-center space-x-1 uppercase tracking-wider transition-colors ${
                  editorMode === 'visual'
                    ? 'bg-white text-[#D11111] border-b-2 border-[#D11111] font-black'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Visual AST Mode</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 font-mono text-slate-500 font-normal">
              {compilationResult?.wordCount !== undefined && (
                <span className="hidden md:inline text-[10px] bg-slate-200 px-1.5 py-0.5 rounded" title="Word count (LaTeX body)">
                  {compilationResult.wordCount.toLocaleString()} words
                </span>
              )}
              <span className="hidden sm:inline truncate">{activeFilePath}</span>
              <span
                className={`hidden lg:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : saveStatus === 'saving'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : saveStatus === 'draft'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
                title="Save state"
              >
                {saveStatus === 'saved' ? (
                  'Saved'
                ) : saveStatus === 'saving' ? (
                  'Saving…'
                ) : saveStatus === 'draft' ? (
                  'Draft (unsaved)'
                ) : (
                  'Save failed — retrying'
                )}
              </span>
              <button
                onClick={onManualSave}
                disabled={saveStatus === 'saved'}
                className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-slate-300 text-slate-600 hover:border-[#D11111] hover:text-[#D11111] disabled:opacity-40 disabled:pointer-events-none"
                title="Save file now (Ctrl/Cmd+S)"
              >
                Save
              </button>
              {collab && (
                <div className="hidden md:flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      collabStatus === 'connected'
                        ? 'bg-emerald-500'
                        : collabStatus === 'connecting'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500">
                    {collabStatus === 'connected'
                      ? collabUsers.length > 0
                        ? `${collabUsers.length} online`
                        : 'Live'
                      : collabStatus === 'connecting'
                      ? 'Connecting…'
                      : 'Offline — local changes only'}
                  </span>
                  {collabUsers.slice(0, 5).map(u => (
                    <span
                      key={u.clientId}
                      title={u.name}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: u.color }}
                    />
                  ))}
                </div>
              )}
              <div className="hidden sm:block h-3.5 w-px bg-slate-300" />
              <button
                onClick={() => setIsCtanPaletteOpen(true)}
                className="p-1 border border-slate-300 text-slate-500 hover:text-[#D11111] hover:bg-red-50 transition-colors"
                title="CTAN Package Palette (Ctrl/Cmd+Shift+P)"
              >
                <PackageSearch className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPubCheckOpen(true)}
                className="p-1 border border-slate-300 text-slate-500 hover:text-[#D11111] hover:bg-red-50 transition-colors"
                title="Publication Readiness Check"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPdfPanelOpen(prev => !prev)}
                className={`p-1 border transition-colors ${
                  isPdfPanelOpen
                    ? 'text-[#D11111] border-red-200 bg-red-50'
                    : 'text-slate-500 border-slate-300 hover:text-[#D11111] hover:bg-red-50'
                }`}
                title={isPdfPanelOpen ? 'Hide PDF Preview' : 'Show PDF Preview'}
              >
                {isPdfPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {/* Both editors stay mounted; visibility toggles with CSS so the
                Monaco instance is never re-created (avoids repeated loading
                every time the user switches Code Source / Visual AST Mode). */}
            <div className={editorMode === 'code' ? 'h-full' : 'hidden'}>
              <MonacoEditor
                content={activeFile?.content || ''}
                onChange={onUpdateFileContent}
                filePath={activeFilePath}
                bibEntries={bibEntries}
                diagnostics={compilationResult?.diagnostics || []}
                monacoThemeId={activeTheme.monacoThemeId}
                codeThemeId={activeCodeThemeId}
                apiRef={editorApiRef}
                onCompileRequest={onCompile}
                collab={collab}
              />
            </div>
            <div className={editorMode === 'visual' ? 'h-full' : 'hidden'}>
              <VisualRichTextEditor
                content={activeFile?.content || ''}
                onChange={onUpdateFileContent}
                onInsertLatex={onInsertLatex}
              />
            </div>
          </div>
        </main>

        {/* Right PDF.js Interactive Preview Panel */}
        <section className={`${isPdfPanelOpen ? 'flex' : 'hidden'} w-1/2 min-w-80 h-full relative shrink-0`}>
          <PdfViewer
            pdfDataUrl={compilationResult?.pdfDataUrl || null}
            diagnostics={compilationResult?.diagnostics || []}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onSyncTexJump={() => {
              setEditorMode('code');
            }}
          />
        </section>

        {/* Slide-out AI Helper Drawer */}
        <AiAssistantPanel
          isOpen={isAiPanelOpen}
          onClose={() => setIsAiPanelOpen(false)}
          diagnostics={compilationResult?.diagnostics || []}
          activeFileContent={activeFile?.content || ''}
          onApplyFix={fixedCode => {
            onUpdateFileContent(fixedCode);
            setIsAiPanelOpen(false);
            setTimeout(() => onCompile(), 100);
          }}
          onTaskComplete={onAiTaskComplete}
          providers={providers}
          onOpenSettings={() => {
            setIsAiPanelOpen(false);
            onOpenSettings();
          }}
        />

        {/* Slide-out Chat & Activity Drawer */}
        <ChatAndActivity
          isOpen={isChatPanelOpen}
          onClose={() => setIsChatPanelOpen(false)}
          messages={chatMessages}
          onSendMessage={onSendChatMessage}
          activities={activities}
        />
      </div>

      {/* Terminal / Diagnostic Log Panel */}
      <TerminalPanel
        result={compilationResult}
        isOpen={isTerminalOpen}
        onToggle={() => {
          if (isTerminalOpen) setIsTerminalMaximized(false);
          setIsTerminalOpen(prev => !prev);
        }}
        isMaximized={isTerminalMaximized}
        onToggleMaximize={() => setIsTerminalMaximized(prev => !prev)}
        activeFilePath={activeFilePath}
        onJumpToLine={handleJumpToLine}
      />

      {/* Modals & Dialog Windows */}
      <MathPalette
        isOpen={isMathPaletteOpen}
        onClose={() => setIsMathPaletteOpen(false)}
        onInsertLatex={onInsertLatex}
      />

      <CtanPackageModal
        isOpen={isCtanPaletteOpen}
        onClose={() => setIsCtanPaletteOpen(false)}
        onInsertPackage={onInsertPackage}
      />

      <TableEditorModal
        isOpen={isTableEditorOpen}
        onClose={() => setIsTableEditorOpen(false)}
        onInsertLatex={onInsertLatex}
      />

      <DoiImportModal
        isOpen={isDoiModalOpen}
        onClose={() => setIsDoiModalOpen(false)}
        onAppendBibtex={onAppendBibtex}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={onSelectTemplate}
      />

      <VersionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        snapshots={snapshots}
        onRestoreSnapshot={onRestoreSnapshot}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={onCloseAbout}
      />

      <PublicationCheckModal
        isOpen={isPubCheckOpen}
        onClose={() => setIsPubCheckOpen(false)}
        findings={pubCheckFindings}
      />
    </div>
  );
};
