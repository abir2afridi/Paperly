import { describe, it, expect, afterEach, vi } from 'vitest';
import { collabUserColor } from '../collab';

describe('collabUserColor', () => {
  it('is deterministic per client id', () => {
    expect(collabUserColor(1)).toBe(collabUserColor(1));
  });

  it('cycles through a small fixed palette', () => {
    const colors = new Set([collabUserColor(0), collabUserColor(1), collabUserColor(2), collabUserColor(3)]);
    expect(colors.size).toBe(4);
    expect([...colors].every(c => /^#[0-9A-F]{6}$/i.test(c))).toBe(true);
  });

  it('clips very large client ids', () => {
    expect(collabUserColor(Number.MAX_SAFE_INTEGER)).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe('collab room helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('derives a same-origin ws URL on the web', async () => {
    const { collabServerUrl } = await import('../collab');
    vi.stubGlobal('window', {
      location: { protocol: 'https:', host: 'paperly.example.com' },
    });
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);
    expect(collabServerUrl()).toBe('wss://paperly.example.com/collab');
  });

  it('uses the explicit VITE_COLLAB_URL override', async () => {
    const { collabServerUrl } = await import('../collab');
    vi.stubEnv('VITE_COLLAB_URL', 'ws://127.0.0.1:3000/collab');
    vi.stubGlobal('window', {
      location: { protocol: 'https:', host: 'paperly.example.com' },
    });
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);
    expect(collabServerUrl()).toBe('ws://127.0.0.1:3000/collab');
  });

  it('returns null inside a Tauri window without an explicit URL', async () => {
    const { collabServerUrl } = await import('../collab');
    vi.stubGlobal('window', {
      location: { protocol: 'tauri:', host: 'paperly' },
      __TAURI_INTERNALS__: {},
    });
    expect(collabServerUrl()).toBeNull();
  });
});