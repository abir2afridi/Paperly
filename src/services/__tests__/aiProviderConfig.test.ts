import { describe, it, expect } from 'vitest';
import {
  ProviderConfigRow,
  maskApiKey,
  resolveDefaultProvider,
  sanitizeProviderConfig,
} from '../aiProviderConfig';

function row(overrides: Partial<ProviderConfigRow> = {}): ProviderConfigRow {
  return {
    id: 'p1',
    user_id: 'user-1',
    label: 'OpenRouter',
    provider_type: 'openai',
    base_url: 'https://openrouter.ai/api/v1',
    api_key_enc: 'enc:abc123',
    model: 'anthropic/claude-3.5-sonnet',
    extra_headers_json: null,
    temperature: null,
    max_tokens: null,
    is_default: false,
    is_verified: false,
    last_tested_at: null,
    last_error: null,
    ...overrides,
  };
}

describe('maskApiKey', () => {
  it('masks the middle of a long key', () => {
    const masked = maskApiKey('sk-abcdefghijkl');
    expect(masked).not.toContain('abcdefghijkl');
    expect(masked).toContain('sk-');
    expect(masked).toContain('jkl');
  });

  it('returns dots for short or missing keys', () => {
    expect(maskApiKey('')).toBe('••••••••');
    expect(maskApiKey('abc')).toBe('••••••••');
  });
});

describe('sanitizeProviderConfig', () => {
  it('never exposes the encrypted key and masks the decrypted one', () => {
    const out = sanitizeProviderConfig(row(), () => 'sk-super-secret-value-1234');
    expect(out).not.toHaveProperty('apiKeyEnc');
    expect(out.apiKey).not.toContain('super-secret');
    expect(out.id).toBe('p1');
    expect(out.isDefault).toBe(false);
  });

  it('falls back to a masked placeholder when decryption fails', () => {
    const out = sanitizeProviderConfig(row(), () => {
      throw new Error('bad ciphertext');
    });
    expect(out.apiKey).toBe('••••••••');
  });

  it('maps snake_case columns to the client payload', () => {
    const out = sanitizeProviderConfig(
      row({ provider_type: 'anthropic', is_default: true, last_tested_at: '2026-08-15T00:00:00Z' }),
      () => 'key',
    );
    expect(out.providerType).toBe('anthropic');
    expect(out.isDefault).toBe(true);
    expect(out.lastTestedAt).toBe('2026-08-15T00:00:00Z');
  });
});

describe('resolveDefaultProvider', () => {
  it('prefers the requested id', () => {
    const providers = [
      { id: 'a', is_default: false },
      { id: 'b', is_default: true },
    ];
    expect(resolveDefaultProvider(providers, 'a')?.id).toBe('a');
  });

  it('falls back to the default, then the first provider', () => {
    expect(resolveDefaultProvider([{ id: 'a', is_default: false }])?.id).toBe('a');
    const two = [
      { id: 'x', is_default: false },
      { id: 'y', is_default: true },
    ];
    expect(resolveDefaultProvider(two, 'missing')?.id).toBe('y');
  });

  it('returns null when there are no providers', () => {
    expect(resolveDefaultProvider([])).toBeNull();
  });
});