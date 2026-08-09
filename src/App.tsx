import React, { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { Code, Eye, PanelRight, PanelRightClose } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MonacoEditor, MonacoEditorApi } from './components/MonacoEditor';
import { TerminalPanel } from './components/TerminalPanel';
import { VisualRichTextEditor } from './components/VisualRichTextEditor';
import { PdfViewer } from './components/PdfViewer';
import { MathPalette } from './components/MathPalette';
import { TableEditorModal } from './components/TableEditorModal';
import { DoiImportModal } from './components/DoiImportModal';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { SettingsModal } from './components/SettingsModal';
import { TemplatesModal } from './components/TemplatesModal';
import { ChatAndActivity } from './components/ChatAndActivity';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AboutModal } from './components/AboutModal';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { AuthPage, AuthUser } from './components/AuthPage';
import {
  isTauri,
  onMenuEvent,
  loadProvidersFile,
  pickImportZip,
  pickExportZip,
} from './desktop/bridge';
import {
  isDatabaseAvailable,
  getSessionUser,
  onAuthStateChange,
  signOutFromApp,
  fetchProjects,
  createProject,
  updateProjectMeta,
  deleteProjectFromDb,
  saveFiles,
  deleteFileFromDb,
  renameFileInDb,
  fetchChatMessages,
  sendChatMessage,
  fetchActivityEvents,
  recordActivity,
  fetchComments,
  addComment,
  setCommentResolved,
  deleteCommentFromDb,
  fetchSnapshots,
  createSnapshotInDb,
  subscribeToProjectChanges,
} from './services/db';
import { getAvatarUrl } from './services/avatar';

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
} from './types';

import { STARTER_TEMPLATES } from './data/templates';
import { compileLatexProject } from './services/latexCompiler';
import { parseBibtex } from './services/bibParser';
import {
  CodeThemeId,
  getStoredCodeThemeId,
  setStoredCodeThemeId,
} from './services/codeThemeService';
import {
  ThemeId,
  getStoredThemeId,
  setStoredThemeId,
  getThemeDefinition,
  getOppositeThemeId,
  applyThemeToDOM,
} from './services/themeService';

