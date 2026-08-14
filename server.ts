import express from 'express';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { setContentInitializor, setupWSConnection } from '@y/websocket-server/utils';
import { sanitizeProjectFilePath } from './src/services/zipSecurity';
import { createRateLimiter, clientIp } from './src/services/rateLimit';
import { renderEmailTemplate, sendEmailViaResend } from './src/services/emailTemplates';
import { buildProviderAdapter } from './src/services/aiProviderAdapter';
import {
  ProviderConfigRow,
  maskApiKey,
  resolveDefaultProvider,
  sanitizeProviderConfig,
} from './src/services/aiProviderConfig';
import 'dotenv/config';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// ---- Security headers (non-CSP; CSP is opt-in behind TEXFORGE_ENABLE_CSP,
// see docs/security.md) ----
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ---- Rate limiting (per-IP, in-memory fixed window) ----
const apiGeneralLimiter = createRateLimiter(600, 60_000);
const aiGenerateLimiter = createRateLimiter(30, 60_000);
const aiProviderMutateLimiter = createRateLimiter(20, 60_000);
const aiTestLimiter = createRateLimiter(10, 60_000);
const collabConnectLimiter = createRateLimiter(30, 60_000);

app.use('/api', (req, res, next) => {
  if (apiGeneralLimiter.allow(clientIp(req))) return next();
  res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
});

// Encryption key derived or environment provided
const ENCRYPTION_SECRET = process.env.AI_ENCRYPTION_KEY || 'texforge-secret-encryption-key-32b';
const AES_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

function encryptText(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptText(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) return '';
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// AI provider configurations are stored per-user in Supabase
// (`ai_provider_configs`, §8A). The plaintext API key never leaves the
// server; `api_key_enc` is AES-GCM encrypted with AI_ENCRYPTION_KEY.

interface ServerAIProvider {
  id: string;
  userId: string;
  label: string;
  providerType: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  apiKeyEnc: string;
  model: string;
  extraHeadersJson?: string;
  temperature?: number;
  maxTokens?: number;
  isDefault: boolean;
  isVerified: boolean;
  lastTestedAt?: string;
  lastError?: string;
}

function mapRowToServer(row: ProviderConfigRow): ServerAIProvider {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    providerType: row.provider_type,
    baseUrl: row.base_url,
    apiKeyEnc: row.api_key_enc,
    model: row.model,
    extraHeadersJson: row.extra_headers_json ?? undefined,
    temperature: row.temperature ?? undefined,
    maxTokens: row.max_tokens ?? undefined,
    isDefault: row.is_default,
    isVerified: row.is_verified,
    lastTestedAt: row.last_tested_at ?? undefined,
    lastError: row.last_error ?? undefined,
  };
}

// ---- Supabase-backed per-user storage helpers ----

function requireSupabaseEnv(): boolean {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
}

/** Authenticates the Bearer session token and returns a user-scoped client. */
async function authenticateUser(
  req: express.Request,
): Promise<{ client: SupabaseClient; userId: string } | null> {
  if (!requireSupabaseEnv()) return null;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  const sb = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) return null;
  return { client: sb, userId: userData.user.id };
}

async function fetchUserProviders(sb: SupabaseClient, userId: string): Promise<ProviderConfigRow[]> {
  const { data, error } = await sb
    .from('ai_provider_configs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as ProviderConfigRow[];
}

/** Clears is_default on every provider except the one being kept (if any). */
async function clearOtherDefaults(
  sb: SupabaseClient,
  userId: string,
  keepId?: string,
): Promise<void> {
  const { error } = await sb
    .from('ai_provider_configs')
    .update({ is_default: false })
    .eq('user_id', userId)
    .neq('id', keepId ?? '')
    .eq('is_default', true);
  if (error) throw error;
}

// ================= API ROUTES =================

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'TeXForge', timestamp: new Date().toISOString() });
});

