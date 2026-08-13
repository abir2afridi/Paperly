import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildAccountArchive, buildAccountZip, AccountExportData } from '../accountExport';
import { Project, ProjectFile } from '../../types';

const makeFile = (path: string): ProjectFile => ({
  id: `f-${path}`,
  projectId: 'p1',
  path,
  type: path.endsWith('.bib') ? 'BIB' : 'TEX',
  content: `content of ${path}`,
  sizeBytes: 10,
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeProject = (): Project => ({
  id: 'p1',
  serialNumber: 1,
  name: 'My Paper',
  description: '',
  ownerId: 'u1',
  ownerName: '',
  compiler: 'PDFLATEX' as Project['compiler'],
  bibTool: 'BIBTEX' as Project['bibTool'],
  mainFile: 'main.tex',
  autoCompile: true,
  isPublic: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  files: [makeFile('main.tex')],
});

const data: AccountExportData = {
  profile: {
    id: 'u1',
    email: 'author@example.com',
    displayName: 'A. Author',
    academicRole: 'Researcher',
    emailNotifications: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  projects: [
    {
      project: makeProject(),
      files: [makeFile('main.tex'), makeFile('references.bib')],
      comments: [
        { id: 'c1', projectId: 'p1', filePath: 'main.tex', anchorLine: 3, authorName: 'A. Author', body: 'Check this.', resolved: false, createdAt: '2026-01-02T00:00:00.000Z' },
      ],
      chatMessages: [],
      activityEvents: [],
      snapshots: [],
      annotations: [],
      drafts: [],
    },
  ],
  notifications: [
    { id: 'n1', type: 'ai_complete', title: 'AI generation complete', body: 'summary', projectId: 'p1', isRead: false, createdAt: '2026-01-03T00:00:00.000Z' },
  ],
};

describe('buildAccountArchive', () => {
  it('produces a versioned archive with metadata', () => {
    const archive = buildAccountArchive(data);
    expect(archive.app).toBe('Paperly');
    expect(archive.version).toBe(1);
    expect(new Date(archive.exportedAt).getTime()).not.toBeNaN();
    expect(archive.data.profile?.email).toBe('author@example.com');
    expect(archive.data.projects).toHaveLength(1);
  });
});

describe('buildAccountZip', () => {
  it('includes account.json plus project files and metadata', async () => {
    const buffer = (await buildAccountZip(data, 'arraybuffer')) as ArrayBuffer;
    const zip = await JSZip.loadAsync(buffer);

    const account = JSON.parse(await zip.file('account.json')!.async('string'));
    expect(account.app).toBe('Paperly');
    expect(account.data.projects[0].project.name).toBe('My Paper');
    expect(account.data.notifications[0].type).toBe('ai_complete');

    const tex = await zip.file('projects/my-paper-p1/files/main.tex')!.async('string');
    expect(tex).toBe('content of main.tex');
    expect(zip.file('projects/my-paper-p1/comments.json')).not.toBeNull();
  });
});