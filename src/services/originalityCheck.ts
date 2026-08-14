/**
 * Originality/similarity safeguard (§42, §44): a deterministic n-gram overlap
 * check comparing generated text (or the whole document) against extracted
 * source-paper text. Flags any run of N+ consecutive words that matches a
 * source too closely. This is a heuristic aid, NOT a legal originality
 * guarantee — the UI must say so.
 */

export interface SourcePaperText {
  /** Display name of the source (e.g. the PDF file name). */
  name: string;
  /** Extracted plain text of the source. */
  text: string;
}

export interface NgramOverlap {
  /** The source paper the passage matches. */
  sourceName: string;
  /** The flagged passage as it appears in the generated text. */
  generatedPassage: string;
  /** The matched passage as it appears in the source. */
  sourcePassage: string;
  /** Length of the overlap in words (>= MIN_NGRAM_WORDS). */
  wordCount: number;
  /** 0-based character offset of the passage in the generated text. */
  generatedOffset: number;
}

export interface OriginalityReport {
  overlaps: NgramOverlap[];
  /** Total words checked in the generated text. */
  checkedWords: number;
}

/** §42 requires flagging any run of 8+ consecutive words that matches too closely. */
export const MIN_NGRAM_WORDS = 8;

const toWords = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(w => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter(Boolean);

/**
 * Find n-gram overlaps between `generated` and one or more source texts.
 *
 * Implementation: build a set of every N-word sequence (n-gram) from each
 * source, then scan the generated text for maximal runs of words where every
 * window is a source n-gram. Runs shorter than MIN_NGRAM_WORDS are ignored.
 */
export function findNgramOverlaps(generated: string, sources: SourcePaperText[]): OriginalityReport {
  const overlaps: NgramOverlap[] = [];
  const generatedWords = toWords(generated);
  const checkedWords = generatedWords.length;

  if (generatedWords.length < MIN_NGRAM_WORDS) {
    return { overlaps, checkedWords };
  }

  for (const source of sources) {
    const sourceWords = toWords(source.text);
    if (sourceWords.length < MIN_NGRAM_WORDS) continue;

    const sourceNgrams = new Set<string>();
    for (let i = 0; i <= sourceWords.length - MIN_NGRAM_WORDS; i++) {
      sourceNgrams.add(sourceWords.slice(i, i + MIN_NGRAM_WORDS).join(' '));
    }
    if (sourceNgrams.size === 0) continue;

    // Scan generated text for maximal matching runs.
    let runStart = -1;
    let runEnd = -1; // exclusive
    const flush = () => {
      if (runStart < 0) return;
      const runLength = runEnd - runStart;
      if (runLength < MIN_NGRAM_WORDS) {
        runStart = -1;
        return;
      }

      const generatedPassageWords = generatedWords.slice(runStart, runEnd).join(' ');
      // Find the exact source passage for display: locate the run's first n-gram
      // in the source, then expand to the longest contiguous match.
      const sourcePassageWords = findLongestSourceMatch(sourceWords, generatedWords.slice(runStart, runEnd));

      // Recover the original capitalization/whitespace from `generated`.
      const generatedPassage = recoverPassage(generated, runStart, runEnd, generatedWords);

      // De-dup: skip if an earlier overlap (from any source) already covers
      // (approximately) the same generated span — the passage is the warning,
      // not the source it matches.
      const thisOffset = charOffsetForWord(generated, runStart, generatedWords);
      const isDuplicate = overlaps.some(o => Math.abs(o.generatedOffset - thisOffset) < 40);
      if (!isDuplicate) {
        overlaps.push({
          sourceName: source.name,
          generatedPassage,
          sourcePassage: sourcePassageWords,
          wordCount: runLength,
          generatedOffset: thisOffset,
        });
      }
      runStart = -1;
    };

    for (let i = 0; i <= generatedWords.length - MIN_NGRAM_WORDS; i++) {
      const window = generatedWords.slice(i, i + MIN_NGRAM_WORDS).join(' ');
      if (sourceNgrams.has(window)) {
        if (runStart < 0) runStart = i;
        runEnd = Math.max(runEnd, i + MIN_NGRAM_WORDS);
      } else {
        flush();
      }
    }
    flush();
  }

  overlaps.sort((a, b) => a.generatedOffset - b.generatedOffset || b.wordCount - a.wordCount);
  return { overlaps, checkedWords };
}

/** Find the longest contiguous span of source words matching the given generated words. */
function findLongestSourceMatch(sourceWords: string[], generatedSlice: string[]): string {
  if (generatedSlice.length < MIN_NGRAM_WORDS) return generatedSlice.join(' ');
  // Locate the first n-gram of the slice in the source.
  const firstNgram = generatedSlice.slice(0, MIN_NGRAM_WORDS).join(' ');
  let idx = -1;
  for (let i = 0; i <= sourceWords.length - MIN_NGRAM_WORDS; i++) {
    if (sourceWords.slice(i, i + MIN_NGRAM_WORDS).join(' ') === firstNgram) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return generatedSlice.join(' ');

  // Expand forward as far as the source continues to match.
  let end = idx + MIN_NGRAM_WORDS;
  while (
    end < sourceWords.length &&
    end - idx < generatedSlice.length &&
    sourceWords[end] === generatedSlice[end - idx]
  ) {
    end++;
  }
  return sourceWords.slice(idx, end).join(' ');
}

/** Character offset of the runStart-th word in the original text. */
function charOffsetForWord(text: string, wordIndex: number, words: string[]): number {
  let pos = 0;
  for (let i = 0; i < wordIndex; i++) {
    const idx = text.toLowerCase().indexOf(words[i], pos);
    if (idx < 0) break;
    pos = idx + words[i].length;
  }
  return pos;
}

/** Recover the original (capitalized, punctuated) passage text for display. */
function recoverPassage(text: string, wordStart: number, wordEnd: number, words: string[]): string {
  let pos = charOffsetForWord(text, wordStart, words);
  const endPos = charOffsetForWord(text, wordEnd, words);
  const end = endPos > pos ? endPos : text.length;
  let passage = text.slice(pos, end).trim();
  // Trim to whole sentences-ish boundaries for nicer display.
  const lastSentenceEnd = Math.max(passage.lastIndexOf('.'), passage.lastIndexOf('!'), passage.lastIndexOf('?'));
  if (lastSentenceEnd > passage.length / 2) passage = passage.slice(0, lastSentenceEnd + 1);
  return passage;
}

/** True when the generated text contains at least one flagged overlap. */
export function hasSignificantOverlap(report: OriginalityReport): boolean {
  return report.overlaps.length > 0;
}