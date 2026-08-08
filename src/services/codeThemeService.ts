export type CodeThemeId =
  | 'match-theme'
  | 'vscode-dark-plus'
  | 'one-dark-pro'
  | 'dracula'
  | 'monokai'
  | 'tokyo-night'
  | 'nord'
  | 'gruvbox-dark'
  | 'github-light'
  | 'solarized-light';

export interface MonacoTokenRule {
  token: string;
  foreground: string;
  fontStyle?: string;
}

export interface CodeThemeDefinition {
  id: CodeThemeId;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  isDefault?: boolean;
  monacoThemeId?: string;
  base?: 'vs' | 'vs-dark';
  rules?: MonacoTokenRule[];
  colors?: Record<string, string>;
  preview: {
    bg: string;
    keyword: string;
    string: string;
    comment: string;
    function: string;
    number: string;
    type: string;
  };
}

// 'match-theme' synchronizes the Monaco code colors with the selected
// workspace theme. All other palettes are fixed VS Code-style schemes
// that stay the same regardless of the workspace theme.
export const CODE_THEMES: CodeThemeDefinition[] = [
  {
    id: 'match-theme',
    name: 'Match Workspace Theme',
    description: 'Code colors follow your selected workspace theme — changes automatically with it.',
    mode: 'dark',
    isDefault: true,
    preview: {
      bg: '#ffffff',
      keyword: '#d11111',
      string: '#d97706',
      comment: '#94a3b8',
      function: '#b91c1c',
      number: '#059669',
      type: '#1d4ed8',
    },
  },
  {
    id: 'vscode-dark-plus',
    name: 'VS Code Dark+',
    description: 'The classic Visual Studio Code Default Dark+ palette with blue keywords and tan functions.',
    mode: 'dark',
    monacoThemeId: 'code-vscode-dark-plus',
    base: 'vs-dark',
    rules: [
      { token: 'keyword', foreground: '569CD6' },
      { token: 'keyword.control', foreground: 'C586C0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.delimiter', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'delimiter', foreground: '808080' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editor.lineHighlightBackground': '#FFFFFF0D',
      'editorCursor.foreground': '#AEAFAD',
      'editor.selectionBackground': '#264F78',
    },
    preview: {
      bg: '#1E1E1E',
      keyword: '#569CD6',
      string: '#CE9178',
      comment: '#6A9955',
      function: '#DCDCAA',
      number: '#B5CEA8',
      type: '#4EC9B0',
    },
  },
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    description: 'Atom\'s beloved dark theme — pink keywords, blue functions and green strings.',
    mode: 'dark',
    monacoThemeId: 'code-one-dark-pro',
    base: 'vs-dark',
    rules: [
      { token: 'keyword', foreground: 'C678DD' },
      { token: 'keyword.control', foreground: 'C678DD' },
      { token: 'function', foreground: '61AFEF' },
      { token: 'type', foreground: 'E5C07B' },
      { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
      { token: 'string', foreground: '98C379' },
      { token: 'string.delimiter', foreground: '98C379' },
      { token: 'number', foreground: 'D19A66' },
      { token: 'operator', foreground: '56B6C2' },
      { token: 'variable', foreground: 'E06C75' },
      { token: 'delimiter', foreground: 'ABB2BF' },
    ],
    colors: {
      'editor.background': '#282C34',
      'editor.foreground': '#ABB2BF',
      'editorLineNumber.foreground': '#495162',
      'editorLineNumber.activeForeground': '#C8CCD4',
      'editor.lineHighlightBackground': '#2C313A',
      'editorCursor.foreground': '#528BFF',
      'editor.selectionBackground': '#3E4451',
    },
    preview: {
      bg: '#282C34',
      keyword: '#C678DD',
      string: '#98C379',
      comment: '#5C6370',
      function: '#61AFEF',
      number: '#D19A66',
      type: '#E5C07B',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'The gothic dark classic — magenta keywords, green functions and yellow strings.',
    mode: 'dark',
    monacoThemeId: 'code-dracula',
    base: 'vs-dark',
    rules: [
      { token: 'keyword', foreground: 'FF79C6' },
      { token: 'keyword.control', foreground: 'FF79C6' },
      { token: 'function', foreground: '50FA7B' },
      { token: 'type', foreground: '8BE9FD' },
      { token: 'comment', foreground: '6272A4', fontStyle: 'italic' },
      { token: 'string', foreground: 'F1FA8C' },
      { token: 'string.delimiter', foreground: 'F1FA8C' },
      { token: 'number', foreground: 'BD93F9' },
      { token: 'operator', foreground: 'FF79C6' },
      { token: 'variable', foreground: 'F8F8F2' },
      { token: 'delimiter', foreground: 'F8F8F2' },
    ],
    colors: {
      'editor.background': '#282A36',
      'editor.foreground': '#F8F8F2',
      'editorLineNumber.foreground': '#6272A4',
      'editorLineNumber.activeForeground': '#F8F8F2',
      'editor.lineHighlightBackground': '#44475A',
      'editorCursor.foreground': '#F8F8F2',
      'editor.selectionBackground': '#44475A',
    },
    preview: {
      bg: '#282A36',
      keyword: '#FF79C6',
      string: '#F1FA8C',
      comment: '#6272A4',
      function: '#50FA7B',
      number: '#BD93F9',
      type: '#8BE9FD',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'High-contrast classic — hot pink keywords, lime functions and amber strings.',
    mode: 'dark',
    monacoThemeId: 'code-monokai',
    base: 'vs-dark',
    rules: [
      { token: 'keyword', foreground: 'F92672' },
      { token: 'keyword.control', foreground: 'F92672' },
      { token: 'function', foreground: 'A6E22E' },
      { token: 'type', foreground: '66D9EF' },
      { token: 'comment', foreground: '75715E', fontStyle: 'italic' },
      { token: 'string', foreground: 'E6DB74' },
      { token: 'string.delimiter', foreground: 'E6DB74' },
      { token: 'number', foreground: 'AE81FF' },
      { token: 'operator', foreground: 'F92672' },
      { token: 'variable', foreground: 'F8F8F2' },
      { token: 'delimiter', foreground: 'F8F8F2' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#F8F8F2',
      'editorLineNumber.foreground': '#75715E',
      'editorLineNumber.activeForeground': '#F8F8F2',
      'editor.lineHighlightBackground': '#3E3D32',
      'editorCursor.foreground': '#F8F8F2',
      'editor.selectionBackground': '#49483E',
    },
    preview: {
      bg: '#272822',
      keyword: '#F92672',
      string: '#E6DB74',
      comment: '#75715E',
      function: '#A6E22E',
      number: '#AE81FF',
      type: '#66D9EF',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Neon city dusk — purple keywords, violet functions and mint strings.',
    mode: 'dark',
    monacoThemeId: 'code-tokyo-night',
    base: 'vs-dark',
    rules: [
      { token: 'keyword', foreground: 'BB9AF7' },
      { token: 'keyword.control', foreground: 'BB9AF7' },
      { token: 'function', foreground: '7AA2F7' },
      { token: 'type', foreground: '2AC3DE' },
      { token: 'comment', foreground: '565F89', fontStyle: 'italic' },
      { token: 'string', foreground: '9ECE6A' },
      { token: 'string.delimiter', foreground: '9ECE6A' },
      { token: 'number', foreground: 'FF9E64' },
      { token: 'operator', foreground: '89DDFF' },
      { token: 'variable', foreground: 'C0CAF5' },
      { token: 'delimiter', foreground: 'C0CAF5' },
    ],
    colors: {
      'editor.background': '#1A1B26',
      'editor.foreground': '#C0CAF5',
      'editorLineNumber.foreground': '#3B4261',
      'editorLineNumber.activeForeground': '#C0CAF5',
      'editor.lineHighlightBackground': '#1F2335',
      'editorCursor.foreground': '#C0CAF5',
      'editor.selectionBackground': '#28344A',
    },
    preview: {
      bg: '#1A1B26',
      keyword: '#BB9AF7',
      string: '#9ECE6A',
      comment: '#565F89',
      function: '#7AA2F7',
      number: '#FF9E64',
      type: '#2AC3DE',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Arctic frost — icy blue keywords, green strings and frosty purples.',
    mode: 'dark',
    monacoThemeId: 'code-nord',
    base: 'vs-dark',
    rules: [
      { token: 'keyword', foreground: '81A1C1' },
      { token: 'keyword.control', foreground: '81A1C1' },
      { token: 'function', foreground: '88C0D0' },
      { token: 'type', foreground: '8FBCBB' },
      { token: 'comment', foreground: '616E88', fontStyle: 'italic' },
      { token: 'string', foreground: 'A3BE8C' },
      { token: 'string.delimiter', foreground: 'A3BE8C' },
      { token: 'number', foreground: 'B48EAD' },
      { token: 'operator', foreground: 'D8DEE9' },
      { token: 'variable', foreground: 'D8DEE9' },
      { token: 'delimiter', foreground: 'D8DEE9' },
    ],
    colors: {
      'editor.background': '#2E3440',
      'editor.foreground': '#D8DEE9',
      'editorLineNumber.foreground': '#4C566A',
      'editorLineNumber.activeForeground': '#D8DEE9',
      'editor.lineHighlightBackground': '#3B4252',
      'editorCursor.foreground': '#88C0D0',
      'editor.selectionBackground': '#434C5E',
    },
    preview: {
      bg: '#2E3440',
      keyword: '#81A1C1',
      string: '#A3BE8C',
      comment: '#616E88',
      function: '#88C0D0',
      number: '#B48EAD',
      type: '#8FBCBB',
    },
  },
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    description: 'Retro warm dark — red keywords, olive functions and golden strings.',
    mode: 'dark',
    monacoThemeId: 'code-gruvbox-dark',
    base: 'vs-dark',
    rules: [
      { token: 'keyword', foreground: 'FB4934' },
      { token: 'keyword.control', foreground: 'FB4934' },
      { token: 'function', foreground: 'B8BB26' },
      { token: 'type', foreground: '8EC07C' },
      { token: 'comment', foreground: '928374', fontStyle: 'italic' },
      { token: 'string', foreground: 'FABD2F' },
      { token: 'string.delimiter', foreground: 'FABD2F' },
      { token: 'number', foreground: 'D3869B' },
      { token: 'operator', foreground: 'FE8019' },
      { token: 'variable', foreground: 'EBDBB2' },
      { token: 'delimiter', foreground: 'EBDBB2' },
    ],
    colors: {
      'editor.background': '#282828',
      'editor.foreground': '#EBDBB2',
      'editorLineNumber.foreground': '#7C6F64',
      'editorLineNumber.activeForeground': '#EBDBB2',
      'editor.lineHighlightBackground': '#32302F',
      'editorCursor.foreground': '#EBDBB2',
      'editor.selectionBackground': '#3C3836',
    },
    preview: {
      bg: '#282828',
      keyword: '#FB4934',
      string: '#FABD2F',
      comment: '#928374',
      function: '#B8BB26',
      number: '#D3869B',
      type: '#8EC07C',
    },
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    description: 'Clean GitHub default light — red keywords and purple functions on white.',
    mode: 'light',
    monacoThemeId: 'code-github-light',
    base: 'vs',
    rules: [
      { token: 'keyword', foreground: 'CF222E' },
      { token: 'keyword.control', foreground: 'CF222E' },
      { token: 'function', foreground: '8250DF' },
      { token: 'type', foreground: '953800' },
      { token: 'comment', foreground: '6E7781', fontStyle: 'italic' },
      { token: 'string', foreground: '0A3069' },
      { token: 'string.delimiter', foreground: '0A3069' },
      { token: 'number', foreground: '0550AE' },
      { token: 'operator', foreground: '0550AE' },
      { token: 'variable', foreground: '24292F' },
      { token: 'delimiter', foreground: '24292F' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#24292F',
      'editorLineNumber.foreground': '#6E7781',
      'editorLineNumber.activeForeground': '#24292F',
      'editor.lineHighlightBackground': '#F6F8FA',
      'editorCursor.foreground': '#044289',
      'editor.selectionBackground': '#0969DA40',
    },
    preview: {
      bg: '#FFFFFF',
      keyword: '#CF222E',
      string: '#0A3069',
      comment: '#6E7781',
      function: '#8250DF',
      number: '#0550AE',
      type: '#953800',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    description: 'Warm paper light — amber keywords and cyan strings in the solarized tradition.',
    mode: 'light',
    monacoThemeId: 'code-solarized-light',
    base: 'vs',
    rules: [
      { token: 'keyword', foreground: 'CB4B16' },
      { token: 'keyword.control', foreground: 'CB4B16' },
      { token: 'function', foreground: '268BD2' },
      { token: 'type', foreground: 'B58900' },
      { token: 'comment', foreground: '93A1A1', fontStyle: 'italic' },
      { token: 'string', foreground: '2AA198' },
      { token: 'string.delimiter', foreground: '2AA198' },
      { token: 'number', foreground: 'D33682' },
      { token: 'operator', foreground: '859900' },
      { token: 'variable', foreground: '586E75' },
      { token: 'delimiter', foreground: '839496' },
    ],
    colors: {
      'editor.background': '#FDF6E3',
      'editor.foreground': '#586E75',
      'editorLineNumber.foreground': '#93A1A1',
      'editorLineNumber.activeForeground': '#073642',
      'editor.lineHighlightBackground': '#EEE8D5',
      'editorCursor.foreground': '#657B83',
      'editor.selectionBackground': '#EEE8D5',
    },
    preview: {
      bg: '#FDF6E3',
      keyword: '#CB4B16',
      string: '#2AA198',
      comment: '#93A1A1',
      function: '#268BD2',
      number: '#D33682',
      type: '#B58900',
    },
  },
];

const CODE_THEME_STORAGE_KEY = 'texforge_code_theme_id';

export function getStoredCodeThemeId(): CodeThemeId {
  try {
    const saved = localStorage.getItem(CODE_THEME_STORAGE_KEY);
    if (saved && CODE_THEMES.some(t => t.id === saved)) {
      return saved as CodeThemeId;
    }
  } catch (e) {
    console.error('Failed to read code theme from localStorage', e);
  }
  return 'match-theme';
}

export function setStoredCodeThemeId(codeThemeId: CodeThemeId): void {
  try {
    localStorage.setItem(CODE_THEME_STORAGE_KEY, codeThemeId);
  } catch (e) {
    console.error('Failed to save code theme to localStorage', e);
  }
}

export function getCodeThemeDefinition(codeThemeId: CodeThemeId): CodeThemeDefinition {
  return CODE_THEMES.find(t => t.id === codeThemeId) || CODE_THEMES[0];
}
