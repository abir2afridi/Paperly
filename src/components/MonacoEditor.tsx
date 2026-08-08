import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import { BibEntry, CompileDiagnostic } from '../types';

interface MonacoEditorProps {
  content: string;
  onChange: (value: string) => void;
  filePath: string;
  bibEntries: BibEntry[];
  diagnostics: CompileDiagnostic[];
  onCursorPositionChange?: (line: number) => void;
  monacoThemeId?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  content,
  onChange,
  filePath,
  bibEntries,
  diagnostics,
  onCursorPositionChange,
  monacoThemeId = 'overleaf-light-theme',
}) => {
  const editorRef = useRef<unknown>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const defineMonacoThemes = (monaco: Monaco) => {
    // 1. Overleaf Light
    monaco.editor.defineTheme('overleaf-light-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'DC2626', fontStyle: 'bold' },
        { token: 'tag', foreground: 'B91C1C' },
        { token: 'comment', foreground: '94A3B8', fontStyle: 'italic' },
        { token: 'string.quote', foreground: 'D97706', fontStyle: 'bold' },
        { token: 'variable.source', foreground: '1E293B' },
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
        { token: 'tag', foreground: 'F87171' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'string.quote', foreground: 'F59E0B', fontStyle: 'bold' },
        { token: 'variable.source', foreground: 'E2E8F0' },
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
        { token: 'tag', foreground: '81A1C1' },
        { token: 'comment', foreground: '6C7A96', fontStyle: 'italic' },
        { token: 'string.quote', foreground: 'EBCB8B', fontStyle: 'bold' },
        { token: 'variable.source', foreground: 'D8DEE9' },
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
        { token: 'tag', foreground: '268BD2' },
        { token: 'comment', foreground: '93A1A1', fontStyle: 'italic' },
        { token: 'string.quote', foreground: 'B58900', fontStyle: 'bold' },
        { token: 'variable.source', foreground: '586E75' },
        { token: 'delimiter', foreground: '2AA198' },
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
        { token: 'tag', foreground: '6EE7B7' },
        { token: 'comment', foreground: '047857', fontStyle: 'italic' },
        { token: 'string.quote', foreground: 'FBBF24', fontStyle: 'bold' },
        { token: 'variable.source', foreground: 'A7F3D0' },
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
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register LaTeX monarch tokenizer
    monaco.languages.register({ id: 'latex' });

    monaco.languages.setMonarchTokensProvider('latex', {
      defaultToken: '',
      tokenPostfix: '.latex',

      keywords: [
        'begin', 'end', 'section', 'subsection', 'subsubsection', 'paragraph',
        'documentclass', 'usepackage', 'title', 'author', 'date', 'maketitle',
        'cite', 'ref', 'label', 'include', 'input', 'bibliography', 'bibliographystyle',
        'caption', 'centering', 'includegraphics', 'equation', 'figure', 'table'
      ],

      tokenizer: {
        root: [
          [/%.*$/, 'comment'],
          [/\\(?:[a-zA-Z]+|.)/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'tag'
            }
          }],
          [/\$\$/, 'string.quote', '@mathBlock'],
          [/\$/, 'string.quote', '@mathInline'],
          [/[{}()\[\]]/, 'delimiter'],
          [/\d+/, 'number'],
        ],
        mathBlock: [
          [/\$\$/, 'string.quote', '@pop'],
          [/[^\$]+/, 'variable.source']
        ],
        mathInline: [
          [/\$/, 'string.quote', '@pop'],
          [/[^\$]+/, 'variable.source']
        ]
      }
    });

    defineMonacoThemes(monaco);
    monaco.editor.setTheme(monacoThemeId);

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

    // Position change listener for SyncTeX / status tracking
    editor.onDidChangeCursorPosition(e => {
      if (onCursorPositionChange) {
        onCursorPositionChange(e.position.lineNumber);
      }
    });
  };

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
      monacoRef.current.editor.setTheme(monacoThemeId);
    }
  }, [monacoThemeId]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-white">
      <Editor
        height="100%"
        defaultLanguage="latex"
        language="latex"
        value={content}
        onChange={value => onChange(value || '')}
        onMount={handleEditorMount}
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
