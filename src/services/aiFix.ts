/**
 * §49 "Fix with AI": parsing of the AI's structured fix response.
 *
 * The LaTeX-debugging prompt asks the model for a plain-language explanation
 * plus a minimal targeted fix. To stay robust across BYO providers (which may
 * wrap output in markdown fences or add prose around it), the model is asked
 * to emit explicit markers, and this module parses them defensively:
 *
 *   EXPLANATION:
 *   <plain language explanation>
 *   FIXED_CONTENT_START
 *   <full fixed file content>
 *   FIXED_CONTENT_END
 */

export interface AiFixResult {
  explanation: string;
  /** Full fixed file content ("" when parsing failed). */
  fixedContent: string;
  /** True when the fixed content was successfully extracted. */
  parsed: boolean;
}

const START_MARKER = 'FIXED_CONTENT_START';
const END_MARKER = 'FIXED_CONTENT_END';

/** Build the §49 debugging prompt from the gathered diagnostic context. */
export function buildFixPrompt(input: {
  message: string;
  severity: string;
  file: string;
  line?: number;
  /** ±N lines of source around the diagnostic. */
  sourceContext: string;
  /** Raw compiler log excerpt near the error. */
  logExcerpt: string;
  backendUsed?: string;
}): string {
  return [
    'You are a LaTeX debugging assistant. A compile failed with the following diagnostic:',
    '',
    `Severity: ${input.severity}`,
    `File: ${input.file}${input.line != null ? `:${input.line}` : ''}`,
    `Message: ${input.message}`,
    input.backendUsed ? `Compile backend: ${input.backendUsed}` : '',
    '',
    'Relevant source lines (around the error):',
    '```',
    input.sourceContext || '(no source context available)',
    '```',
    '',
    'Raw compiler log excerpt:',
    '```',
    input.logExcerpt || '(no log excerpt available)',
    '```',
    '',
    'Respond with EXACTLY this structure — no markdown fences around the whole reply:',
    'EXPLANATION:',
    '<plain-language explanation of the likely cause and the minimal fix, 2-5 sentences>',
    'FIXED_CONTENT_START',
    '<the COMPLETE fixed file content — change only the lines needed for the fix, do not rewrite the file>',
    'FIXED_CONTENT_END',
  ].join('\n');
}

/** Parse the model's reply into explanation + fixed content. */
export function parseAiFixResponse(raw: string): AiFixResult {
  if (!raw) return { explanation: '', fixedContent: '', parsed: false };

  const startIdx = raw.indexOf(START_MARKER);
  if (startIdx < 0) {
    // No marker: keep the whole reply as explanation only.
    return { explanation: raw.trim(), fixedContent: '', parsed: false };
  }

  const explanation = raw.slice(0, startIdx).replace(/^EXPLANATION:?\s*/i, '').trim();

  const afterStart = raw.slice(startIdx + START_MARKER.length);
  const endIdx = afterStart.indexOf(END_MARKER);
  let fixedContent = endIdx >= 0 ? afterStart.slice(0, endIdx) : afterStart;
  fixedContent = fixedContent.replace(/^\n/, '').replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trimEnd();

  return {
    explanation,
    fixedContent: fixedContent.trim(),
    parsed: fixedContent.trim().length > 0,
  };
}