// POST /api/email/notify - transactional email for mentions/invites/review
// requests (§31). Respects the recipient's per-user email preference. Requires
// RESEND_API_KEY; returns 501 when email delivery is not configured.
app.post('/api/email/notify', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });

  const sb = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) return res.status(401).json({ error: 'Invalid session token.' });

  const recipientId = req.body.recipientId as string | undefined;
  if (!recipientId) return res.status(400).json({ error: 'recipientId is required.' });

  const { data: profile } = await sb
    .from('profiles')
    .select('email, email_notifications')
    .eq('id', recipientId)
    .maybeSingle();
  if (!profile?.email) return res.status(404).json({ error: 'Recipient not found.' });
  if (profile.email_notifications === false) {
    return res.json({ delivered: false, reason: 'email_notifications_disabled' });
  }

  const { type, data } = req.body as { type: string; data: Record<string, string> };
  if (type !== 'mention' && type !== 'invite' && type !== 'review_request') {
    return res.status(400).json({ error: 'Unsupported email template type.' });
  }
  const template = renderEmailTemplate(type, data);

  if (!process.env.RESEND_API_KEY) {
    return res.status(501).json({ error: 'Email delivery is not configured (RESEND_API_KEY missing).' });
  }

  try {
    const response = await sendEmailViaResend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || 'Paperly <notifications@paperly.app>',
      to: profile.email,
      template,
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('[email] Resend delivery failed:', response.status, detail);
      return res.status(502).json({ error: 'Email provider rejected the request.' });
    }
    return res.json({ delivered: true });
  } catch (err) {
    console.error('[email] Delivery error:', err);
    return res.status(502).json({ error: 'Email delivery failed.' });
  }
});

