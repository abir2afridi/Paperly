/**
 * Keyboard shortcuts registry (§33) — the single source of truth for every
 * workspace shortcut. The shortcuts cheatsheet modal (ShortcutsModal) renders
 * entirely from this list, so adding or changing a key binding never leaves
 * the documentation stale.
 */

export interface ShortcutEntry {
  id: string;
  category: 'Compilation & Build' | 'Editor & Formatting' | 'Navigation & Views' | 'Tools & Modals';
  action: string;
  keys: string[];
  description: string;
}

export const SHORTCUTS: ShortcutEntry[] = [
  {
    id: 'compile',
    category: 'Compilation & Build',
    action: 'Compile LaTeX Project',
    keys: ['Ctrl', 'Enter'],
    description: 'Trigger instant WebAssembly pdfTeX compilation and update PDF view',
  },
  {
    id: 'shortcuts',
    category: 'Navigation & Views',
    action: 'Keyboard Shortcuts Cheatsheet',
    keys: ['Ctrl', '/'],
    description: 'Toggle this interactive searchable shortcuts overlay modal',
  },
  {
    id: 'math',
    category: 'Tools & Modals',
    action: 'Math & Symbol Palette',
    keys: ['Ctrl', 'M'],
    description: 'Open LaTeX mathematical equation symbols and formula generator',
  },
  {
    id: 'ctan-palette',
    category: 'Tools & Modals',
    action: 'CTAN Package Palette',
    keys: ['Ctrl', 'Shift', 'P'],
    description: 'Search the static CTAN package index and insert \\usepackage at the correct preamble position',
  },
  {
    id: 'ai-panel',
    category: 'Tools & Modals',
    action: 'Toggle AI Assistant Panel',
    keys: ['Ctrl', 'K'],
    description: 'Open AI Assistant for LaTeX error debugging, polishing, and equation building',
  },
  {
    id: 'doi-modal',
    category: 'Tools & Modals',
    action: 'DOI Citation Import',
    keys: ['Ctrl', 'Shift', 'D'],
    description: 'Lookup BibTeX citations by DOI or PubMed ID and append to references.bib',
  },
  {
    id: 'table-modal',
    category: 'Tools & Modals',
    action: 'Table Generator Modal',
    keys: ['Ctrl', 'Shift', 'T'],
    description: 'Interactive visual spreadsheet matrix to clean LaTeX table generator',
  },
  {
    id: 'save',
    category: 'Compilation & Build',
    action: 'Save Version Checkpoint',
    keys: ['Ctrl', 'S'],
    description: 'Save current workspace files into project version snapshot timeline',
  },
  {
    id: 'search-editor',
    category: 'Editor & Formatting',
    action: 'Find & Replace',
    keys: ['Ctrl', 'F'],
    description: 'Find and replace text strings within Monaco code editor',
  },
  {
    id: 'chat-panel',
    category: 'Navigation & Views',
    action: 'Toggle Team Discussion Stream',
    keys: ['Ctrl', 'Shift', 'C'],
    description: 'Open slide-out peer review discussion and real-time team stream',
  },
  {
    id: 'bold-text',
    category: 'Editor & Formatting',
    action: 'Bold Text (\\textbf)',
    keys: ['Ctrl', 'B'],
    description: 'Wrap selected text in LaTeX \\textbf{...} command',
  },
  {
    id: 'italic-text',
    category: 'Editor & Formatting',
    action: 'Italic Text (\\textit)',
    keys: ['Ctrl', 'I'],
    description: 'Wrap selected text in LaTeX \\textit{...} command',
  },
  {
    id: 'history-modal',
    category: 'Navigation & Views',
    action: 'Version History Timeline',
    keys: ['Ctrl', 'H'],
    description: 'Inspect saved document checkpoints and restore previous source code diffs',
  },
];

/** Unique shortcut categories, in the order they appear in the registry. */
export const SHORTCUT_CATEGORIES: string[] = [
  'Compilation & Build',
  'Editor & Formatting',
  'Navigation & Views',
  'Tools & Modals',
];
