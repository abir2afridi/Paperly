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
  PdfAnnotationRow,
  DraftRow,
  NotificationRow,
} from './supabase';
import {
  Project,
  ProjectFile,
  CodeComment,
  ChatMessage,
  ActivityEvent,
  ProjectSnapshot,
  PdfAnnotation,
  AppNotification,
} from '../types';
import { AccountExportData } from './accountExport';

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

// Update the user's display profile (name, role, avatar). Stored in auth metadata so it
// survives across sessions; the profiles row is kept in sync for dashboard queries.
export async function updateUserProfile(patch: {
  displayName?: string;
  academicRole?: string;
  avatarUrl?: string | null;
}) {
  if (!supabase) return { ok: false as const, error: 'Database is not configured.' };
  const metadata: Record<string, string> = {};
  if (patch.displayName !== undefined) metadata.display_name = patch.displayName;
  if (patch.academicRole !== undefined) metadata.academic_role = patch.academicRole;
  if (patch.avatarUrl !== undefined) metadata.avatar_url = patch.avatarUrl || '';

  const { data, error } = await supabase.auth.updateUser({ data: metadata });
  if (error) return { ok: false as const, error: error.message };

  // Best-effort sync of the profiles row; failures are non-fatal (metadata already saved).
  try {
    const profile: Record<string, string> = {};
    if (patch.displayName !== undefined) profile.display_name = patch.displayName;
    if (patch.academicRole !== undefined) profile.academic_role = patch.academicRole;
    if (Object.keys(profile).length > 0) {
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, email: data.user.email ?? '', ...profile }, { onConflict: 'id' });
    }
  } catch {
    // ignore — auth metadata update already succeeded
  }
  return { ok: true as const };
}

export async function changePassword(newPassword: string) {
  if (!supabase) return { ok: false as const, error: 'Database is not configured.' };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

async function getProfile(uid: string): Promise<ProfileRow | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  return (data as ProfileRow) || null;
}

// §40 — chat retention preference (days; null = keep forever)
export async function setChatRetentionDays(days: number | null) {
  if (!supabase) return { ok: false as const, error: 'Database is not configured.' };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false as const, error: 'Not signed in.' };
  const { error } = await supabase
    .from('profiles')
    .update({ chat_retention_days: days })
    .eq('id', userData.user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function getChatRetentionDays(): Promise<number | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('chat_retention_days')
    .eq('id', userData.user.id)
    .maybeSingle();
  const row = data as { chat_retention_days?: number | null } | null;
  return row?.chat_retention_days ?? null;
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
  await saveFilesChecked(projectId, files);
}

export async function saveFilesChecked(projectId: string, files: ProjectFile[]): Promise<boolean> {
  if (!supabase || files.length === 0) return true;
  const rows = files.map(f => ({
    project_id: projectId,
    path: f.path,
    type: f.type,
    content: f.content || '',
    size_bytes: f.sizeBytes,
  }));
  const { error } = await supabase.from('project_files').upsert(rows, { onConflict: 'project_id,path' });
  if (error) {
    console.error('[db] saveFiles failed:', error.message);
    return false;
  }
  return true;
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
// PDF Annotations (plan §23)
// =============================================================

export async function fetchAnnotations(projectId: string): Promise<PdfAnnotation[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('pdf_annotations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) {
    console.error('[db] fetchAnnotations failed:', error.message);
    return null;
  }
  return (data as PdfAnnotationRow[]).map(rowToAnnotation);
}

export async function addAnnotation(annotation: {
  projectId: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  authorName: string;
  text: string;
  color: string;
}): Promise<PdfAnnotation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('pdf_annotations')
    .insert({
      project_id: annotation.projectId,
      page: annotation.page,
      x: annotation.x,
      y: annotation.y,
      width: annotation.width,
      height: annotation.height,
      author_name: annotation.authorName,
      text: annotation.text,
      color: annotation.color,
    })
    .select()
    .single();
  if (error) {
    console.error('[db] addAnnotation failed:', error.message);
    return null;
  }
  return rowToAnnotation(data as PdfAnnotationRow);
}

export async function deleteAnnotationFromDb(annotationId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pdf_annotations').delete().eq('id', annotationId);
  if (error) console.error('[db] deleteAnnotation failed:', error.message);
}

function rowToAnnotation(r: PdfAnnotationRow): PdfAnnotation {
  return {
    id: r.id,
    projectId: r.project_id,
    page: r.page,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    authorName: r.author_name,
    text: r.text,
    color: r.color,
    createdAt: r.created_at,
  };
}

// =============================================================
// Drafts / Autosave (plan §41)
// =============================================================

export async function fetchDrafts(projectId: string): Promise<DraftRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('drafts').select('*').eq('project_id', projectId);
  if (error) {
    console.error('[db] fetchDrafts failed:', error.message);
    return null;
  }
  return data as DraftRow[];
}

