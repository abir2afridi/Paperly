/**
 * Terminal engine — diagnostic summaries for the terminal panel.
 *
 * Extracted from the UI so counts/duration formatting can be reused and
 * tested without React.
 */
import type { CompilationResult } from '../types';

export interface CompilationSummary {
  errorCount: number;
  warningCount: number;
  durationLabel: string;
}

export function summarizeCompilation(result: CompilationResult | null): CompilationSummary {
  const diagnostics = result?.diagnostics || [];
  return {
    errorCount: diagnostics.filter(d => d.severity === 'error').length,
    warningCount: diagnostics.filter(d => d.severity === 'warning').length,
    durationLabel: result ? (result.durationMs / 1000).toFixed(2) + 's' : '--',
  };
}