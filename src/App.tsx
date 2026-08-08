import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { Code, Eye, Palette } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MonacoEditor } from './components/MonacoEditor';
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
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/AuthModal';

import {
  Project,
  ProjectFile,
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
  ThemeId,
  getStoredThemeId,
  setStoredThemeId,
  getThemeDefinition,
  getOppositeThemeId,
  applyThemeToDOM,
} from './services/themeService';

export default function App() {
  const initialTemplate = STARTER_TEMPLATES[0];

  // Navigation View State ('landing', 'dashboard', 'workspace')
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'workspace'>('landing');

  // Auth User State
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Theme Palette State
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(getStoredThemeId());
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  useEffect(() => {
    const themeDef = getThemeDefinition(activeThemeId);
    applyThemeToDOM(themeDef);
    setStoredThemeId(activeThemeId);
  }, [activeThemeId]);

  const activeTheme = getThemeDefinition(activeThemeId);

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

  // Editor Mode State (Code vs Visual AST)
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');

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

  // Active File object
  const activeFile = project.files.find(f => f.path === activeFilePath) || project.files[0];

  // Parsed BibTeX entries for autocomplete
  const bibFile = project.files.find(f => f.path.endsWith('.bib'));
  const bibEntries = bibFile && bibFile.content ? parseBibtex(bibFile.content) : [];

  // Fetch AI providers from backend
  const refreshProviders = useCallback(async () => {
    try {
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

      // Record activity
      setActivityEvents(prev => [
        {
          id: `act-${Date.now()}`,
          projectId: project.id,
          actorName: 'TeXForge Compiler',
          type: result.status === 'success' ? 'COMPILE_SUCCESS' : 'COMPILE_ERROR',
          description: result.status === 'success' ? 'Compilation succeeded in ' + result.durationMs + 'ms' : 'Compilation failed with errors',
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
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
  };

  // Rename File
  const handleRenameFile = (oldPath: string, newPath: string) => {
    setProject(prev => ({
      ...prev,
      mainFile: prev.mainFile === oldPath ? newPath : prev.mainFile,
      files: prev.files.map(f => (f.path === oldPath ? { ...f, path: newPath } : f)),
    }));
    if (activeFilePath === oldPath) setActiveFilePath(newPath);
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
  const handleSelectTemplate = (template: Template) => {
    const nextSerial = projectsList.length + 1;
    const newProject: Project = {
      id: `project-${Date.now()}`,
      serialNumber: nextSerial,
      name: `${template.name} Document`,
      description: `Academic ${template.category} scaffold.`,
      ownerId: currentUser ? 'user-1' : 'guest-1',
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
          projectId: `project-${Date.now()}`,
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
                projectId: `project-${Date.now()}`,
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_serial_${String(project.serialNumber || 1).padStart(2, '0')}_${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.zip`;
    a.click();
  };

  // Import Overleaf / LaTeX ZIP Archive
  const handleImportZip = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const zip = await JSZip.loadAsync(file);
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
          name: file.name.replace('.zip', ''),
          description: 'Imported LaTeX ZIP project.',
          ownerId: 'user-1',
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

        setProjectsList(prev => [importedProject, ...prev]);
        setProject(importedProject);
        setActiveFilePath(main);
        setCurrentView('workspace');
        setTimeout(() => handleCompile(), 100);
      }
    };
    input.click();
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
    };
    setProjectsList(prev => [duplicated, ...prev]);
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjectsList(prev =>
      prev.map(p => (p.id === projectId ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p))
    );
    if (project.id === projectId) {
      setProject(prev => ({ ...prev, name: newName, updatedAt: new Date().toISOString() }));
    }
  };

  // Create New Project
  const handleNewProject = () => {
    const nextSerial = projectsList.length + 1;
    const newProj: Project = {
      id: `project-new-${Date.now()}`,
      serialNumber: nextSerial,
      name: `LaTeX Research Project #${String(nextSerial).padStart(2, '0')}`,
      description: 'New academic LaTeX document workspace.',
      ownerId: 'user-1',
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
          projectId: `project-new-${Date.now()}`,
          path: 'main.tex',
          type: 'TEX',
          content: initialTemplate.mainFileContent,
          sizeBytes: initialTemplate.mainFileContent.length,
          updatedAt: new Date().toISOString(),
        },
        {
          id: `file-${Date.now()}-2`,
          projectId: `project-new-${Date.now()}`,
          path: 'references.bib',
          type: 'BIB',
          content: initialTemplate.bibContent || '',
          sizeBytes: (initialTemplate.bibContent || '').length,
          updatedAt: new Date().toISOString(),
        },
      ],
    };

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
    setTimeout(() => handleCompile(), 100);
  };

  // Open Auth Modal
  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // On Login / Signup Success
  const handleLoginSuccess = (user: { name: string; email: string; role: string }) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  // Logout
  const handleLogout = () => {
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
              name: 'Dr. Aris Thorne',
              email: 'author@texforge.io',
              role: 'Lead Academic Researcher',
            }
          }
          projects={projectsList}
          onOpenProject={proj => handleLaunchEditor(undefined, proj)}
          onCreateNewProject={handleNewProject}
          onDeleteProject={handleDeleteProjectFromDashboard}
          onDuplicateProject={handleDuplicateProject}
          onRenameProject={handleRenameProject}
          onSelectTemplate={handleSelectTemplate}
          onLogout={handleLogout}
          onGoHome={() => setCurrentView('landing')}
          onOpenThemeSelector={() => setIsThemeSelectorOpen(true)}
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
          <div className="flex-1 flex overflow-hidden relative">
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
            />

            {/* Center Monaco LaTeX Editor / Visual Rich Text Editor */}
            <main className="flex-1 h-full relative overflow-hidden bg-white flex flex-col">
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

                <div className="flex items-center space-x-3 font-mono text-slate-500 font-normal">
                  <button
                    onClick={() => setIsThemeSelectorOpen(true)}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-white border border-slate-300 hover:border-red-400 hover:text-[#D11111] text-slate-700 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    title="Change Workspace & Code Theme"
                  >
                    <Palette className="w-3 h-3 text-[#D11111]" />
                    <span className="hidden sm:inline">Theme:</span>
                    <span className="font-extrabold text-slate-900">{activeTheme.name}</span>
                  </button>

                  <span>{activeFilePath}</span>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden">
                {editorMode === 'code' ? (
                  <MonacoEditor
                    content={activeFile?.content || ''}
                    onChange={handleFileContentChange}
                    filePath={activeFilePath}
                    bibEntries={bibEntries}
                    diagnostics={compilationResult?.diagnostics || []}
                    monacoThemeId={activeTheme.monacoThemeId}
                  />
                ) : (
                  <VisualRichTextEditor
                    content={activeFile?.content || ''}
                    onChange={handleFileContentChange}
                    onInsertLatex={handleInsertLatex}
                  />
                )}
              </div>
            </main>

            {/* Right PDF.js Interactive Preview Panel */}
            <section className="w-1/2 h-full relative">
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
              onSendMessage={body => setChatMessages(prev => [...prev, { id: `chat-${Date.now()}`, projectId: project.id, authorName: currentUser ? currentUser.name : 'You (Author)', body, createdAt: new Date().toISOString() }])}
              activities={activityEvents}
            />
          </div>

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

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            providers={providers}
            onRefreshProviders={refreshProviders}
            activeThemeId={activeThemeId}
            onSelectTheme={setActiveThemeId}
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
        </div>
      )}

      {/* Auth Modal for Login & Signup */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Theme Selector Modal accessible globally */}
      <ThemeSelectorModal
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
        activeThemeId={activeThemeId}
        onSelectTheme={setActiveThemeId}
      />
    </>
  );
}
