export type ThemeId = 'overleaf-dark' | 'overleaf-light' | 'nordic-polar' | 'solarized-warm' | 'emerald-night';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  monacoThemeId: string;
  colors: {
    bgHeader: string;
    bgWorkspace: string;
    bgEditor: string;
    bgSidebar: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    border: string;
    previewDotBg: string;
  };
  cssVars: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'overleaf-light',
    name: 'Overleaf Light',
    description: 'Crisp white & red classic editor theme, ideal for daytime document writing.',
    mode: 'light',
    monacoThemeId: 'overleaf-light-theme',
    colors: {
      bgHeader: '#ffffff',
      bgWorkspace: '#f8fafc',
      bgEditor: '#ffffff',
      bgSidebar: '#f1f5f9',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      accent: '#d11111',
      border: '#e2e8f0',
      previewDotBg: '#d11111',
    },
    cssVars: {
      '--th-bg': '#ffffff',
      '--th-surface-2': '#f8fafc',
      '--th-surface-3': '#f1f5f9',
      '--th-surface-4': '#e2e8f0',
      '--th-border': '#cbd5e1',
      '--th-border-2': '#94a3b8',
      '--th-text': '#0f172a',
      '--th-text-2': '#334155',
      '--th-text-3': '#475569',
      '--th-text-4': '#64748b',
      '--th-code': '#020617',
      '--th-red': '#fef2f2',
      '--th-accent': '#d11111',
      '--th-on-accent': '#ffffff',
    },
  },
  {
    id: 'overleaf-dark',
    name: 'Overleaf Dark',
    description: 'Classic slate dark theme with high-contrast LaTeX syntax highlighting.',
    mode: 'dark',
    monacoThemeId: 'overleaf-dark-theme',
    colors: {
      bgHeader: '#0f172a',
      bgWorkspace: '#1e293b',
      bgEditor: '#0f172a',
      bgSidebar: '#1e293b',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      accent: '#ef4444',
      border: '#334155',
      previewDotBg: '#ef4444',
    },
    cssVars: {
      '--th-bg': '#0f172a',
      '--th-surface-2': '#1e293b',
      '--th-surface-3': '#273244',
      '--th-surface-4': '#334155',
      '--th-border': '#475569',
      '--th-border-2': '#334155',
      '--th-text': '#f8fafc',
      '--th-text-2': '#e2e8f0',
      '--th-text-3': '#cbd5e1',
      '--th-text-4': '#94a3b8',
      '--th-code': '#0b1220',
      '--th-red': '#2b1215',
      '--th-accent': '#ef4444',
      '--th-on-accent': '#ffffff',
    },
  },
  {
    id: 'nordic-polar',
    name: 'Nordic Polar',
    description: 'Arctic blue dark palette engineered for low eye-strain focus during night editing.',
    mode: 'dark',
    monacoThemeId: 'nordic-polar-theme',
    colors: {
      bgHeader: '#2e3440',
      bgWorkspace: '#3b4252',
      bgEditor: '#2e3440',
      bgSidebar: '#3b4252',
      textPrimary: '#eceff4',
      textSecondary: '#d8dee9',
      accent: '#88c0d0',
      border: '#4c566a',
      previewDotBg: '#88c0d0',
    },
    cssVars: {
      '--th-bg': '#2e3440',
      '--th-surface-2': '#3b4252',
      '--th-surface-3': '#434c5e',
      '--th-surface-4': '#4c566a',
      '--th-border': '#5b6478',
      '--th-border-2': '#4c566a',
      '--th-text': '#eceff4',
      '--th-text-2': '#d8dee9',
      '--th-text-3': '#aab4c8',
      '--th-text-4': '#8f9bb0',
      '--th-code': '#242933',
      '--th-red': '#453942',
      '--th-accent': '#88c0d0',
      '--th-on-accent': '#2e3440',
    },
  },
  {
    id: 'solarized-warm',
    name: 'Solarized Warm',
    description: 'Gentle warm paper tone with tuned contrast to minimize glare.',
    mode: 'light',
    monacoThemeId: 'solarized-warm-theme',
    colors: {
      bgHeader: '#eee8d5',
      bgWorkspace: '#fdf6e3',
      bgEditor: '#fdf6e3',
      bgSidebar: '#eee8d5',
      textPrimary: '#073642',
      textSecondary: '#657b83',
      accent: '#cb4b16',
      border: '#d33682',
      previewDotBg: '#cb4b16',
    },
    cssVars: {
      '--th-bg': '#fdf6e3',
      '--th-surface-2': '#f6eeda',
      '--th-surface-3': '#eee8d5',
      '--th-surface-4': '#e4dcc4',
      '--th-border': '#d3c9ae',
      '--th-border-2': '#93a1a1',
      '--th-text': '#073642',
      '--th-text-2': '#586e75',
      '--th-text-3': '#657b83',
      '--th-text-4': '#839496',
      '--th-code': '#002b36',
      '--th-red': '#f7ead9',
      '--th-accent': '#cb4b16',
      '--th-on-accent': '#073642',
    },
  },
  {
    id: 'emerald-night',
    name: 'Emerald Night',
    description: 'Deep forest green theme with bright mint accents for code immersion.',
    mode: 'dark',
    monacoThemeId: 'emerald-night-theme',
    colors: {
      bgHeader: '#062c22',
      bgWorkspace: '#0a3a2f',
      bgEditor: '#041f18',
      bgSidebar: '#0a3a2f',
      textPrimary: '#ecfdf5',
      textSecondary: '#a7f3d0',
      accent: '#10b981',
      border: '#059669',
      previewDotBg: '#10b981',
    },
    cssVars: {
      '--th-bg': '#041f18',
      '--th-surface-2': '#0a3a2f',
      '--th-surface-3': '#0f4d3d',
      '--th-surface-4': '#15614a',
      '--th-border': '#1a7057',
      '--th-border-2': '#0d7a5c',
      '--th-text': '#ecfdf5',
      '--th-text-2': '#a7f3d0',
      '--th-text-3': '#6ee7b7',
      '--th-text-4': '#34d399',
      '--th-code': '#02150f',
      '--th-red': '#3a2520',
      '--th-accent': '#10b981',
      '--th-on-accent': '#02150f',
    },
  },
];

const THEME_STORAGE_KEY = 'texforge_theme_id';

export function getStoredThemeId(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEMES.some(t => t.id === saved)) {
      return saved as ThemeId;
    }
  } catch (e) {
    console.error('Failed to read theme from localStorage', e);
  }
  return 'overleaf-light';
}

export function setStoredThemeId(themeId: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.error('Failed to save theme to localStorage', e);
  }
}

export function getThemeDefinition(themeId: ThemeId): ThemeDefinition {
  return THEMES.find(t => t.id === themeId) || THEMES[0];
}

// Returns the opposite mode (light <-> dark) counterpart theme id
export function getOppositeThemeId(themeId: ThemeId): ThemeId {
  const theme = getThemeDefinition(themeId);
  return theme.mode === 'dark' ? 'overleaf-light' : 'overleaf-dark';
}

export function applyThemeToDOM(theme: ThemeDefinition): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-theme-mode', theme.mode);

  if (theme.mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  Object.entries(theme.cssVars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
}
