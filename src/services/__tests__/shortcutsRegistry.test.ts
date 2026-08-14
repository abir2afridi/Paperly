import { describe, it, expect } from 'vitest';
import { SHORTCUTS, SHORTCUT_CATEGORIES } from '../shortcutsRegistry';

describe('shortcutsRegistry (§33)', () => {
  it('exposes at least one shortcut per documented category', () => {
    for (const cat of SHORTCUT_CATEGORIES) {
      expect(SHORTCUTS.some(s => s.category === cat)).toBe(true);
    }
  });

  it('keeps ids unique and key combos unique', () => {
    const ids = SHORTCUTS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    const combos = SHORTCUTS.map(s => s.keys.join('+'));
    expect(new Set(combos).size).toBe(combos.length);
  });

  it('documents the cheatsheet toggle (Ctrl+/) which opens the modal', () => {
    const shortcuts = SHORTCUTS.find(s => s.id === 'shortcuts');
    expect(shortcuts?.keys).toEqual(['Ctrl', '/']);
  });

  it('every entry has an action, keys and description', () => {
    for (const s of SHORTCUTS) {
      expect(s.action.trim().length).toBeGreaterThan(0);
      expect(s.keys.length).toBeGreaterThan(0);
      expect(s.description.trim().length).toBeGreaterThan(0);
    }
  });
});