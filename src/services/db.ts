import {
  supabase,
  isSupabaseConfigured,
  ProfileRow,
  ProjectRow,
  ProjectFileRow,
  ChatMessageRow,
  ActivityEventRow,
  CommentRow,
  SnapshotRow,
} from './supabase';
import { Project, ProjectFile, CodeComment, ChatMessage, ActivityEvent, ProjectSnapshot } from '../types';

export const isDatabaseAvailable = (): boolean => supabase !== null;

// =============================================================
// Auth
// =============================================================

export async function signUpWithEmail(email: string, password: string, displayName: string, academicRole: string) {
  if (!supabase) return { ok: false as const, error: 'Database is not configured.' };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, academic_role: academicRole },
    },
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) return { ok: false as const, error: 'Database is not configured.' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

// Google OAuth — provides the real Google account profile picture (avatar_url).
// The user must enable the Google provider first: Dashboard -> Authentication -> Providers -> Google.
export async function signInWithGoogle() {
  if (!supabase) return { ok: false as const, error: 'Database is not configured.' };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function signOutFromApp() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export interface AuthSessionUser {
  id: string;
  email: string;
  displayName: string;
  academicRole: string;
  avatarUrl?: string;
}

function userFromSession(session: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } }): AuthSessionUser {
  const meta = session.user.user_metadata || {};
  const displayName =
    (meta.display_name as string) || (meta.full_name as string) || session.user.email?.split('@')[0] || 'Author';
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    displayName,
    academicRole: (meta.academic_role as string) || 'Academic Researcher',
    avatarUrl: (meta.avatar_url as string) || undefined,
  };
}

export async function getSessionUser(): Promise<AuthSessionUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  return userFromSession(session);
}

export function onAuthStateChange(callback: (user: AuthSessionUser | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      callback(null);
      return;
    }
    callback(userFromSession(session));
  });
  return () => data.subscription.unsubscribe();
}

async function getProfile(uid: string): Promise<ProfileRow | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  return (data as ProfileRow) || null;
}

// =============================================================
// Projects
// =============================================================

export async function fetchProjects(): Promise<Project[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[db] fetchProjects failed:', error.message);
    return null;
  }
  const rows = (data || []) as ProjectRow[];
  const files: Record<string, ProjectFile[]> = {};
  const { data: fileRows, error: fileError } = await supabase
    .from('project_files')
    .select('*')
    .in('project_id', rows.map(r => r.id));
  if (!fileError) {
    (fileRows || []).forEach((fr: ProjectFileRow) => {
      (files[fr.project_id] = files[fr.project_id] || []).push(mapFileRow(fr));
    });
  }
  return rows.map(r => mapProjectRow(r, files[r.id] || []));
}

export async function createProject(project: Project, ownerId: string): Promise<Project | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('projects')
    .insert({
      serial_number: project.serialNumber ?? 1,
      name: project.name,
      description: project.description || '',
      owner_id: ownerId,
      compiler: project.compiler,
      bib_tool: project.bibTool,
      main_file: project.mainFile,
      auto_compile: project.autoCompile,
      is_public: project.isPublic,
    })
    .select()
    .single();
  if (error) {
    console.error('[db] createProject failed:', error.message);
    return null;
  }
  const row = data as ProjectRow;
  await saveFiles(row.id, project.files);
  return {
    ...project,
    id: row.id,
    serialNumber: row.serial_number,
    ownerId: row.owner_id,
    files: project.files.map(f => ({ ...f, projectId: row.id })),
  };
}

export async function updateProjectMeta(projectId: string, patch: { name?: string; description?: string; compiler?: string; bib_tool?: string; main_file?: string; auto_compile?: boolean; is_public?: boolean }) {
  if (!supabase) return;
  const { error } = await supabase.from('projects').update(patch).eq('id', projectId);
  if (error) console.error('[db] updateProjectMeta failed:', error.message);
}

export async function deleteProjectFromDb(projectId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) {
    console.error('[db] deleteProject failed:', error.message);
    return false;
  }
  return true;
}

// =============================================================
// Files
// =============================================================

export async function saveFiles(projectId: string, files: ProjectFile[]): Promise<void> {
  if (!supabase || files.length === 0) return;
  const rows = files.map(f => ({
    project_id: projectId,
    path: f.path,
    type: f.type,
    content: f.content || '',
    size_bytes: f.sizeBytes,
  }));
  const { error } = await supabase.from('project_files').upsert(rows, { onConflict: 'project_id,path' });
  if (error) console.error('[db] saveFiles failed:', error.message);
}

export async function deleteFileFromDb(projectId: string, path: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('project_files').delete().eq('project_id', projectId).eq('path', path);
  if (error) console.error('[db] deleteFile failed:', error.message);
}

export async function renameFileInDb(projectId: string, oldPath: string, newPath: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('project_files')
    .update({ path: newPath })
    .eq('project_id', projectId)
    .eq('path', oldPath);
  if (error) console.error('[db] renameFile failed:', error.message);
}

// =============================================================
// Chat
// =============================================================

export async function fetchChatMessages(projectId: string): Promise<ChatMessage[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) {
    console.error('[db] fetchChatMessages failed:', error.message);
    return null;
  }
  return (data as ChatMessageRow[]).map(r => ({
    id: r.id,
    projectId: r.project_id,
    authorName: r.author_name,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function sendChatMessage(projectId: string, authorId: string, authorName: string, body: string): Promise<ChatMessage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ project_id: projectId, author_id: authorId, author_name: authorName, body })
    .select()
    .single();
  if (error) {
    console.error('[db] sendChatMessage failed:', error.message);
    return null;
  }
  const r = data as ChatMessageRow;
  return { id: r.id, projectId: r.project_id, authorName: r.author_name, body: r.body, createdAt: r.created_at };
}

