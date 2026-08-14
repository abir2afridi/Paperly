/**
 * CompileBackend abstraction (§4A) — mirrors the plan's `CompileBackend`
 * interface. Today only the in-browser parser-based backend exists; a future
 * WASM pdfTeX or Docker sandbox backend implements the same contract and is
 * selected via `getCompileBackend(id)`.
 */
import { CompilationResult } from '../types';
import { compileLatexProject, CompileOptions } from './latexCompiler';

export interface CompileBackend {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Human-readable capability tags, e.g. 'pdf', 'biblatex', 'tikz'. */
  readonly capabilities: string[];
  compile(options: CompileOptions): Promise<CompilationResult>;
}

export class ParserCompileBackend implements CompileBackend {
  readonly id = 'parser';
  readonly label = 'Parser-based typesetter (in-browser)';
  readonly description =
    'Validates resources, lints the source (§24) and typesets parsed content into a real PDF binary.';
  readonly capabilities = ['pdf', 'lint', 'resource-validation', 'latex-to-pdf'];

  async compile(options: CompileOptions): Promise<CompilationResult> {
    const result = await compileLatexProject(options);
    // §48: every result records which backend produced it so the PDF viewer
    // can show the persistent "Preview — browser compiler" badge.
    return { ...result, backendUsed: this.id };
  }
}

const parserBackend = new ParserCompileBackend();

/** Factory (§4A.1). Unknown ids fall back to the parser backend. */
export function getCompileBackend(id: string = 'parser'): CompileBackend {
  switch (id) {
    default:
      return parserBackend;
  }
}

/** Registered backend ids — kept here so the UI can enumerate options. */
export const COMPILE_BACKEND_IDS: string[] = ['parser'];