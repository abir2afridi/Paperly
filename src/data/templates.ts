import { Template } from '../types';

export const STARTER_TEMPLATES: Template[] = [
  {
    id: 'article-standard',
    name: 'Standard Scientific Article',
    category: 'article',
    description: 'A clean two-column or single-column research paper template with abstract, sections, figures, and bibliography.',
    mainFileContent: `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{cite}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{\\textbf{TeXForge: Next-Generation Collaborative LaTeX Platform}}
\\author{\\textbf{Alex Rivera}\\textsuperscript{1}, \\textbf{Sophia Chen}\\textsuperscript{2} \\\\
\\small \\textsuperscript{1}Department of Computer Science, Stanford University \\\\
\\small \\textsuperscript{2}MIT Computer Science and Artificial Intelligence Laboratory}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
We present \\textbf{TeXForge}, an open-source, web-based collaborative LaTeX editing platform that combines real-time multi-user document synchronization, WebAssembly-accelerated typesetting, and privacy-preserving AI assistance. This document demonstrates core features including inline mathematics, structured sections, figures, citations, and tables.
\\end{abstract}

\\section{Introduction}
Mathematical typesetting requires precise notation and robust formatting. TeXForge allows researchers to co-author complex LaTeX documents in real-time with instant PDF preview capabilities.

The fundamental equation of mass-energy equivalence is expressed in Equation~\\ref{eq:einstein}:
\\begin{equation}
\\label{eq:einstein}
E = m c^2
\\end{equation}
where $E$ denotes energy, $m$ represents rest mass, and $c$ is the speed of light in vacuum ($c \\approx 3 \\times 10^8 \\text{ m/s}$).

\\section{Methodology}
Our platform uses WebAssembly binaries for zero-latency local compilation and a debounced operational transformation engine for state reconciliation.

\\subsection{Algorithm Formulation}
Consider a matrix system $A x = b$. The solution vector $x$ can be computed using numerical decomposition as shown in Equation~\\ref{eq:matrix}:

\\begin{equation}
\\label{eq:matrix}
\\begin{bmatrix}
a_{11} & a_{12} \\\\
a_{21} & a_{22}
\\end{bmatrix}
\\begin{bmatrix}
x_1 \\\\
x_2
\\end{bmatrix}
=
\\begin{bmatrix}
b_1 \\\\
b_2
\\end{bmatrix}
\\end{equation}

\\section{Experimental Results}
As discussed by Lamport~\\cite{lamport1994} and Knuth~\\cite{knuth1984}, structured markup guarantees consistent formatting across diverse publishing platforms.

\\begin{table}[h]
\\centering
\\caption{Benchmark Comparison of Compilation Times}
\\label{tab:results}
\\begin{tabular}{|l|c|c|}
\\hline
\\textbf{Backend Engine} & \\textbf{First Compile (s)} & \\textbf{Cached Compile (ms)} \\\\
\\hline
Native pdfTeX & 1.42 & 120 \\\\
WASM SwiftLaTeX & 0.85 & 45 \\\\
Docker Sandboxed & 1.10 & 90 \\\\
\\hline
\\end{tabular}
\\end{table}

\\section{Conclusion}
TeXForge establishes a modern baseline for open scientific publishing. Future work will extend real-time SyncTeX navigation and automated CrossRef citation matching.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`,
    bibContent: `@article{lamport1994,
  author = {Leslie Lamport},
  title = {LaTeX: A Document Preparation System},
  journal = {Addison-Wesley Professional},
  year = {1994},
  publisher = {Addison-Wesley}
}

@article{knuth1984,
  author = {Donald E. Knuth},
  title = {The TeXbook},
  journal = {American Mathematical Society},
  year = {1984}
}
`,
  },
  {
    id: 'ieee-conference',
    name: 'IEEE Conference Paper',
    category: 'ieee',
    description: 'Official-style IEEE two-column paper template for engineering and computer science conferences.',
    mainFileContent: `\\documentclass[conference]{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}

\\begin{document}

\\title{Scalable Real-Time Document Synchronization in LaTeX Cloud Editors}

\\author{\\IEEEauthorblockN{1\\textsuperscript{st} Marcus Vance}
\\IEEEauthorblockA{\\textit{School of Electrical Engineering} \\\\
\\textit{Carnegie Mellon University}\\\\
Pittsburgh, PA, USA \\\\
marcus@cmu.edu}
\\and
\\IEEEauthorblockN{2\\textsuperscript{nd} Elena Rostova}
\\IEEEauthorblockA{\\textit{Department of Informatics} \\\\
\\textit{ETH Zurich}\\\\
Zurich, Switzerland \\\\
elena@ethz.ch}
}

\\maketitle

\\begin{abstract}
This paper presents an event-driven synchronization architecture tailored for high-frequency concurrent edits in LaTeX documents. By decoupling source document delta application from heavy typesetting cycles, we achieve under 50ms keystroke latency across distributed clients.
\\end{abstract}

\\begin{IEEEkeywords}
LaTeX, Real-Time Systems, Collaborative Editing, WebAssembly, WebSockets.
\\end{IEEEkeywords}

\\section{Introduction}
Cloud-based authoring platforms have transformed academic publishing. However, concurrent edits in large multi-file projects create unique synchronization challenges.

\\section{System Architecture}
We implement a client-side Yjs CRDT model backed by an ephemeral WebSocket broadcast tier.

\\section{Evaluation}
Performance metrics demonstrate linear scalability up to 50 active co-authors per document session.

\\bibliographystyle{IEEEtran}
\\bibliography{references}

\\end{document}
`,
    bibContent: `@article{crdt2011,
  author = {Shapiro, Marc and Pregui{\\c{c}}a, Nuno and Baquero, Carlos and Zawirski, Marek},
  title = {Conflict-Free Replicated Data Types},
  journal = {Symposium on Self-Stabilizing Systems},
  pages = {386--400},
  year = {2011}
}
`,
  },
  {
    id: 'beamer-slides',
    name: 'Beamer Presentation Deck',
    category: 'beamer',
    description: 'Elegant slide deck with custom frame layouts, lists, and math blocks for talks and lectures.',
    mainFileContent: `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{default}

\\title[TeXForge Overview]{TeXForge: Modern LaTeX Authoring}
\\subtitle{Collaborative Research Platform}
\\author{Dr. Julian Thorne}
\\institute{Institute for Advanced Study}
\\date{\\today}

\\begin{document}

\\begin{frame}
  \\titlepage
\\end{frame}

\\begin{frame}{Outline}
  \\tableofcontents
\\end{frame}

\\section{Features}

\\begin{frame}{Key Platform Features}
  \\begin{itemize}
    \\item \\textbf{Real-time Co-authoring}: Multi-user cursor tracking and CRDT sync.
    \\item \\textbf{WASM Compiler}: Zero-install instant local PDF generation.
    \\item \\textbf{BYO-Key AI Helper}: Context-aware LaTeX error explanations and fixes.
    \\item \\textbf{CrossRef DOI Import}: Auto-fetch BibTeX entries directly into .bib files.
  \\end{itemize}
\\end{frame}

\\section{Mathematics}

\\begin{frame}{Mathematical Formulations}
  \\begin{block}{Euler's Identity}
    An elegant connection between five fundamental constants:
    \\[ e^{i\\pi} + 1 = 0 \\]
  \\end{block}

  \\begin{exampleblock}{Fourier Transform}
    \\[ \\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) e^{-2\\pi i x \\xi} dx \\]
  \\end{exampleblock}
\\end{frame}

\\begin{frame}{Thank You!}
  \\centering
  \\Large Questions \\& Discussion\\\\
  \\vspace{0.5cm}
  \\small Visit \\textbf{TeXForge} at your local browser port!
\\end{frame}

\\end{document}
`,
  },
  {
    id: 'cv-modern',
    name: 'Academic CV & Resume',
    category: 'cv',
    description: 'Clean, modern resume template highlighting publications, education, experience, and skills.',
    mainFileContent: `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{titlesec}
\\usepackage{enumitem}

\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0pt}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\pagestyle{empty}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{Dr. Sarah Jenkins}}\\\\
  \\vspace{4pt}
  San Francisco, CA $\\cdot$ sarah.jenkins@example.com $\\cdot$ +1 (550) 019-2831 $\\cdot$ \\url{github.com/sjenkins}
\\end{center}

\\section{Education}
\\textbf{Ph.D. in Computer Science}, Stanford University \\hfill 2019 -- 2024\\\\
Dissertation: \\textit{Distributed Consensus Protocols in Ephemeral Networks}\\\\
\\textbf{B.S. in Mathematics \\& Computer Science}, UC Berkeley \\hfill 2015 -- 2019\\\\
Summa Cum Laude, GPA 3.96/4.00

\\section{Experience}
\\textbf{Senior Systems Researcher}, OpenAI / AI Infrastructure Lab \\hfill 2024 -- Present
\\begin{itemize}[leftmargin=*]
  \\item Architectural design of high-throughput distributed inference clusters.
  \\item Reduced cross-datacenter synchronization latency by 34\\% using custom binary protocols.
\\end{itemize}

\\textbf{Research Fellow}, Berkeley Artificial Intelligence Research (BAIR) \\hfill 2022 -- 2024
\\begin{itemize}[leftmargin=*]
  \\item Published 4 peer-reviewed papers in NeurIPS and ICML on zero-knowledge verifications.
\\end{itemize}

\\section{Selected Publications}
\\begin{enumerate}[leftmargin=*]
  \\item \\textbf{Jenkins, S.}, et al. "Fast Verified Matrix Inversion in WebAssembly." \\textit{ACM TOG}, 2024.
  \\item \\textbf{Jenkins, S.}, \\& Miller, K. "Zero-Knowledge Proof Systems for Distributed Editors." \\textit{NeurIPS}, 2023.
\\end{enumerate}

\\section{Skills \\& Technologies}
\\textbf{Languages}: C++, Rust, TypeScript, Python, LaTeX, SQL\\\\
\\textbf{Tools \\& Frameworks}: WebAssembly, Docker, Linux Systems, PyTorch, Git, Monorepos

\\end{document}
`,
  }
];
