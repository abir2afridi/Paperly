import { ProjectSnapshot } from '../types';

export type DiffLineType = 'same' | 'add' | 'remove';

export interface DiffLine {
  type: DiffLineType;
  text: string;
  aIndex?: number;
  bIndex?: number;
}

export interface SnapshotFileDiff {
  path: string;
  status: 'added' | 'removed' | 'modified';
  diff: DiffLine[];
}

export interface SnapshotDiffSummary {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  wordCountDelta: number;
}

const MAX_DIFF_LINES = 4000;

const toLines = (s: string): string[] => {
  if (s === '') return [];
  const lines = s.split(/\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

/** Line-based LCS diff of two text documents (§27). */
export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = toLines(a);
  const bLines = toLines(b);
  const n = aLines.length;
  const m = bLines.length;

  if (n > MAX_DIFF_LINES || m > MAX_DIFF_LINES) {
    return [
      ...aLines.map((text, i) => ({ type: 'remove' as const, text, aIndex: i + 1 })),
      ...bLines.map((text, i) => ({ type: 'add' as const, text, bIndex: i + 1 })),
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      out.push({ type: 'same', text: aLines[i], aIndex: i + 1, bIndex: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'remove', text: aLines[i], aIndex: i + 1 });
      i++;
    } else {
      out.push({ type: 'add', text: bLines[j], bIndex: j + 1 });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: 'remove', text: aLines[i], aIndex: i + 1 });
    i++;
  }
  while (j < m) {
    out.push({ type: 'add', text: bLines[j], bIndex: j + 1 });
    j++;
  }
  return out;
}

/** Rough word count of the .tex files in a snapshot (strips commands/comments). */
export function texWordCount(files: { path: string; content: string }[]): number {
  let total = 0;
  for (const f of files) {
    if (!f.path.endsWith('.tex')) continue;
    const body = f.content
      .replace(/%.*$/gm, ' ')
      .replace(/\\(?:begin|end)\{[^}]*\}/g, ' ')
      .replace(/\\[a-zA-Z@]+(\[[^\]]*\])?(\{[^{}]*\})?/g, ' ')
      .replace(/\$\$?[^$]*\$\$?/g, ' ')
      .replace(/[^a-zA-Z0-9'-]+/g, ' ');
    total += body.split(/\s+/).filter(Boolean).length;
  }
  return total;
}

/** Compare two snapshots: changed files with line diffs plus a summary (§27). */
export function diffSnapshots(
  base: ProjectSnapshot,
  compare: ProjectSnapshot
): { files: SnapshotFileDiff[]; summary: SnapshotDiffSummary } {
  const files: SnapshotFileDiff[] = [];
  const baseMap = new Map(base.files.map(f => [f.path, f.content]));
  const compareMap = new Map(compare.files.map(f => [f.path, f.content]));

  let linesAdded = 0;
  let linesRemoved = 0;

  const handle = (path: string, aContent: string | undefined, bContent: string | undefined, status: SnapshotFileDiff['status']) => {
    if (aContent === bContent) return;
    const diff = diffLines(aContent ?? '', bContent ?? '');
    for (const line of diff) {
      if (line.type === 'add') linesAdded++;
      else if (line.type === 'remove') linesRemoved++;
    }
    files.push({ path, status, diff });
  };

  for (const [path, content] of baseMap) {
    if (!compareMap.has(path)) handle(path, content, undefined, 'removed');
    else handle(path, content, compareMap.get(path), 'modified');
  }
  for (const [path, content] of compareMap) {
    if (!baseMap.has(path)) handle(path, undefined, content, 'added');
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  const wordCountDelta = texWordCount(compare.files) - texWordCount(base.files);
  const summary: SnapshotDiffSummary = {
    filesChanged: files.length,
    linesAdded,
    linesRemoved,
    wordCountDelta,
  };
  return { files, summary };
}