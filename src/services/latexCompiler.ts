import { CompilationResult, CompileDiagnostic, ProjectFile } from '../types';

/**
 * TeXForge LaTeX Compilation Engine
 *
 * A parser-based typesetter: it validates the document structure & resources
 * (classes, packages, inputs, graphics, bibliography), extracts the outline,
 * and renders a paginated PDF from the parsed content — like an Overleaf
 * compile pipeline but without a full TeX distribution. Diagnostics are
 * generated from the same .log format conventions TeX uses.
 */

export interface CompileOptions {
  mainFilePath: string;
  files: ProjectFile[];
  compiler: 'PDFLATEX' | 'XELATEX' | 'LUALATEX';
  bibTool: 'BIBTEX' | 'BIBER' | 'NONE';
}

// =============================================================
// Known resource catalogs (what the parser-based engine supports)
// =============================================================

const BUILTIN_CLASSES = [
  'article', 'report', 'book', 'letter', 'slides', 'minimal',
  'beamer', 'memoir', 'amsart', 'amsbook', 'proc', 'standalone',
  'IEEEtran', 'acmart', 'llncs', 'revtex4-1', 'revtex4-2',
  'scrartcl', 'scrreprt', 'scrbook', 'exam', 'tufte-book', 'tufte-handout',
  'elsarticle', 'apa6', 'apa7', 'cvpr', 'ijcai24', 'jmlr',
];

const KNOWN_PACKAGES = [
  // Math
  'amsmath', 'amssymb', 'amsfonts', 'amsthm', 'mathtools', 'bm', 'braket',
  'empheq', 'physics', 'cancel', 'mathrsfs', 'stmaryrd', 'esint', 'euscript',
  'cases', 'siunitx', 'units', 'mhchem', 'chemfig',
  // Graphics & floats
  'graphicx', 'graphics', 'float', 'caption', 'subcaption', 'subfig', 'wrapfig',
  'rotating', 'pdfpages', 'tikz', 'pgfplots', 'xcolor', 'adjustbox', 'framed',
  'mdframed', 'tcolorbox', 'fancybox',
  // Tables
  'booktabs', 'array', 'tabularx', 'longtable', 'multirow', 'makecell',
  'tabularray', 'colortbl', 'dcolumn',
  // Layout & typography
  'geometry', 'hyperref', 'url', 'xurl', 'microtype', 'setspace', 'indentfirst',
  'parskip', 'titlesec', 'titleps', 'tocloft', 'fancyhdr', 'fancyhdr-extra',
  'enumitem', 'sectsty', 'multicol', 'ragged2e', 'textcomp', 'latexsym', 'xspace',
  'titling', 'relsize', 'accent', 'lineno',
  // Text & languages
  'babel', 'polyglossia', 'inputenc', 'fontenc', 'csquotes', 'lipsum', 'blindtext',
  'dirtytalk', 'biblatex-chicago',
  // Lists & theorems
  'algorithm', 'algorithmic', 'algpseudocode', 'algorithm2e', 'listings',
  'appendix', 'enumerate', 'paralist', 'tasks',
  // Bibliography
  'natbib', 'biblatex', 'bibentry', 'multibib',
  // Misc / modern
  'fontawesome5', 'fontawesome', 'awesomebox', 'acronym', 'glossaries', 'makeidx',
  'imakeidx', 'tocbibind', 'hologo', 'microtype', 'verbatim', 'fancyvrb',
  'pdfcomment', 'pifont', 'wasysym', 'marvosym', 'ulem', 'soul', 'xargs', 'etoolbox',
];

