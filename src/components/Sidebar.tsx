import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  MessageSquare,
  MessageCircle,
  Activity,
  Github,
  History,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  Edit2,
  MoreVertical,
  Check,
  X,
  GitCommit,
  GitPullRequest,
  GitBranch,
  RotateCcw,
  Eye,
  FileCode,
  Image as ImageIcon,
  Clock,
  User,
  Send,
  Filter,
  Sparkles,
  RefreshCw,
  FolderPlus,
  Folder,
  FolderOpen,
  FolderMinus,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import {
  ProjectFile,
  CodeComment,
  ChatMessage,
  ActivityEvent,
  ProjectSnapshot,
  GithubSyncState,
} from '../types';

export type SidebarTab =
  | 'files'
  | 'comments'
  | 'chat'
  | 'activity'
  | 'github'
  | 'history';

interface SidebarProps {
  files: ProjectFile[];
  activeFilePath: string;
  mainFilePath: string;
  onSelectFile: (path: string) => void;
  onSetMainFile: (path: string) => void;
  onCreateFile: (path: string, type: ProjectFile['type']) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Sidebar collapse / expand
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userName?: string;

  // Module 2: Comments
  comments?: CodeComment[];
  onAddComment?: (comment: { filePath: string; anchorLine?: number; authorName: string; body: string }) => void;
  onToggleResolveComment?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;

  // Module 3: Chat
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (body: string) => void;

  // Module 4: Activity
  activities?: ActivityEvent[];

  // Module 5: GitHub
  githubState?: GithubSyncState;
  onConnectGithub?: (repoUrl: string, branch: string) => void;
  onPushGithub?: (commitMessage: string) => void;
  onPullGithub?: () => void;

  // Module 6: Version History
  snapshots?: ProjectSnapshot[];
  onCreateSnapshot?: (title: string) => void;
  onRestoreSnapshot?: (snapshot: ProjectSnapshot) => void;
  activeFileContent?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFilePath,
  mainFilePath,
  onSelectFile,
  onSetMainFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onFileUpload,

  collapsed = false,
  onToggleCollapse,

  userName = 'Dr. Aris Thorne',

  comments: propComments,
  onAddComment,
  onToggleResolveComment,
  onDeleteComment,

  chatMessages: propChatMessages,
  onSendChatMessage,

  activities: propActivities,

  githubState: propGithubState,
  onConnectGithub,
  onPushGithub,
  onPullGithub,

  snapshots: propSnapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  activeFileContent = '',
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');

