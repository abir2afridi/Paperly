export interface CtanPackage {
  name: string;
  description: string;
  category: string;
}

export const PACKAGE_CATEGORIES = [
  'Math & Symbols',
  'Fonts & Typography',
  'Tables',
  'Graphics & Figures',
  'Bibliographies & Citations',
  'Theorems & Definitions',
  'Heads & Footers',
  'Cross-References & Links',
  'Lists & Structures',
  'Chemistry & Physics',
  'Language & Encoding',
  'Misc / Utilities',
] as const;

// Curated index of common CTAN packages (plan §26). This is a static,
// locally-cached index — it does not proxy live CTAN search.
export const CTAN_PACKAGES: CtanPackage[] = [
  // Math & Symbols
  { name: 'amsmath', description: 'Advanced math: align, gather, cases, matrices and equation numbering.', category: 'Math & Symbols' },
  { name: 'amssymb', description: 'AMS symbol fonts: blackboard bold, \\lesssim, \\to and hundreds more.', category: 'Math & Symbols' },
  { name: 'amsthm', description: 'AMS theorem environments: definition, theorem, proof with QED symbol.', category: 'Math & Symbols' },
  { name: 'amsfonts', description: 'AMS font definitions including \\mathbb{} blackboard bold letters.', category: 'Math & Symbols' },
  { name: 'mathtools', description: 'Enhanced amsmath: \\coloneqq, \\DeclarePairedDelimiter, multi-line alignment.', category: 'Math & Symbols' },
  { name: 'bm', description: 'Bold math symbols: \\bm{x}. Works across font families.', category: 'Math & Symbols' },
  { name: 'gensymb', description: 'Generic symbols: \\degree, \\celsius, \\ohm, \\micro.', category: 'Math & Symbols' },
  { name: 'siunitx', description: 'Typeset units and numbers: \\SI{5}{\\metre\\per\\second}.', category: 'Math & Symbols' },
  { name: 'units', description: 'Dimension/unit support with \\unit{metre\\per\\second}.', category: 'Math & Symbols' },
  { name: 'physics', description: 'Physics notation helpers: \\abs, \\expval, \\dv, \\pdv.', category: 'Math & Symbols' },
  { name: 'youngtab', description: 'Young tableaux for symmetric group / representation theory diagrams.', category: 'Math & Symbols' },
  { name: 'braket', description: 'Dirac bra-ket notation: \\bra, \\ket, \\braket.', category: 'Math & Symbols' },
  { name: 'nicefrac', description: 'Inline fractions: \\nicefrac{1}{2}.', category: 'Math & Symbols' },
  { name: 'cancel', description: 'Diagonal slashed-out math: \\cancel{x}, \\bcancel, \\xcancel.', category: 'Math & Symbols' },
  { name: 'cases', description: 'Math case environment with automatic braces and alignment.', category: 'Math & Symbols' },
  { name: 'empheq', description: 'Tags, boxes and background colors around aligned equations.', category: 'Math & Symbols' },
  { name: 'nccmath', description: 'Non-centred math variants: \\mfrac, \\mint, medium-sized fractions.', category: 'Math & Symbols' },
  { name: 'stmaryrd', description: 'St Mary Road symbol font: \\bigsqcap, \\talloblong and friends.', category: 'Math & Symbols' },
  { name: 'commath', description: 'Classic differentials \\dif{} and operators with clean spacing.', category: 'Math & Symbols' },
  { name: 'esvect', description: 'Fancy vector arrows: \\vv{v}, \\vvv for 3D vectors.', category: 'Math & Symbols' },
  { name: 'derivative', description: 'Derivative notation: \\odv{y}{x}, \\pdv[2]{f}{x}.', category: 'Math & Symbols' },
  { name: 'interval', description: 'Interval notation for real sets: \\interval[open]{a}{b}.', category: 'Math & Symbols' },
  { name: 'setspace', description: 'Line spacing: \\doublespacing, \\onehalfspacing.', category: 'Fonts & Typography' },
  { name: 'microtype', description: 'Micro-typographic refinements: character protrusion and font expansion.', category: 'Fonts & Typography' },
  { name: 'fontspec', description: '(Xe/LuaLaTeX) Load system fonts natively with \\setmainfont.', category: 'Fonts & Typography' },
  { name: 'newtx', description: 'Times-style text + math fonts (TX clone family).', category: 'Fonts & Typography' },
  { name: 'newpx', description: 'Palatino-style text + math fonts (PX clone family).', category: 'Fonts & Typography' },
  { name: 'lmodern', description: 'Latin Modern fonts — improved Computer Modern look.', category: 'Fonts & Typography' },
  { name: 'mathpazo', description: 'Palatino text with matching math (PaZo).', category: 'Fonts & Typography' },
  { name: 'mathptmx', description: 'Times text with matching math (PTMX).', category: 'Fonts & Typography' },
  { name: 'libertine', description: 'Linux Libertine text and math fonts.', category: 'Fonts & Typography' },
  { name: 'charter', description: 'Bitstream Charter text font with matching math option.', category: 'Fonts & Typography' },
  { name: 'helvet', description: 'Helvetica clone; scale with \\usepackage[scaled]{helvet}.', category: 'Fonts & Typography' },
  { name: 'courier', description: 'Courier monospaced clone for code listings.', category: 'Fonts & Typography' },
  { name: 'fancyhdr', description: 'Custom headers/footers with \\fancyhead and \\fancyfoot.', category: 'Heads & Footers' },
  { name: 'titlesec', description: 'Custom section title formatting: spacing, fonts, rules.', category: 'Heads & Footers' },
  { name: 'titletoc', description: 'Customize table-of-contents entries.', category: 'Heads & Footers' },
  { name: 'abstract', description: 'Control abstract environment appearance and position.', category: 'Heads & Footers' },
  { name: 'tocloft', description: 'Fine control over list-of-figures/tables rendering.', category: 'Heads & Footers' },
  { name: 'totcount', description: 'Counters with page-references: \\total{cycles}.', category: 'Heads & Footers' },
  { name: 'totpages', description: '\\totpages — total page count everywhere in the document.', category: 'Heads & Footers' },
  { name: 'lastpage', description: 'Provides \\pageref{LastPage} for "Page X of Y" footers.', category: 'Heads & Footers' },
  { name: 'geometry', description: 'Set page margins and paper size with a key=value interface.', category: 'Misc / Utilities' },
  { name: 'hyperref', description: 'Hyperlinks, PDF bookmarks, \\autoref and clickable cross-references. Load last.', category: 'Cross-References & Links' },
  { name: 'hypcap', description: 'Make hyperlinks to figures/tables jump to the caption, not the float.', category: 'Cross-References & Links' },
  { name: 'cleveref', description: 'Smart cross-references: \\cref{a,b} renders "Sections 2 and 3".', category: 'Cross-References & Links' },
  { name: 'xr', description: 'Cross-reference labels between separate documents (\\externaldocument).', category: 'Cross-References & Links' },
  { name: 'varioref', description: 'Context-aware references: "on the following page".', category: 'Cross-References & Links' },
  { name: 'caption', description: 'Fine control over figure/table caption text and formatting.', category: 'Graphics & Figures' },
  { name: 'subcaption', description: 'Sub-figures/tables with \\subcaption and \\subref.', category: 'Graphics & Figures' },
  { name: 'subfig', description: 'Legacy side-by-side sub-figures with letters.', category: 'Graphics & Figures' },
  { name: 'graphicx', description: 'Include graphics: \\includegraphics, \\graphicspath, rotation/scaling.', category: 'Graphics & Figures' },
  { name: 'grffile', description: 'Extended support for graphics file names with dots/spaces.', category: 'Graphics & Figures' },
  { name: 'epstopdf', description: 'Auto-convert EPS pictures to PDF during compilation.', category: 'Graphics & Figures' },
  { name: 'svg', description: 'SVG graphics with \\includesvg (requires Inkscape in the toolchain).', category: 'Graphics & Figures' },
  { name: 'tikz', description: 'Powerful drawing language: \\begin{tikzpicture} + \\draw, \\node, \\fill.', category: 'Graphics & Figures' },
  { name: 'pgfplots', description: 'High-quality function/data plots built on TikZ: \\addplot.', category: 'Graphics & Figures' },
  { name: 'pgfplotstable', description: 'Create tables directly from numeric data files.', category: 'Graphics & Figures' },
  { name: 'circuitikz', description: 'Electrical and electronic circuit diagrams.', category: 'Graphics & Figures' },
  { name: 'float', description: 'Float placement tweaks: [H] to force a position.', category: 'Graphics & Figures' },
  { name: 'floatrow', description: 'Side-by-side and complex float layouts.', category: 'Graphics & Figures' },
  { name: 'wrapfig', description: 'Wrap text around a figure or table.', category: 'Graphics & Figures' },
  { name: 'placeins', description: 'Control float placement: \\FloatBarrier, \\usepackage[section].', category: 'Graphics & Figures' },
  { name: 'pdfpages', description: 'Include whole PDFs as pages: \\includepdf.', category: 'Graphics & Figures' },
  { name: 'booktabs', description: 'Publication-quality horizontal rules in tables: \\toprule, \\midrule.', category: 'Tables' },
  { name: 'tabularx', description: 'Tables that stretch to a fixed width with the X column type.', category: 'Tables' },
  { name: 'tabulary', description: 'Variable-width columns balancing hyphenation in tables.', category: 'Tables' },
  { name: 'longtable', description: 'Tables that break across pages automatically.', category: 'Tables' },
  { name: 'supertabular', description: 'Alternate multi-page table environment with repeat headers.', category: 'Tables' },
  { name: 'array', description: 'Extended column types and preamble commands for tabular.', category: 'Tables' },
  { name: 'multirow', description: 'Span rows in a table: \\multirow{2}{*}{text}.', category: 'Tables' },
  { name: 'makecell', description: 'Custom cell content with line breaks and alignment.', category: 'Tables' },
  { name: 'colortbl', description: 'Colored table cells, rows and columns.', category: 'Tables' },
  { name: 'diagbox', description: 'Diagonal lines separating header-cells in tables.', category: 'Tables' },
  { name: 'dcolumn', description: 'Decimal-aligned numeric columns: D{.}{,}{2}.', category: 'Tables' },
  { name: 'rotating', description: 'Sideways (rotated) floats: sidewaystable, sidewaysfigure.', category: 'Tables' },
  { name: 'threeparttable', description: 'Tables with notes placed at the bottom, matched to the tabular width.', category: 'Tables' },
  { name: 'tablefootnote', description: 'Footnotes that live at the end of tables.', category: 'Tables' },
  { name: 'fancyvrb', description: 'Verbatim environments with custom fonts, frames and line numbers.', category: 'Misc / Utilities' },
  { name: 'listings', description: 'Code listings with syntax highlighting: \\lstinputlisting.', category: 'Misc / Utilities' },
  { name: 'minted', description: 'Code listings via Pygments (requires external python/pygments).', category: 'Misc / Utilities' },
  { name: 'verbatim', description: 'Classic verbatim environment and \\verb command.', category: 'Misc / Utilities' },
  { name: 'url', description: 'Safer \\url{} with line-break friendly URL typesetting.', category: 'Misc / Utilities' },
  { name: 'xurl', description: 'URLs that break anywhere: long link-friendly line breaking.', category: 'Misc / Utilities' },
  { name: 'enumitem', description: 'Flexible control for lists: custom labels, spacing, resume.', category: 'Lists & Structures' },
  { name: 'tasks', description: 'Horizontally-aligned lists of tasks/questions: \\begin{tasks}.', category: 'Lists & Structures' },
  { name: 'paralist', description: 'Compact lists: inline lists, tighter spacing.', category: 'Lists & Structures' },
  { name: 'sectsty', description: 'Simple section-title font and formatting control.', category: 'Heads & Footers' },
  { name: 'appendix', description: 'Appendix management: sections appendixed automatically.', category: 'Lists & Structures' },
  { name: 'minitoc', description: 'Per-chapter tables of contents.', category: 'Lists & Structures' },
  { name: 'biblatex', description: 'Modern bibliography system with the biber backend.', category: 'Bibliographies & Citations' },
  { name: 'natbib', description: 'Author-year and numeric citation commands: \\citep, \\citet.', category: 'Bibliographies & Citations' },
  { name: 'cite', description: 'Condensed, sorted citations: \\cite{a,b,c} -> [1-3].', category: 'Bibliographies & Citations' },
  { name: 'apalike', description: 'APA-like bibliography style.', category: 'Bibliographies & Citations' },
  { name: 'harvard', description: 'Harvard-style author-year citations.', category: 'Bibliographies & Citations' },
  { name: 'inputenc', description: 'Input character encoding (usually: \\usepackage[utf8]{inputenc}).', category: 'Language & Encoding' },
  { name: 'fontenc', description: 'Output font encoding (usually: \\usepackage[T1]{fontenc}).', category: 'Language & Encoding' },
  { name: 'textcomp', description: 'Text companion symbols: \\texteuro, \\textcopyright.', category: 'Language & Encoding' },
  { name: 'babel', description: 'Language support with hyphenation and translated headings.', category: 'Language & Encoding' },
  { name: 'csquotes', description: 'Language-aware quotation marks: \\enquote{double}.', category: 'Language & Encoding' },
  { name: 'polyglossia', description: '(Xe/LuaLaTeX) Multilingual typesetting — option to babel.', category: 'Language & Encoding' },
  { name: 'xfrac', description: 'Professional fractions and complex number formatting.', category: 'Math & Symbols' },
  { name: 'dblfloatfix', description: 'Fix placement of double-column floats.', category: 'Graphics & Figures' },
  { name: 'ntheorem', description: 'Flexible theorem environments with configurable styles.', category: 'Theorems & Definitions' },
  { name: 'thmtools', description: 'Declare theorems with fine-tuned keys: shared counters, QED.', category: 'Theorems & Definitions' },
  { name: 'mdframed', description: 'Framed boxes for theorems/definitions with custom styling.', category: 'Theorems & Definitions' },
  { name: 'tcolorbox', description: 'Beautiful boxes & breakable environments for examples and theorems.', category: 'Theorems & Definitions' },
  { name: 'algorithm', description: 'Float-algorithms: \\begin{algorithm} + pseudocode environments.', category: 'Theorems & Definitions' },
  { name: 'algorithmic', description: 'Plain pseudocode algorithm environments.', category: 'Theorems & Definitions' },
  { name: 'algpseudocode', description: 'Pseudocode package in the algorithmic-compatible style.', category: 'Theorems & Definitions' },
  { name: 'algorithm2e', description: 'Floating algorithm environment with control keyword styling.', category: 'Theorems & Definitions' },
  { name: 'chemfig', description: 'Draw molecule structures: \\chemfig{-[::-60]O}.', category: 'Chemistry & Physics' },
  { name: 'mhchem', description: 'Chemical equations/formulas: \\ce{H2O}, \\ce{Na^+}.', category: 'Chemistry & Physics' },
  { name: 'isotope', description: 'Isotope notation: \\isotope[14][6]{C}.', category: 'Chemistry & Physics' },
  { name: 'feynMF', description: 'Draw Feynman diagrams using MetaFont (legacy; prefer tikz-feynman).', category: 'Chemistry & Physics' },
  { name: 'ifthen', description: 'Conditional typesetting: \\ifthenelse, \\ifboolexpr.', category: 'Misc / Utilities' },
  { name: 'xcolor', description: 'Color support with named colors: \\textcolor{red}{x}, \\pagecolor.', category: 'Misc / Utilities' },
  { name: 'color', description: 'Core color package (prefer xcolor for extended capabilities).', category: 'Misc / Utilities' },
  { name: 'eso-pic', description: 'Add background pictures and watermark text to every page.', category: 'Misc / Utilities' },
  { name: 'wallpaper', description: 'Background wallpaper images for pages.', category: 'Misc / Utilities' },
  { name: 'background', description: 'Easily add background artwork/watermarks to all pages.', category: 'Misc / Utilities' },
  { name: 'draftwatermark', description: 'DRAFT watermarks styled with \\SetWatermarkText and \\SetWatermarkLightness.', category: 'Misc / Utilities' },
  { name: 'lipsum', description: 'Lorem ipsum filler text for drafts: \\lipsum[1-5].', category: 'Misc / Utilities' },
  { name: 'blindtext', description: 'Blind text generator with languages: \\blindtext, \\Blinddocument.', category: 'Misc / Utilities' },
  { name: 'datetime2', description: 'Date/time formatting and selection: \\today with custom styles.', category: 'Misc / Utilities' },
  { name: 'filecontents', description: 'Write auxiliary files (\\filecontents) from the main document.', category: 'Misc / Utilities' },
  { name: 'calc', description: 'Length calculations in macro arguments: 2\\textwidth-1cm.', category: 'Misc / Utilities' },
  { name: 'multicol', description: 'Multi-column text: \\begin{multicols}{2}.', category: 'Misc / Utilities' },
  { name: 'needspace', description: 'Prevent page breaks: \\needspace{5\\baselineskip}.', category: 'Misc / Utilities' },
  { name: 'etoolbox', description: 'Auxiliary programming macros for LaTeX: \\ifstrequal, \\patchcmd.', category: 'Misc / Utilities' },
  { name: 'refcount', description: 'Read and compare counter values from labels: \\getrefnumber.', category: 'Misc / Utilities' },
  { name: 'relsize', description: 'Relative font sizes: \\relsize{1}, \\smaller, \\larger.', category: 'Fonts & Typography' },
  { name: 'soul', description: 'Strike-through and text highlighting: \\st{}, \\hl{}.', category: 'Fonts & Typography' },
  { name: 'ulem', description: 'Underline, strike-out, wave: \\uline, \\sout, \\uwave.', category: 'Fonts & Typography' },
  { name: 'mathenv', description: 'Extra math environments used by other packages.', category: 'Math & Symbols' },
  { name: 'breqn', description: 'Automatic line-breaking of display equations.', category: 'Math & Symbols' },
  { name: 'algorithmicx', description: 'Support framework behind algpseudocode family.', category: 'Theorems & Definitions' },
  { name: 'glossaries', description: 'Glossaries and acronyms with \\newglossaryentry.', category: 'Misc / Utilities' },
  { name: 'nomencl', description: 'Nomenclature lists: \\nomenclature{}{}.', category: 'Misc / Utilities' },
  { name: 'acro', description: 'Acronym definitions with automatic expansion: \\ac{api}.', category: 'Misc / Utilities' },
  { name: 'fancybox', description: 'Decorated boxes: \\ovalbox, \\shadowbox, \\doublebox.', category: 'Misc / Utilities' },
  { name: 'framed', description: 'Environment that breaks across pages with a frame.', category: 'Misc / Utilities' },
  { name: 'quoting', description: 'Quotation environment with fine control over spacing.', category: 'Misc / Utilities' },
];