const KNOWN_ENVIRONMENTS = [
  'document', 'abstract', 'keywords', 'figure', 'figure*', 'table', 'table*',
  'equation', 'equation*', 'align', 'align*', 'gather', 'gather*', 'multline',
  'multline*', 'split', 'cases', 'itemize', 'enumerate', 'description',
  'verbatim', 'lstlisting', 'minted', 'code', 'tabular', 'tabularx', 'longtable',
  'array', 'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'center', 'flushleft',
  'flushright', 'quote', 'quotation', 'verse', 'minipage', 'tikzpicture',
  'theorem', 'lemma', 'proof', 'definition', 'remark', 'example', 'corollary',
  'proposition', 'conjecture', 'note', 'info', 'rhoenv', 'algorithm',
  'algorithmic', 'titlepage', 'thebibliography', 'list', 'trivlist', 'picture',
  'tabbing', 'filecontents', 'filecontents*', 'lrbox', 'displaymath', 'math',
  'subequations', 'alignat', 'alignat*', 'flalign', 'flalign*', 'xalignat',
  'xxalignat', 'comment',
];

const IMAGE_EXTENSIONS = ['png', 'pdf', 'jpg', 'jpeg', 'eps', 'svg'];

// =============================================================
// .log parsing
// =============================================================

export function parseLatexLog(rawLog: string, _files: ProjectFile[]): CompileDiagnostic[] {
  const diagnostics: CompileDiagnostic[] = [];
  const lines = rawLog.split('\n');

  let currentFile = 'main.tex';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file opening e.g. (./main.tex or (./references.bib
    const fileMatch = line.match(/\(\.\/([a-zA-Z0-9_\-\.\/]+\.(tex|bib|cls|sty))/);
    if (fileMatch) {
      currentFile = fileMatch[1];
    }

    // Detect LaTeX error: "! LaTeX Error: ..."
    if (line.startsWith('! LaTeX Error:') || line.startsWith('! Undefined control sequence.')) {
      let message = line.replace(/^!\s*/, '');
      let lineNum: number | undefined = undefined;

      // Scan subsequent lines for line number e.g. "l.24 \begin{something}"
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const lMatch = lines[j].match(/^l\.(\d+)/);
        if (lMatch) {
          lineNum = parseInt(lMatch[1], 10);
          message += ' ' + lines[j].replace(/^l\.\d+\s*/, '');
          break;
        }
      }

      diagnostics.push({
        severity: 'error',
        file: currentFile,
        line: lineNum,
        message: message.trim(),
      });
    } else if (line.includes('LaTeX Warning:')) {
      const lineMatch = line.match(/line\s+(\d+)/i);
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
      diagnostics.push({
        severity: 'warning',
        file: currentFile,
        line: lineNum,
        message: line.replace(/LaTeX Warning:\s*/, '').trim(),
      });
    } else if (line.includes('Overfull \\hbox') || line.includes('Underfull \\hbox')) {
      const lineMatch = line.match(/at lines\s+(\d+)/i) || line.match(/line\s+(\d+)/i);
      const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
      diagnostics.push({
        severity: 'info',
        file: currentFile,
        line: lineNum,
        message: line.trim(),
      });
    }
  }

  return diagnostics;
}

// =============================================================
// Resource validation — Overleaf-style "file not found" errors
// =============================================================

function lineAt(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

function findBibCiteKeys(files: ProjectFile[]): Set<string> {
  const keys = new Set<string>();
  for (const f of files) {
    if (!f.path.endsWith('.bib') || !f.content) continue;
    const re = /@\w+\s*\{\s*([^,\s]+)/g;
    let m;
    while ((m = re.exec(f.content)) !== null) {
      keys.add(m[1]);
    }
  }
  return keys;
}

/**
 * Validates classes/packages/inputs/graphics/bibliography against the
 * project file tree + known catalogs, producing real diagnostics.
 */
function validateResources(
  texContent: string,
  files: ProjectFile[],
  mainPath: string
): CompileDiagnostic[] {
  const diagnostics: CompileDiagnostic[] = [];
  const knownPaths = new Set(files.map(f => f.path.replace(/^(\.\/|\/)/, '').toLowerCase()));

  const exists = (rel: string): boolean => {
    const normalized = rel.replace(/^(\.\/|\/)/, '').toLowerCase();
    if (knownPaths.has(normalized)) return true;
    // Allow extension-less references
    for (const ext of ['.tex', '.cls', '.sty', '.bib']) {
      if (knownPaths.has(normalized + ext)) return true;
    }
    return false;
  };

  const stripComments = (s: string) => s.replace(/%(?![a-zA-Z])[^\n]*/g, '');

  const content = stripComments(texContent);

  // --- \documentclass{...} ---
  const classRe = /\\documentclass(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = classRe.exec(content)) !== null) {
    const cls = m[1].trim().replace(/\.cls$/, '');
    const clsName = cls.split('/').pop() || cls;
    const clsFile = `${cls}.cls`;
    if (!exists(clsFile) && !BUILTIN_CLASSES.includes(clsName) && !knownPaths.has(clsFile.toLowerCase())) {
      diagnostics.push({
        severity: 'error',
        file: mainPath,
        line: lineAt(content, m.index),
        message: `File '${clsFile}' not found. The document class '${cls}' must either be a built-in class or uploaded to the project (e.g. as a .cls file).`,
      });
    }
  }

  // --- \usepackage{...} / \RequirePackage ---
  const pkgRe = /\\usepackage(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  while ((m = pkgRe.exec(content)) !== null) {
    const pkgs = m[1].split(',').map(p => p.trim()).filter(Boolean);
    for (const pkg of pkgs) {
      if (pkg === 'minted') {
        diagnostics.push({
          severity: 'error',
          file: mainPath,
          line: lineAt(content, m.index),
          message: `Package 'minted' requires Python/Pygments and --shell-escape, which the TeXForge engine does not support. Use the 'listings' package instead.`,
        });
        continue;
      }
      if (pkg === 'fontawesome5' || pkg === 'fontawesome') {
        diagnostics.push({
          severity: 'error',
          file: mainPath,
          line: lineAt(content, m.index),
          message: `Package '${pkg}' ships its own fonts (FontAwesome) that are not bundled with TeXForge. Remove it or replace with standard symbols.`,
        });
        continue;
      }
      if (!KNOWN_PACKAGES.includes(pkg)) {
        const styFile = `${pkg}.sty`;
        if (!exists(styFile)) {
          diagnostics.push({
            severity: 'error',
            file: mainPath,
            line: lineAt(content, m.index),
            message: `File '${styFile}' not found. Package '${pkg}' is not bundled with the TeXForge engine; upload it as a project file or remove the \\usepackage command.`,
          });
        }
      }
    }
  }

  // --- \input{...} / \include{...} ---
  const inputRe = /\\(?:input|include)\s*\{([^}]+)\}/g;
  while ((m = inputRe.exec(content)) !== null) {
    const target = m[1].trim();
    if (!exists(target)) {
      diagnostics.push({
        severity: 'error',
        file: mainPath,
        line: lineAt(content, m.index),
        message: `File '${target}.tex' not found. The referenced input file must exist in the project.`,
      });
    }
  }

  // --- \includegraphics{...} ---
  const imgRe = /\\includegraphics(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  while ((m = imgRe.exec(content)) !== null) {
    const target = m[1].trim();
    if (target.startsWith('http')) continue;
    let found = false;
    for (const ext of IMAGE_EXTENSIONS) {
      if (exists(`${target}.${ext}`)) { found = true; break; }
    }
    if (!found && !exists(target)) {
      diagnostics.push({
        severity: 'error',
        file: mainPath,
        line: lineAt(content, m.index),
        message: `File '${target}' not found. \\includegraphics references an image (${IMAGE_EXTENSIONS.join(', ')}) that is not in the project.`,
      });
    }
  }

  // --- \bibliography / \addbibresource ---
  const bibRe = /\\(?:bibliography|addbibresource)\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  while ((m = bibRe.exec(content)) !== null) {
    const targets = m[1].split(',').map(t => t.trim().replace(/\.bib$/, '')).filter(Boolean);
    for (const target of targets) {
      if (!exists(target)) {
        diagnostics.push({
          severity: 'error',
          file: mainPath,
          line: lineAt(content, m.index),
          message: `File '${target}.bib' not found. The bibliography database must be uploaded to the project.`,
        });
      }
    }
  }

  // --- \cite keys against .bib files (warning only) ---
  const citeRe = /\\cite(?:\[[^\]]*\])?(?:\[[^\]]*\])?\s*\{([^}]+)\}/g;
  const bibKeys = findBibCiteKeys(files);
  if (bibKeys.size > 0) {
    while ((m = citeRe.exec(content)) !== null) {
      const keys = m[1].split(',').map(k => k.trim()).filter(Boolean);
      for (const key of keys) {
        if (!bibKeys.has(key)) {
          diagnostics.push({
            severity: 'warning',
            file: mainPath,
            line: lineAt(content, m.index),
            message: `Citation '${key}' on page 1 undefined. No matching entry found in the .bib files.`,
          });
        }
      }
    }
  }

  // --- Unknown environments (excluding \newenvironment declarations) ---
  const declaredEnvs = new Set<string>();
  const newEnvRe = /\\newenvironment\*?\{([^}]+)\}/g;
  while ((m = newEnvRe.exec(content)) !== null) declaredEnvs.add(m[1]);

  const openEnvs: { name: string; line: number }[] = [];
  const beginRe = /\\begin\s*\{([^}]+)\}/g;
  while ((m = beginRe.exec(content)) !== null) {
    openEnvs.push({ name: m[1], line: lineAt(content, m.index) });
  }
  for (const env of openEnvs) {
    if (!KNOWN_ENVIRONMENTS.includes(env.name) && !declaredEnvs.has(env.name)) {
      diagnostics.push({
        severity: 'warning',
        file: mainPath,
        line: env.line,
        message: `Environment '${env.name}' undefined. It is not built-in and was not declared with \\newenvironment.`,
      });
    }
  }

  return diagnostics;
}

