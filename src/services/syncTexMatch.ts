/**
 * Best-effort SyncTeX: map a visible text fragment (e.g. from the PDF text
 * layer) back to the source `.tex` line that produced it.
 *
 * Real SyncTeX requires a TeX engine with -synctex=1; since Paperly's engine
 * is parser-based, we approximate by normalizing both sides (strip LaTeX
 * commands, comments, math) and scoring line overlap. The longest match wins;
 * falls back to null when nothing plausible matches.
 */

export function normalizeTextFragment(raw: string): string {
  return raw
    .replace(/\\[a-zA-Z]+\*?\[[^\]]*\]/g, ' ')
    .replace(/\\[a-zA-Z]+\*?\{([^{}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\\[^a-zA-Z]/g, ' ')
    .replace(/[{}\[\]]/g, ' ')
    .replace(/[$^_~&=]/g, ' ')
    .replace(/[-,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeSourceLine(raw: string): string {
  let line = raw.replace(/%[^\n]*$/, '');
  line = line
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\\begin\{[^}]*\}/g, ' ')
    .replace(/\\end\{[^}]*\}/g, ' ')
    .replace(/\\[a-zA-Z]+\*?\[[^\]]*\]/g, ' ')
    .replace(/\\[a-zA-Z]+\*?\{([^{}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\\[^a-zA-Z]/g, ' ')
    .replace(/[{}\[\]]/g, ' ')
    .replace(/[$^_~&=]/g, ' ')
    .replace(/[-,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return line;
}

/** Longest common substring length (bounded, cheap) between two strings. */
export function lcsLength(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  const maxLen = Math.min(a.length, b.length);
  for (let len = maxLen; len >= 2; len--) {
    for (let i = 0; i + len <= a.length; i++) {
      const sub = a.slice(i, i + len);
      if (b.includes(sub)) return len;
    }
  }
  return 0;
}

export interface SyncTexMatch {
  line: number;
  score: number;
}

/**
 * Find the source line whose normalized text best overlaps the clicked PDF
 * fragment. Returns the 1-based line number and its overlap score, or null.
 */
export function findBestSourceLine(
  sourceText: string,
  fragment: string,
  minFragmentLen = 3,
): SyncTexMatch | null {
  const target = normalizeTextFragment(fragment);
  if (target.length < minFragmentLen) return null;

  const lines = sourceText.split('\n');
  let best: SyncTexMatch | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNorm = normalizeSourceLine(lines[i]);
    if (lineNorm.length === 0) continue;
    const score = lcsLength(target, lineNorm);
    if (score >= 3 && (!best || score > best.score)) {
      best = { line: i + 1, score };
    }
  }
  return best;
}