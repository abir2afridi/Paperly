import React, { useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { SettingsModal } from './components/SettingsModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { AuthPage, AuthUser } from './components/AuthPage';
import {
  isTauri,
  onMenuEvent,
  pickImportZip,
  pickExportZip,
} from './desktop/bridge';
import { loadProvidersFile } from './services/aiEngine';
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
  saveFilesChecked,
  fetchDrafts,
  upsertDraft,
  deleteDraft,
  fetchNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  fetchAccountExport,
} from './services/db';
import { getAvatarUrl } from './services/avatar';
import { validateZipImport, sanitizeProjectFilePath, fileTypeFromPath } from './services/zipSecurity';
import { downloadAccountArchive } from './services/accountExport';
import { supabase } from './services/supabase';
import { DraftRestoreModal } from './components/DraftRestoreModal';
import {
  CollabSession,
  CollabStatus,
  CollabUser,
  collabServerUrl,
  createCollabSession,
} from './services/collab';

import {
  Project,
  ProjectFile,
  CodeComment,
  CompilationResult,
  AIProviderConfig,
  ChatMessage,
  ActivityEvent,
  ProjectSnapshot,
  Template,
  SaveStatus,
  AppNotification,
} from './types';
import { WorkspaceView, WorkspaceMenuBridge } from './workspace/WorkspaceView';

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
  const autoCompileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCompileRef = useRef<() => void>(() => {});

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

  // ---- In-app notifications (§31): persisted + mark-as-read + realtime ----
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    fetchNotifications(currentUser.id).then(list => {
      if (!cancelled && list) setNotifications(list);
    });
    const unsubscribe = subscribeToNotifications(currentUser.id, n =>
      setNotifications(prev => (prev.some(x => x.id === n.id) ? prev : [n, ...prev]))
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser?.id]);

  const notify = useCallback(
    (n: { type: AppNotification['type']; title: string; body?: string; projectId?: string | null }) => {
      if (!currentUser?.id) return;
      createNotification({ userId: currentUser.id, type: n.type, title: n.title, body: n.body, projectId: n.projectId });
    },
    [currentUser?.id]
  );

  const handleAiTaskComplete = useCallback(
    (summary: string) => {
      notify({ type: 'ai_complete', title: 'AI generation complete', body: summary, projectId: project.id });
    },
    [notify, project.id]
  );

  const handleMarkNotificationRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n)));
    markNotificationRead(notificationId);
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (currentUser?.id) markAllNotificationsRead(currentUser.id);
  };

  // ---- Account data export (§29): GDPR-style ZIP from Settings -> Privacy ----
  const handleExportAccountData = useCallback(async (): Promise<boolean> => {
    if (!currentUser?.id) return false;
    try {
      const data = await fetchAccountExport(currentUser.id);
      if (!data) return false;
      await downloadAccountArchive(data);
      notify({ type: 'general', title: 'Account export ready', body: 'Your data archive has been downloaded.', projectId: null });
      return true;
    } catch (err) {
      console.error('[export] account export failed:', err);
      return false;
    }
  }, [currentUser?.id, notify]);

  // Autosave / Draft system (§41):
  // - Autosave ON: debounced persistence to project_files (interval configurable in Settings -> Editor)
  // - Autosave OFF: edits go to the drafts table only; Ctrl/Cmd+S commits to the real file
  // - Any failed save keeps content in the drafts table and retries
  const AUTOSAVE_ENABLED_KEY = 'paperly.autosaveEnabled';
  const AUTOSAVE_INTERVAL_KEY = 'paperly.autosaveIntervalMs';
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [autosaveIntervalMs, setAutosaveIntervalMs] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(AUTOSAVE_INTERVAL_KEY));
      return [2000, 5000, 10000, 30000].includes(v) ? v : 5000;
    } catch {
      return 5000;
    }
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Pending edits are flushed immediately on project switch / logout / tab close
  const pendingSaveRef = useRef<{ projectId: string; changed: ProjectFile[]; meta: { name: string; description: string; compiler: string; bib_tool: string; main_file: string; auto_compile: boolean; is_public: boolean } } | null>(null);
  const prevProjectIdRef = useRef<string | null>(null);
  // Unsaved edits per file when autosave is OFF (path -> content), debounced to the drafts table
  const dirtyDraftsRef = useRef<Map<string, string>>(new Map());
  const draftFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushDirtyDrafts = useCallback(async () => {
    const entries = [...dirtyDraftsRef.current.entries()];
    if (entries.length === 0) return;
    dirtyDraftsRef.current.clear();
    await Promise.all(entries.map(([path, content]) => upsertDraft(project.id, path, content)));
  }, [project.id]);

  const flushPendingSave = useCallback(() => {
    const pending = pendingSaveRef.current;
    if (!pending || pending.changed.length === 0) return;
    saveFiles(pending.projectId, pending.changed);
    pending.changed.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
    pendingSaveRef.current = null;
  }, []);

  // Debounced real-file persistence (autosave ON) with save-status + failure retry
  useEffect(() => {
    if (!currentUser?.id) return;
    const pending = {
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
    pendingSaveRef.current = pending;
    const timer = setTimeout(async () => {
      const p = pendingSaveRef.current;
      if (!p) return;
      pendingSaveRef.current = null;
      try {
        if (p.changed.length > 0) {
          if (autosaveEnabled) {
            setSaveStatus('saving');
            const ok = await saveFilesChecked(p.projectId, p.changed);
            if (ok) {
              p.changed.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
              setSaveStatus('saved');
            } else {
              setSaveStatus('failed');
              notify({ type: 'save_error', title: 'Save failed — kept as draft', body: `Changed files in "${p.projectId === project.id ? project.name : 'this project'}" could not be saved and will retry.`, projectId: p.projectId });
              retryTimerRef.current = setTimeout(() => {
                const again = pendingSaveRef.current;
                if (again && again.changed.length > 0) {
                  saveFiles(again.projectId, again.changed);
                  again.changed.forEach(f => savedFileContents.current.set(f.id, f.content || ''));
                  pendingSaveRef.current = null;
                }
                setSaveStatus('saved');
              }, 5000);
            }
          } else {
            await flushDirtyDrafts();
          }
        }
        await updateProjectMeta(p.projectId, p.meta);
      } catch {
        setSaveStatus('failed');
        notify({ type: 'save_error', title: 'Save failed — kept as draft', body: 'Unexpected error while saving. Changes are preserved and will retry.', projectId: p.projectId });
      }
    }, autosaveIntervalMs);
    return () => {
      clearTimeout(timer);
      const prevId = prevProjectIdRef.current;
      prevProjectIdRef.current = project.id;
      if (prevId !== null && prevId !== project.id) {
        flushPendingSave();
      }
    };
  }, [project, currentUser?.id, autosaveEnabled, autosaveIntervalMs, flushDirtyDrafts, notify]);

  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingSave);
    return () => window.removeEventListener('beforeunload', flushPendingSave);
  }, [flushPendingSave]);

  // Manual save (Ctrl/Cmd+S or Save button): commit draft content to the real file
  const handleManualSave = useCallback(async () => {
    if (!currentUser?.id) return;
    const activeFile = project.files.find(f => f.path === activeFilePath);
    if (!activeFile) return;
    setSaveStatus('saving');
    const ok = await saveFilesChecked(project.id, [activeFile]);
    if (ok) {
      savedFileContents.current.set(activeFile.id, activeFile.content || '');
      dirtyDraftsRef.current.delete(activeFilePath);
      await deleteDraft(project.id, activeFilePath);
      setSaveStatus('saved');
    } else {
      dirtyDraftsRef.current.set(activeFilePath, activeFile.content || '');
      await flushDirtyDrafts();
      setSaveStatus('failed');
      notify({ type: 'save_error', title: 'Save failed — kept as draft', body: `${activeFilePath} could not be saved. Your changes are safe in the draft and will retry.`, projectId: project.id });
      retryTimerRef.current = setTimeout(() => {
        saveFiles(project.id, [activeFile]);
        setSaveStatus('saved');
      }, 5000);
    }
  }, [currentUser?.id, project, activeFilePath, flushDirtyDrafts, notify]);

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

  // Editor mode / terminal / panel states now live inside WorkspaceView.

  // AI Providers State
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);

  // Chat Messages (collaboration stream, cloud-backed when signed in)
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

  // Global Settings Modal (shared by workspace & dashboard)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Responsive layout + workspace panel toggles live inside WorkspaceView.

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

  // Bridge for desktop-menu events that target workspace-local actions
  // (compile, terminal toggle, AI drawer, shortcuts modal). Registered by
  // WorkspaceView while mounted; no-op on web or outside the workspace.
  const workspaceMenuBridgeRef = useRef<WorkspaceMenuBridge | null>(null);

  // Native desktop menu events (Tauri only; no-op on web)
  useEffect(() => {
    onMenuEvent(event => {
      switch (event.type) {
        case 'about':
          setIsAboutOpen(true);
          break;
        case 'export-zip':
          handleExportZip();
          break;
        case 'import-zip':
          handleImportZip();
          break;
        case 'compile':
        case 'toggle-pdf':
        case 'toggle-ai':
        case 'shortcuts':
          workspaceMenuBridgeRef.current?.handleMenuEvent(event);
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
    if (autoCompileTimerRef.current) clearTimeout(autoCompileTimerRef.current);
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

  latestCompileRef.current = handleCompile;

  // Cleanup pending auto-compile timer on unmount
  useEffect(() => {
    return () => {
      if (autoCompileTimerRef.current) clearTimeout(autoCompileTimerRef.current);
    };
  }, []);

  // Auto-compile on initial mount
  useEffect(() => {
    handleCompile();
  }, []);

  // Keyboard shortcuts moved into WorkspaceView (workspace-local actions).

  // Update File Content
  const handleFileContentChange = (newContent: string) => {
    setProject(prev => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      files: prev.files.map(f => (f.path === activeFilePath ? { ...f, content: newContent, sizeBytes: newContent.length } : f)),
    }));

    // Autosave OFF -> edits live only in the drafts table until a manual save
    if (!autosaveEnabled) {
      dirtyDraftsRef.current.set(activeFilePath, newContent);
      setSaveStatus('draft');
      if (draftFlushTimerRef.current) clearTimeout(draftFlushTimerRef.current);
      draftFlushTimerRef.current = setTimeout(() => {
        flushDirtyDrafts();
      }, 400);
    } else {
      setSaveStatus('saving');
    }

    // Auto-compile with debounce (Overleaf-style) when enabled
    if (project.autoCompile && currentView === 'workspace') {
      if (autoCompileTimerRef.current) clearTimeout(autoCompileTimerRef.current);
      autoCompileTimerRef.current = setTimeout(() => {
        latestCompileRef.current();
      }, 2000);
    }
  };

  // ---- Real-time collaboration (Yjs over WebSocket) ----
  const [collabSession, setCollabSession] = useState<CollabSession | null>(null);
  const [collabUsers, setCollabUsers] = useState<CollabUser[]>([]);
  const [collabStatus, setCollabStatus] = useState<CollabStatus>('idle');

  // Latest content of the active file, for de-duplicating collab round-trips
  // (Monaco onChange and the Yjs observer both report the same content).
  const activeFileContentRef = useRef<string>('');
  useEffect(() => {
    activeFileContentRef.current = project.files.find(f => f.path === activeFilePath)?.content ?? '';
  }, [project.files, activeFilePath]);

  const handleFileContentChangeRef = useRef(handleFileContentChange);
  useEffect(() => {
    handleFileContentChangeRef.current = handleFileContentChange;
  }, [handleFileContentChange]);

  // Draft restore prompt (§41): reopening a file with a newer draft than the last save
  const [restoreDraft, setRestoreDraft] = useState<{ filePath: string; content: string; updatedAt: string } | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    (async () => {
      const drafts = await fetchDrafts(project.id);
      if (cancelled || !drafts) return;
      const draft = drafts.find(
        d => d.file_path === activeFilePath && new Date(d.updated_at).getTime() > new Date(project.files.find(f => f.path === d.file_path)?.updatedAt ?? 0).getTime()
      );
      if (draft) {
        setRestoreDraft({ filePath: draft.file_path, content: draft.content, updatedAt: draft.updated_at });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, project.id, activeFilePath]);

  const handleRestoreDraft = () => {
    if (!restoreDraft) return;
    setProject(prev => ({
      ...prev,
      files: prev.files.map(f => (f.path === restoreDraft.filePath ? { ...f, content: restoreDraft.content } : f)),
    }));
    setSaveStatus(autosaveEnabled ? 'saving' : 'draft');
    dirtyDraftsRef.current.set(restoreDraft.filePath, restoreDraft.content);
    setRestoreDraft(null);
  };

  const handleDiscardDraft = () => {
    if (!restoreDraft) return;
    const { filePath } = restoreDraft;
    dirtyDraftsRef.current.delete(filePath);
    deleteDraft(project.id, filePath);
    setRestoreDraft(null);
  };

  useEffect(() => {
    collabSession?.destroy();
    setCollabSession(null);
    setCollabUsers([]);
    setCollabStatus('idle');

    const isCollabFile = /\.(tex|bib)$/i.test(activeFilePath);
    if (!currentUser?.id || !project?.id || !supabase || !isCollabFile) return;

    if (!collabServerUrl()) {
      setCollabStatus('idle');
      return;
    }

    let cancelled = false;
    let session: CollabSession | null = null;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled || !data.session?.access_token) return;
        session = createCollabSession({
          projectId: project.id,
          filePath: activeFilePath,
          token: data.session.access_token,
          userName: currentUser.name || currentUser.email || 'Collaborator',
          initialContent: activeFileContentRef.current,
          onContent: content => {
            // Local echoes arrive via Monaco onChange; only forward real
            // (remote or seed) changes to keep autosave/compile in sync.
            if (content === activeFileContentRef.current) return;
            activeFileContentRef.current = content;
            handleFileContentChangeRef.current(content);
          },
          onUsers: users => setCollabUsers(users),
          onStatus: status => setCollabStatus(status),
        });
        if (cancelled) {
          session.destroy();
          return;
        }
        setCollabSession(session);
      } catch {
        if (!cancelled) setCollabStatus('idle');
      }
    })();

    return () => {
      cancelled = true;
      session?.destroy();
    };
  }, [currentUser?.id, project?.id, activeFilePath]);

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
    const entries = Object.values(zip.files).map(entry => ({
      path: entry.name,
      isDirectory: entry.dir,
      uncompressedSize:
        typeof (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize === 'number'
          ? ((entry as unknown as { _data: { uncompressedSize: number } })._data.uncompressedSize as number)
          : 0,
      unixPermissions: typeof entry.unixPermissions === 'string' ? Number(entry.unixPermissions) : entry.unixPermissions,
    }));
    const validation = validateZipImport(entries);
    if (!validation.ok) {
      alert(`Cannot import ZIP: ${validation.reason}`);

      return;
    }

    const importedFiles: ProjectFile[] = [];

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      const safePath = sanitizeProjectFilePath(relativePath);
      if (!safePath) continue;
      const content = await zipEntry.async('string');

      importedFiles.push({
        id: `file-${Date.now()}-${Math.random()}`,
        projectId: project.id,
        path: safePath,
        type: fileTypeFromPath(safePath),
        content,
        sizeBytes: content.length,
        updatedAt: new Date().toISOString(),
      });
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

  // Send a chat message (cloud-backed when signed in; local echo for guests)
  const handleSendChatMessage = (body: string) => {
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
        <WorkspaceView
          project={project}
          activeFilePath={activeFilePath}
          onSelectFile={setActiveFilePath}
          isCompiling={isCompiling}
          compilationResult={compilationResult}
          onCompile={handleCompile}
          onUpdateProjectName={newName => setProject(prev => ({ ...prev, name: newName }))}
          currentUser={currentUser}
          onGoHome={() => setCurrentView(currentUser ? 'dashboard' : 'landing')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
          isAboutOpen={isAboutOpen}
          onCloseAbout={() => setIsAboutOpen(false)}
          activeTheme={activeTheme}
          activeCodeThemeId={activeCodeThemeId}
          onToggleThemeMode={handleToggleThemeMode}
          onExportZip={handleExportZip}
          onImportZip={handleImportZip}
          onNewProject={handleNewProject}
          providers={providers}
          onSetMainFile={handleSetMainFile}
          onCreateFile={handleCreateFile}
          onRenameFile={handleRenameFile}
          onDeleteFile={handleDeleteFile}
          onUpdateFileContent={handleFileContentChange}
          collab={collabSession}
          collabUsers={collabUsers}
          collabStatus={collabStatus}
          onInsertLatex={handleInsertLatex}
          onAppendBibtex={handleAppendBibtex}
          onSelectTemplate={handleSelectTemplate}
          comments={comments}
          onAddComment={handleAddComment}
          onToggleCommentResolve={handleToggleCommentResolve}
          onDeleteComment={handleDeleteComment}
          chatMessages={chatMessages}
          onSendChatMessage={handleSendChatMessage}
          activities={activityEvents}
          snapshots={snapshots}
          onCreateSnapshot={handleCreateSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          saveStatus={saveStatus}
          onManualSave={handleManualSave}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onAiTaskComplete={handleAiTaskComplete}
          menuBridgeRef={workspaceMenuBridgeRef}
        />
      )}

      {/* Global Settings Modal (AI Providers + Themes) — shared by workspace & dashboard */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        providers={providers}
        onRefreshProviders={refreshProviders}
        activeThemeId={activeThemeId}
        onSelectTheme={setActiveThemeId}
        autosaveEnabled={autosaveEnabled}
        autosaveIntervalMs={autosaveIntervalMs}
        onChangeAutosave={enabled => {
          setAutosaveEnabled(enabled);
          try {
            localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(enabled));
          } catch {
            /* ignore */
          }
        }}
        onChangeAutosaveInterval={ms => {
          setAutosaveIntervalMs(ms);
          try {
            localStorage.setItem(AUTOSAVE_INTERVAL_KEY, String(ms));
          } catch {
            /* ignore */
          }
        }}
        onExportAccountData={handleExportAccountData}
      />

      {/* Unsaved-draft restore prompt (§41) */}
      <DraftRestoreModal
        isOpen={restoreDraft !== null}
        filePath={restoreDraft?.filePath ?? ''}
        draftUpdatedAt={restoreDraft?.updatedAt ?? null}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
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
