import { describe, it, expect } from 'vitest';
import {
  findNgramOverlaps,
  hasSignificantOverlap,
  MIN_NGRAM_WORDS,
  OriginalityReport,
  NgramOverlap,
} from '../originalityCheck';

describe('findNgramOverlaps (§42 originality safeguard)', () => {
  it('flags an 8+ word verbatim run against a source', () => {
    const sourceText =
      'Attention mechanisms allow the model to dynamically weigh the importance of different parts of the input sequence.';
    const generated =
      'In this section we argue that attention mechanisms allow the model to dynamically weigh the importance of different parts of the input sequence and that this is a key insight for our work.';
    const report = findNgramOverlaps(generated, [{ name: 'vaswani2017.pdf', text: sourceText }]);
    expect(hasSignificantOverlap(report)).toBe(true);
    expect(report.overlaps.length).toBe(1);
    const o = report.overlaps[0];
    expect(o.sourceName).toBe('vaswani2017.pdf');
    expect(o.wordCount).toBeGreaterThanOrEqual(MIN_NGRAM_WORDS);
    expect(o.generatedPassage.toLowerCase()).toContain('attention mechanisms allow the model');
  });

  it('does not flag original text', () => {
    const sourceText =
      'Gradient boosting ensembles decision trees sequentially, each tree correcting the residuals of its predecessor.';
    const generated =
      'Our contribution is a new hybrid approach combining sparse tensor algebra with kernel methods, evaluated on three benchmark corpora.';
    const report = findNgramOverlaps(generated, [{ name: 'src.pdf', text: sourceText }]);
    expect(hasSignificantOverlap(report)).toBe(false);
    expect(report.overlaps).toEqual([]);
  });

  it('ignores runs shorter than 8 words', () => {
    const sourceText = 'the quick brown fox jumps over the lazy dog';
    const generated = 'the quick brown fox jumps over the lazy dog is a pangram';
    const report = findNgramOverlaps(generated, [{ name: 'src.pdf', text: sourceText }]);
    // "the quick brown fox jumps over the lazy dog" is 9 words -> flagged.
    expect(hasSignificantOverlap(report)).toBe(true);

    const short = findNgramOverlaps('the quick brown fox jumps', [{ name: 'src.pdf', text: sourceText }]);
    expect(hasSignificantOverlap(short)).toBe(false);
  });

  it('handles case and punctuation differences', () => {
    const sourceText = 'The model, trained on a large corpus, achieves state-of-the-art results on GLUE.';
    const generated = 'The Model trained on a large corpus achieves state of the art results on GLUE benchmarks.';
    const report = findNgramOverlaps(generated, [{ name: 'bert.pdf', text: sourceText }]);
    expect(hasSignificantOverlap(report)).toBe(true);
  });

  it('reports the matched source passage for reference', () => {
    const sourceText = 'Transformers replace recurrence with self-attention, enabling parallelization over sequence positions.';
    const generated = 'Transformers replace recurrence with self-attention, enabling parallelization over sequence positions in all our experiments.';
    const report = findNgramOverlaps(generated, [{ name: 'paper.pdf', text: sourceText }]);
    expect(report.overlaps.length).toBeGreaterThan(0);
    const o = report.overlaps[0];
    expect(o.sourcePassage.toLowerCase()).toContain('transformers replace recurrence with self-attention');
  });

  it('matches against multiple sources and dedupes near-identical spans', () => {
    const shared = 'reinforcement learning agents optimize a policy by maximizing expected cumulative reward';
    const report = findNgramOverlaps(`We note that ${shared} over many episodes.`, [
      { name: 'a.pdf', text: `Introduction: ${shared}.` },
      { name: 'b.pdf', text: `${shared} is a core idea.` },
    ]);
    expect(report.overlaps.length).toBe(1);
    expect(report.overlaps[0].wordCount).toBeGreaterThanOrEqual(MIN_NGRAM_WORDS);
  });

  it('returns empty report for short or empty generated text', () => {
    const report = findNgramOverlaps('Short text.', [{ name: 'a.pdf', text: 'some very long source text with many words in it for testing' }]);
    expect(report.overlaps).toEqual([]);
    expect(report.checkedWords).toBe(2);
  });

  it('tracks checkedWords count', () => {
    const report: OriginalityReport = findNgramOverlaps('one two three four five six seven eight nine ten', [
      { name: 'a.pdf', text: 'unrelated source content that shares no words at all' },
    ]);
    expect(report.checkedWords).toBe(10);
  });
});

describe('NgramOverlap shape', () => {
  it('exposes the required fields', () => {
    const sourceText = 'A very long sentence about differential privacy mechanisms used in federated learning systems.';
    const generated = 'We begin with a very long sentence about differential privacy mechanisms used in federated learning systems and then extend it.';
    const report = findNgramOverlaps(generated, [{ name: 'dp.pdf', text: sourceText }]);
    const o: NgramOverlap | undefined = report.overlaps[0];
    expect(o).toBeDefined();
    if (o) {
      expect(typeof o.generatedOffset).toBe('number');
      expect(o.generatedOffset).toBeGreaterThanOrEqual(0);
      expect(o.wordCount).toBeGreaterThanOrEqual(MIN_NGRAM_WORDS);
    }
  });
});