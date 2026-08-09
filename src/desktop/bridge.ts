/**
 * Desktop (Tauri) bridge.
 *
 * Every function here detects whether the app is running inside the Tauri
 * shell and transparently falls back to web behavior otherwise, so the exact
 * same bundle serves both Web and Desktop.
 */
import type { AIProviderConfig } from '../types';

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

// ---- Provider persistence (replaces /api/ai/providers on desktop) ----

export async function loadProvidersFile(): Promise<AIProviderConfig[]> {
  if (!isTauri()) return [];
  const { invoke } = await import('@tauri-apps/api/core');
  const raw = await invoke<string>('read_providers_file').catch(() => '[]');
  try {
    return JSON.parse(raw) as AIProviderConfig[];
  } catch {
    return [];
  }
}

export async function saveProvidersFile(providers: AIProviderConfig[]): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('write_providers_file', { json: JSON.stringify(providers) });
}

// ---- AI generation (replaces /api/ai/generate on desktop) ----

export interface AiGenerateResult {
  result: string;
  providerModel?: string;
}

export async function aiGenerate(
  providerId: string | undefined,
  prompt: string,
  context: string,
): Promise<AiGenerateResult> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AiGenerateResult>('ai_generate', { providerId, prompt, context });
  }
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, prompt, context }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'AI generation failed.');
  }
  return { result: data.result, providerModel: data.providerModel };
}

export async function aiTestProvider(providerId: string): Promise<{ latencyMs: number; message: string }> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('ai_test_provider', { providerId });
  }
  const res = await fetch(`/api/ai/providers/${providerId}/test`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Connection test failed.');
  }
  return { latencyMs: data.latencyMs, message: data.message };
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
