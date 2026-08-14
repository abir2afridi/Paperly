import katex from 'katex';

export interface MathSegment {
  math: string;
  display: boolean;
}

const MATH_ENVS = new Set([
  'equation',
  'align',
  'gather',
  'multline',
  'eqnarray',
  'math',
  'displaymath',
  'flalign',
  'alignat',
  'cases',
  'split',
  'array',
  'matrix',
  'pmatrix',
  'bmatrix',
]);

/** True when the character at `idx` is preceded by an even number of backslashes (i.e. not escaped). */
function isUnescaped(content: string, idx: number): boolean {
  let backslashes = 0;
  for (let j = idx - 1; j >= 0 && content[j] === '\\'; j--) backslashes++;
  return backslashes % 2 === 0;
}

function lastUnescapedIndex(content: string, token: string, before: number): number {
  for (let i = before - 1; i >= 0; i--) {
    if (content.startsWith(token, i) && isUnescaped(content, i)) return i;
  }
  return -1;
}

function firstUnescapedIndex(content: string, token: string, from: number): number {
  for (let i = from; i <= content.length - token.length; i++) {
    if (content.startsWith(token, i) && isUnescaped(content, i)) return i;
  }
  return -1;
}

/** Last single (non-$$-pair) dollar sign before `before`. */
function lastSingleDollar(content: string, before: number): number {
  for (let i = before - 1; i >= 0; i--) {
    if (content[i] !== '$' || !isUnescaped(content, i)) continue;
    if (content[i + 1] === '$' || content[i - 1] === '$') continue;
    return i;
  }
  return -1;
}

/** First single (non-$$-pair) dollar sign at or after `from`. */
function firstSingleDollar(content: string, from: number): number {
  for (let i = from; i < content.length; i++) {
    if (content[i] !== '$' || !isUnescaped(content, i)) continue;
    if (content[i + 1] === '$' || content[i - 1] === '$') continue;
    return i;
  }
  return -1;
}

/** Math segment containing `offset` in `content`, or null when the cursor is outside math. */
export function findMathSegmentAt(content: string, offset: number): MathSegment | null {
  if (offset < 0 || offset > content.length) return null;

  const candidates: (MathSegment & { start: number; end: number })[] = [];

  // \begin{env} ... \end{env} (display math environments)
  const beginRe = /\\(?:begin)\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  let lastBegin: { env: string; matchStart: number; contentStart: number } | null = null;
  while ((m = beginRe.exec(content)) !== null) {
    const env = m[1].replace(/\*$/, '');
    if (MATH_ENVS.has(env)) {
      const matchStart = m.index;
      const contentStart = matchStart + m[0].length;
      const endRe = new RegExp(`\\\\end\\{${m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`);
      const endMatch = endRe.exec(content.slice(contentStart));
      if (endMatch) {
        const endStart = contentStart + endMatch.index;
        if (contentStart <= offset && offset <= endStart) {
          candidates.push({ math: content.slice(contentStart, endStart), display: true, start: contentStart, end: endStart });
        }
      }
    }
  }

  // \[ ... \] (display)
  const dOpen = lastUnescapedIndex(content, '\\[', offset + 1);
  if (dOpen !== -1) {
    const dClose = firstUnescapedIndex(content, '\\]', dOpen + 2);
    if (dClose !== -1 && dOpen + 2 <= offset && offset <= dClose) {
      candidates.push({ math: content.slice(dOpen + 2, dClose), display: true, start: dOpen, end: dClose });
    }
  }

  // $$ ... $$ (display)
  const ddOpen = lastUnescapedIndex(content, '$$', offset + 1);
  if (ddOpen !== -1) {
    const ddClose = firstUnescapedIndex(content, '$$', ddOpen + 2);
    if (ddClose !== -1 && ddOpen + 2 <= offset && offset <= ddClose) {
      candidates.push({ math: content.slice(ddOpen + 2, ddClose), display: true, start: ddOpen, end: ddClose });
    }
  }

  // \( ... \) (inline)
  const pOpen = lastUnescapedIndex(content, '\\(', offset + 1);
  if (pOpen !== -1) {
    const pClose = firstUnescapedIndex(content, '\\)', pOpen + 2);
    if (pClose !== -1 && pOpen + 2 <= offset && offset <= pClose) {
      candidates.push({ math: content.slice(pOpen + 2, pClose), display: false, start: pOpen, end: pClose });
    }
  }

  // $ ... $ (inline)
  const sOpen = lastSingleDollar(content, offset + 1);
  if (sOpen !== -1) {
    const sClose = firstSingleDollar(content, sOpen + 1);
    if (sClose !== -1 && sOpen + 1 <= offset && offset <= sClose) {
      candidates.push({ math: content.slice(sOpen + 1, sClose), display: false, start: sOpen, end: sClose });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.start - a.start);
  const best = candidates[0];
  return { math: best.math, display: best.display };
}

/** Render math to HTML with MathML output for screen readers (§30). */
export function renderMathHtml(math: string, display: boolean): string {
  return katex.renderToString(math, {
    throwOnError: false,
    displayMode: display,
    output: 'htmlAndMathml',
    strict: false,
  });
}