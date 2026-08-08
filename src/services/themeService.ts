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
      '--app-bg': '#f8fafc',
      '--app-text': '#0f172a',
      '--app-[#D11111]': '#d11111',
      '--header-bg': '#ffffff',
      '--header-border': '#d11111',
      '--sidebar-bg': '#f8fafc',
      '--editor-bg': '#ffffff',
      '--panel-border': '#e2e8f0',
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
      '--app-bg': '#0f172a',
      '--app-text': '#f8fafc',
      '--app-[#D11111]': '#ef4444',
      '--header-bg': '#0f172a',
      '--header-border': '#ef4444',
      '--sidebar-bg': '#1e293b',
      '--editor-bg': '#0f172a',
      '--panel-border': '#334155',
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
      '--app-bg': '#2e3440',
      '--app-text': '#eceff4',
      '--app-[#D11111]': '#88c0d0',
      '--header-bg': '#2e3440',
      '--header-border': '#88c0d0',
      '--sidebar-bg': '#3b4252',
      '--editor-bg': '#2e3440',
      '--panel-border': '#4c566a',
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
      '--app-bg': '#fdf6e3',
      '--app-text': '#073642',
      '--app-[#D11111]': '#cb4b16',
      '--header-bg': '#eee8d5',
      '--header-border': '#cb4b16',
      '--sidebar-bg': '#eee8d5',
      '--editor-bg': '#fdf6e3',
      '--panel-border': '#d33682',
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
      '--app-bg': '#041f18',
      '--app-text': '#ecfdf5',
      '--app-[#D11111]': '#10b981',
      '--header-bg': '#062c22',
      '--header-border': '#10b981',
      '--sidebar-bg': '#0a3a2f',
      '--editor-bg': '#041f18',
      '--panel-border': '#059669',
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
