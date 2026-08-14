/**
 * Per-user AI provider configuration helpers (§8A).
 *
 * The web server stores each user's AI provider configs in the
 * `ai_provider_configs` table (api keys AES-GCM encrypted at rest) instead of
 * a shared JSON file. These pure helpers keep the route logic testable:
 * response sanitization (never leak the raw key) and default-provider
 * resolution.
 */

export interface ProviderConfigRow {
  id: string;
  user_id: string;
  label: string;
  provider_type: 'openai' | 'anthropic' | 'custom';
  base_url: string;
  api_key_enc: string;
  model: string;
  extra_headers_json: string | null;
  temperature: number | null;
  max_tokens: number | null;
  is_default: boolean;
  is_verified: boolean;
  last_tested_at: string | null;
  last_error: string | null;
}

export interface SanitizedProviderConfig {
  id: string;
  label: string;
  providerType: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeadersJson: string | null;
  temperature: number | null;
  maxTokens: number | null;
  isDefault: boolean;
  isVerified: boolean;
  lastTestedAt: string | null;
  lastError: string | null;
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 6) return '••••••••';
  return key.slice(0, 3) + '••••••••' + key.slice(-4);
}

/** Server-side shape → safe client payload. `decrypt` never throws on bad input. */
export function sanitizeProviderConfig(
  row: ProviderConfigRow,
  decrypt: (encrypted: string) => string,
): SanitizedProviderConfig {
  let rawKey = '';
  try {
    rawKey = decrypt(row.api_key_enc);
  } catch {
    rawKey = '';
  }
  return {
    id: row.id,
    label: row.label,
    providerType: row.provider_type,
    baseUrl: row.base_url,
    apiKey: maskApiKey(rawKey),
    model: row.model,
    extraHeadersJson: row.extra_headers_json,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    isDefault: row.is_default,
    isVerified: row.is_verified,
    lastTestedAt: row.last_tested_at,
    lastError: row.last_error,
  };
}

/**
 * Resolve which provider a generation request should use:
 * the requested id when it exists, otherwise the user's default, otherwise
 * the first provider, otherwise null.
 */
export function resolveDefaultProvider<T extends { id: string; is_default: boolean }>(
  providers: T[],
  requestedId?: string,
): T | null {
  if (requestedId) {
    const match = providers.find(p => p.id === requestedId);
    if (match) return match;
  }
  return providers.find(p => p.is_default) ?? providers[0] ?? null;
}
