/**
 * Desktop (Tauri) bridge.
 *
 * Every function here detects whether the app is running inside the Tauri
 * shell and transparently falls back to web behavior otherwise, so the exact
 * same bundle serves both Web and Desktop.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return '0.0.0';
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('app_version').catch(() => '0.0.0');
}

export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_external', { url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export type MenuEventPayload =
  | { type: 'about' }
  | { type: 'shortcuts' }
  | { type: 'export-zip' }
  | { type: 'import-zip' }
  | { type: 'toggle-pdf' }
  | { type: 'toggle-ai' }
  | { type: 'compile' }
  | { type: 'edit-undo' }
  | { type: 'edit-redo' }
  | { type: 'edit-cut' }
  | { type: 'edit-copy' }
  | { type: 'edit-paste' };

let menuListenerRegistered = false;
export function onMenuEvent(cb: (event: MenuEventPayload) => void): void {
  if (!isTauri() || menuListenerRegistered) return;
  menuListenerRegistered = true;
  import('@tauri-apps/api/event').then(({ listen }) => {
    listen<string>('menu://event', event => {
      try {
        const parsed = JSON.parse(event.payload) as MenuEventPayload;
        cb(parsed);
      } catch {
        // ignore malformed payloads
      }
    });
  });
}

// ---- File dialogs (replaces DOM <input>/<a> flows on desktop) ----

export async function pickImportZip(): Promise<{ name: string; dataBase64: string } | null> {
  if (!isTauri()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<{ name: string; dataBase64: string } | null>('pick_import_zip');
}

export async function pickExportZip(dataBase64: string, suggestedName: string): Promise<boolean> {
  if (!isTauri()) return false;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<boolean>('pick_export_zip', { dataBase64, suggestedName });
}
