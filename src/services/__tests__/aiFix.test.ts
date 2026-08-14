import { describe, it, expect } from 'vitest';
import { buildFixPrompt, parseAiFixResponse } from '../aiFix';

describe('buildFixPrompt (§49)', () => {
  it('includes all gathered context', () => {
    const prompt = buildFixPrompt({
      message: 'Undefined control sequence \\foobar',
      severity: 'error',
      file: 'main.tex',
      line: 12,
      sourceContext: 'line 2\nline 12 here\nline 13',
      logExcerpt: '! Undefined control sequence.',
      backendUsed: 'parser',
    });
    expect(prompt).toContain('Undefined control sequence');
    expect(prompt).toContain('main.tex:12');
    expect(prompt).toContain('line 12 here');
    expect(prompt).toContain('! Undefined control sequence.');
    expect(prompt).toContain('parser');
    expect(prompt).toContain('FIXED_CONTENT_START');
  });

  it('handles diagnostics without a line number', () => {
    const prompt = buildFixPrompt({
      message: 'Resource not found',
      severity: 'warning',
      file: 'main.tex',
      sourceContext: '',
      logExcerpt: '',
    });
    expect(prompt).toContain('main.tex');
    expect(prompt).not.toContain('main.tex:');
  });
});

describe('parseAiFixResponse (§49)', () => {
  it('parses explanation and fixed content', () => {
    const raw = [
      'EXPLANATION:',
      'The \\foobar command is undefined.',
      'FIXED_CONTENT_START',
      '\\documentclass{article}',
      '\\begin{document}',
      'Hello',
      '\\end{document}',
      'FIXED_CONTENT_END',
    ].join('\n');
    const result = parseAiFixResponse(raw);
    expect(result.parsed).toBe(true);
    expect(result.explanation).toBe('The \\foobar command is undefined.');
    expect(result.fixedContent).toContain('\\documentclass{article}');
    expect(result.fixedContent).toContain('\\end{document}');
  });

  it('strips code fences around the fixed content', () => {
    const raw = [
      'EXPLANATION: Fixed.',
      'FIXED_CONTENT_START',
      '```latex',
      '\\documentclass{article}',
      '```',
      'FIXED_CONTENT_END',
    ].join('\n');
    const result = parseAiFixResponse(raw);
    expect(result.parsed).toBe(true);
    expect(result.fixedContent).toBe('\\documentclass{article}');
  });

  it('returns explanation-only when no marker is present', () => {
    const result = parseAiFixResponse('Just some prose, no marker.');
    expect(result.parsed).toBe(false);
    expect(result.fixedContent).toBe('');
    expect(result.explanation).toBe('Just some prose, no marker.');
  });

  it('returns empty result for empty input', () => {
    const result = parseAiFixResponse('');
    expect(result.parsed).toBe(false);
    expect(result.explanation).toBe('');
    expect(result.fixedContent).toBe('');
  });
});