// =============================================================
// Word counting (Overleaf-style body word count)
// =============================================================

function countBodyWords(bodyContent: string): number {
  let text = bodyContent;
  // Drop full environments that should not be counted (figures, tables, equations)
  text = text
    .replace(/\\begin\{(figure|table|equation|align|gather|multline|verbatim|lstlisting|minted|code|algorithm|algorithmic)\*?\}[\s\S]*?\\end\{\1\*?\}/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\\\[[\s\S]*?\\\]/g, ' ');
  // Strip commands with arguments and bare commands
  text = text
    .replace(/\\[a-zA-Z]+\*?\[[^\]]*\]/g, ' ')
    .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\\[^a-zA-Z]/g, ' ')
    .replace(/[{}\[\]]/g, ' ');
  const words = text.split(/\s+/).filter(w => /[a-zA-Z0-9\u00C0-\u024F]/.test(w));
  return words.length;
}

// =============================================================
// PDF generation (paginated)
// =============================================================

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const BOTTOM_MARGIN = 40;
const TOP_START = PAGE_HEIGHT - MARGIN;

function sanitizeForPdf(str: string): string {
  if (!str) return '';
  return str
    .replace(/[^\x00-\x7F]/g, c => {
      const map: Record<string, string> = {
        '—': '-', '–': '-', '“': '"', '”': '"', '‘': "'", '’': "'",
        '°': ' deg', '±': '+/-', '≤': '<=', '≥': '>=', '≠': '!=',
        'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'π': 'pi',
        'µ': 'u', '€': 'EUR', '£': 'GBP', '©': '(c)', '®': '(R)'
      };
      return map[c] || ' ';
    })
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function chunkString(str: string, size: number): string[] {
  if (!str) return [];
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }
  return chunks;
}