export async function upsertDraft(projectId: string, filePath: string, content: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('drafts')
    .upsert({ project_id: projectId, file_path: filePath, content }, { onConflict: 'project_id,file_path' });
  if (error) console.error('[db] upsertDraft failed:', error.message);
}

export async function deleteDraft(projectId: string, filePath: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('drafts')
    .delete()
    .eq('project_id', projectId)
    .eq('file_path', filePath);
  if (error) console.error('[db] deleteDraft failed:', error.message);
}

// =============================================================
// Notifications (plan §31)
// =============================================================

export type NotificationType = AppNotification['type'];

export async function fetchNotifications(userId: string): Promise<AppNotification[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('[db] fetchNotifications failed:', error.message);
    return null;
  }
  return (data as NotificationRow[]).map(rowToNotification);
}

export async function createNotification(input: {
  userId: string;
  projectId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
}): Promise<AppNotification | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      project_id: input.projectId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
    })
    .select()
    .single();
  if (error) {
    console.error('[db] createNotification failed:', error.message);
    return null;
  }
  return rowToNotification(data as NotificationRow);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) console.error('[db] markNotificationRead failed:', error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) console.error('[db] markAllNotificationsRead failed:', error.message);
}

export function subscribeToNotifications(userId: string, onNotification: (n: AppNotification) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      payload => onNotification(rowToNotification(payload.new as NotificationRow))
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

function rowToNotification(r: NotificationRow): AppNotification {
  return {
    id: r.id,
    type: r.type as AppNotification['type'],
    title: r.title,
    body: r.body,
    projectId: r.project_id,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

// =============================================================
// Account data export (plan §29 - GDPR-style portability)
// =============================================================

export async function fetchAccountExport(userId: string): Promise<AccountExportData | null> {
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  const { data: projectRows, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true });
  if (projectsError) {
    console.error('[db] fetchAccountExport projects failed:', projectsError.message);
    return null;
  }

  const projectList = (projectRows as ProjectRow[]) || [];
  const projects = await Promise.all(
    projectList.map(async row => {
      const p = mapProjectRow(row, []);
      const { data: files } = await supabase.from('project_files').select('*').eq('project_id', row.id);
      const { data: comments } = await supabase.from('comments').select('*').eq('project_id', row.id);
      const { data: chat } = await supabase.from('chat_messages').select('*').eq('project_id', row.id);
      const { data: activity } = await supabase.from('activity_events').select('*').eq('project_id', row.id);
      const { data: snapshots } = await supabase.from('project_snapshots').select('*').eq('project_id', row.id);
      const { data: annotations } = await supabase.from('pdf_annotations').select('*').eq('project_id', row.id);
      const { data: drafts } = await supabase.from('drafts').select('*').eq('project_id', row.id);
      return {
        project: { ...p, files: ((files as ProjectFileRow[]) || []).map(mapFileRow) },
        files: ((files as ProjectFileRow[]) || []).map(mapFileRow),
        comments: ((comments as CommentRow[]) || []).map(rowToComment),
        chatMessages: ((chat as ChatMessageRow[]) || []).map(rowToChatMessage),
        activityEvents: ((activity as ActivityEventRow[]) || []).map(rowToActivityEvent),
        snapshots: ((snapshots as SnapshotRow[]) || []).map(r => ({
          id: r.id,
          projectId: r.project_id,
          title: r.title,
          files: r.files || [],
          createdAt: r.created_at,
        })),
        annotations: ((annotations as PdfAnnotationRow[]) || []).map(rowToAnnotation),
        drafts: ((drafts as DraftRow[]) || []) as DraftRow[],
      };
    })
  );

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return {
    profile: profile
      ? {
          id: (profile as ProfileRow).id,
          email: (profile as ProfileRow).email,
          displayName: (profile as ProfileRow).display_name,
          academicRole: (profile as ProfileRow).academic_role,
          emailNotifications: (profile as { email_notifications?: boolean }).email_notifications !== false,
          createdAt: (profile as ProfileRow).created_at,
        }
      : null,
    projects,
    notifications: ((notifications as NotificationRow[]) || []).map(rowToNotification),
  };
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
    source: (r.source as ProjectSnapshot['source']) || 'human',
  }));
}

export async function createSnapshotInDb(
  projectId: string,
  title: string,
  files: { path: string; content: string }[],
  source: ProjectSnapshot['source'] = 'human'
): Promise<ProjectSnapshot | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('project_snapshots')
    .insert({ project_id: projectId, title, files, source })
    .select()
    .single();
  if (error) {
    console.error('[db] createSnapshot failed:', error.message);
    return null;
  }
  const r = data as SnapshotRow;
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    files: r.files || [],
    createdAt: r.created_at,
    source: (r.source as ProjectSnapshot['source']) || 'human',
  };
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
