/**
 * PDF engine — builds a valid %PDF-1.4 binary from typeset content.
 *
 * Pure functions, no React/DOM dependencies. The compiler service feeds it
 * parsed sections; it returns a paginated PDF that strict viewers (Chrome
 * pdfium, Firefox) can render.
 */

export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 50;
export const BOTTOM_MARGIN = 40;
export const TOP_START = PAGE_HEIGHT - MARGIN;

export function sanitizeForPdf(str: string): string {
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

export interface PdfSection {
  title: string;
  content: string[];
}

/**
 * Generates a valid %PDF-1.4 binary with automatic pagination.
 */
export function createPdfBinary(
  title: string,
  author: string,
  sections: PdfSection[],
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