interface PageBuilder {
  ops: string;
  y: number;
}

/**
 * Generates a valid %PDF-1.4 binary with automatic pagination.
 */
function createPdfBinary(
  title: string,
  author: string,
  sections: { title: string; content: string[] }[],
  bibEntriesCount: number,
  wordCount: number
): ArrayBuffer {
  const createPage = (): PageBuilder => ({ ops: '50 740 Td\n', y: 740 });
  const pages: PageBuilder[] = [];
  let current: PageBuilder = createPage();

  // Writes an op at the current text position, then moves down by dy.
  // Flows to a new page automatically when the bottom margin is reached.
  // NOTE: a space is mandatory between operators and following numbers —
  // "Tj0" merges into one token and strict viewers (Chrome pdfium) abort
  // the whole content stream, leaving a blank white page.
  const push = (op: string, dy: number) => {
    current.y -= dy;
    if (current.y < BOTTOM_MARGIN) {
      pages.push(current);
      current = createPage();
    }
    current.ops += op;
    if (dy > 0) current.ops += ` 0 -${dy} Td\n`;
  };

  // Title block
  push(`/F2 20 Tf (${sanitizeForPdf(title.slice(0, 60))}) Tj`, 22);
  if (author) {
    push(`/F1 11 Tf (${sanitizeForPdf(author.slice(0, 70))}) Tj`, 14);
  }
  push(`/F1 9 Tf (Compiled via TeXForge Typesetter v1.0 - ${new Date().toLocaleDateString()}) Tj`, 12);
  push(`/F1 9 Tf (${wordCount.toLocaleString()} words) Tj`, 12);
  push(`/F1 9 Tf (____________________________________________________________________________) Tj`, 18);

  // Sections
  for (const sec of sections) {
    if (sec.title) {
      push(`/F2 13 Tf (${sanitizeForPdf(sec.title.slice(0, 60))}) Tj`, 22);
    }
    for (const paragraph of sec.content) {
      push(`/F1 10 Tf`, 0);
      const pLines = chunkString(paragraph, 74);
      let first = true;
      for (const pl of pLines) {
        if (!pl.trim().length) continue;
        push(`(${sanitizeForPdf(pl)}) Tj`, first ? 14 : 14);
        first = false;
      }
      push(`() Tj`, 8); // Paragraph spacing
    }
  }

  // Bibliography note
  if (bibEntriesCount > 0) {
    push(`/F2 12 Tf (References) Tj`, 24);
    push(`/F1 9 Tf (Document references synchronized - ${bibEntriesCount} bibliography entries loaded.) Tj`, 14);
  }

  pages.push(current);

  const encoder = new TextEncoder();

  // Build objects in strict ascending object-number order so the xref
  // table offsets align with the real object numbers:
  //   1 Catalog, 2 Pages, then per page (Page + Contents), then 2 fonts.
  const pageCount = pages.length;
  const fontBaseOffset = 3 + pageCount * 2;
  const objects: string[] = [];
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  const kids = Array.from({ length: pageCount }, (_, i) => `${3 + i * 2} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj`);

  // Pages + contents
  pages.forEach((pg, i) => {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = 4 + i * 2;
    const stream = `BT\n${pg.ops}ET\n`;
    const streamBytes = encoder.encode(stream);
    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontBaseOffset} 0 R /F2 ${fontBaseOffset + 1} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj`
    );
    objects.push(
      `${contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj`
    );
  });

  // Fonts (F1 = Helvetica, F2 = Helvetica-Bold)
  objects.push(`${fontBaseOffset} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objects.push(`${fontBaseOffset + 1} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);

  const headerBytes = encoder.encode(`%PDF-1.4\n`);
  const objBytes: Uint8Array[] = [];
  let currentOffset = headerBytes.length;
  const offsets: number[] = [0];

  for (const objStr of objects) {
    offsets.push(currentOffset);
    const encoded = encoder.encode(objStr + `\n`);
    objBytes.push(encoded);
    currentOffset += encoded.length;
  }

  const xrefOffset = currentOffset;
  let xrefStr = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offStr = offsets[i].toString().padStart(10, '0');
    xrefStr += `${offStr} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const xrefBytes = encoder.encode(xrefStr);

  const totalLength = headerBytes.length + objBytes.reduce((a, b) => a + b.length, 0) + xrefBytes.length;
  const pdfBuffer = new Uint8Array(totalLength);

  let pos = 0;
  pdfBuffer.set(headerBytes, pos);
  pos += headerBytes.length;

  for (const ob of objBytes) {
    pdfBuffer.set(ob, pos);
    pos += ob.length;
  }

  pdfBuffer.set(xrefBytes, pos);
  return pdfBuffer.buffer;
}

// =============================================================
// Main compilation entry point
// =============================================================

export async function compileLatexProject(options: CompileOptions): Promise<CompilationResult> {
  const startTime = performance.now();

  const normalizedMainPath = (options.mainFilePath || 'main.tex').replace(/^(\.\/|\/)/, '');
  const mainFile =
    options.files.find(f => f.path.replace(/^(\.\/|\/)/, '') === normalizedMainPath) ||
    options.files.find(f => f.path.endsWith('.tex')) ||
    options.files[0];

  if (!mainFile || !mainFile.content) {
    return {
      status: 'error',
      log: '! LaTeX Error: Main file not found or empty.',
      diagnostics: [
        {
          severity: 'error',
          file: options.mainFilePath,
          line: 1,
          message: 'Main LaTeX file could not be located in project files.',
        },
      ],
      wordCount: 0,
      durationMs: Math.round(performance.now() - startTime),
      compiledAt: new Date().toISOString(),
    };
  }

  const texContent = mainFile.content;

  // Extract Title
  const titleMatch = texContent.match(/\\title\{([\s\S]*?)\}/);
  const title = titleMatch
    ? titleMatch[1]
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\Large|\\large|\\huge|\\Huge/g, '')
        .replace(/\\\\/g, ' ')
        .trim()
    : 'LaTeX Document';

  // Extract Author
  const authorMatch = texContent.match(/\\author\{([\s\S]*?)\}/);
  const author = authorMatch
    ? authorMatch[1]
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\textsuperscript\{[^}]+\}/g, '')
        .replace(/\\\\/g, ' ')
        .trim()
    : '';

  // Extract Document Body
  let bodyContent = texContent;
  const docMatch = texContent.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (docMatch) {
    bodyContent = docMatch[1];
  }

  // Validate resources — this is what turns "silent demo output" into
  // real Overleaf-style errors (missing .cls / .sty / images / .bib).
  const diagnostics = validateResources(texContent, options.files, mainFile.path);
  const hasResourceErrors = diagnostics.some(d => d.severity === 'error');

  const sections: { title: string; content: string[] }[] = [];

  // Extract Abstract if present
  const abstractMatch = bodyContent.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  if (abstractMatch) {
    const cleanAbstract = abstractMatch[1]
      .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[\$\{\}]/g, '')
      .trim();
    if (cleanAbstract) {
      sections.push({
        title: 'Abstract',
        content: [cleanAbstract],
      });
    }
  }

  // Extract Sections & Chapters
  const sectionRegex = /\\(section|chapter|subsection)\*?\{([^}]+)\}([\s\S]*?)(?=\\(section|chapter|subsection)\*?\{|$)/g;
  let match;
  while ((match = sectionRegex.exec(bodyContent)) !== null) {
    const secTitle = match[2].replace(/\\textbf\{([^}]+)\}/g, '$1').trim();
    const rawBody = match[3];

    const cleanBody = rawBody
      .replace(/\\begin\{equation\}[\s\S]*?\\end\{equation\}/g, '[Equation]')
      .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, '[Table]')
      .replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, '[Figure]')
      .replace(/\\cite\{([^}]+)\}/g, '[$1]')
      .replace(/\\ref\{([^}]+)\}/g, '($1)')
      .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[\$\{\}]/g, '')
      .trim();

    const paragraphs = cleanBody.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    sections.push({
      title: secTitle,
      content: paragraphs.length > 0 ? paragraphs : [cleanBody],
    });
  }

  // Fallback if no explicit section matched
  if (sections.length === 0) {
    const cleanBody = bodyContent
      .replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g, '')
      .replace(/\\[a-zA-Z]+\{([^}]+)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/[\$\{\}]/g, '')
      .trim();

    const paragraphs = cleanBody.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    sections.push({
      title: 'Document Body',
      content: paragraphs.length > 0 ? paragraphs : ['LaTeX Document compiled successfully.'],
    });
  }

  // Word count
  const wordCount = countBodyWords(bodyContent);

  // Syntax balance check & generate .log file lines
  const rawLogLines: string[] = [];
  rawLogLines.push(`This is TeXForge Typesetter v1.0 (parser-based engine, Overleaf-style diagnostics)`);
  rawLogLines.push(`(./${mainFile.path}`);

  // Strip comment lines for environment checking
  const texWithoutComments = texContent.replace(/%.*/g, '');
  const openEnvs = (texWithoutComments.match(/\\begin\{([a-zA-Z0-9\*_]+)\}/g) || []).map(e =>
    e.replace(/\\begin\{|\}/g, '')
  );
  const closeEnvs = (texWithoutComments.match(/\\end\{([a-zA-Z0-9\*_]+)\}/g) || []).map(e =>
    e.replace(/\\end\{|\}/g, '')
  );

  let hasError = hasResourceErrors;
  if (openEnvs.length !== closeEnvs.length) {
    hasError = true;
    const lineCount = texContent.split('\n').length;
    rawLogLines.push(
      `! LaTeX Error: \\begin{${openEnvs[openEnvs.length - 1] || 'document'}} on input line ${Math.max(
        1,
        lineCount - 2
      )} ended by \\end{document}.`
    );
    rawLogLines.push(`l.${Math.max(1, lineCount - 2)} \\end{document}`);
    diagnostics.push({
      severity: 'error',
      file: mainFile.path,
      line: Math.max(1, lineCount - 2),
      message: `\\begin{${openEnvs[openEnvs.length - 1] || 'document'}} ... \\end{document} environment mismatch.`,
    });
  }

  // Count bib entries
  const bibFiles = options.files.filter(f => f.path.endsWith('.bib'));
  let totalBibEntries = 0;
  for (const bf of bibFiles) {
    if (bf.content) {
      const entries = bf.content.match(/@\w+\{/g) || [];
      totalBibEntries += entries.length;
    }
  }

  if (bibFiles.length > 0) {
    rawLogLines.push(`(./${bibFiles[0].path})`);
    rawLogLines.push(`BibTeX database file #1: ${bibFiles[0].path}`);
    rawLogLines.push(`Database file #1 contains ${totalBibEntries} entries.`);
  }

  if (hasResourceErrors) {
    for (const d of diagnostics) {
      if (d.severity === 'error') {
        rawLogLines.push(`! LaTeX Error: ${d.message}`);
        if (d.line) rawLogLines.push(`l.${d.line}`);
      } else if (d.severity === 'warning') {
        rawLogLines.push(`LaTeX Warning: ${d.message}`);
      }
    }
  }

  // Generate binary PDF array buffer (paginated)
  const pdfBuffer = createPdfBinary(title, author, sections, totalBibEntries, wordCount);
  const pageEstimate = Math.max(1, Math.round((sections.reduce((a, s) => a + s.content.reduce((b, p) => b + p.length, 0), 0) + title.length) / 2200) || 1);

  if (!hasResourceErrors) {
    rawLogLines.push(`Output written on ${mainFile.path.replace('.tex', '.pdf')} (${pageEstimate} page${pageEstimate !== 1 ? 's' : ''}, ${pdfBuffer.byteLength} bytes).`);
  } else {
    rawLogLines.push(`! No pages of output.`);
  }
  rawLogLines.push(`Transcript written on ${mainFile.path.replace('.tex', '.log')}.`);

  const fullLog = rawLogLines.join('\n');
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const pdfDataUrl = URL.createObjectURL(blob);

  return {
    status: hasError ? 'error' : 'success',
    pdfDataUrl,
    pdfArrayBuffer: pdfBuffer,
    log: fullLog,
    diagnostics,
    wordCount,
    durationMs: Math.round(performance.now() - startTime),
    compiledAt: new Date().toISOString(),
  };
}
