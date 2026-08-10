export type CompilerType = 'PDFLATEX' | 'XELATEX' | 'LUALATEX';
export type BibToolType = 'BIBTEX' | 'BIBER' | 'NONE';
export type FileType = 'TEX' | 'BIB' | 'CLS' | 'STY' | 'IMAGE' | 'PDF' | 'OTHER';

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string; // e.g. "main.tex", "references.bib", "figures/chart.png"
  type: FileType;
  content?: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface Project {
  id: string;
  serialNumber?: number;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  compiler: CompilerType;
  bibTool: BibToolType;
  mainFile: string;
  autoCompile: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  files: ProjectFile[];
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface CompileDiagnostic {
  severity: DiagnosticSeverity;
  file?: string;
  line?: number;
  message: string;
  codeSnippet?: string;
}

export interface CompilationResult {
  status: 'success' | 'error';
  pdfDataUrl?: string;
  pdfArrayBuffer?: ArrayBuffer;
  log: string;
  diagnostics: CompileDiagnostic[];
  durationMs: number;
  compiledAt: string;
  wordCount?: number;
}

export type AIProviderType = 'openai' | 'anthropic' | 'custom';

export interface AIProviderConfig {
  id: string;
  label: string;
  providerType: AIProviderType;
  baseUrl: string;
  apiKey?: string; // Masked on client side, e.g. "sk-••••1234"
  model: string;
  extraHeadersJson?: string;
  temperature?: number;
  maxTokens?: number;
  isDefault: boolean;
  isVerified?: boolean;
  lastError?: string;
  lastTestedAt?: string;
}

export interface GithubCommit {
  id: string;
  hash: string;
  message: string;
  authorName: string;
  timestamp: string;
}

export interface GithubSyncState {
  isConnected: boolean;
  repoUrl: string;
  branch: string;
  lastSyncedAt?: string;
  commits: GithubCommit[];
  hasUnpushedChanges: boolean;
}

export interface CodeComment {
  id: string;
  projectId: string;
  filePath: string;
  anchorLine?: number;
  authorName: string;
  authorAvatar?: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  authorName: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  actorName: string;
  type: 'FILE_CREATE' | 'FILE_DELETE' | 'COMPILE_SUCCESS' | 'COMPILE_ERROR' | 'MEMBER_JOIN' | 'COMMENT_ADD' | 'VERSION_RESTORE';
  description: string;
  timestamp: string;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  files: { path: string; content: string }[];
}

export interface PdfAnnotation {
  id: string;
  projectId: string;
  page: number;
  x: number; // percentage or PDF pt coordinates
  y: number;
  width: number;
  height: number;
  authorName: string;
  text: string;
  color: string;
  createdAt: string;
}

export interface BibEntry {
  citeKey: string;
  type: string;
  title: string;
  author: string;
  year?: string;
  journal?: string;
  publisher?: string;
  rawBibtex: string;
}

export interface Template {
  id: string;
  name: string;
  category: 'article' | 'report' | 'ieee' | 'acm' | 'thesis' | 'beamer' | 'cv';
  description: string;
  mainFileContent: string;
  bibContent?: string;
  extraFiles?: { path: string; content: string }[];
}
