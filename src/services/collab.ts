import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface CollabUser {
  clientId: number;
  name: string;
  color: string;
}

export interface CollabSession {
  doc: Y.Doc;
  ytext: Y.Text;
  provider: WebsocketProvider;
  /** y-protocols/awareness Awareness instance (untyped here to avoid the
   *  untyped y-protocols package; consumed by y-monaco's MonacoBinding). */
  awareness: unknown;
  destroy: () => void;
}

export interface CreateCollabOptions {
  projectId: string;
  filePath: string;
  token: string;
  userName: string;
  initialContent: string;
  onContent: (content: string) => void;
  onUsers: (users: CollabUser[]) => void;
  onStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

export type CollabStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

const USER_COLORS = ['#D11111', '#2563EB', '#059669', '#7C3AED', '#D97706', '#0E7490', '#BE185D', '#4D7C0F', '#B45309', '#4338CA'];

export function collabUserColor(clientId: number): string {
  return USER_COLORS[clientId % USER_COLORS.length];
}

/**
 * Resolve the collab WebSocket server URL.
 * - Explicit override: VITE_COLLAB_URL (required for desktop builds).
 * - Web: same origin as the page (`/collab`), ws->wss automatically.
 * - Desktop without override: returns null (no collab server there).
 */
export function collabServerUrl(): string | null {
  const explicit = import.meta.env.VITE_COLLAB_URL as string | undefined;
  if (explicit) return explicit;
  if (typeof window === 'undefined') return null;
  const isTauri = '__TAURI_INTERNALS__' in window;
  if (isTauri) return null;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/collab`;
}

export function createCollabSession(opts: CreateCollabOptions): CollabSession {
  const url = collabServerUrl();
  if (!url) throw new Error('Collab server is not configured.');

  const room = `project:${opts.projectId}:file:${encodeURIComponent(opts.filePath)}`;
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(url, room, doc, {
    params: {
      token: opts.token,
      project: opts.projectId,
      file: opts.filePath,
    },
  });
  const ytext = doc.getText('content');
  const awareness = provider.awareness as {
    setLocalStateField: (field: string, value: unknown) => void;
    setLocalState: (state: unknown) => void;
    getStates: () => Map<number, Record<string, unknown>>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
  };

  let shouldSeed = true;
  let sawLocalContent = false;

  awareness.setLocalStateField('user', {
    name: opts.userName || 'Collaborator',
    color: collabUserColor(doc.clientID),
    clientId: doc.clientID,
  });

  provider.on('status', ({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) => {
    opts.onStatus(status);
  });

  // Seed only when the server truly has no content for this room yet. The
  // server also seeds from the database on room creation, so this is a
  // fallback for brand-new rooms (or when the seed fetch fails).
  provider.on('sync', (isSynced: boolean) => {
    if (isSynced && shouldSeed && ytext.toString() === '' && opts.initialContent) {
      ytext.insert(0, opts.initialContent);
      shouldSeed = false;
    }
  });

  const onYtextChange = () => {
    if (ytext.toString() !== '' && !sawLocalContent) {
      shouldSeed = false;
      sawLocalContent = true;
    }
    opts.onContent(ytext.toString());
  };
  ytext.observe(onYtextChange);

  const onAwarenessChange = () => {
    const users: CollabUser[] = [];
    awareness.getStates().forEach((state, clientId) => {
      const user = state?.user as { name?: string; color?: string } | undefined;
      if (user?.name) {
        users.push({ clientId, name: user.name, color: user.color || collabUserColor(clientId) });
      }
    });
    users.sort((a, b) => a.name.localeCompare(b.name) || a.clientId - b.clientId);
    opts.onUsers(users);
  };
  awareness.on('change', onAwarenessChange);

  return {
    doc,
    ytext,
    provider,
    awareness,
    destroy: () => {
      try {
        awareness.setLocalState(null);
        awareness.off('change', onAwarenessChange);
      } catch {
        // already destroyed
      }
      provider.destroy();
      doc.destroy();
    },
  };
}