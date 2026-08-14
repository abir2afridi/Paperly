/**
 * LaTeX-aware spell checking (§28) powered by nspell + the MIT/BSD English
 * Hunspell dictionary (vendored under src/vendor/ because dictionary-en
 * reads its files via node:fs, which does not exist in the browser).
 *
 * The tokenizer skips LaTeX constructs that must not be spell-checked:
 * comments, backslash commands (and the arguments of non-text commands like
 * \cite / \label / \includegraphics), inline/display math, URLs and
 * numbers. Words inside text commands (\textbf{...}) are still checked.
 */

export interface SpellToken {
  word: string;
  start: number;
  end: number;
}

export interface SpellIssue {
  word: string;
  start: number;
  end: number;
  suggestions: string[];
}

type NspellLike = {
  correct: (word: string) => boolean;
  suggest: (word: string) => string[];
};

// Commands whose braced arguments are NOT prose: keys, URLs, file paths.
const NON_TEXT_COMMANDS = new Set([
  'cite', 'citep', 'citet', 'nocite', 'parencite', 'textcite',
  'label', 'ref', 'pageref', 'eqref', 'autoref', 'nameref', 'vref',
  'includegraphics', 'input', 'include', 'usepackage', 'documentclass',
  'begin', 'end', 'newcommand', 'renewcommand', 'providecommand', 'def',
  'bibliography', 'bibliographystyle', 'addbibresource', 'printbibliography',
  'url', 'href', 'hyperlink', 'acrodef', 'gls', 'glspl', 'acr', 'acrlong',
]);

const LATEX_COMMAND = /^\\[a-zA-Z@]+/;
const WORD_CHAR = /[A-Za-zÀ-ÖØ-öø-ÿ'’-]/;

export function isSpellCheckEnabled(): boolean {
  try {
    return localStorage.getItem('paperly.spellCheckEnabled') !== 'false';
  } catch {
    return true;
  }
}

export function setSpellCheckEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('paperly.spellCheckEnabled', enabled ? 'true' : 'false');
  } catch {
    // Ignore storage failures (private mode etc.)
  }
}

/** Split LaTeX source into word tokens, skipping non-prose constructs. */
export function tokenizeLatexWords(content: string): SpellToken[] {
  const tokens: SpellToken[] = [];
  const n = content.length;
  let i = 0;
  let inMath = false;

  const skipBalanced = (open: string, close: string): number => {
    let depth = 0;
    while (i < n) {
      if (content[i] === '\\' && i + 1 < n) {
        const two = content.slice(i, i + 2);
        if (two !== open && two !== close) {
          i += 2;
          continue;
        }
      }
      const two = content.slice(i, i + 2);
      if (two === open) depth += 1;
      else if (two === close) {
        depth -= 1;
        if (depth === 0) return i + 2;
      } else if (content[i] === open) depth += 1;
      else if (content[i] === close) {
        depth -= 1;
        if (depth === 0) return i + 1;
      }
      i += 1;
    }
    return i;
  };

  while (i < n) {
    const ch = content[i];

    // Escaped percent is literal text; plain % starts a comment.
    if (ch === '\\' && content[i + 1] === '%') {
      i += 2;
      continue;
    }
    if (ch === '%') {
      while (i < n && content[i] !== '\n') i += 1;
      continue;
    }

    // Inline/display math regions are skipped entirely.
    if (ch === '\\' && (content[i + 1] === '(' || content[i + 1] === '[')) {
      const close = content[i + 1] === '(' ? ')' : ']';
      i = skipBalanced('\\' + content[i + 1], '\\' + close);
      continue;
    }
    if (ch === '$') {
      if (content[i + 1] === '$') {
        i += 2;
        inMath = !inMath;
      } else {
        inMath = !inMath;
        i += 1;
      }
      continue;
    }
    if (inMath) {
      i += 1;
      continue;
    }

    // Backslash commands: skip the command name and (for non-text commands)
    // their optional and braced arguments. Text commands keep their braces
    // so the enclosed prose is checked.
    if (ch === '\\') {
      const m = content.slice(i).match(LATEX_COMMAND);
      if (m) {
        i += m[0].length;
        if (NON_TEXT_COMMANDS.has(m[0].slice(1))) {
          if (content[i] === '[') i = skipBalanced('[', ']');
          if (content[i] === '{') i = skipBalanced('{', '}');
        } else if (content[i] === '[') {
          // Optional argument (e.g. \section[short]{Long title}) is metadata.
          i = skipBalanced('[', ']');
        }
      } else {
        i += 1;
      }
      continue;
    }

    // A regular word run (digits join the run so "v1"-style identifiers are
    // detected as a single token and then dropped).
    if (WORD_CHAR.test(ch)) {
      const start = i;
      while (i < n && (WORD_CHAR.test(content[i]) || /[0-9]/.test(content[i]))) i += 1;
      const rawRun = content.slice(start, i);
      // Skip runs containing digits (e.g. "v1", "fig2") — identifiers, not prose.
      if (/[0-9]/.test(rawRun)) continue;
      let word = rawRun.replace(/^['’-]+|['’-]+$/g, '');
      if (!word) continue;
      // Skip ALL-CAPS acronyms.
      if (word === word.toUpperCase() && word.length > 1) continue;
      tokens.push({ word, start, end: i });
      continue;
    }

    i += 1;
  }

  return tokens;
}

/** Tokenizer + dictionary lookup; returns misspelled word issues. */
export function spellCheckLatex(content: string, dict: NspellLike): SpellIssue[] {
  return tokenizeLatexWords(content)
    .filter(t => !dict.correct(t.word))
    .map(t => ({
      word: t.word,
      start: t.start,
      end: t.end,
      suggestions: dict.suggest(t.word).slice(0, 5),
    }));
}

export interface SpellCheckApi {
  checker: NspellLike;
  check: (content: string) => SpellIssue[];
}

let spellCheckerPromise: Promise<SpellCheckApi> | null = null;

/**
 * Lazily load the dictionary (nspell + vendored .aff/.dic) and memoize the
 * checker. The dictionary is a ~550 KB async chunk, so it is only fetched
 * when spell checking is actually enabled.
 */
export function getSpellChecker(): Promise<SpellCheckApi> {
  if (!spellCheckerPromise) {
    spellCheckerPromise = (async () => {
      const [{ default: nspell }, { default: aff }, { default: dic }] = await Promise.all([
        import('nspell'),
        import('../vendor/dictionary-en.aff?raw'),
        import('../vendor/dictionary-en.dic?raw'),
      ]);
      const checker = nspell({ aff, dic });
      return {
        checker,
        check: (content: string) => spellCheckLatex(content, checker),
      };
    })();
  }
  return spellCheckerPromise;
}

/** Reset cached checker (used by tests). */
export function resetSpellChecker(): void {
  spellCheckerPromise = null;
}