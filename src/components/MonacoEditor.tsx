import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, BeforeMount, Monaco } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';
import { BibEntry, CompileDiagnostic } from '../types';
import { CODE_THEMES, CodeThemeId } from '../services/codeThemeService';

export interface MonacoEditorApi {
  jumpToLine: (line: number) => void;
}

interface MonacoEditorProps {
  content: string;
  onChange: (value: string) => void;
  filePath: string;
  bibEntries: BibEntry[];
  diagnostics: CompileDiagnostic[];
  onCursorPositionChange?: (line: number) => void;
  monacoThemeId?: string;
  codeThemeId?: CodeThemeId;
  apiRef?: React.MutableRefObject<MonacoEditorApi | null>;
  onCompileRequest?: () => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  content,
  onChange,
  filePath,
  bibEntries,
  diagnostics,
  onCursorPositionChange,
  monacoThemeId = 'overleaf-light-theme',
  codeThemeId = 'match-theme',
  apiRef,
  onCompileRequest,
}) => {
  const editorRef = useRef<unknown>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const prevFilePathRef = useRef<string>(filePath);
  // Keep the latest compile callback so the Monaco Ctrl+Enter binding never
  // captures a stale closure (the editor instance survives prop re-renders).
  const onCompileRequestRef = useRef(onCompileRequest);
  useEffect(() => {
    onCompileRequestRef.current = onCompileRequest;
  }, [onCompileRequest]);

  // On file switch: reset the viewport & cursor to the top of the new file.
  // Monaco preserves scroll/cursor position across model value swaps, so the
  // new source can otherwise appear "loaded in the middle" of the document.
  useEffect(() => {
    if (prevFilePathRef.current === filePath) return;
    prevFilePathRef.current = filePath;
    const editor = editorRef.current as
      | {
          setScrollPosition: (pos: { scrollTop: number }) => void;
          setPosition: (pos: { lineNumber: number; column: number }) => void;
        }
      | null
      | undefined;
    if (!editor) return;
    requestAnimationFrame(() => {
      editor.setScrollPosition({ scrollTop: 0 });
      editor.setPosition({ lineNumber: 1, column: 1 });
    });
  }, [filePath]);

  // 'match-theme' follows the workspace theme; any other selection uses a
  // fixed VS Code-style palette that is independent of the workspace theme.
  const effectiveMonacoThemeId =
    codeThemeId === 'match-theme' ? monacoThemeId : `code-${codeThemeId}`;

  const defineMonacoThemes = (monaco: Monaco) => {
    // 1. Overleaf Light
    monaco.editor.defineTheme('overleaf-light-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'DC2626', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'DC2626', fontStyle: 'bold' },
        { token: 'tag', foreground: 'B91C1C' },
        { token: 'function', foreground: 'B91C1C' },
        { token: 'type', foreground: '1D4ED8' },
        { token: 'comment', foreground: '94A3B8', fontStyle: 'italic' },
        { token: 'string', foreground: 'D97706', fontStyle: 'bold' },
        { token: 'string.delimiter', foreground: 'B45309', fontStyle: 'bold' },
        { token: 'number', foreground: '059669' },
        { token: 'operator', foreground: '64748B', fontStyle: 'bold' },
        { token: 'variable', foreground: '1E293B' },
        { token: 'delimiter', foreground: '64748B' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#0F172A',
        'editorLineNumber.foreground': '#94A3B8',
        'editorLineNumber.activeForeground': '#DC2626',
        'editor.lineHighlightBackground': '#FEF2F2',
        'editorCursor.foreground': '#DC2626',
        'editor.selectionBackground': '#FCA5A540',
      },
    });

    // 2. Overleaf Dark
    monaco.editor.defineTheme('overleaf-dark-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'EF4444', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'EF4444', fontStyle: 'bold' },
        { token: 'tag', foreground: 'F87171' },
        { token: 'function', foreground: 'F87171' },
        { token: 'type', foreground: '60A5FA' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'string', foreground: 'F59E0B', fontStyle: 'bold' },
        { token: 'string.delimiter', foreground: 'FBBF24', fontStyle: 'bold' },
        { token: 'number', foreground: '34D399' },
        { token: 'operator', foreground: '94A3B8', fontStyle: 'bold' },
        { token: 'variable', foreground: 'E2E8F0' },
        { token: 'delimiter', foreground: '94A3B8' },
      ],
      colors: {
        'editor.background': '#0F172A',
        'editor.foreground': '#F8FAFC',
        'editorLineNumber.foreground': '#64748B',
        'editorLineNumber.activeForeground': '#EF4444',
        'editor.lineHighlightBackground': '#1E293B',
        'editorCursor.foreground': '#EF4444',
        'editor.selectionBackground': '#991B1B40',
      },
    });

    // 3. Nordic Polar
    monaco.editor.defineTheme('nordic-polar-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '88C0D0', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: '88C0D0', fontStyle: 'bold' },
        { token: 'tag', foreground: '81A1C1' },
        { token: 'function', foreground: '81A1C1' },
        { token: 'type', foreground: 'B48EAD' },
        { token: 'comment', foreground: '6C7A96', fontStyle: 'italic' },
        { token: 'string', foreground: 'EBCB8B', fontStyle: 'bold' },
        { token: 'string.delimiter', foreground: 'D08770', fontStyle: 'bold' },
        { token: 'number', foreground: 'A3BE8C' },
        { token: 'operator', foreground: '8FBCBB', fontStyle: 'bold' },
        { token: 'variable', foreground: 'D8DEE9' },
        { token: 'delimiter', foreground: '81A1C1' },
      ],
      colors: {
        'editor.background': '#2E3440',
        'editor.foreground': '#ECEFF4',
        'editorLineNumber.foreground': '#4C566A',
        'editorLineNumber.activeForeground': '#88C0D0',
        'editor.lineHighlightBackground': '#3B4252',
        'editorCursor.foreground': '#88C0D0',
        'editor.selectionBackground': '#434C5E60',
      },
    });

    // 4. Solarized Warm
    monaco.editor.defineTheme('solarized-warm-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'CB4B16', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'CB4B16', fontStyle: 'bold' },
        { token: 'tag', foreground: '268BD2' },
        { token: 'function', foreground: '268BD2' },
        { token: 'type', foreground: 'B58900' },
        { token: 'comment', foreground: '93A1A1', fontStyle: 'italic' },
        { token: 'string', foreground: '2AA198', fontStyle: 'bold' },
        { token: 'string.delimiter', foreground: '859900', fontStyle: 'bold' },
        { token: 'number', foreground: 'D33682' },
        { token: 'operator', foreground: '859900', fontStyle: 'bold' },
        { token: 'variable', foreground: '586E75' },
        { token: 'delimiter', foreground: '93A1A1' },
      ],
      colors: {
        'editor.background': '#FDF6E3',
        'editor.foreground': '#073642',
        'editorLineNumber.foreground': '#93A1A1',
        'editorLineNumber.activeForeground': '#CB4B16',
        'editor.lineHighlightBackground': '#EEE8D5',
        'editorCursor.foreground': '#CB4B16',
        'editor.selectionBackground': '#268BD230',
      },
    });

    // 5. Emerald Night
    monaco.editor.defineTheme('emerald-night-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '34D399', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: '34D399', fontStyle: 'bold' },
        { token: 'tag', foreground: '6EE7B7' },
        { token: 'function', foreground: '6EE7B7' },
        { token: 'type', foreground: 'F472B6' },
        { token: 'comment', foreground: '3FA17C', fontStyle: 'italic' },
        { token: 'string', foreground: 'FBBF24', fontStyle: 'bold' },
        { token: 'string.delimiter', foreground: 'F59E0B', fontStyle: 'bold' },
        { token: 'number', foreground: 'A7F3D0' },
        { token: 'operator', foreground: '10B981', fontStyle: 'bold' },
        { token: 'variable', foreground: 'A7F3D0' },
        { token: 'delimiter', foreground: '10B981' },
      ],
      colors: {
        'editor.background': '#041F18',
        'editor.foreground': '#ECFDF5',
        'editorLineNumber.foreground': '#059669',
        'editorLineNumber.activeForeground': '#10B981',
        'editor.lineHighlightBackground': '#0A3A2F',
        'editorCursor.foreground': '#34D399',
        'editor.selectionBackground': '#04785750',
      },
    });

    // Fixed VS Code-style code palettes (independent of the workspace theme)
    CODE_THEMES.forEach(codeTheme => {
      if (codeTheme.isDefault || !codeTheme.monacoThemeId) return;
      monaco.editor.defineTheme(codeTheme.monacoThemeId, {
        base: codeTheme.base || 'vs-dark',
        inherit: true,
        rules: codeTheme.rules || [],
        colors: codeTheme.colors || {},
      });
    });
  };

  const handleBeforeMount: BeforeMount = monaco => {
    // Register LaTeX monarch tokenizer with rich token types so code palettes
    // can color keywords, functions, types, numbers and operators distinctly.
    monaco.languages.register({ id: 'latex' });

    monaco.languages.setMonarchTokensProvider('latex', {
      defaultToken: '',
      tokenPostfix: '.latex',

      keywords: [
        'section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph',
        'documentclass', 'usepackage', 'title', 'author', 'date', 'maketitle',
        'cite', 'ref', 'label', 'include', 'input', 'bibliography', 'bibliographystyle',
        'caption', 'centering', 'includegraphics', 'equation', 'figure', 'table',
        'newcommand', 'renewcommand', 'newenvironment', 'renewenvironment',
        'textbf', 'textit', 'underline', 'footnote', 'item', 'enumerate', 'itemize'
      ],

      tokenizer: {
        root: [
          [/%.*$/, 'comment'],
          [/\$\$/, 'string.delimiter', '@mathBlock'],
          [/\$/, 'string.delimiter', '@mathInline'],
          [/\\begin/, 'keyword.control', '@envName'],
          [/\\end/, 'keyword.control', '@envName'],
          [/\\[a-zA-Z]+/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'function'
            }
          }],
          [/\\[^a-zA-Z]/, 'operator'],
          [/[{}\[\]()]/, 'delimiter'],
          [/\d+(\.\d+)?/, 'number'],
          [/[=+<>\-*\/^_]/, 'operator'],
          [/[,;:]/, 'delimiter'],
          [/[a-zA-Z][a-zA-Z0-9]*/, '']
        ],
        envName: [
          [/\{([^}]*)\}/, 'type', '@pop'],
          [/[^{}]+/, 'type'],
          [/[{}]/, 'type']
        ],
        mathBlock: [
          [/\$\$/, 'string.delimiter', '@pop'],
          [/%.*$/, 'comment'],
          [/\\begin/, 'keyword.control', '@envName'],
          [/\\end/, 'keyword.control', '@envName'],
          [/\\[a-zA-Z]+/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'function'
            }
          }],
          [/\\[^a-zA-Z]/, 'operator'],
          [/\d+(\.\d+)?/, 'number'],
          [/[=+<>\-*\/^_{}]/, 'operator'],
          [/[a-zA-Z]+/, 'variable'],
          [/[^a-zA-Z0-9\\{}]+/, 'variable']
        ],
        mathInline: [
          [/\$/, 'string.delimiter', '@pop'],
          [/%.*$/, 'comment'],
          [/\\begin/, 'keyword.control', '@envName'],
          [/\\end/, 'keyword.control', '@envName'],
          [/\\[a-zA-Z]+/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'function'
            }
          }],
          [/\\[^a-zA-Z]/, 'operator'],
          [/\d+(\.\d+)?/, 'number'],
          [/[=+<>\-*\/^_{}]/, 'operator'],
          [/[a-zA-Z]+/, 'variable'],
          [/[^a-zA-Z0-9\\{}]+/, 'variable']
        ]
      }
    });

    // Define all workspace themes BEFORE the editor is created
    defineMonacoThemes(monaco);

    // Register LaTeX Autocomplete Provider (\cite{}, \ref{}, \begin{}...\end{})
    monaco.languages.registerCompletionItemProvider('latex', {
      triggerCharacters: ['\\', '{', ','],
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const suggestions: unknown[] = [];

        // Check if inside \cite{...}
        if (/\\cite\{[^}]*$/.test(textUntilPosition)) {
          bibEntries.forEach(entry => {
            suggestions.push({
              label: entry.citeKey,
              kind: monaco.languages.CompletionItemKind.Reference,
              insertText: entry.citeKey,
              documentation: `${entry.title} (${entry.author}, ${entry.year || 'N/A'})`,
              detail: `[BibTeX] ${entry.type}`
            });
          });
          return { suggestions };
        }

        // Environments e.g. \begin{...}
        const envs = ['equation', 'align', 'figure', 'table', 'itemize', 'enumerate', 'abstract', 'document'];
        if (/\\begin\{[^}]*$/.test(textUntilPosition)) {
          envs.forEach(env => {
            suggestions.push({
              label: env,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: `${env}}\n\t$0\n\\end{${env}}`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: `Auto-paired \\begin{${env}} ... \\end{${env}}`
            });
          });
          return { suggestions };
        }

        // Common commands
        const snippets = [
          { label: 'section', insertText: 'section{${1:Title}}\n$0' },
          { label: 'subsection', insertText: 'subsection{${1:Title}}\n$0' },
          { label: 'cite', insertText: 'cite{${1:key}}' },
          { label: 'ref', insertText: 'ref{${1:label}}' },
          { label: 'label', insertText: 'label{${1:type:name}}' },
          { label: 'usepackage', insertText: 'usepackage{${1:package}}' },
          { label: 'frac', insertText: 'frac{${1:num}}{${2:denom}}' },
        ];

        snippets.forEach(s => {
          suggestions.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          });
        });

        return { suggestions };
      }
    });
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Expose imperative API for external line jumps (Terminal / Diagnostics panel)
    if (apiRef) {
      apiRef.current = {
        jumpToLine: (line: number) => {
          const current = editorRef.current as {
            revealLineInCenter: (l: number) => void;
            setPosition: (p: { lineNumber: number; column: number }) => void;
            focus: () => void;
          } | null;
          if (!current) return;
          current.revealLineInCenter(line);
          current.setPosition({ lineNumber: line, column: 1 });
          current.focus();
        },
      };
    }

    // Ensure the current theme is applied once the editor exists
    monaco.editor.setTheme(effectiveMonacoThemeId);

    // Position change listener for SyncTeX / status tracking
    editor.onDidChangeCursorPosition(e => {
      if (onCursorPositionChange) {
        onCursorPositionChange(e.position.lineNumber);
      }
    });

    // Ctrl/Cmd + Enter -> Compile. Monaco swallows the default browser
    // shortcut (its own binding is "insert line below"), so register it
    // explicitly to keep the TeXForge compile shortcut working in-editor.
    if (onCompileRequestRef.current) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onCompileRequestRef.current?.();
      });
    }
  };

  // Clear the exposed API when the editor unmounts (e.g. switching to Visual mode)
  useEffect(() => {
    return () => {
      if (apiRef) apiRef.current = null;
    };
  }, [apiRef]);

  // Update diagnostic markers in editor when compile completes
  useEffect(() => {
    if (!monacoRef.current || !editorRef.current) return;

    const monaco = monacoRef.current;
    const model = (editorRef.current as { getModel: () => unknown }).getModel();

    if (!model) return;

    const fileDiagnostics = diagnostics.filter(d => d.file === filePath && d.line);

    const markers = fileDiagnostics.map(d => ({
      startLineNumber: d.line!,
      startColumn: 1,
      endLineNumber: d.line!,
      endColumn: 100,
      message: d.message,
      severity: d.severity === 'error'
        ? monaco.MarkerSeverity.Error
        : d.severity === 'warning'
        ? monaco.MarkerSeverity.Warning
        : monaco.MarkerSeverity.Info,
    }));

    monaco.editor.setModelMarkers(model as never, 'texforge', markers as never);
  }, [diagnostics, filePath]);

  // Handle dynamic theme change
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(effectiveMonacoThemeId);
    }
  }, [effectiveMonacoThemeId]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-white">
      <Editor
        height="100%"
        defaultLanguage="latex"
        language="latex"
        theme={effectiveMonacoThemeId}
        beforeMount={handleBeforeMount}
        value={content}
        onChange={value => onChange(value || '')}
        onMount={handleEditorMount}
        loading={
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D11111]" />
              <span>Initializing LaTeX editor…</span>
            </div>
          </div>
        }
        options={{
          fontSize: 13,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          roundedSelection: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 2,
          renderLineHighlight: 'all',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
};
