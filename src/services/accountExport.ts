import JSZip from 'jszip';
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
import { DraftRow } from './supabase';

export interface AccountExportProfile {
  id: string;
  email: string;
  displayName: string;
  academicRole: string;
  emailNotifications: boolean;
  createdAt: string;
}

export interface AccountExportProject {
  project: Project;
  files: ProjectFile[];
  comments: CodeComment[];
  chatMessages: ChatMessage[];
  activityEvents: ActivityEvent[];
  snapshots: ProjectSnapshot[];
  annotations: PdfAnnotation[];
  drafts: DraftRow[];
}

export interface AccountExportData {
  profile: AccountExportProfile | null;
  projects: AccountExportProject[];
  notifications: AppNotification[];
}

export interface AccountArchive {
  exportedAt: string;
  app: 'Paperly';
  version: 1;
  data: AccountExportData;
}

export function buildAccountArchive(data: AccountExportData): AccountArchive {
  return {
    exportedAt: new Date().toISOString(),
    app: 'Paperly',
    version: 1,
    data,
  };
}

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project';

const safePath = (p: string): string =>
  p.split('/').map(seg => seg.replace(/[^a-zA-Z0-9._-]/g, '_')).join('/');

export async function buildAccountZip(data: AccountExportData): Promise<Blob> {
  const zip = new JSZip();
  const archive = buildAccountArchive(data);
  zip.file('account.json', JSON.stringify(archive, null, 2));

  for (const entry of data.projects) {
    const folder = `projects/${slugify(entry.project.name)}-${entry.project.id.slice(0, 8)}/`;
    for (const file of entry.files) {
      zip.file(`${folder}files/${safePath(file.path)}`, file.content || '');
    }
    zip.file(`${folder}metadata.json`, JSON.stringify({ project: entry.project }, null, 2));
    zip.file(`${folder}comments.json`, JSON.stringify(entry.comments, null, 2));
    zip.file(`${folder}chat.json`, JSON.stringify(entry.chatMessages, null, 2));
    zip.file(`${folder}activity.json`, JSON.stringify(entry.activityEvents, null, 2));
    zip.file(`${folder}snapshots.json`, JSON.stringify(entry.snapshots, null, 2));
    zip.file(`${folder}annotations.json`, JSON.stringify(entry.annotations, null, 2));
    zip.file(`${folder}drafts.json`, JSON.stringify(entry.drafts, null, 2));
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function downloadAccountArchive(data: AccountExportData): Promise<void> {
  const blob = await buildAccountZip(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paperly-account-export-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}