// GET AI Providers (per-user, authenticated)
app.get('/api/ai/providers', async (req, res) => {
  const auth = await authenticateUser(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required. Sign in to manage AI providers.' });

  try {
    const rows = await fetchUserProviders(auth.client, auth.userId);
    res.json(rows.map(row => sanitizeProviderConfig(row, decryptText)));
  } catch (err) {
    console.error('[ai/providers] Listing failed:', err);
    res.status(500).json({ error: 'Failed to load AI providers.' });
  }
});

// POST Create AI Provider (per-user, authenticated)
app.post('/api/ai/providers', async (req, res) => {
  if (!aiProviderMutateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const auth = await authenticateUser(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required. Sign in to manage AI providers.' });

  const { label, providerType, baseUrl, apiKey, model, extraHeadersJson, temperature, maxTokens, isDefault } = req.body;

  if (!label || !baseUrl || !apiKey || !model) {
    return res.status(400).json({ error: 'Label, Base URL, API Key, and Model are required.' });
  }

  try {
    const rows = await fetchUserProviders(auth.client, auth.userId);
    const makeDefault = Boolean(isDefault || rows.length === 0);
    if (makeDefault) await clearOtherDefaults(auth.client, auth.userId);

    const apiKeyEnc = encryptText(apiKey);
    const { data, error } = await auth.client
      .from('ai_provider_configs')
      .insert({
        user_id: auth.userId,
        label,
        provider_type: providerType || 'openai',
        base_url: baseUrl,
        api_key_enc: apiKeyEnc,
        model,
        extra_headers_json: extraHeadersJson ?? null,
        temperature: temperature ?? null,
        max_tokens: maxTokens ?? null,
        is_default: makeDefault,
        is_verified: false,
      })
      .select()
      .single();
    if (error || !data) throw error || new Error('Insert returned no row.');

    res.json({
      id: data.id,
      label: data.label,
      providerType: data.provider_type,
      baseUrl: data.base_url,
      apiKey: maskApiKey(apiKey),
      model: data.model,
      isDefault: data.is_default,
      isVerified: false,
    });
  } catch (err) {
    console.error('[ai/providers] Create failed:', err);
    res.status(500).json({ error: 'Failed to save AI provider.' });
  }
});
// PATCH Update AI Provider (per-user, authenticated)
app.patch('/api/ai/providers/:id', async (req, res) => {
  if (!aiProviderMutateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const auth = await authenticateUser(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required. Sign in to manage AI providers.' });

  const { label, providerType, baseUrl, apiKey, model, extraHeadersJson, temperature, maxTokens, isDefault } = req.body;

  try {
    const rows = await fetchUserProviders(auth.client, auth.userId);
    const provider = rows.find(p => p.id === req.params.id);
    if (!provider) {
      return res.status(404).json({ error: 'AI Provider configuration not found.' });
    }

    if (isDefault) await clearOtherDefaults(auth.client, auth.userId, provider.id);

    const updates: Record<string, unknown> = {};
    if (label) updates.label = label;
    if (providerType) updates.provider_type = providerType;
    if (baseUrl) updates.base_url = baseUrl;
    if (model) updates.model = model;
    if (extraHeadersJson !== undefined) updates.extra_headers_json = extraHeadersJson;
    if (temperature !== undefined) updates.temperature = temperature;
    if (maxTokens !== undefined) updates.max_tokens = maxTokens;
    if (isDefault) updates.is_default = true;
    if (apiKey && apiKey.trim().length > 0) {
      updates.api_key_enc = encryptText(apiKey);
      updates.is_verified = false; // Require re-test
    }

    const { error } = await auth.client
      .from('ai_provider_configs')
      .update(updates)
      .eq('id', provider.id)
      .eq('user_id', auth.userId);
    if (error) throw error;

    res.json({ success: true, id: provider.id });
  } catch (err) {
    console.error('[ai/providers] Update failed:', err);
    res.status(500).json({ error: 'Failed to update AI provider.' });
  }
});

// DELETE AI Provider (per-user, authenticated)
app.delete('/api/ai/providers/:id', async (req, res) => {
  if (!aiProviderMutateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const auth = await authenticateUser(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required. Sign in to manage AI providers.' });

  try {
    const { error } = await auth.client
      .from('ai_provider_configs')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', auth.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[ai/providers] Delete failed:', err);
    res.status(500).json({ error: 'Failed to delete AI provider.' });
  }
});

// POST Test Connection (per-user, authenticated)
app.post('/api/ai/providers/:id/test', async (req, res) => {
  if (!aiTestLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const auth = await authenticateUser(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required. Sign in to manage AI providers.' });

  let provider: ServerAIProvider;
  try {
    const rows = await fetchUserProviders(auth.client, auth.userId);
    const row = rows.find(p => p.id === req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'AI Provider configuration not found.' });
    }
    provider = mapRowToServer(row);
  } catch (err) {
    console.error('[ai/providers] Test lookup failed:', err);
    return res.status(500).json({ error: 'Failed to load AI provider.' });
  }

  let decryptedKey = '';
  try {
    decryptedKey = decryptText(provider.apiKeyEnc);
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt provider key.' });
  }

  const adapter = buildProviderAdapter({
    id: provider.id,
    label: provider.label,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl,
    apiKey: decryptedKey,
    model: provider.model,
    extraHeadersJson: provider.extraHeadersJson,
    temperature: provider.temperature,
    maxTokens: provider.maxTokens,
  });

  const startTime = Date.now();

  try {
    const testResponseText = await adapter.testConnection();

    const latencyMs = Date.now() - startTime;

    const { error: updateError } = await auth.client
      .from('ai_provider_configs')
      .update({
        is_verified: true,
        last_tested_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', provider.id)
      .eq('user_id', auth.userId);
    if (updateError) console.error('[ai/providers] Test-result persist failed:', updateError);

    res.json({
      ok: true,
      latencyMs,
      message: `✓ Connected — ready to use (${latencyMs}ms)`,
      sample: testResponseText,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    const { error: updateError } = await auth.client
      .from('ai_provider_configs')
      .update({
        is_verified: false,
        last_error: errorMsg,
        last_tested_at: new Date().toISOString(),
      })
      .eq('id', provider.id)
      .eq('user_id', auth.userId);
    if (updateError) console.error('[ai/providers] Test-result persist failed:', updateError);

    res.status(400).json({
      ok: false,
      error: `✗ Connection failed: ${errorMsg}`,
    });
  }
});

// Parse an OpenAI-compatible or Anthropic completion response, handling SSE streams
// (kept for backward compatibility with older code paths; new code goes through
// buildProviderAdapter in src/services/aiProviderAdapter.ts).

// POST Generate AI completions for TeXForge actions (per-user, authenticated)
app.post('/api/ai/generate', async (req, res) => {
  if (!aiGenerateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const auth = await authenticateUser(req);
  if (!auth) return res.status(401).json({ error: 'Authentication required. Sign in to use AI features.' });

  const { providerId, prompt, context } = req.body;

  let provider: ServerAIProvider;
  try {
    const rows = await fetchUserProviders(auth.client, auth.userId);
    const chosen = resolveDefaultProvider(rows, providerId);
    if (!chosen) {
      return res.status(400).json({
        error: 'No AI Provider configured. Please add an API key in Settings -> AI Providers.',
      });
    }
    provider = mapRowToServer(chosen);
  } catch (err) {
    console.error('[ai/generate] Provider lookup failed:', err);
    return res.status(500).json({ error: 'Failed to load AI provider configuration.' });
  }

  let decryptedKey = '';
  try {
    decryptedKey = decryptText(provider.apiKeyEnc);
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt API key.' });
  }

  const adapter = buildProviderAdapter({
    id: provider.id,
    label: provider.label,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl,
    apiKey: decryptedKey,
    model: provider.model,
    extraHeadersJson: provider.extraHeadersJson,
    temperature: provider.temperature,
    maxTokens: provider.maxTokens,
  });

  try {
    const systemPrompt = `You are TeXForge AI, an expert LaTeX co-author and debugging assistant embedded in the TeXForge web editor.

Respond in a helpful, structured teaching style. Follow these rules every time:

1. Be thorough and concrete: explain the problem briefly, then provide the exact working fix, ready to paste.
2. Ground your answer in the user's actual document: reference their file names, commands, and citations (e.g. \\cite{...}, \\begin{...}) when they appear in the context, and point out what will fail and why.
3. Include complete, valid LaTeX code snippets in fenced code blocks (\`\`\`latex ... \`\`\`). Include the surrounding environment when needed so it compiles as-is.
4. If a fix needs a supporting file (like a .bib, .cls, or .sty), show the minimal full file content, and also offer a simpler alternative that works without that file (e.g. show thebibliography as an alternative to BibTeX).
5. Use short sections and bullet points for readability. Keep prose tight and professional.
6. Never invent packages or commands that do not exist, and never guess — if something is not in the context, ask for it.
7. End with a short line inviting the user to tell you what to modify or debug next.

This is the context: write your answers in the language the user wrote in; if unsure, use English.`;

    const answer = await adapter.chat({
      system: systemPrompt,
      prompt: `${prompt}\n\nContext:\n${context || ''}`,
    });
    res.json({ result: answer, providerModel: provider.model });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `AI Provider Error: ${msg}` });
  }
});

// POST /api/compile - Server-side compile endpoint.
// Honest response: the server does NOT run a TeX engine. Compilation happens
// in-browser (see docs/compilation.md). Returning a canned success log here
// would be fake functionality, so this route reports the real state of the
// deployment instead of fabricating a PDF/transcript.
app.post('/api/compile', (_req, res) => {
  res.status(501).json({
    status: 'error',
    error: 'Server-side compilation is not available. Compilation runs in-browser (parser-based engine). A real TeX backend is planned — see docs/compilation.md.',
    diagnostics: [{ severity: 'error', file: 'main.tex', line: 1, message: 'Server-side TeX compilation is not implemented; compile from the editor instead.' }],
  });
});

// ================= SESSION / DEVICE MANAGEMENT (§34) =================
// Lists and revokes the caller's auth sessions via the GoTrue admin REST
// API (service-role only). Honest 501 when SUPABASE_SERVICE_ROLE_KEY is not
// configured, mirroring the /api/compile route's no-fabrication rule.

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function adminAuthHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function requireSessionToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return token || null;
}

// GET /api/sessions — list the caller's sessions (device, IP, timestamps).
app.get('/api/sessions', async (req, res) => {
  const token = requireSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });

  const sb = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) return res.status(401).json({ error: 'Invalid session token.' });

  if (!SERVICE_ROLE_KEY) {
    return res.status(501).json({ error: 'Session listing requires SUPABASE_SERVICE_ROLE_KEY on the server.' });
  }

  const claims = decodeJwtPayload(token);
  const currentSessionId = typeof claims?.session_id === 'string' ? claims.session_id : null;

  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/auth/v1/admin/sessions?user_id=${encodeURIComponent(userData.user.id)}`,
      { headers: adminAuthHeaders() },
    );
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to list sessions from the auth server.' });
    }
    const body = (await response.json()) as { sessions?: { id: string; created_at: string; updated_at: string; ip?: string; user_agent?: string }[] };
    const sessions = (body.sessions || []).map(s => ({
      id: s.id,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      ip: s.ip || '',
      userAgent: s.user_agent || '',
      current: s.id === currentSessionId,
    }));
    res.json({ sessions });
  } catch (err) {
    console.error('[sessions] Listing failed:', err);
    res.status(502).json({ error: 'Session listing failed.' });
  }
});

// DELETE /api/sessions/:id — revoke one of the caller's sessions.
app.delete('/api/sessions/:id', async (req, res) => {
  const token = requireSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });

  const sb = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) return res.status(401).json({ error: 'Invalid session token.' });

  if (!SERVICE_ROLE_KEY) {
    return res.status(501).json({ error: 'Session revocation requires SUPABASE_SERVICE_ROLE_KEY on the server.' });
  }

  const sessionId = req.params.id;
  if (!sessionId) return res.status(400).json({ error: 'Session id is required.' });

  try {
    // Ownership check: fetch the session first; only the owner may revoke it.
    const check = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/admin/sessions/${sessionId}`, {
      headers: adminAuthHeaders(),
    });
    if (!check.ok) return res.status(404).json({ error: 'Session not found.' });
    const session = (await check.json()) as { user_id?: string };
    if (session.user_id !== userData.user.id) {
      return res.status(403).json({ error: 'You can only revoke your own sessions.' });
    }

    const del = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/admin/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: adminAuthHeaders(),
    });
    if (!del.ok) {
      return res.status(del.status).json({ error: 'Failed to revoke session.' });
    }
    res.json({ success: true, id: sessionId });
  } catch (err) {
    console.error('[sessions] Revocation failed:', err);
    res.status(502).json({ error: 'Session revocation failed.' });
  }
});

// DELETE /api/sessions/others — revoke every session except the caller's own.
app.delete('/api/sessions/others', async (req, res) => {
  const token = requireSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Missing authorization token.' });

  const sb = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) return res.status(401).json({ error: 'Invalid session token.' });

  if (!SERVICE_ROLE_KEY) {
    return res.status(501).json({ error: 'Session revocation requires SUPABASE_SERVICE_ROLE_KEY on the server.' });
  }

  const claims = decodeJwtPayload(token);
  const currentSessionId = typeof claims?.session_id === 'string' ? claims.session_id : null;
  const { exceptSessionId } = req.body as { exceptSessionId?: string };
  const keepId = exceptSessionId || currentSessionId;

  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/auth/v1/admin/sessions?user_id=${encodeURIComponent(userData.user.id)}`,
      { headers: adminAuthHeaders() },
    );
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to list sessions from the auth server.' });
    }
    const body = (await response.json()) as { sessions?: { id: string }[] };
    const toRevoke = (body.sessions || []).filter(s => s.id !== keepId);

    for (const s of toRevoke) {
      await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/admin/sessions/${encodeURIComponent(s.id)}`, {
        method: 'DELETE',
        headers: adminAuthHeaders(),
      });
    }
    res.json({ success: true, revoked: toRevoke.length });
  } catch (err) {
    console.error('[sessions] Bulk revocation failed:', err);
    res.status(502).json({ error: 'Session revocation failed.' });
  }
});

