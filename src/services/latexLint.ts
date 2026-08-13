import { CompileDiagnostic, ProjectFile } from '../types';

// Signatures that prove a package is actually used. Only packages with an
// entry here are candidates for UNUSED_PACKAGE hints (keeps false positives
// low — a package without a known signature is never flagged).
const PACKAGE_SIGNATURES: Record<string, RegExp> = {
  amsmath: /\\begin\{(?:align|gather|multline|split|cases|eqnarray)\*?\}|\\(?:dfrac|tfrac|xrightarrow|xleftarrow|overset|underset|text)\{/,
  amssymb: /\\mathbb|\\mathfrak|\\mathcal|\\nexists|\\varnothing|\\leqslant|\\geqslant|\\pmod|\\therefore/,
  graphicx: /\\includegraphics/,
  hyperref: /\\href|\\url|\\hyperref|\\autoref|\\nameref/,
  booktabs: /\\toprule|\\midrule|\\bottomrule/,
  tikz: /\\begin\{tikzpicture\}|\\draw\b|\\node\b|\\tikz\b/,
  listings: /\\begin\{lstlisting\}|\\lstset/,
  geometry: /\\geometry/,
  natbib: /\\citep|\\citet|\\citealt|\\citealp/,
  biblatex: /\\addbibresource|\\printbibliography|\\parencite|\\citeauthor|\\footcite/,
  caption: /\\captionsetup/,
  subcaption: /\\begin\{subfigure\}|\\subcaption/,
  xcolor: /\\color\{|\\textcolor\{|\\definecolor/,
  multicol: /\\begin\{multicols\}/,
  minted: /\\begin\{minted\}/,
  siunitx: /\\SI\{|\\si\{|\\num\{/,
  mhchem: /\\ce\{/,
  algorithm: /\\begin\{algorithm\}/,
  algpseudocode: /\\begin\{algorithmic\}/,
  fancyhdr: /\\fancyhf|\\fancyhead|\\fancyfoot|\\pagestyle\{fancy\}/,
  setspace: /\\begin\{spacing\}|\\doublespacing|\\onehalfspacing|\\singlespacing/,
  verbatim: /\\begin\{verbatim\}/,
  longtable: /\\begin\{longtable\}/,
  tabularx: /\\begin\{tabularx\}/,
  multibib: /\\newcites/,
  glossaries: /\\newglossaryentry|\\gls\{/,
  makeidx: /\\printindex|\\index\{/,
  ulem: /\\sout|\\uuline|\\uwave/,
  soul: /\\hl\{|\\so\{|\\st\{/,
  url: /\\url\b/,
  enumitem: /\\begin\{(?:enumerate|itemize)\}\[/,
  float: /\[H\]/,
  amsthm: /\\begin\{theorem\}|\\begin\{lemma\}|\\begin\{proof\}|\\newtheorem/,
  babel: /\\selectlanguage|\\foreignlanguage/,
  csquotes: /\\enquote|\\blockquote|\\foreignquote/,
  lineno: /\\linenumbers|\\nolinenumbers/,
  tocloft: /\\renewcommand\{\\cft/,
  titling: /\\pretitle|\\posttitle|\\predate/,
  appendix: /\\appendix\b/,
};

const ALL_CITE_COMMANDS = /\\cite[a-z]*\*?\{[^}]*\}|\\Cite[a-z]*|\\parencite\{[^}]*\}|\\citep\{[^}]*\}|\\citet\{[^}]*\}|\\autocite\{[^}]*\}/gi;

/** Extract every citation key used anywhere in the project's TeX files. */
function collectCiteKeys(files: ProjectFile[]): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    if (!file.path.endsWith('.tex')) continue;
    for (const m of file.content.matchAll(/\\cite[a-zA-Z]*\*?\{([^}]*)\}/g)) {
      for (const key of m[1].split(',')) {
        const trimmed = key.trim();
        if (trimmed) keys.add(trimmed);
      }
    }
  }
  return keys;
}

/** Extract citation keys defined in the project's .bib files. */
function collectBibKeys(files: ProjectFile[]): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    if (!file.path.endsWith('.bib')) continue;
    for (const m of file.content.matchAll(/@[a-zA-Z]+\s*\{\s*([^,\s}]+)/g)) {
      keys.add(m[1]);
    }
  }
  return keys;
}

function collectLabels(files: ProjectFile[]): Map<string, { file: string; line: number }[]> {
  const labels = new Map<string, { file: string; line: number }[]>();
  for (const file of files) {
    if (!file.path.endsWith('.tex')) continue;
    for (const m of file.content.matchAll(/\\label\{([^}]*)\}/g)) {
      const key = m[1];
      const line = file.content.slice(0, m.index).split('\n').length;
      const entry = { file: file.path, line };
      const existing = labels.get(key);
      if (existing) existing.push(entry);
      else labels.set(key, [entry]);
    }
  }
  return labels;
}

function collectRefs(files: ProjectFile[]): { key: string; file: string; line: number }[] {
  const refs: { key: string; file: string; line: number }[] = [];
  for (const file of files) {
    if (!file.path.endsWith('.tex')) continue;
    for (const m of file.content.matchAll(/\\(?:ref|eqref|pageref|autoref|vref|cref|Cref|labelcref)\*?\{([^}]*)\}/g)) {
      const line = file.content.slice(0, m.index).split('\n').length;
      for (const key of m[1].split(',')) {
        const trimmed = key.trim();
        if (trimmed) refs.push({ key: trimmed, file: file.path, line });
      }
    }
  }
  return refs;
}

export interface LintOptions {
  /** Only warn about citations when the project actually uses bibliography tooling. */
  hasBibTooling?: boolean;
}

/**
 * Static lint pass over the whole project (plan §24). Conservative by design:
 * emits warnings/info only for findings with near-zero false-positive rates,
 * and never fabricates "errors" for things the parser engine still supports.
 */
export function runLatexLint(mainFilePath: string, files: ProjectFile[], options: LintOptions = {}): CompileDiagnostic[] {
  const findings: CompileDiagnostic[] = [];
  const texFiles = files.filter(f => f.path.endsWith('.tex'));
  const bibFiles = files.filter(f => f.path.endsWith('.bib'));
  const mainFile = texFiles.find(f => f.path === mainFilePath) || texFiles.find(f => f.path.endsWith('.tex'));

  const push = (severity: CompileDiagnostic['severity'], file: string, line: number | undefined, message: string) => {
    findings.push({ severity, file, line, message });
  };

  if (!mainFile) {
    findings.push({ severity: 'error', file: mainFilePath, line: 1, message: 'Lint: main file not found.' });
    return findings;
  }

  // 1. Missing document environment (the parser still renders, but real TeX fails)
  if (!/\\(?:begin|end)\{document\}/.test(mainFile.content)) {
    push('warning', mainFile.path, undefined, 'Missing \\begin{document} ... \\end{document} — the compiled output may not represent the full document.');
  }

  // 2. Citations known only to the project
  const citeKeys = collectCiteKeys(files);
  const bibKeys = collectBibKeys(files);
  const usesBibliography = /\\bibliography\{|\\addbibresource\{|\\printbibliography|\\thebibliography/.test(
    texFiles.map(f => f.content).join('\n')
  );
  const hasBibTooling = options.hasBibTooling ?? (bibFiles.length > 0 || usesBibliography);

  if (hasBibTooling) {
    for (const file of texFiles) {
      for (const m of file.content.matchAll(ALL_CITE_COMMANDS)) {
        const line = file.content.slice(0, m.index).split('\n').length;
        const inner = m[0].match(/\{([^}]*)\}/)?.[1] || '';
        for (const key of inner.split(',')) {
          const trimmed = key.trim();
          if (trimmed && bibKeys.size > 0 && !bibKeys.has(trimmed)) {
            push('warning', file.path, line, `Citation '${trimmed}' is not defined in any .bib file.`);
          }
        }
      }
    }
    if (citeKeys.size > 0 && bibKeys.size === 0 && usesBibliography) {
      push('warning', mainFile.path, undefined, 'The document cites entries but no .bib file exists in the project.');
    }
  }

  // 3. Bibliography declared but no .bib present / .bib present but never declared
  if (usesBibliography && bibFiles.length === 0) {
    push('warning', mainFile.path, undefined, 'A bibliography is declared (\\bibliography / \\addbibresource) but the project has no .bib files.');
  } else if (bibFiles.length > 0 && !usesBibliography) {
    push('info', bibFiles[0].path, 1, `Project contains ${bibFiles.length} .bib file(s) but no \\bibliography is declared.`);
  }

  // 4. References & labels
  const labels = collectLabels(files);
  const refs = collectRefs(files);

  if (labels.size === 0 && refs.length > 0) {
    for (const ref of refs) {
      push('warning', ref.file, ref.line, `\\ref{${ref.key}} has no matching \\label anywhere in the project.`);
    }
  } else {
    for (const ref of refs) {
      if (!labels.has(ref.key)) {
        push('warning', ref.file, ref.line, `Reference '${ref.key}' has no matching \\label.`);
      }
    }
  }

  const referencedLabels = new Set(refs.map(r => r.key));
  for (const [key, occurrences] of labels) {
    if (occurrences.length > 1) {
      push('warning', occurrences[1].file, occurrences[1].line, `Duplicate \\label{${key}} (first defined at ${occurrences[0].file}:${occurrences[0].line}).`);
    } else if (!referencedLabels.has(key) && !/\\(?:section|subsection|subsubsection|figure|table|equation)/.test(key)) {
      push('info', occurrences[0].file, occurrences[0].line, `Label '${key}' is defined but never referenced.`);
    }
  }

  // 5. Unused packages (only for packages whose usage we can verify)
  for (const file of texFiles) {
    const loaded = new Set<string>();
    for (const m of file.content.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]*)\}/g)) {
      for (const pkg of m[1].split(',')) loaded.add(pkg.trim().toLowerCase());
    }
    if (loaded.size === 0) continue;

    const allTex = texFiles.map(f => f.content).join('\n');
    for (const pkg of loaded) {
      const signature = PACKAGE_SIGNATURES[pkg];
      if (!signature) continue; // can't verify usage — never flag
      if (!signature.test(allTex)) {
        push('info', file.path, undefined, `Package '${pkg}' appears unused — no ${pkg}-specific commands found in the project.`);
      }
    }
  }

  // 6. Draft leftovers
  for (const file of texFiles) {
    for (const m of file.content.matchAll(/(?:^|[^\\])(%[^\n]*\b(?:TODO|FIXME|XXX|HACK|WIP)\b[^\n]*)/gi)) {
      const line = file.content.slice(0, m.index).split('\n').length;
      push('info', file.path, line, `Draft note left in source: ${m[1].trim().slice(0, 80)}`);
    }
  }

  return findings;
}