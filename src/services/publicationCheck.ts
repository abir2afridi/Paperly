import { ProjectFile } from '../types';

export type PublicationSeverity = 'error' | 'warning' | 'info';
export type PublicationCategory = 'structure' | 'citations' | 'metadata' | 'completeness';

export interface PublicationFinding {
  severity: PublicationSeverity;
  category: PublicationCategory;
  message: string;
  suggestion: string;
}

/**
 * Publication-readiness check (plan §44): a deterministic, source-level
 * analysis of the common blockers editors run into before submission.
 * Every check is computed from the project files — nothing is guessed.
 */
export function runPublicationCheck(mainFilePath: string, files: ProjectFile[]): PublicationFinding[] {
  const findings: PublicationFinding[] = [];
  const texFiles = files.filter(f => f.path.endsWith('.tex'));
  const mainFile = texFiles.find(f => f.path === mainFilePath) || texFiles.find(f => f.path.endsWith('.tex'));

  if (!mainFile) {
    findings.push({
      severity: 'error',
      category: 'structure',
      message: `Main file '${mainFilePath}' was not found in the project.`,
      suggestion: 'Re-open the project and make sure the main file path is correct.',
    });
    return findings;
  }

  const content = mainFile.content;
  const allTex = texFiles.map(f => f.content).join('\n');
  const bodyMatch = content.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  const body = bodyMatch ? bodyMatch[1] : content;
  const bodyWords = body.replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, ' ').replace(/[\$\{\}\\%]/g, ' ').split(/\s+/).filter(Boolean).length;

  // ---- structure ----
  if (!/\\begin\{document\}[\s\S]*\\end\{document\}/.test(content)) {
    findings.push({
      severity: 'error',
      category: 'structure',
      message: 'The document is missing a complete \\begin{document} ... \\end{document} body.',
      suggestion: 'Wrap the content in the document environment before submitting.',
    });
  }

  const sectionCount = (content.match(/\\(?:section|chapter|part)\{/g) || []).length;
  if (sectionCount === 0) {
    findings.push({
      severity: 'warning',
      category: 'structure',
      message: 'No \\section or \\chapter headings were found in the main file.',
      suggestion: 'Most venues expect at least one structured section heading.',
    });
  }

  // ---- metadata ----
  if (!/\\title\{/.test(content)) {
    findings.push({
      severity: 'error',
      category: 'metadata',
      message: 'No \\title is defined.',
      suggestion: 'Add \\title{...} (and \\maketitle) to the preamble.',
    });
  }
  if (!/\\author\{/.test(content)) {
    findings.push({
      severity: 'error',
      category: 'metadata',
      message: 'No \\author is defined.',
      suggestion: 'Add \\author{...} before compiling for submission.',
    });
  }
  if (!/\\(?:date|maketitle)\{/.test(content) && !/\\date\{/.test(content)) {
    findings.push({
      severity: 'warning',
      category: 'metadata',
      message: 'No \\date is set — the compiled output will show the current date.',
      suggestion: 'Set \\date{} explicitly if the venue requires a fixed date.',
    });
  }

  // ---- completeness ----
  if (!/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/.test(content)) {
    findings.push({
      severity: 'warning',
      category: 'completeness',
      message: 'The document has no abstract.',
      suggestion: 'Add an abstract environment; most venues require one for review.',
    });
  }

  if (bodyWords < 300) {
    findings.push({
      severity: 'info',
      category: 'completeness',
      message: `The body is short (~${bodyWords} words) — double-check that this is the intended submission length.`,
      suggestion: 'Expand sections or confirm the venue\'s length limits.',
    });
  }

  if (!/\\begin\{acknowledg|\\acknowledge|\\thanks\{|funding/i.test(content) && !/acknowledg/i.test(allTex)) {
    findings.push({
      severity: 'info',
      category: 'completeness',
      message: 'No acknowledgments/funding statement was found.',
      suggestion: 'Add one if the venue or funder requires it.',
    });
  }

  // ---- citations & cross-references ----
  const cites = [...allTex.matchAll(/\\cite[a-zA-Z]*\*?\{([^}]*)\}/g)].flatMap(m => m[1].split(',')).map(s => s.trim()).filter(Boolean);
  const labels = [...allTex.matchAll(/\\label\{([^}]*)\}/g)].map(m => m[1]);
  const refs = [...allTex.matchAll(/\\(?:ref|eqref|pageref|autoref|cref|Cref)\*?\{([^}]*)\}/g)].flatMap(m => m[1].split(',')).map(s => s.trim()).filter(Boolean);
  const bibFiles = files.filter(f => f.path.endsWith('.bib'));

  if (cites.length === 0) {
    findings.push({
      severity: 'info',
      category: 'citations',
      message: 'The document does not cite any references.',
      suggestion: bibFiles.length > 0
        ? 'Citations were expected — add \\cite{...} commands to the text.'
        : 'Add a .bib file and cite at least some entries (unless the venue does not use references).',
    });
  }

  const missingRefs = refs.filter(key => !labels.includes(key));
  if (missingRefs.length > 0) {
    findings.push({
      severity: 'error',
      category: 'citations',
      message: `${missingRefs.length} reference(s) have no matching \\label: ${missingRefs.slice(0, 5).map(k => `'${k}'`).join(', ')}${missingRefs.length > 5 ? ', …' : ''}.`,
      suggestion: 'Add the missing \\label{...} commands or fix the reference keys.',
    });
  }

  const duplicateLabels = [...new Set(labels.filter((label, i) => labels.indexOf(label) !== i))];
  if (duplicateLabels.length > 0) {
    findings.push({
      severity: 'warning',
      category: 'citations',
      message: `Duplicate \\label keys: ${duplicateLabels.join(', ')}.`,
      suggestion: 'Rename duplicates — this breaks cross-references at compile time.',
    });
  }

  return findings;
}