// ================= CHAT RETENTION SWEEP (§40) =================
// Periodically deletes expired chat messages (per-user retention window or
// explicit expires_at). Requires the service role key; skips quietly when
// unset so the dev server never needs it.

function startChatRetentionSweep(intervalMs = 15 * 60_000): void {
  if (!SERVICE_ROLE_KEY) {
    console.warn('[retention] SUPABASE_SERVICE_ROLE_KEY not set — chat retention sweep disabled.');
    return;
  }
  const runSweep = async () => {
    try {
      const admin = createClient(process.env.VITE_SUPABASE_URL || '', SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await admin.rpc('sweep_expired_chat');
      if (error) throw error;
      if (typeof data === 'number' && data > 0) {
        console.log(`[retention] Swept ${data} expired chat message(s).`);
      }
    } catch (err) {
      console.error('[retention] Sweep failed:', err);
    }
  };
  runSweep();
  setInterval(runSweep, intervalMs);
}

// ================= REAL-TIME COLLABORATION (Yjs over WebSocket) =================
// Rooms follow the plan's naming scheme: `project:<projectId>:file:<encodedPath>`.
// Access is authorized at connection time (upgrade) using the caller's Supabase
// session token: the server validates the token and the caller's access to the
// project before the WebSocket is accepted. No document content is ever used
// for authorization.

const COLLAB_PATH = '/collab';
const collabTokenByRoom = new Map<string, string>();
const collabClientByToken = new Map<string, SupabaseClient>();

const COLLAB_SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const COLLAB_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

function supabaseForCollabToken(token: string) {
  let client = collabClientByToken.get(token);
  if (!client) {
    client = createClient(COLLAB_SUPABASE_URL, COLLAB_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Bound the token cache so stale sessions can't accumulate unbounded.
    if (collabClientByToken.size > 100) collabClientByToken.clear();
    collabClientByToken.set(token, client);
  }
  return client;
}

// Parse a room name back into its project id and file path.
function parseCollabRoom(room: string): { projectId: string; filePath: string } | null {
  const match = /^project:([^:]+):file:(.+)$/.exec(room);
  if (!match) return null;
  const filePath = decodeURIComponent(match[2]);
  return { projectId: match[1], filePath };
}

// Seed a freshly created room document from the persisted project file. This
// is authoritative (server-side, race-free) and what makes reconnects and
// server restarts consistent with what the clients have in their databases.
setContentInitializor(async ydoc => {
  // WSSharedDoc carries the room name; Y.Doc's public type doesn't expose it.
  const roomName = (ydoc as unknown as { name?: string }).name || '';
  const room = parseCollabRoom(roomName);
  if (!room) return;
  try {
    const token = collabTokenByRoom.get(roomName);
    if (!token) return;
    const sb = supabaseForCollabToken(token);
    const { data: row } = await sb
      .from('project_files')
      .select('content')
      .eq('project_id', room.projectId)
      .eq('path', room.filePath)
      .maybeSingle();
    const content: string | undefined = (row as { content?: string } | null)?.content;
    const ytext = ydoc.getText('content');
    if (content && ytext.toString() === '') {
      ydoc.transact(() => ytext.insert(0, content), 'seed');
    }
  } catch (err) {
    console.error('Collab seed failed for room', roomName, err);
  }
});

const collabWss = new WebSocketServer({ noServer: true });
let collabHostServer: http.Server | null = null;

function attachCollabUpgrade(server: http.Server) {
  if (collabHostServer === server) return;
  collabHostServer = server;
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname !== COLLAB_PATH) {
      socket.destroy();
      return;
    }
    const token = url.searchParams.get('token') || '';
    const projectId = url.searchParams.get('project') || '';
    const filePath = sanitizeProjectFilePath(url.searchParams.get('file') || '');
    if (!collabConnectLimiter.allow(clientIp(request))) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const reject = (code: string) => {
      socket.write(`HTTP/1.1 ${code}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };

    if (!COLLAB_SUPABASE_URL || !COLLAB_SUPABASE_ANON_KEY) {
      reject('503 Service Unavailable');
      return;
    }
    if (!token || !projectId || !filePath || !/\.(tex|bib)$/i.test(filePath)) {
      reject('400 Bad Request');
      return;
    }

    const room = `project:${projectId}:file:${encodeURIComponent(filePath)}`;

    (async () => {
      try {
        const sb = supabaseForCollabToken(token);
        const { data: userData, error: userError } = await sb.auth.getUser();
        if (userError || !userData?.user) {
          reject('401 Unauthorized');
          return;
        }
        const { data: projectRow } = await sb
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .maybeSingle();
        if (!projectRow) {
          reject('403 Forbidden');
          return;
        }
        collabTokenByRoom.set(room, token);
        if (collabTokenByRoom.size > 500) collabTokenByRoom.clear();
        collabWss.handleUpgrade(request, socket, head, ws => {
          collabWss.emit('connection', ws, request, room);
        });
      } catch (err) {
        console.error('Collab auth failed:', err);
        reject('500 Internal Server Error');
      }
    })();
  });

  collabWss.on('connection', (ws, request, room: string) => {
    setupWSConnection(ws, request, { docName: room });
  });
}

// ================= VITE / SERVE MIDDLEWARE =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  attachCollabUpgrade(server);
  startChatRetentionSweep();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TeXForge Server listening on http://localhost:${PORT}`);
    console.log(`Collab WebSocket endpoint: ws(s)://<host>:${PORT}${COLLAB_PATH}`);
  });
}

startServer();
