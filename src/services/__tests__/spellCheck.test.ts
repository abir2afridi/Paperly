import { describe, it, expect } from 'vitest';
import { spellCheckLatex, tokenizeLatexWords, getSpellChecker } from '../spellCheck';

const SIMPLE_DICT = {
  correct: (w: string) => ['hello', 'world', 'title', 'editor', 'document', 'good', 'bad'].includes(w.toLowerCase()),
  suggest: (w: string) => [w],
};

describe('tokenizeLatexWords (§28)', () => {
  it('extracts plain prose words', () => {
    const tokens = tokenizeLatexWords('Hello world');
    expect(tokens.map(t => t.word)).toEqual(['Hello', 'world']);
  });

  it('skips comments but keeps text before them', () => {
    const tokens = tokenizeLatexWords('Hello % world comment\nworld');
    expect(tokens.map(t => t.word)).toEqual(['Hello', 'world']);
  });

  it('skips backslash commands and their names', () => {
    const tokens = tokenizeLatexWords('\\textbf{Hello} \\emph{world}');
    expect(tokens.map(t => t.word)).toEqual(['Hello', 'world']);
  });

  it('skips arguments of non-text commands (citations, labels, URLs)', () => {
    const tokens = tokenizeLatexWords('\\cite{smith2020} \\label{sec:intro} \\url{https://example.com} \\includegraphics[width=2cm]{fig.png}');
    expect(tokens.map(t => t.word)).toEqual([]);
  });

  it('skips inline and display math', () => {
    const tokens = tokenizeLatexWords('The $x^2 + y = \\alpha$ end. And \\[ E = mc^2 \\] done.');
    expect(tokens.map(t => t.word)).toEqual(['The', 'end', 'And', 'done']);
  });

  it('skips pure numbers, digit words and ALL-CAPS acronyms', () => {
    const tokens = tokenizeLatexWords('Page 42 has v1 beta and PDF files');
    expect(tokens.map(t => t.word)).toEqual(['Page', 'has', 'beta', 'and', 'files']);
  });

  it('keeps apostrophes inside words', () => {
    const tokens = tokenizeLatexWords("It's the editor's job");
    expect(tokens.map(t => t.word)).toEqual(["It's", 'the', "editor's", 'job']);
  });
});

describe('spellCheckLatex (§28)', () => {
  it('flags only misspelled prose, not commands', () => {
    const issues = spellCheckLatex('\\documentclass{article} Hello worrld \\cite{ref1}', SIMPLE_DICT);
    expect(issues.map(i => i.word)).toEqual(['worrld']);
  });

  it('attaches suggestions', () => {
    const issues = spellCheckLatex('worrld', SIMPLE_DICT);
    expect(issues[0].suggestions).toEqual(['worrld']);
  });

  it('records accurate offsets', () => {
    const issues = spellCheckLatex('Good xyz bad', SIMPLE_DICT);
    expect(issues[0].word).toBe('xyz');
    expect(issues[0].start).toBe(5);
    expect(issues[0].end).toBe(8);
  });

  it('matches words case-insensitively (nspell lowercases lookups)', () => {
    const issues = spellCheckLatex('HELLO worrld', SIMPLE_DICT);
    expect(issues.map(i => i.word)).toEqual(['worrld']);
  });
});

describe('getSpellChecker (§28)', () => {
  it('loads the vendored English dictionary through nspell', async () => {
    const api = await getSpellChecker();
    expect(api.checker.correct('hello')).toBe(true);
    expect(api.checker.correct('helo')).toBe(false);
    expect(api.checker.suggest('helo').length).toBeGreaterThan(0);

    const issues = api.check('Ths is a tset');
    expect(issues.map(i => i.word).sort()).toEqual(['Ths', 'tset']);
  });

  it('memoizes the checker across calls', async () => {
    const first = await getSpellChecker();
    const second = await getSpellChecker();
    expect(second.checker).toBe(first.checker);
  });
});