export default function App() {
  const initialTemplate = STARTER_TEMPLATES[0];

  // Navigation View State ('landing', 'auth', 'dashboard', 'workspace')
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'workspace'>('landing');

  // Auth User State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authPageMode, setAuthPageMode] = useState<'login' | 'signup'>('login');
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Restore Supabase session on app start + react to auth changes (e.g. other tabs / desktop menu)
  useEffect(() => {
    if (!isDatabaseAvailable()) return;
    let mounted = true;
    (async () => {
      const user = await getSessionUser();
      if (mounted && user) {
        setCurrentUser({
          id: user.id,
          name: user.displayName,
          email: user.email,
          role: user.academicRole,
          avatarUrl: user.avatarUrl || getAvatarUrl(user.email),
        });
        setCurrentView('dashboard');
      }
    })();
    const unsubscribe = onAuthStateChange(u => {
      if (!u) {
        setCurrentUser(null);
      } else {
        setCurrentUser({
          id: u.id,
          name: u.displayName,
          email: u.email,
          role: u.academicRole,
          avatarUrl: u.avatarUrl || getAvatarUrl(u.email),
        });
        // Landing on the auth page via OAuth redirect → move straight to the dashboard
        setCurrentView(prev => (prev === 'auth' ? 'dashboard' : prev));
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Theme Palette State
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(getStoredThemeId());
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [activeCodeThemeId, setActiveCodeThemeId] = useState<CodeThemeId>(getStoredCodeThemeId());

  useEffect(() => {
    const themeDef = getThemeDefinition(activeThemeId);
    applyThemeToDOM(themeDef);
    setStoredThemeId(activeThemeId);
  }, [activeThemeId]);

  const activeTheme = getThemeDefinition(activeThemeId);

  // Code palette selection ('match-theme' syncs code colors to the workspace theme)
  const handleSelectCodeTheme = (codeThemeId: CodeThemeId) => {
    setActiveCodeThemeId(codeThemeId);
    setStoredCodeThemeId(codeThemeId);
  };

  // Quick Light/Dark Mode Toggle (preserves chosen family only via modal)
  const handleToggleThemeMode = () => {
    setActiveThemeId(prev => getOppositeThemeId(prev));
  };

  // Initial Seed Projects with Explicit Serials (#01, #02, #03...)
  const seedProject1: Project = {
    id: 'project-serial-1',
    serialNumber: 1,
    name: 'Quantum Physics & WebAssembly LaTeX Engine',
    description: 'High-performance scientific manuscript formatted for IEEE Transactions.',
    ownerId: 'user-1',
    ownerName: 'Dr. Aris Thorne',
    compiler: 'PDFLATEX',
    bibTool: 'BIBTEX',
    mainFile: 'main.tex',
    autoCompile: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    files: [
      {
        id: 'file-1',
        projectId: 'project-serial-1',
        path: 'main.tex',
        type: 'TEX',
        content: initialTemplate.mainFileContent,
        sizeBytes: initialTemplate.mainFileContent.length,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file-2',
        projectId: 'project-serial-1',
        path: 'references.bib',
        type: 'BIB',
        content: initialTemplate.bibContent || '',
        sizeBytes: (initialTemplate.bibContent || '').length,
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const seedProject2: Project = {
    id: 'project-serial-2',
    serialNumber: 2,
    name: 'Neural Network Optimization Survey',
    description: 'Academic survey on gradient descent convergence in deep models.',
    ownerId: 'user-1',
    ownerName: 'Dr. Aris Thorne',
    compiler: 'XELATEX',
    bibTool: 'BIBTEX',
    mainFile: 'main.tex',
    autoCompile: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    files: [
      {
        id: 'file-2-1',
        projectId: 'project-serial-2',
        path: 'main.tex',
        type: 'TEX',
        content: STARTER_TEMPLATES[1].mainFileContent,
        sizeBytes: STARTER_TEMPLATES[1].mainFileContent.length,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file-2-2',
        projectId: 'project-serial-2',
        path: 'references.bib',
        type: 'BIB',
        content: STARTER_TEMPLATES[1].bibContent || '',
        sizeBytes: (STARTER_TEMPLATES[1].bibContent || '').length,
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const seedProject3: Project = {
    id: 'project-serial-3',
    serialNumber: 3,
    name: 'Doctoral Dissertation Manuscript',
    description: 'Comprehensive multi-chapter PhD thesis with automated bibliography indexing.',
    ownerId: 'user-1',
    ownerName: 'Dr. Aris Thorne',
    compiler: 'PDFLATEX',
    bibTool: 'BIBTEX',
    mainFile: 'main.tex',
    autoCompile: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    files: [
      {
        id: 'file-3-1',
        projectId: 'project-serial-3',
        path: 'main.tex',
        type: 'TEX',
        content: STARTER_TEMPLATES[2].mainFileContent,
        sizeBytes: STARTER_TEMPLATES[2].mainFileContent.length,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'file-3-2',
        projectId: 'project-serial-3',
        path: 'references.bib',
        type: 'BIB',
        content: STARTER_TEMPLATES[2].bibContent || '',
        sizeBytes: (STARTER_TEMPLATES[2].bibContent || '').length,
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const [projectsList, setProjectsList] = useState<Project[]>([seedProject1, seedProject2, seedProject3]);
  const [project, setProject] = useState<Project>(seedProject1);

  // Sync active project into projectsList
  useEffect(() => {
    setProjectsList(prev => {
      const idx = prev.findIndex(p => p.id === project.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = project;
        return copy;
      }
      return [project, ...prev];
    });
  }, [project]);

  const [activeFilePath, setActiveFilePath] = useState<string>('main.tex');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);

  // ---- Cloud sync (Supabase) plumbing ----
  const guestSeedProjects = [seedProject1, seedProject2, seedProject3];

  // Mirrors the last content persisted to the DB per file id (autosave only uploads changes)
  const savedFileContents = useRef<Map<string, string>>(new Map());
  const currentUserRef = useRef<AuthUser | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const buildProjectFromTemplate = (name: string, template: Template): Project => {
    const nextSerial = projectsList.length + 1;
    const projectId = `project-${Date.now()}`;
    return {
      id: projectId,
      serialNumber: nextSerial,
      name,
      description: `Academic ${template.category} scaffold.`,
      ownerId: currentUser ? currentUser.id : 'guest-1',
      ownerName: currentUser ? currentUser.name : 'Author',
      compiler: 'PDFLATEX',
      bibTool: 'BIBTEX',
      mainFile: 'main.tex',
      autoCompile: true,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: [
        {
          id: `file-${Date.now()}-1`,
          projectId,
          path: 'main.tex',
          type: 'TEX',
          content: template.mainFileContent,
          sizeBytes: template.mainFileContent.length,
          updatedAt: new Date().toISOString(),
        },
        ...(template.bibContent
          ? [
              {
                id: `file-${Date.now()}-2`,
                projectId,
                path: 'references.bib',
                type: 'BIB' as const,
                content: template.bibContent,
                sizeBytes: template.bibContent.length,
                updatedAt: new Date().toISOString(),
              },
            ]
          : []),
      ],
    };
  };

  // Load the user's projects from Supabase on sign-in; restore seeds for guests
  useEffect(() => {
    let cancelled = false;

    if (!currentUser?.id) {
      setProjectsList(guestSeedProjects);
      setProject(guestSeedProjects[0]);
      setActiveFilePath('main.tex');
      savedFileContents.current = new Map();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const dbProjects = await fetchProjects();
      if (cancelled) return;
      if (dbProjects === null) {
        // DB unreachable or migration not applied yet — keep the local guest view
        setProjectsList(guestSeedProjects);
        return;
      }
      if (dbProjects.length === 0) {
        // First sign-in: scaffold a starter paper from the default template
        const starter = buildProjectFromTemplate('My First LaTeX Paper', initialTemplate);
        const created = await createProject(starter, currentUser.id);
        if (!cancelled && created) {
          created.files.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
          setProjectsList([created]);
          setProject(created);
          setActiveFilePath(created.mainFile || 'main.tex');
        }
        return;
      }
      const isSeedProject =
        project.id.startsWith('project-serial-') ||
        project.id.startsWith('project-new-') ||
        project.id.startsWith('project-import-') ||
        project.id.startsWith('project-dup-');
      dbProjects.forEach(p => p.files.forEach(f => savedFileContents.current.set(f.id, f.content || '')));
      setProjectsList(dbProjects);
      if (isSeedProject) {
        setProject(dbProjects[0]);
        setActiveFilePath(dbProjects[0].mainFile || 'main.tex');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // Autosave: persist changed files + project metadata to Supabase (debounced)
  // Pending edits are flushed immediately on project switch / logout / tab close
  const pendingSaveRef = useRef<{ projectId: string; changed: ProjectFile[]; meta: { name: string; description: string; compiler: string; bib_tool: string; main_file: string; auto_compile: boolean; is_public: boolean } } | null>(null);
  const prevProjectIdRef = useRef<string | null>(null);

  const flushPendingSave = () => {
    const pending = pendingSaveRef.current;
    if (!pending || pending.changed.length === 0) return;
    saveFiles(pending.projectId, pending.changed);
    pending.changed.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
    pendingSaveRef.current = null;
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    pendingSaveRef.current = {
      projectId: project.id,
      changed: project.files.filter(f => savedFileContents.current.get(f.id) !== (f.content || '')),
      meta: {
        name: project.name,
        description: project.description || '',
        compiler: project.compiler,
        bib_tool: project.bibTool,
        main_file: project.mainFile,
        auto_compile: project.autoCompile,
        is_public: project.isPublic,
      },
    };
    const timer = setTimeout(async () => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      if (pending.changed.length > 0) {
        await saveFiles(pending.projectId, pending.changed);
        pending.changed.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
      }
      await updateProjectMeta(pending.projectId, pending.meta);
      pendingSaveRef.current = null;
    }, 1500);
    return () => {
      clearTimeout(timer);
      const prevId = prevProjectIdRef.current;
      prevProjectIdRef.current = project.id;
      if (prevId !== null && prevId !== project.id) {
        flushPendingSave();
      }
    };
  }, [project, currentUser?.id]);

  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingSave);
    return () => window.removeEventListener('beforeunload', flushPendingSave);
  }, []);

  // Load project-bound collaboration data (chat, activity, comments, snapshots)
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    (async () => {
      const [msgs, acts, cmts, snaps] = await Promise.all([
        fetchChatMessages(project.id),
        fetchActivityEvents(project.id),
        fetchComments(project.id),
        fetchSnapshots(project.id),
      ]);
      if (cancelled) return;
      if (msgs) setChatMessages(msgs);
      if (acts) setActivityEvents(acts);
      if (cmts) setComments(cmts);
      if (snaps) setSnapshots(snaps);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, project.id]);

  // Realtime: live chat / activity / comments for the open project
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = subscribeToProjectChanges(project.id, {
      onChatMessage: msg => setChatMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg])),
      onActivity: ev => setActivityEvents(prev => (prev.some(a => a.id === ev.id) ? prev : [ev, ...prev])),
      onComment: c => setComments(prev => (prev.some(x => x.id === c.id) ? prev : [...prev, c])),
    });
    return unsubscribe;
  }, [currentUser?.id, project.id]);

  // Editor Mode State (Code vs Visual AST)
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');

  // Terminal / Diagnostic Log Panel State
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const editorApiRef = useRef<MonacoEditorApi | null>(null);

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
        setActiveFilePath(file);
      }
      if (editorMode !== 'code') {
        setEditorMode('code');
      }
      // Give the editor a moment to mount/switch before jumping
      setTimeout(() => editorApiRef.current?.jumpToLine(line), 80);
    },
    [activeFilePath, editorMode]
  );

  // AI Providers State
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);

  // Annotations & Collaboration
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'chat-1',
      projectId: 'project-serial-1',
      authorName: 'Sophia Chen (Co-Author)',
      body: 'Welcome to TeXForge! Check out the live WASM compilation and serial project organization.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    {
      id: 'act-1',
      projectId: 'project-serial-1',
      actorName: 'Dr. Aris Thorne',
      type: 'FILE_CREATE',
      description: 'created main.tex and references.bib',
      timestamp: new Date().toISOString(),
    },
  ]);

  // Version Snapshots History
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([
    {
      id: 'snap-initial',
      projectId: 'project-serial-1',
      title: 'Initial Project Seed',
      createdAt: new Date().toISOString(),
      files: [
        { path: 'main.tex', content: initialTemplate.mainFileContent },
        { path: 'references.bib', content: initialTemplate.bibContent || '' },
      ],
    },
  ]);

  // Review Comments (cloud-backed when signed in, local state otherwise)
  const [comments, setComments] = useState<CodeComment[]>([]);

  // Panels & Modals Toggles
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isMathPaletteOpen, setIsMathPaletteOpen] = useState(false);
  const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
  const [isDoiModalOpen, setIsDoiModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // Active File object
  const activeFile = project.files.find(f => f.path === activeFilePath) || project.files[0];

  // Parsed BibTeX entries for autocomplete
  const bibFile = project.files.find(f => f.path.endsWith('.bib'));
  const bibEntries = bibFile && bibFile.content ? parseBibtex(bibFile.content) : [];

  // Fetch AI providers from backend (or the Tauri bridge on desktop)
  const refreshProviders = useCallback(async () => {
    try {
      if (isTauri()) {
        setProviders(await loadProvidersFile());
        return;
      }
      const res = await fetch('/api/ai/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch {
      // Backend error fallback
    }
  }, []);

  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  // Native desktop menu events (Tauri only; no-op on web)
  useEffect(() => {
    onMenuEvent(event => {
      switch (event.type) {
        case 'about':
          setIsAboutOpen(true);
          break;
        case 'shortcuts':
          setIsShortcutsOpen(true);
          break;
        case 'export-zip':
          handleExportZip();
          break;
        case 'import-zip':
          handleImportZip();
          break;
        case 'compile':
          handleCompile();
          break;
        case 'toggle-pdf':
          setIsTerminalOpen(prev => !prev);
          break;
        case 'toggle-ai':
          setIsAiPanelOpen(prev => !prev);
          break;
        case 'edit-undo':
        case 'edit-redo':
        case 'edit-cut':
        case 'edit-copy':
        case 'edit-paste': {
          const cmd = event.type.replace('edit-', '');
          const target = document.activeElement as HTMLElement | null;
          if (target && (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
            document.execCommand(cmd);
          } else {
            document.execCommand(cmd === 'undo' ? 'undo' : cmd === 'redo' ? 'redo' : cmd);
          }
          break;
        }
        default:
          break;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle LaTeX Compilation
  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    try {
      const result = await compileLatexProject({
        mainFilePath: project.mainFile,
        files: project.files,
        compiler: project.compiler,
        bibTool: project.bibTool,
      });

      setCompilationResult(result);

      // Record activity (cloud-backed when signed in)
      const activityEntry: ActivityEvent = {
        id: `act-${Date.now()}`,
        projectId: project.id,
        actorName: 'TeXForge Compiler',
        type: result.status === 'success' ? 'COMPILE_SUCCESS' : 'COMPILE_ERROR',
        description: result.status === 'success' ? 'Compilation succeeded in ' + result.durationMs + 'ms' : 'Compilation failed with errors',
        timestamp: new Date().toISOString(),
      };
      setActivityEvents(prev => [activityEntry, ...prev]);
      const u = currentUserRef.current;
      if (u) {
        recordActivity(project.id, u.id, u.name, activityEntry.type, activityEntry.description);
      }
    } finally {
      setIsCompiling(false);
    }
  }, [project]);

  // Auto-compile on initial mount
  useEffect(() => {
    handleCompile();
  }, []);

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
        handleCompile();
      }
      // Cmd/Ctrl + M -> Math Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMathPaletteOpen(prev => !prev);
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
  }, [handleCompile]);

  // Update File Content
  const handleFileContentChange = (newContent: string) => {
    setProject(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      files: prev.files.map(f => (f.path === activeFilePath ? { ...f, content: newContent, sizeBytes: newContent.length } : f)),
    }));
  };

  // Create File
  const handleCreateFile = (path: string, type: ProjectFile['type']) => {
    if (project.files.some(f => f.path === path)) return;

    const newFile: ProjectFile = {
      id: `file-${Date.now()}`,
      projectId: project.id,
      path,
      type,
      content: type === 'TEX' ? `% TeXForge LaTeX File: ${path}\n` : '',
      sizeBytes: 0,
      updatedAt: new Date().toISOString(),
    };

    setProject(prev => ({ ...prev, files: [...prev.files, newFile] }));
    setActiveFilePath(path);
    if (currentUser?.id) recordProjectActivity('FILE_CREATE', `created ${path}`);
  };

  // Delete File
  const handleDeleteFile = (path: string) => {
    if (project.files.length <= 1) return;
    setProject(prev => {
      const remaining = prev.files.filter(f => f.path !== path);
      let nextMain = prev.mainFile;
      if (prev.mainFile === path) {
        nextMain = remaining.find(f => f.path.endsWith('.tex'))?.path || remaining[0].path;
      }
      return { ...prev, files: remaining, mainFile: nextMain };
    });
    if (activeFilePath === path) {
      setActiveFilePath(project.files.find(f => f.path !== path)?.path || 'main.tex');
    }
    if (currentUser?.id) deleteFileFromDb(project.id, path);
    recordProjectActivity('FILE_DELETE', `deleted ${path}`);
  };

  // Rename File
  const handleRenameFile = (oldPath: string, newPath: string) => {
    setProject(prev => ({
      ...prev,
      mainFile: prev.mainFile === oldPath ? newPath : prev.mainFile,
      files: prev.files.map(f => (f.path === oldPath ? { ...f, path: newPath } : f)),
    }));
    if (activeFilePath === oldPath) setActiveFilePath(newPath);
    if (currentUser?.id) renameFileInDb(project.id, oldPath, newPath);
    recordProjectActivity('FILE_CREATE', `renamed ${oldPath} to ${newPath}`);
  };

  // Set Main File
  const handleSetMainFile = (path: string) => {
    setProject(prev => ({ ...prev, mainFile: path }));
  };

  // Insert LaTeX code snippet into active file
  const handleInsertLatex = (snippet: string) => {
    if (!activeFile || !activeFile.content) return;
    handleFileContentChange(activeFile.content + '\n' + snippet);
  };

  // Append CrossRef BibTeX Entry to .bib file
  const handleAppendBibtex = (bibtex: string, citeKey: string) => {
    let refsFile = project.files.find(f => f.path.endsWith('.bib'));

    if (!refsFile) {
      refsFile = {
        id: `file-${Date.now()}`,
        projectId: project.id,
        path: 'references.bib',
        type: 'BIB',
        content: '',
        sizeBytes: 0,
        updatedAt: new Date().toISOString(),
      };
      setProject(prev => ({ ...prev, files: [...prev.files, refsFile!] }));
    }

    const updatedContent = (refsFile.content ? refsFile.content + '\n\n' : '') + bibtex;

    setProject(prev => ({
      ...prev,
      files: prev.files.map(f => (f.path === refsFile!.path ? { ...f, content: updatedContent } : f)),
    }));
  };

  // Select Starter Template
  const handleSelectTemplate = async (template: Template) => {
    const newProject = buildProjectFromTemplate(`${template.name} Document`, template);

    if (currentUser?.id) {
      const created = await createProject(newProject, currentUser.id);
      if (created) {
        created.files.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
        setProjectsList(prev => [created, ...prev]);
        setProject(created);
        setActiveFilePath('main.tex');
        setCurrentView('workspace');
        setTimeout(() => handleCompile(), 100);
        return;
      }
    }

    setProjectsList(prev => [newProject, ...prev]);
    setProject(newProject);
    setActiveFilePath('main.tex');
    setCurrentView('workspace');
    setTimeout(() => handleCompile(), 100);
  };

  // Export Project as ZIP Archive
  const handleExportZip = async () => {
    const zip = new JSZip();
    project.files.forEach(f => {
      zip.file(f.path, f.content || '');
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const fileName = `project_serial_${String(project.serialNumber || 1).padStart(2, '0')}_${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.zip`;

    if (isTauri()) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      bytes.forEach(b => {
        binary += String.fromCharCode(b);
      });
      const dataBase64 = btoa(binary);
      const saved = await pickExportZip(dataBase64, fileName);
      if (!saved) return;
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    }
  };

  // Import Overleaf / LaTeX ZIP Archive
  const handleImportZip = async () => {
    if (isTauri()) {
      const picked = await pickImportZip();
      if (!picked) return;
      const binary = atob(picked.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      await importZipContent(bytes, picked.name.replace('.zip', ''));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      await importZipContent(await file.arrayBuffer(), file.name.replace('.zip', ''));
    };
    input.click();
  };

  const importZipContent = async (data: ArrayBuffer | Uint8Array, projectName: string) => {
    const zip = await JSZip.loadAsync(data);
    const importedFiles: ProjectFile[] = [];

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async('string');
        let type: ProjectFile['type'] = 'TEX';
        if (relativePath.endsWith('.bib')) type = 'BIB';
        else if (relativePath.endsWith('.cls')) type = 'CLS';
        else if (relativePath.endsWith('.sty')) type = 'STY';

        importedFiles.push({
          id: `file-${Date.now()}-${Math.random()}`,
          projectId: project.id,
          path: relativePath,
          type,
          content,
          sizeBytes: content.length,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (importedFiles.length > 0) {
      const nextSerial = projectsList.length + 1;
      const main = importedFiles.find(f => f.path.includes('main.tex'))?.path || importedFiles[0].path;
      const importedProject: Project = {
        id: `project-import-${Date.now()}`,
        serialNumber: nextSerial,
        name: projectName,
        description: 'Imported LaTeX ZIP project.',
        ownerId: currentUser ? currentUser.id : 'user-1',
        ownerName: currentUser ? currentUser.name : 'Author',
        compiler: 'PDFLATEX',
        bibTool: 'BIBTEX',
        mainFile: main,
        autoCompile: true,
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        files: importedFiles,
      };

      if (currentUser?.id) {
        const created = await createProject(importedProject, currentUser.id);
        if (created) {
          created.files.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
          setProjectsList(prev => [created, ...prev]);
          setProject(created);
          setActiveFilePath(created.mainFile || 'main.tex');
          setCurrentView('workspace');
          setTimeout(() => handleCompile(), 100);
          return;
        }
      }

      setProjectsList(prev => [importedProject, ...prev]);
      setProject(importedProject);
      setActiveFilePath(main);
      setCurrentView('workspace');
      setTimeout(() => handleCompile(), 100);
    }
  };

  // Launch Editor with template or project
  const handleLaunchEditor = (template?: Template, projectToOpen?: Project) => {
    if (projectToOpen) {
      setProject(projectToOpen);
      setActiveFilePath(projectToOpen.mainFile || 'main.tex');
      setCurrentView('workspace');
    } else if (template) {
      handleSelectTemplate(template);
    } else {
      setCurrentView('workspace');
    }
  };

  const handleDeleteProjectFromDashboard = (projectId: string) => {
    setProjectsList(prev => prev.filter(p => p.id !== projectId));
    if (project.id === projectId && projectsList.length > 1) {
      const remaining = projectsList.filter(p => p.id !== projectId);
      setProject(remaining[0]);
    }
    if (currentUser?.id) deleteProjectFromDb(projectId);
  };

  const handleDuplicateProject = (proj: Project) => {
    const nextSerial = projectsList.length + 1;
    const duplicated: Project = {
      ...proj,
      id: `project-dup-${Date.now()}`,
      serialNumber: nextSerial,
      name: `Copy of ${proj.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: proj.files.map(f => ({
        ...f,
        id: `file-dup-${Date.now()}-${Math.random()}`,
        projectId: `project-dup-${Date.now()}`,
      })),
    };
    if (currentUser?.id) {
      createProject(duplicated, currentUser.id).then(created => {
        if (created) {
          created.files.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
          setProjectsList(prev => [created, ...prev]);
        }
      });
      return;
    }
    setProjectsList(prev => [duplicated, ...prev]);
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjectsList(prev =>
      prev.map(p => (p.id === projectId ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p))
    );
    if (project.id === projectId) {
      setProject(prev => ({ ...prev, name: newName, updatedAt: new Date().toISOString() }));
    }
    if (currentUser?.id) updateProjectMeta(projectId, { name: newName });
  };

  // Create New Project
  const handleNewProject = async () => {
    const nextSerial = projectsList.length + 1;
    const newProj = buildProjectFromTemplate(
      `LaTeX Research Project #${String(nextSerial).padStart(2, '0')}`,
      initialTemplate
    );
    newProj.description = 'New academic LaTeX document workspace.';

    if (currentUser?.id) {
      const created = await createProject(newProj, currentUser.id);
      if (created) {
        created.files.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
        setProjectsList(prev => [created, ...prev]);
        setProject(created);
        setActiveFilePath('main.tex');
        setCurrentView('workspace');
        setTimeout(() => handleCompile(), 100);
        return;
      }
    }

    setProjectsList(prev => [newProj, ...prev]);
    setProject(newProj);
    setActiveFilePath('main.tex');
    setCurrentView('workspace');
    setTimeout(() => handleCompile(), 100);
  };

  // Restore Version Snapshot
  const handleRestoreSnapshot = (snapshot: ProjectSnapshot) => {
    const restoredFiles: ProjectFile[] = snapshot.files.map((sf, idx) => ({
      id: `file-restored-${idx}`,
      projectId: project.id,
      path: sf.path,
      type: sf.path.endsWith('.bib') ? 'BIB' : 'TEX',
      content: sf.content,
      sizeBytes: sf.content.length,
      updatedAt: new Date().toISOString(),
    }));

    setProject(prev => ({
      ...prev,
      files: restoredFiles,
      mainFile: restoredFiles.find(f => f.path.endsWith('.tex'))?.path || restoredFiles[0].path,
    }));

    setActiveFilePath(restoredFiles[0].path);
    const u = currentUserRef.current;
    if (u) recordActivity(project.id, u.id, u.name, 'VERSION_RESTORE', `restored snapshot "${snapshot.title}"`);
    setTimeout(() => handleCompile(), 100);
  };

  // Cloud-persist an activity event for the open project (no-op for guests)
  const recordProjectActivity = (type: ActivityEvent['type'], description: string) => {
    const u = currentUserRef.current;
    if (!u) return;
    recordActivity(project.id, u.id, u.name, type, description);
  };

  // Create a version snapshot (cloud-backed when signed in)
  const handleCreateSnapshot = (title: string) => {
    const snapshotFiles = project.files.map(f => ({ path: f.path, content: f.content || '' }));
    if (currentUser?.id) {
      createSnapshotInDb(project.id, title, snapshotFiles).then(created => {
        if (created) setSnapshots(prev => [created, ...prev]);
      });
      return;
    }
    setSnapshots(prev => [
      {
        id: `snap-${Date.now()}`,
        projectId: project.id,
        title,
        createdAt: new Date().toISOString(),
        files: snapshotFiles,
      },
      ...prev,
    ]);
  };

  // Review comments (cloud-backed when signed in)
  const handleAddComment = (comment: { filePath: string; anchorLine?: number; authorName: string; body: string }) => {
    if (!currentUser?.id) return;
    addComment({
      projectId: project.id,
      filePath: comment.filePath,
      anchorLine: comment.anchorLine,
      authorId: currentUser.id,
      authorName: comment.authorName,
      body: comment.body,
    }).then(created => {
      if (created) setComments(prev => [...prev, created]);
    });
    recordProjectActivity('COMMENT_ADD', `commented on ${comment.filePath}`);
  };

  const handleToggleCommentResolve = (commentId: string) => {
    const target = comments.find(c => c.id === commentId);
    if (!target) return;
    setComments(prev => prev.map(c => (c.id === commentId ? { ...c, resolved: !c.resolved } : c)));
    setCommentResolved(commentId, !target.resolved);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    deleteCommentFromDb(commentId);
  };

  // Open Auth Page
  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthPageMode(mode);
    setCurrentView('auth');
  };

  // On Login / Signup Success
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  // Logout
  const handleLogout = () => {
    flushPendingSave();
    signOutFromApp();
    setCurrentUser(null);
    setCurrentView('landing');
  };

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage
          currentUser={currentUser}
          onOpenAuth={handleOpenAuth}
          onGoToDashboard={() => setCurrentView('dashboard')}
          onLaunchEditor={handleLaunchEditor}
          onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
          activeThemeId={activeThemeId}
          activeThemeMode={activeTheme.mode}
          onToggleThemeMode={handleToggleThemeMode}
          projects={projectsList}
        />
      )}

      {currentView === 'dashboard' && (
        <DashboardView
          user={
            currentUser || {
              name: 'Guest Author',
              email: 'guest@texforge.local',
              role: 'Local Mode',
            }
          }
          projects={projectsList}
          isCloudUser={Boolean(currentUser)}
          onOpenProject={proj => handleLaunchEditor(undefined, proj)}
          onCreateNewProject={handleNewProject}
          onDeleteProject={handleDeleteProjectFromDashboard}
          onDuplicateProject={handleDuplicateProject}
          onRenameProject={handleRenameProject}
          onSelectTemplate={handleSelectTemplate}
          onLogout={handleLogout}
          onGoHome={() => setCurrentView('landing')}
          onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
          onOpenAiSettings={() => setIsSettingsOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
          onSelectTheme={setActiveThemeId}
          activeThemeId={activeThemeId}
          activeThemeMode={activeTheme.mode}
          onToggleThemeMode={handleToggleThemeMode}
        />
      )}

      {currentView === 'workspace' && (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans">
          {/* Red & White Navigation Bar */}
          <Navbar
            project={project}
            onUpdateProjectName={newName => setProject(prev => ({ ...prev, name: newName }))}
            onCompile={handleCompile}
            isCompiling={isCompiling}
            compilationResult={compilationResult}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onToggleThemeMode={handleToggleThemeMode}
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
            onExportZip={handleExportZip}
            onImportZip={handleImportZip}
            onNewProject={handleNewProject}
            onGoHome={() => setCurrentView(currentUser ? 'dashboard' : 'landing')}
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
              onSelectFile={path => setActiveFilePath(path)}
              onSetMainFile={handleSetMainFile}
              onCreateFile={handleCreateFile}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
              onFileUpload={() => {}}
              collapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
              userName={currentUser?.name}
              comments={currentUser ? comments : undefined}
              onAddComment={currentUser ? handleAddComment : undefined}
              onToggleResolveComment={currentUser ? handleToggleCommentResolve : undefined}
              onDeleteComment={currentUser ? handleDeleteComment : undefined}
              chatMessages={currentUser ? chatMessages : undefined}
              onSendChatMessage={
                currentUser
                  ? body => {
                      sendChatMessage(project.id, currentUser.id, currentUser.name, body).then(created => {
                        if (created) setChatMessages(prev => [...prev, created]);
                      });
                    }
                  : undefined
              }
              activities={currentUser ? activityEvents : undefined}
              snapshots={currentUser ? snapshots : undefined}
              onCreateSnapshot={currentUser ? handleCreateSnapshot : undefined}
              onRestoreSnapshot={handleRestoreSnapshot}
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
                  <span className="hidden sm:inline truncate">{activeFilePath}</span>
                  <div className="hidden sm:block h-3.5 w-px bg-slate-300" />
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
                    onChange={handleFileContentChange}
                    filePath={activeFilePath}
                    bibEntries={bibEntries}
                    diagnostics={compilationResult?.diagnostics || []}
                    monacoThemeId={activeTheme.monacoThemeId}
                    codeThemeId={activeCodeThemeId}
                    apiRef={editorApiRef}
                    onCompileRequest={handleCompile}
                  />
                </div>
                <div className={editorMode === 'visual' ? 'h-full' : 'hidden'}>
                  <VisualRichTextEditor
                    content={activeFile?.content || ''}
                    onChange={handleFileContentChange}
                    onInsertLatex={handleInsertLatex}
                  />
                </div>
              </div>
            </main>

            {/* Right PDF.js Interactive Preview Panel */}
            <section className={`${isPdfPanelOpen ? 'flex' : 'hidden'} w-1/2 min-w-80 h-full relative shrink-0`}>
              <PdfViewer
                pdfDataUrl={compilationResult?.pdfDataUrl || null}
                annotations={annotations}
                onAddAnnotation={ann => setAnnotations(prev => [...prev, { ...ann, id: `ann-${Date.now()}`, createdAt: new Date().toISOString() }])}
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
                handleFileContentChange(fixedCode);
                setIsAiPanelOpen(false);
                setTimeout(() => handleCompile(), 100);
              }}
              providers={providers}
              onOpenSettings={() => {
                setIsAiPanelOpen(false);
                setIsSettingsOpen(true);
              }}
            />

            {/* Slide-out Chat & Activity Drawer */}
            <ChatAndActivity
              isOpen={isChatPanelOpen}
              onClose={() => setIsChatPanelOpen(false)}
              messages={chatMessages}
              onSendMessage={body => {
                if (currentUser?.id) {
                  sendChatMessage(project.id, currentUser.id, currentUser.name, body).then(created => {
                    if (created) setChatMessages(prev => [...prev, created]);
                  });
                } else {
                  setChatMessages(prev => [
                    ...prev,
                    {
                      id: `chat-${Date.now()}`,
                      projectId: project.id,
                      authorName: 'You (Author)',
                      body,
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                }
              }}
              activities={activityEvents}
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
            onInsertLatex={handleInsertLatex}
          />

          <TableEditorModal
            isOpen={isTableEditorOpen}
            onClose={() => setIsTableEditorOpen(false)}
            onInsertLatex={handleInsertLatex}
          />

          <DoiImportModal
            isOpen={isDoiModalOpen}
            onClose={() => setIsDoiModalOpen(false)}
            onAppendBibtex={handleAppendBibtex}
          />

          <TemplatesModal
            isOpen={isTemplatesOpen}
            onClose={() => setIsTemplatesOpen(false)}
            onSelectTemplate={handleSelectTemplate}
          />

          <VersionHistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            snapshots={snapshots}
            onRestoreSnapshot={handleRestoreSnapshot}
          />

          <ShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />

          <AboutModal
            isOpen={isAboutOpen}
            onClose={() => setIsAboutOpen(false)}
          />
        </div>
      )}

      {/* Global Settings Modal (AI Providers + Themes) — shared by workspace & dashboard */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        providers={providers}
        onRefreshProviders={refreshProviders}
        activeThemeId={activeThemeId}
        onSelectTheme={setActiveThemeId}
      />

      {/* Auth Page for Login & Signup */}
      {currentView === 'auth' && (
        <AuthPage
          initialMode={authPageMode}
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setCurrentView('landing')}
        />
      )}

      {/* Theme Selector Modal accessible globally */}
      <ThemeSelectorModal
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
        activeThemeId={activeThemeId}
        onSelectTheme={setActiveThemeId}
        activeCodeThemeId={activeCodeThemeId}
        onSelectCodeTheme={handleSelectCodeTheme}
      />
    </>
  );
}
