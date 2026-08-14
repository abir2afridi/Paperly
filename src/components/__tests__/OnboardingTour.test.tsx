import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasSeenTour, markTourSeen } from '../OnboardingTour';

// The repo's test environment is node (no jsdom); stub localStorage.
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  return store;
}

describe('OnboardingTour storage', () => {
  beforeEach(() => installStorage());
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).localStorage;
  });

  it('starts unseen', () => {
    expect(hasSeenTour()).toBe(false);
  });

  it('records that the tour was shown', () => {
    markTourSeen();
    expect(hasSeenTour()).toBe(true);
  });

  it('tolerates unavailable localStorage', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(hasSeenTour()).toBe(false);
    expect(() => markTourSeen()).not.toThrow();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});