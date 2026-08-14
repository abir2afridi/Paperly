/**
 * Session/device management (§34) — lists and revokes the signed-in user's
 * auth sessions through the web server's admin-REST proxy. Requires
 * SUPABASE_SERVICE_ROLE_KEY on the server; falls back to honest errors when
 * unavailable.
 */
import { supabase } from './supabase';

export interface DeviceSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  ip: string;
  userAgent: string;
  current: boolean;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${token}` };
}

export async function listSessions(): Promise<DeviceSession[]> {
  const headers = await authHeaders();
  const res = await fetch('/api/sessions', { headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to list sessions.');
  return (body.sessions || []) as DeviceSession[];
}

export async function revokeSession(sessionId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE', headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to revoke session.');
}

export async function revokeOtherSessions(currentSessionId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`/api/sessions/others`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ exceptSessionId: currentSessionId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to revoke other sessions.');
}

/** Human-readable device label from a user-agent string (best effort). */
export function deviceLabelFromUserAgent(userAgent: string): string {
  if (!userAgent) return 'Unknown device';
  let label = '';
  const ua = userAgent;
  if (/windows/i.test(ua)) label = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) label = 'macOS';
  else if (/android/i.test(ua)) label = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) label = 'iOS';
  else if (/linux/i.test(ua)) label = 'Linux';
  else label = 'Web';
  if (/edg\//i.test(ua)) label += ' · Edge';
  else if (/firefox\//i.test(ua)) label += ' · Firefox';
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) label += ' · Chrome';
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) label += ' · Safari';
  return label;
}