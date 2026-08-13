import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { setContentInitializor, setupWSConnection } from '@y/websocket-server/utils';
import { sanitizeProjectFilePath } from './src/services/zipSecurity';
import { createRateLimiter, clientIp } from './src/services/rateLimit';
import { renderEmailTemplate, sendEmailViaResend } from './src/services/emailTemplates';
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

function maskApiKey(key: string): string {
  if (!key || key.length < 6) return '••••••••';
  return key.slice(0, 3) + '••••••••' + key.slice(-4);
}

// In-memory data store for AI Provider configurations
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

const aiProvidersStore: ServerAIProvider[] = [];

// Persistent storage for AI provider configs (apiKeyEnc is AES-GCM encrypted)
const PROVIDERS_FILE = path.join(process.cwd(), '.texforge-ai-providers.json');

function saveProviders(): void {
  try {
    fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(aiProvidersStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist AI providers:', err);
  }
}

function loadProviders(): void {
  try {
    if (!fs.existsSync(PROVIDERS_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      aiProvidersStore.splice(0, aiProvidersStore.length, ...raw);
    }
  } catch (err) {
    console.error('Failed to load AI providers:', err);
  }
}

loadProviders();

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

// GET AI Providers
app.get('/api/ai/providers', (_req, res) => {
  const sanitized = aiProvidersStore.map(p => {
    let rawKey = '';
    try {
      rawKey = decryptText(p.apiKeyEnc);
    } catch {
      rawKey = '';
    }
    return {
      id: p.id,
      label: p.label,
      providerType: p.providerType,
      baseUrl: p.baseUrl,
      apiKey: maskApiKey(rawKey),
      model: p.model,
      extraHeadersJson: p.extraHeadersJson,
      temperature: p.temperature,
      maxTokens: p.maxTokens,
      isDefault: p.isDefault,
      isVerified: p.isVerified,
      lastTestedAt: p.lastTestedAt,
      lastError: p.lastError,
    };
  });
  res.json(sanitized);
});

// POST Create AI Provider
app.post('/api/ai/providers', (req, res) => {
  if (!aiProviderMutateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const { label, providerType, baseUrl, apiKey, model, extraHeadersJson, temperature, maxTokens, isDefault } = req.body;

  if (!label || !baseUrl || !apiKey || !model) {
    return res.status(400).json({ error: 'Label, Base URL, API Key, and Model are required.' });
  }

  if (isDefault) {
    aiProvidersStore.forEach(p => (p.isDefault = false));
  }

  const id = `provider-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const apiKeyEnc = encryptText(apiKey);

  const newProvider: ServerAIProvider = {
    id,
    userId: 'default-user',
    label,
    providerType: providerType || 'openai',
    baseUrl,
    apiKeyEnc,
    model,
    extraHeadersJson,
    temperature,
    maxTokens,
    isDefault: Boolean(isDefault || aiProvidersStore.length === 0),
    isVerified: false,
  };

  aiProvidersStore.push(newProvider);
  saveProviders();

  res.json({
    id: newProvider.id,
    label: newProvider.label,
    providerType: newProvider.providerType,
    baseUrl: newProvider.baseUrl,
    apiKey: maskApiKey(apiKey),
    model: newProvider.model,
    isDefault: newProvider.isDefault,
    isVerified: false,
  });
});

// PATCH Update AI Provider
app.patch('/api/ai/providers/:id', (req, res) => {
  if (!aiProviderMutateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const provider = aiProvidersStore.find(p => p.id === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'AI Provider configuration not found.' });
  }

  const { label, providerType, baseUrl, apiKey, model, extraHeadersJson, temperature, maxTokens, isDefault } = req.body;

  if (label) provider.label = label;
  if (providerType) provider.providerType = providerType;
  if (baseUrl) provider.baseUrl = baseUrl;
  if (model) provider.model = model;
  if (extraHeadersJson !== undefined) provider.extraHeadersJson = extraHeadersJson;
  if (temperature !== undefined) provider.temperature = temperature;
  if (maxTokens !== undefined) provider.maxTokens = maxTokens;

  if (apiKey && apiKey.trim().length > 0) {
    provider.apiKeyEnc = encryptText(apiKey);
    provider.isVerified = false; // Require re-test
  }

  if (isDefault) {
    aiProvidersStore.forEach(p => (p.isDefault = false));
    provider.isDefault = true;
  }

  saveProviders();

  res.json({ success: true, id: provider.id });
});

// DELETE AI Provider
app.delete('/api/ai/providers/:id', (req, res) => {
  if (!aiProviderMutateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const idx = aiProvidersStore.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    aiProvidersStore.splice(idx, 1);
  }
  saveProviders();
  res.json({ success: true });
});

// POST Test Connection
app.post('/api/ai/providers/:id/test', async (req, res) => {
  if (!aiTestLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const provider = aiProvidersStore.find(p => p.id === req.params.id);
  if (!provider) {
    return res.status(404).json({ error: 'AI Provider configuration not found.' });
  }

  let decryptedKey = '';
  try {
    decryptedKey = decryptText(provider.apiKeyEnc);
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt provider key.' });
  }

  const startTime = Date.now();

  try {
    let testResponseText = '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.extraHeadersJson) {
      try {
        const extra = JSON.parse(provider.extraHeadersJson);
        Object.assign(headers, extra);
      } catch {
        // Ignore JSON error
      }
    }

    if (provider.providerType === 'anthropic') {
      headers['x-api-key'] = decryptedKey;
      headers['anthropic-version'] = '2023-06-01';

      const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Ping' }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errText}`);
      }
      testResponseText = 'Anthropic response received.';
    } else {
      // OpenAI / OpenAI-compatible default
      headers['Authorization'] = `Bearer ${decryptedKey}`;

      const targetUrl = provider.baseUrl.includes('/chat/completions')
        ? provider.baseUrl
        : `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: 'user', content: 'Ping test' }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Provider API error (${response.status}): ${errText}`);
      }
      testResponseText = 'OpenAI-compatible response received.';
    }

    const latencyMs = Date.now() - startTime;
    provider.isVerified = true;
    provider.lastTestedAt = new Date().toISOString();
    provider.lastError = undefined;
    saveProviders();

    res.json({
      ok: true,
      latencyMs,
      message: `✓ Connected — ready to use (${latencyMs}ms)`,
      sample: testResponseText,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    provider.isVerified = false;
    provider.lastError = errorMsg;
    provider.lastTestedAt = new Date().toISOString();
    saveProviders();

    res.status(400).json({
      ok: false,
      error: `✗ Connection failed: ${errorMsg}`,
    });
  }
});