// Order-sensitive packages should be appended after all other \usepackage lines.
export const PACKAGE_LAST_ORDER: ReadonlySet<string> = new Set(['hyperref', 'hypcap', 'cleveref']);

const packageRe = (name: string) => new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{${name.replace(/[-]/g, '\\-')}\\}`);

export function packageAlreadyLoaded(content: string, name: string): boolean {
  return packageRe(name).test(content);
}

// Insert `\usepackage{name}` into a preamble at the correct place:
// after the last existing \usepackage line (preserving load order), and
// packages in PACKAGE_LAST_ORDER (hyperref etc.) are appended last.
export function insertPackageContent(content: string, name: string): { content: string; inserted: boolean } {
  if (packageAlreadyLoaded(content, name)) return { content, inserted: false };

  const usePackageRe = /^((?:\s*)(?:%[^\n]*\n)?\s*)\\usepackage(?:\[[^\]]*\])?\{[\w+-]+\}\s*(?:\n|$)/gm;
  const lines = content.split('\n');
  let lastUsePackageIndex = -1;
  const docBeginIndex = lines.findIndex(l => /^\s*\\begin\{document\}/.test(l));

  lines.forEach((line, i) => {
    if (usePackageRe.test(line)) {
      usePackageRe.lastIndex = 0;
      lastUsePackageIndex = i;
    }
  });

  const isLastOrder = PACKAGE_LAST_ORDER.has(name);
  let insertAfter: number;

  if (isLastOrder) {
    insertAfter = docBeginIndex === -1 ? lines.length : docBeginIndex;
  } else if (lastUsePackageIndex !== -1) {
    insertAfter = lastUsePackageIndex + 1;
  } else {
    const documentclassIndex = lines.findIndex(l => /^\\documentclass/.test(l));
    insertAfter = documentclassIndex === -1 ? 0 : documentclassIndex + 1;
  }

  const line = `\\usepackage{${name}}`;
  lines.splice(insertAfter, 0, line);
  return { content: lines.join('\n'), inserted: true };
}