/**
 * AI engine — provider CRUD, connection tests and generation requests.
 *
 * Every call transparently branches between the Tauri desktop shell
 * (Rust commands) and the web backend (REST endpoints), so the same
 * bundle works on Web and Desktop.
 */
import type { AIProviderConfig } from '../types';
import { isTauri } from '../desktop/bridge';
import { supabase } from './supabase';

// ---- Provider persistence ----

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in. Sign in to use AI features.');
  return { Authorization: `Bearer ${token}` };
}

export async function loadProvidersFile(): Promise<AIProviderConfig[]> {
  if (!isTauri()) {
    const headers = await authHeaders();
    const res = await fetch('/api/ai/providers', { headers });
    if (!res.ok) throw new Error(res.status === 401 ? 'Not signed in. Sign in to manage AI providers.' : 'Failed to load AI providers.');
    return res.json();
  }
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

export async function createProvider(input: {
  label: string;
  providerType: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
}): Promise<{ id: string }> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<{ id: string }>('create_provider', { input });
  }
  const res = await fetch('/api/ai/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'Not signed in. Sign in to manage AI providers.' : 'Failed to create AI provider.');
  }
  return res.json();
}

export async function deleteProvider(id: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('delete_provider', { id });
    return;
  }
  const res = await fetch(`/api/ai/providers/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'Not signed in. Sign in to manage AI providers.' : 'Failed to delete AI provider.');
  }
}

export async function aiTestProvider(providerId: string): Promise<{ latencyMs: number; message: string }> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('ai_test_provider', { providerId });
  }
  const res = await fetch(`/api/ai/providers/${providerId}/test`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Connection test failed.');
  }
  return { latencyMs: data.latencyMs, message: data.message };
}

// ---- Generation ----

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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ providerId, prompt, context }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || (res.status === 401 ? 'Not signed in. Sign in to use AI features.' : 'AI generation failed.'));
  }
  return { result: data.result, providerModel: data.providerModel };
}