// Parse an OpenAI-compatible or Anthropic completion response, handling SSE streams
function parseCompletionBody(rawBody: string, providerType: string): string {
  const trimmed = rawBody.trim();
  if (trimmed.startsWith('data:')) {
    let fullText = '';
    for (const line of trimmed.split('\n')) {
      const l = line.trim();
      if (!l.startsWith('data:')) continue;
      const payload = l.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        if (providerType === 'anthropic') {
          if (obj.type === 'content_block_delta' && typeof obj.delta?.text === 'string') {
            fullText += obj.delta.text;
          }
        } else {
          const delta = obj.choices?.[0]?.delta?.content;
          const content = obj.choices?.[0]?.message?.content;
          if (typeof delta === 'string') fullText += delta;
          else if (typeof content === 'string') fullText += content;
        }
      } catch {
        // Skip malformed stream chunk
      }
    }
    return fullText || 'No response generated.';
  }

  const data = JSON.parse(trimmed);
  if (providerType === 'anthropic') {
    return data.content?.[0]?.text || 'No response generated.';
  }
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

// POST Generate AI completions for TeXForge actions
app.post('/api/ai/generate', async (req, res) => {
  if (!aiGenerateLimiter.allow(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  const { providerId, prompt, context } = req.body;

  let provider = aiProvidersStore.find(p => p.id === providerId);
  if (!provider) {
    provider = aiProvidersStore.find(p => p.isDefault) || aiProvidersStore[0];
  }

  if (!provider) {
    return res.status(400).json({
      error: 'No AI Provider configured. Please add an API key in Settings -> AI Providers.',
    });
  }

  let decryptedKey = '';
  try {
    decryptedKey = decryptText(provider.apiKeyEnc);
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt API key.' });
  }

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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.providerType === 'anthropic') {
      headers['x-api-key'] = decryptedKey;
      headers['anthropic-version'] = '2023-06-01';

      const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          max_tokens: provider.maxTokens || 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: `${prompt}\n\nContext:\n${context || ''}` }],
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const answer = parseCompletionBody(await response.text(), 'anthropic');
      res.json({ result: answer, providerModel: provider.model });
    } else {
      headers['Authorization'] = `Bearer ${decryptedKey}`;

      const targetUrl = provider.baseUrl.includes('/chat/completions')
        ? provider.baseUrl
        : `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${prompt}\n\nContext:\n${context || ''}` },
          ],
          temperature: provider.temperature ?? 0.3,
          max_tokens: provider.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const answer = parseCompletionBody(await response.text(), provider.providerType);
      res.json({ result: answer, providerModel: provider.model });
    }
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

// ================= REAL-TIME COLLABORATION (Yjs over WebSocket) =================
// Rooms follow the plan's naming scheme: `project:<projectId>:file:<encodedPath>`.
// Access is authorized at connection time (upgrade) using the caller's Supabase
// session token: the server validates the token and the caller's access to the
// project before the WebSocket is accepted. No document content is ever used
// for authorization.

const COLLAB_PATH = '/collab';
const collabTokenByRoom = new Map<string, string>();
const collabClientByToken = new Map<string, ReturnType<typeof createClient>>();

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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TeXForge Server listening on http://localhost:${PORT}`);
    console.log(`Collab WebSocket endpoint: ws(s)://<host>:${PORT}${COLLAB_PATH}`);
  });
}

startServer();