  // Drag-to-resize sidebar width (VS Code style), persisted locally
  const [asideWidth, setAsideWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('texforge.sidebarWidth');
      const w = saved ? parseInt(saved, 10) : 272;
      return Number.isFinite(w) ? Math.min(420, Math.max(176, w)) : 272;
    } catch {
      return 272;
    }
  });
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('texforge.sidebarWidth', String(asideWidth));
    } catch {
      /* ignore */
    }
  }, [asideWidth]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: asideWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const w = Math.min(420, Math.max(176, dragRef.current.startW + (ev.clientX - dragRef.current.startX)));
      setAsideWidth(w);
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Collapsed mode: clicking a tab icon expands the panel and switches to it
  const openTab = (tab: SidebarTab) => {
    if (collapsed && onToggleCollapse) onToggleCollapse();
    setActiveTab(tab);
  };

  // --- Module 1: File Explorer Local State ---
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [activeMenuPath, setActiveMenuPath] = useState<string | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());

  const toggleDir = (dir: string) => {
    setCollapsedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  // --- Module 2: Comments Local State ---
  const [localComments, setLocalComments] = useState<CodeComment[]>([
    {
      id: 'cmt-1',
      projectId: 'proj-1',
      filePath: 'main.tex',
      anchorLine: 14,
      authorName: 'Dr. Aris Thorne',
      body: 'Verify the matrix formulation in equation (2) matches the supplementary material.',
      resolved: false,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'cmt-2',
      projectId: 'proj-1',
      filePath: 'main.tex',
      anchorLine: 28,
      authorName: 'Sophia Chen',
      body: 'Add BibTeX citation key for Thorne2026Wasm in section 3.',
      resolved: true,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ]);
  const [commentFilterFile, setCommentFilterFile] = useState<'current' | 'all'>('current');
  const [commentFilterResolved, setCommentFilterResolved] = useState<'all' | 'unresolved'>('unresolved');
  const [newCommentBody, setNewCommentBody] = useState('');
  const [newCommentLine, setNewCommentLine] = useState<string>('14');

  const commentsList = propComments || localComments;

  // --- Module 3: Chat Local State ---
  const [localChat, setLocalChat] = useState<ChatMessage[]>([
    {
      id: 'chat-1',
      projectId: 'proj-1',
      authorName: 'Sophia Chen (Co-Author)',
      body: 'I completed section 2 proofs. Running live compilation now.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'chat-2',
      projectId: 'proj-1',
      authorName: 'Dr. Aris Thorne',
      body: 'Great! The WASM pdfTeX compiler output looks crisp.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatList = propChatMessages || localChat;

  // --- Module 4: Activity Log Local State ---
  const [localActivities, setLocalActivities] = useState<ActivityEvent[]>([
    {
      id: 'act-1',
      projectId: 'proj-1',
      actorName: 'Dr. Aris Thorne',
      type: 'FILE_CREATE',
      description: 'created main.tex and references.bib',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'act-2',
      projectId: 'proj-1',
      actorName: 'TeXForge Compiler',
      type: 'COMPILE_SUCCESS',
      description: 'compiled WASM pdfTeX in 342ms',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'act-3',
      projectId: 'proj-1',
      actorName: 'Sophia Chen',
      type: 'COMMENT_ADD',
      description: 'added inline review comment on main.tex:14',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'FILES' | 'COMPILES' | 'COMMENTS'>('ALL');
  const activityList = propActivities || localActivities;

  // --- Module 5: GitHub Local State ---
  const [localGithub, setLocalGithub] = useState<GithubSyncState>({
    isConnected: true,
    repoUrl: 'github.com/academic-org/texforge-paper',
    branch: 'main',
    lastSyncedAt: new Date(Date.now() - 1800000).toISOString(),
    hasUnpushedChanges: true,
    commits: [
      {
        id: 'c1',
        hash: 'f3a91bc',
        message: 'Update quantum wave formulation and add BibTeX entries',
        authorName: 'Dr. Aris Thorne',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'c2',
        hash: 'e820d91',
        message: 'Initial LaTeX scaffold with IEEEtran package',
        authorName: 'Sophia Chen',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  });
  const [commitMessage, setCommitMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [repoInput, setRepoInput] = useState('github.com/academic-org/texforge-paper');
  const [branchInput, setBranchInput] = useState('main');

  const github = propGithubState || localGithub;

  // --- Module 6: Version History Local State ---
  const [localSnapshots, setLocalSnapshots] = useState<ProjectSnapshot[]>([
    {
      id: 'snap-1',
      projectId: 'proj-1',
      title: 'Initial TeX Live 2026 Scaffold',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      files: files.map(f => ({ path: f.path, content: f.content || '' })),
    },
    {
      id: 'snap-2',
      projectId: 'proj-1',
      title: 'Pre-Submission Peer Review Draft',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      files: files.map(f => ({ path: f.path, content: f.content || '' })),
    },
  ]);
  const [newSnapshotTitle, setNewSnapshotTitle] = useState('');
  const [diffModalSnapshot, setDiffModalSnapshot] = useState<ProjectSnapshot | null>(null);

  const snapshotsList = propSnapshots || localSnapshots;

  // --- Module Handlers ---
  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let path = newFileName.trim();
    if (path.startsWith('/')) path = path.slice(1);

    let type: ProjectFile['type'] = 'TEX';
    if (path.endsWith('.bib')) type = 'BIB';
    else if (path.endsWith('.cls')) type = 'CLS';
    else if (path.endsWith('.sty')) type = 'STY';
    else if (/\.(png|jpg|jpeg|eps|pdf)$/i.test(path)) type = 'IMAGE';

    onCreateFile(path, type);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const handleRenameSubmit = (oldPath: string) => {
    if (renameInput.trim() && renameInput.trim() !== oldPath) {
      onRenameFile(oldPath, renameInput.trim());
    }
    setRenamingPath(null);
  };

  const handleAddCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim()) return;

    const lineNum = parseInt(newCommentLine, 10);
    const newCommentObj: CodeComment = {
      id: `cmt-${Date.now()}`,
      projectId: 'proj-1',
      filePath: activeFilePath,
      anchorLine: isNaN(lineNum) ? undefined : lineNum,
      authorName: userName,
      body: newCommentBody.trim(),
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    if (onAddComment) {
      onAddComment({
        filePath: activeFilePath,
        anchorLine: isNaN(lineNum) ? undefined : lineNum,
        authorName: userName,
        body: newCommentBody.trim(),
      });
    } else {
      setLocalComments(prev => [newCommentObj, ...prev]);
    }

    setNewCommentBody('');
  };

  const handleToggleResolve = (id: string) => {
    if (onToggleResolveComment) {
      onToggleResolveComment(id);
    } else {
      setLocalComments(prev =>
        prev.map(c => (c.id === id ? { ...c, resolved: !c.resolved } : c))
      );
    }
  };

  const handleDeleteCommentLocal = (id: string) => {
    if (onDeleteComment) {
      onDeleteComment(id);
    } else {
      setLocalComments(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSendChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (onSendChatMessage) {
      onSendChatMessage(chatInput.trim());
    } else {
      setLocalChat(prev => [
        ...prev,
        {
          id: `chat-${Date.now()}`,
          projectId: 'proj-1',
          authorName: 'Dr. Aris Thorne',
          body: chatInput.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setChatInput('');
  };

  const handlePushSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;

    setIsPushing(true);

    setTimeout(() => {
      setIsPushing(false);

      if (onPushGithub) {
        onPushGithub(commitMessage.trim());
      } else {
        const newCommit = {
          id: `c-${Date.now()}`,
          hash: Math.random().toString(16).substring(2, 9),
          message: commitMessage.trim(),
          authorName: 'Dr. Aris Thorne',
          timestamp: new Date().toISOString(),
        };

        setLocalGithub(prev => ({
          ...prev,
          lastSyncedAt: new Date().toISOString(),
          hasUnpushedChanges: false,
          commits: [newCommit, ...prev.commits],
        }));
      }

      setCommitMessage('');
    }, 600);
  };

  const handleCreateSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotTitle.trim()) return;

    if (onCreateSnapshot) {
      onCreateSnapshot(newSnapshotTitle.trim());
    } else {
      const snap: ProjectSnapshot = {
        id: `snap-${Date.now()}`,
        projectId: 'proj-1',
        title: newSnapshotTitle.trim(),
        createdAt: new Date().toISOString(),
        files: files.map(f => ({ path: f.path, content: f.content || '' })),
      };
      setLocalSnapshots(prev => [snap, ...prev]);
    }

    setNewSnapshotTitle('');
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.path.endsWith('.tex')) return <FileCode className="w-4 h-4 text-red-600" />;
    if (file.path.endsWith('.bib')) return <FileText className="w-4 h-4 text-amber-600" />;
    if (/\.(png|jpg|jpeg|eps)$/i.test(file.path)) return <ImageIcon className="w-4 h-4 text-blue-600" />;
    return <FileText className="w-4 h-4 text-slate-500" />;
  };

  // Group files into folders for a VS Code-style collapsible tree.
  // While searching, fall back to a flat filtered list.
  const searchQuery = fileSearchQuery.trim().toLowerCase();
  const fileTree = useMemo(() => {
    const filtered = files.filter(f => f.path.toLowerCase().includes(searchQuery));
    if (searchQuery) {
      return { searching: true, roots: filtered, dirs: [] as { name: string; files: ProjectFile[] }[] };
    }
    const roots: ProjectFile[] = [];
    const dirMap = new Map<string, ProjectFile[]>();
    for (const f of filtered) {
      const slash = f.path.lastIndexOf('/');
      if (slash === -1) {
        roots.push(f);
      } else {
        const dir = f.path.slice(0, slash);
        const arr = dirMap.get(dir) ?? [];
        arr.push(f);
        dirMap.set(dir, arr);
      }
    }
    return { searching: false, roots, dirs: [...dirMap.entries()].map(([name, fs]) => ({ name, files: fs })) };
  }, [files, searchQuery]);

  const renderFileRow = (file: ProjectFile) => {
    const isActive = file.path === activeFilePath;
    const isMain = file.path === mainFilePath;
    const isRenaming = renamingPath === file.path;

    return (
      <div
        key={file.id}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-all border ${
          isActive
            ? 'bg-red-50 text-[#D11111] font-bold border-[#D11111] shadow-2xs'
            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
        }`}
        onClick={() => onSelectFile(file.path)}
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          {getFileIcon(file)}

          {isRenaming ? (
            <input
              type="text"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onBlur={() => handleRenameSubmit(file.path)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSubmit(file.path);
                if (e.key === 'Escape') setRenamingPath(null);
              }}
              autoFocus
              className="bg-white border-2 border-[#D11111] px-1 text-xs text-slate-900 focus:outline-none"
            />
          ) : (
            <span className="truncate font-mono text-[11px]">{file.path}</span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {isMain && (
            <span
              className="text-[8px] bg-[#D11111] text-white font-black px-1.5 py-0.5 uppercase tracking-widest"
              title="Main Entry File"
            >
              Main
            </span>
          )}

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setActiveMenuPath(activeMenuPath === file.path ? null : file.path);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 text-slate-500"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeMenuPath === file.path && (
          <div
            className="absolute right-2 top-8 bg-white border-2 border-slate-800 shadow-xl py-1 z-30 w-38 text-slate-800 text-[11px]"
            onClick={e => e.stopPropagation()}
          >
            {!isMain && file.path.endsWith('.tex') && (
              <button
                onClick={() => {
                  onSetMainFile(file.path);
                  setActiveMenuPath(null);
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 hover:text-[#D11111] font-bold flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-[#D11111]" />
                <span>Set as Main File</span>
              </button>
            )}

            <button
              onClick={() => {
                setRenamingPath(file.path);
                setRenameInput(file.path);
                setActiveMenuPath(null);
              }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 flex items-center space-x-1.5"
            >
              <Edit2 className="w-3 h-3 text-slate-500" />
              <span>Rename</span>
            </button>

            <button
              onClick={() => {
                onDeleteFile(file.path);
                setActiveMenuPath(null);
              }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 text-[#D11111] font-bold flex items-center space-x-1.5"
            >
              <Trash2 className="w-3 h-3 text-[#D11111]" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const unresolvedCommentsCount = commentsList.filter(c => !c.resolved).length;

  return (
    <div className="flex h-full select-none text-xs font-medium bg-white">
      {/* LEFT ICON NAVIGATION RAIL */}
      <nav className="w-13 bg-slate-950 text-slate-400 flex flex-col items-center py-3 border-r border-slate-800 space-y-4">
        {/* 1. File Explorer */}
        <button
          onClick={() => openTab('files')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            activeTab === 'files'
              ? 'bg-[#D11111] text-white shadow-lg'
              : 'hover:bg-slate-800 hover:text-white'
          }`}
          title="📂 1. File Explorer (Multi-file Management)"
        >
          <FileText className="w-5 h-5" />
          <span className="absolute left-14 bg-slate-900 text-white font-mono text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Files ({files.length})
          </span>
        </button>

        {/* 2. Review Comments */}
        <button
          onClick={() => openTab('comments')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            activeTab === 'comments'
              ? 'bg-[#D11111] text-white shadow-lg'
              : 'hover:bg-slate-800 hover:text-white'
          }`}
          title="💬 2. Review Comments (Inline Peer Review)"
        >
          <MessageSquare className="w-5 h-5" />
          {unresolvedCommentsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {unresolvedCommentsCount}
            </span>
          )}
          <span className="absolute left-14 bg-slate-900 text-white font-mono text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Review Comments ({commentsList.length})
          </span>
        </button>

        {/* 3. Team Chat */}
        <button
          onClick={() => openTab('chat')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            activeTab === 'chat'
              ? 'bg-[#D11111] text-white shadow-lg'
              : 'hover:bg-slate-800 hover:text-white'
          }`}
          title="💬 3. Team Chat (Real-time Stream)"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="absolute left-14 bg-slate-900 text-white font-mono text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Team Discussion
          </span>
        </button>

        {/* 4. Activity Audit Log */}
        <button
          onClick={() => openTab('activity')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            activeTab === 'activity'
              ? 'bg-[#D11111] text-white shadow-lg'
              : 'hover:bg-slate-800 hover:text-white'
          }`}
          title="⚡ 4. Activity Audit Log (Event Feed)"
        >
          <Activity className="w-5 h-5" />
          <span className="absolute left-14 bg-slate-900 text-white font-mono text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Activity Audit Feed
          </span>
        </button>

        {/* 5. GitHub Integration */}
        <button
          onClick={() => openTab('github')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            activeTab === 'github'
              ? 'bg-[#D11111] text-white shadow-lg'
              : 'hover:bg-slate-800 hover:text-white'
          }`}
          title="🐙 5. GitHub Integration (Two-way Sync)"
        >
          <Github className="w-5 h-5" />
          {github.hasUnpushedChanges && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          )}
          <span className="absolute left-14 bg-slate-900 text-white font-mono text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            GitHub Sync
          </span>
        </button>

        {/* 6. Version History */}
        <button
          onClick={() => openTab('history')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            activeTab === 'history'
              ? 'bg-[#D11111] text-white shadow-lg'
              : 'hover:bg-slate-800 hover:text-white'
          }`}
          title="📜 6. Version History (Snapshot Timeline)"
        >
          <History className="w-5 h-5" />
          <span className="absolute left-14 bg-slate-900 text-white font-mono text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Version Snapshots ({snapshotsList.length})
          </span>
        </button>

        {/* Sidebar Collapse / Expand Toggle */}
        <button
          onClick={onToggleCollapse}
          className="mt-auto p-2.5 rounded-lg transition-all hover:bg-slate-800 hover:text-white"
          title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        >
          {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
        </button>
      </nav>

      {/* MAIN SIDEBAR CONTENT PANEL */}
      <aside
        style={collapsed ? undefined : { width: asideWidth }}
        className={`${collapsed ? 'hidden' : 'flex'} bg-slate-50 flex-col h-full overflow-hidden text-slate-800`}
      >
        {/* MODULE 1: FILE EXPLORER */}
        {activeTab === 'files' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b-2 border-slate-200 flex items-center justify-between bg-white">
              <span className="font-black uppercase tracking-widest text-[#D11111] text-[10px] flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>File Directory ({files.length})</span>
              </span>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCollapsedDirs(new Set(fileTree.dirs.map(d => d.name)))}
                  disabled={fileTree.dirs.length === 0}
                  className="p-1 text-slate-700 hover:text-white hover:bg-[#D11111] transition-colors border border-slate-200 hover:border-red-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700 disabled:hover:border-slate-200"
                  title="Collapse All Folders"
                >
                  <FolderMinus className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setCollapsedDirs(new Set())}
                  disabled={fileTree.dirs.length === 0}
                  className="p-1 text-slate-700 hover:text-white hover:bg-[#D11111] transition-colors border border-slate-200 hover:border-red-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700 disabled:hover:border-slate-200"
                  title="Expand All Folders"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsCreatingFile(true)}
                  className="p-1 text-slate-700 hover:text-white hover:bg-[#D11111] transition-colors border border-slate-200 hover:border-red-700"
                  title="Create New File"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <label
                  className="p-1 text-slate-700 hover:text-white hover:bg-[#D11111] cursor-pointer transition-colors border border-slate-200 hover:border-red-700"
                  title="Upload Image / Asset"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    onChange={onFileUpload}
                    multiple
                    className="hidden"
                    accept=".tex,.bib,.cls,.sty,.png,.jpg,.jpeg,.eps,.pdf"
                  />
                </label>
              </div>
            </div>

            {/* Inline Search Bar */}
            <div className="px-2 pt-2">
              <input
                type="text"
                placeholder="Filter files..."
                value={fileSearchQuery}
                onChange={e => setFileSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 px-2 py-1 text-[11px] font-mono text-slate-900 focus:outline-none focus:border-[#D11111]"
              />
            </div>

            {/* New File Creation Form */}
            {isCreatingFile && (
              <form onSubmit={handleCreateFileSubmit} className="p-2 bg-red-50 border-b-2 border-red-300 mt-2">
                <input
                  type="text"
                  placeholder="e.g. main.tex, refs.bib"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onBlur={() => {
                    if (!newFileName) setIsCreatingFile(false);
                  }}
                  autoFocus
                  className="w-full bg-white border-2 border-[#D11111] px-2 py-1 text-xs text-slate-900 focus:outline-none"
                />
                <div className="flex justify-end space-x-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFile(false)}
                    className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-[10px] bg-[#D11111] text-white font-black uppercase tracking-wider hover:bg-black"
                  >
                    Add File
                  </button>
                </div>
              </form>
            )}

            {/* File Tree List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {fileTree.searching && fileTree.roots.map(renderFileRow)}

              {!fileTree.searching && (
                <>
                  {fileTree.roots.map(renderFileRow)}

                  {fileTree.dirs.map(dir => {
                    const isCollapsed = collapsedDirs.has(dir.name);
                    return (
                      <div key={dir.name}>
                        <div
                          className="flex items-center space-x-1 px-1.5 py-1 cursor-pointer select-none border border-transparent hover:bg-slate-100 transition-colors"
                          onClick={() => toggleDir(dir.name)}
                          title={isCollapsed ? `Expand ${dir.name}` : `Collapse ${dir.name}`}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          {isCollapsed ? (
                            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span className="truncate font-mono text-[11px] font-bold text-slate-700">
                            {dir.name}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">
                            {dir.files.length}
                          </span>
                        </div>

                        {!isCollapsed && (
                          <div className="ml-4 border-l border-slate-200 pl-1.5 space-y-1">
                            {dir.files.map(renderFileRow)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {fileTree.roots.length === 0 &&
                fileTree.dirs.length === 0 &&
                !fileTree.searching && (
                  <div className="text-center text-[11px] text-slate-400 font-mono py-6 uppercase tracking-wider">
                    No files yet — create one above.
                  </div>
                )}
            </div>
          </div>
        )}

        {/* MODULE 2: REVIEW COMMENTS */}
        {activeTab === 'comments' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b-2 border-slate-200 bg-white flex items-center justify-between">
              <span className="font-black uppercase tracking-widest text-[#D11111] text-[10px] flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Review Comments</span>
              </span>
              <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 text-[9px] border border-amber-300">
                {unresolvedCommentsCount} Active
              </span>
            </div>

            {/* Filter controls */}
            <div className="p-2 bg-slate-100 border-b border-slate-200 space-y-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-500 font-bold">Scope:</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCommentFilterFile('current')}
                    className={`px-2 py-0.5 font-bold ${
                      commentFilterFile === 'current'
                        ? 'bg-[#D11111] text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    Current File
                  </button>
                  <button
                    onClick={() => setCommentFilterFile('all')}
                    className={`px-2 py-0.5 font-bold ${
                      commentFilterFile === 'all'
                        ? 'bg-[#D11111] text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    All Files
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-500 font-bold">Status:</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCommentFilterResolved('unresolved')}
                    className={`px-2 py-0.5 font-bold ${
                      commentFilterResolved === 'unresolved'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    Unresolved
                  </button>
                  <button
                    onClick={() => setCommentFilterResolved('all')}
                    className={`px-2 py-0.5 font-bold ${
                      commentFilterResolved === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-300'
                    }`}
                  >
                    All Status
                  </button>
                </div>
              </div>
            </div>

            {/* New Comment Add Form */}
            <form onSubmit={handleAddCommentSubmit} className="p-2 bg-white border-b-2 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] text-slate-700">Add Line Review Comment</span>
                <div className="flex items-center space-x-1 font-mono text-[10px]">
                  <span>Line #:</span>
                  <input
                    type="number"
                    value={newCommentLine}
                    onChange={e => setNewCommentLine(e.target.value)}
                    className="w-12 bg-slate-100 border border-slate-300 px-1 py-0.5 text-center text-slate-900 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <textarea
                value={newCommentBody}
                onChange={e => setNewCommentBody(e.target.value)}
                placeholder={`Leave feedback for ${activeFilePath}...`}
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 p-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#D11111]"
              />

              <button
                type="submit"
                className="w-full py-1 bg-[#D11111] hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Post Comment</span>
              </button>
            </form>

            {/* Comments Stream */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {commentsList
                .filter(c => (commentFilterFile === 'current' ? c.filePath === activeFilePath : true))
                .filter(c => (commentFilterResolved === 'unresolved' ? !c.resolved : true))
                .map(comment => (
                  <div
                    key={comment.id}
                    className={`p-2.5 border-2 transition-all ${
                      comment.resolved
                        ? 'bg-slate-100 border-slate-200 text-slate-500 opacity-75'
                        : 'bg-white border-slate-300 hover:border-red-400 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-[11px]">{comment.authorName}</span>
                      <span className="font-mono text-[9px] bg-slate-100 px-1 border border-slate-300 font-bold text-slate-600">
                        {comment.filePath}
                        {comment.anchorLine ? `:${comment.anchorLine}` : ''}
                      </span>
                    </div>

                    <p className="text-slate-800 text-xs leading-relaxed mb-2 font-medium">
                      {comment.body}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[9px] font-mono">
                      <span className="text-slate-400">
                        {new Date(comment.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleResolve(comment.id)}
                          className={`flex items-center space-x-0.5 font-bold px-1.5 py-0.5 ${
                            comment.resolved
                              ? 'text-amber-700 hover:underline'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{comment.resolved ? 'Reopen' : 'Resolve'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCommentLocal(comment.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* MODULE 3: TEAM CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b-2 border-slate-200 bg-white flex items-center justify-between">
              <span className="font-black uppercase tracking-widest text-[#D11111] text-[10px] flex items-center space-x-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Team Discussion Stream</span>
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 border border-emerald-300">
                ● 2 Online
              </span>
            </div>

            {/* Chat Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
              {chatList.map(msg => (
                <div key={msg.id} className="bg-white p-2.5 border border-slate-300 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-[11px] flex items-center space-x-1">
                      <User className="w-3 h-3 text-[#D11111]" />
                      <span>{msg.authorName}</span>
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-700 text-xs font-medium leading-relaxed">{msg.body}</p>
                </div>
              ))}
            </div>

            {/* Chat Send Form */}
            <form onSubmit={handleSendChatSubmit} className="p-2 bg-white border-t-2 border-slate-200 flex items-center space-x-1">
              <input
                type="text"
                placeholder="Type message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#D11111]"
              />
              <button
                type="submit"
                className="p-1.5 bg-[#D11111] hover:bg-red-700 text-white transition-colors"
                title="Send Chat Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* MODULE 4: ACTIVITY AUDIT LOG */}
        {activeTab === 'activity' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b-2 border-slate-200 bg-white flex items-center justify-between">
              <span className="font-black uppercase tracking-widest text-[#D11111] text-[10px] flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Activity Audit Feed</span>
              </span>
              <span className="font-mono text-[9px] text-slate-400">
                {activityList.length} events
              </span>
            </div>

            {/* Activity Category Filter Pills */}
            <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center space-x-1 text-[9px] font-bold uppercase">
              {(['ALL', 'FILES', 'COMPILES', 'COMMENTS'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActivityFilter(cat)}
                  className={`px-2 py-0.5 transition-colors ${
                    activityFilter === cat
                      ? 'bg-[#D11111] text-white'
                      : 'bg-white text-slate-600 border border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Audit Feed Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {activityList
                .filter(act => {
                  if (activityFilter === 'FILES') return act.type.includes('FILE');
                  if (activityFilter === 'COMPILES') return act.type.includes('COMPILE');
                  if (activityFilter === 'COMMENTS') return act.type.includes('COMMENT');
                  return true;
                })
                .map(act => (
                  <div key={act.id} className="bg-white p-2.5 border border-slate-300 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] bg-red-950 text-red-300 px-1 py-0.2 font-extrabold uppercase">
                        {act.type}
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">
                        {new Date(act.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-slate-800 font-semibold text-[11px] leading-snug">
                      <span className="text-[#D11111] font-bold">{act.actorName}</span>{' '}
                      {act.description}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* MODULE 5: GITHUB INTEGRATION */}
        {activeTab === 'github' && (
          <div className="flex flex-col h-full overflow-y-auto p-3 space-y-4">
            <div className="border-b-2 border-slate-200 pb-2 flex items-center justify-between">
              <span className="font-black uppercase tracking-widest text-[#D11111] text-[10px] flex items-center space-x-1.5">
                <Github className="w-4 h-4 text-slate-900" />
                <span>GitHub Sync</span>
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold px-1.5 py-0.5 border border-emerald-300">
                Connected
              </span>
            </div>

            {/* Repository details */}
            <div className="bg-slate-900 text-slate-200 p-3 border border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex items-center space-x-1.5 text-white font-bold">
                <GitBranch className="w-3.5 h-3.5 text-[#D11111]" />
                <span className="truncate">{github.repoUrl}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Target Branch: <span className="text-amber-300 font-bold">{github.branch}</span>
              </div>
              <div className="text-[9px] text-slate-500">
                Last Sync:{' '}
                {github.lastSyncedAt
                  ? new Date(github.lastSyncedAt).toLocaleTimeString()
                  : 'Just now'}
              </div>

              {onPullGithub && (
                <button
                  onClick={onPullGithub}
                  className="w-full mt-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold flex items-center justify-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Pull Upstream Changes</span>
                </button>
              )}
            </div>

            {/* Push updates section */}
            <form onSubmit={handlePushSubmit} className="bg-white p-3 border-2 border-slate-200 space-y-2">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-600">
                Commit & Push Updates
              </label>
              <textarea
                value={commitMessage}
                onChange={e => setCommitMessage(e.target.value)}
                placeholder="e.g. Update abstract and citation references..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-[#D11111]"
                required
              />

              <button
                type="submit"
                disabled={isPushing}
                className="w-full py-2 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
              >
                {isPushing ? (
                  <span>Syncing to GitHub...</span>
                ) : (
                  <>
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>Push to {github.branch}</span>
                  </>
                )}
              </button>
            </form>

            {/* Commit Log Feed */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Recent Commit Log</span>
                <span>{github.commits.length} Commits</span>
              </div>

              <div className="space-y-1.5">
                {github.commits.map(c => (
                  <div key={c.id} className="bg-white p-2 border border-slate-300 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-[9px]">
                      <span className="bg-slate-200 text-slate-800 font-bold px-1">{c.hash}</span>
                      <span className="text-slate-400">
                        {new Date(c.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-800 font-bold text-[11px] leading-snug">{c.message}</p>
                    <div className="text-[9px] text-slate-500 font-mono">By {c.authorName}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 6: VERSION HISTORY */}
        {activeTab === 'history' && (
          <div className="flex flex-col h-full overflow-y-auto p-3 space-y-4">
            <div className="border-b-2 border-slate-200 pb-2 flex items-center justify-between">
              <span className="font-black uppercase tracking-widest text-[#D11111] text-[10px] flex items-center space-x-1.5">
                <History className="w-4 h-4 text-slate-900" />
                <span>Version History</span>
              </span>
              <span className="font-mono text-[9px] text-slate-500">
                {snapshotsList.length} Snapshots
              </span>
            </div>

            {/* Create manual checkpoint */}
            <form onSubmit={handleCreateSnapshotSubmit} className="bg-white p-3 border-2 border-slate-200 space-y-2">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-600">
                Save Document Checkpoint
              </label>
              <input
                type="text"
                placeholder="e.g. Camera-ready Version 1.0"
                value={newSnapshotTitle}
                onChange={e => setNewSnapshotTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#D11111]"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Snapshot</span>
              </button>
            </form>

            {/* Snapshots Timeline */}
            <div className="space-y-2">
              {snapshotsList.map(snap => (
                <div key={snap.id} className="bg-white p-3 border-2 border-slate-300 hover:border-red-500 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs">{snap.title}</span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {new Date(snap.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-[10px] font-mono text-slate-500">
                    Contains {snap.files.length} project files.
                  </p>

                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-200">
                    <button
                      onClick={() => setDiffModalSnapshot(snap)}
                      className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3 h-3 text-[#D11111]" />
                      <span>Inspect Diff</span>
                    </button>

                    <button
                      onClick={() => {
                        if (onRestoreSnapshot) {
                          onRestoreSnapshot(snap);
                        }
                      }}
                      className="flex-1 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase flex items-center justify-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Diff Inspection Modal */}
            {diffModalSnapshot && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-slate-900 border-2 border-slate-700 text-white w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-white">
                        Source Line Diff: {diffModalSnapshot.title}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-400">
                        Comparing saved snapshot against current workspace files
                      </p>
                    </div>
                    <button
                      onClick={() => setDiffModalSnapshot(null)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-3 bg-slate-950">
                    {diffModalSnapshot.files.map(sf => (
                      <div key={sf.path} className="border border-slate-800 p-3 space-y-1">
                        <div className="text-amber-400 font-bold border-b border-slate-800 pb-1 mb-2">
                          File: {sf.path}
                        </div>
                        <div className="text-emerald-400 bg-emerald-950/40 p-2 font-mono text-[11px] leading-relaxed overflow-x-auto">
                          {sf.content.slice(0, 300)}...
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-end space-x-2">
                    <button
                      onClick={() => setDiffModalSnapshot(null)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Drag-to-resize handle (VS Code style) */}
      {!collapsed && (
        <div
          onMouseDown={handleResizeStart}
          className="w-1.5 cursor-col-resize shrink-0 border-l border-slate-200 hover:bg-[#D11111]/40 active:bg-[#D11111] transition-colors"
          title="Drag to resize sidebar"
        />
      )}
    </div>
  );
};