// =============================================================
// Activity
// =============================================================

export async function fetchActivityEvents(projectId: string): Promise<ActivityEvent[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('[db] fetchActivityEvents failed:', error.message);
    return null;
  }
  return (data as ActivityEventRow[]).map(r => ({
    id: r.id,
    projectId: r.project_id,
    actorName: r.actor_name,
    type: r.type as ActivityEvent['type'],
    description: r.description,
    timestamp: r.created_at,
  }));
}

export async function recordActivity(
  projectId: string,
  authorId: string,
  authorName: string,
  type: ActivityEvent['type'],
  description: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('activity_events')
    .insert({ project_id: projectId, actor_id: authorId, actor_name: authorName, type, description });
  if (error) console.error('[db] recordActivity failed:', error.message);
}

// =============================================================
// Comments
// =============================================================

export async function fetchComments(projectId: string): Promise<CodeComment[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) {
    console.error('[db] fetchComments failed:', error.message);
    return null;
  }
  return (data as CommentRow[]).map(r => ({
    id: r.id,
    projectId: r.project_id,
    filePath: r.file_path,
    anchorLine: r.anchor_line ?? undefined,
    authorName: r.author_name,
    body: r.body,
    resolved: r.resolved,
    createdAt: r.created_at,
  }));
}

export async function addComment(comment: {
  projectId: string;
  filePath: string;
  anchorLine?: number;
  authorId: string;
  authorName: string;
  body: string;
}): Promise<CodeComment | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: comment.projectId,
      file_path: comment.filePath,
      anchor_line: comment.anchorLine ?? null,
      author_id: comment.authorId,
      author_name: comment.authorName,
      body: comment.body,
    })
    .select()
    .single();
  if (error) {
    console.error('[db] addComment failed:', error.message);
    return null;
  }
  const r = data as CommentRow;
  return {
    id: r.id,
    projectId: r.project_id,
    filePath: r.file_path,
    anchorLine: r.anchor_line ?? undefined,
    authorName: r.author_name,
    body: r.body,
    resolved: r.resolved,
    createdAt: r.created_at,
  };
}

export async function setCommentResolved(commentId: string, resolved: boolean): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('comments').update({ resolved }).eq('id', commentId);
  if (error) console.error('[db] setCommentResolved failed:', error.message);
}

export async function deleteCommentFromDb(commentId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) console.error('[db] deleteComment failed:', error.message);
}

// =============================================================
// Snapshots
// =============================================================

export async function fetchSnapshots(projectId: string): Promise<ProjectSnapshot[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('project_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[db] fetchSnapshots failed:', error.message);
    return null;
  }
  return (data as SnapshotRow[]).map(r => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    files: r.files || [],
    createdAt: r.created_at,
  }));
}

export async function createSnapshotInDb(projectId: string, title: string, files: { path: string; content: string }[]): Promise<ProjectSnapshot | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('project_snapshots')
    .insert({ project_id: projectId, title, files })
    .select()
    .single();
  if (error) {
    console.error('[db] createSnapshot failed:', error.message);
    return null;
  }
  const r = data as SnapshotRow;
  return { id: r.id, projectId: r.project_id, title: r.title, files: r.files || [], createdAt: r.created_at };
}

// =============================================================
// Realtime
// =============================================================

export function subscribeToProjectChanges(
  projectId: string,
  handlers: {
    onChatMessage?: (msg: ChatMessage) => void;
    onActivity?: (event: ActivityEvent) => void;
    onComment?: (comment: CodeComment) => void;
  }
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`project-${projectId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `project_id=eq.${projectId}` },
      payload => handlers.onChatMessage?.(rowToChatMessage(payload.new as ChatMessageRow))
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_events', filter: `project_id=eq.${projectId}` },
      payload => handlers.onActivity?.(rowToActivityEvent(payload.new as ActivityEventRow))
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'comments', filter: `project_id=eq.${projectId}` },
      payload => {
        const row = payload.new as CommentRow;
        handlers.onComment?.(rowToComment(row));
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// =============================================================
// Row -> App type mappers
// =============================================================

function mapProjectRow(row: ProjectRow, files: ProjectFile[]): Project {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    name: row.name,
    description: row.description || undefined,
    ownerId: row.owner_id,
    ownerName: '',
    compiler: row.compiler as Project['compiler'],
    bibTool: row.bib_tool as Project['bibTool'],
    mainFile: row.main_file,
    autoCompile: row.auto_compile,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files,
  };
}

function mapFileRow(row: ProjectFileRow): ProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    path: row.path,
    type: row.type as ProjectFile['type'],
    content: row.content,
    sizeBytes: row.size_bytes,
    updatedAt: row.updated_at,
  };
}

function rowToChatMessage(r: ChatMessageRow): ChatMessage {
  return { id: r.id, projectId: r.project_id, authorName: r.author_name, body: r.body, createdAt: r.created_at };
}

function rowToActivityEvent(r: ActivityEventRow): ActivityEvent {
  return {
    id: r.id,
    projectId: r.project_id,
    actorName: r.actor_name,
    type: r.type as ActivityEvent['type'],
    description: r.description,
    timestamp: r.created_at,
  };
}

function rowToComment(r: CommentRow): CodeComment {
  return {
    id: r.id,
    projectId: r.project_id,
    filePath: r.file_path,
    anchorLine: r.anchor_line ?? undefined,
    authorName: r.author_name,
    body: r.body,
    resolved: r.resolved,
    createdAt: r.created_at,
  };
}

export { getProfile };
