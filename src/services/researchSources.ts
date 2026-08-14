/**
 * In-session registry of uploaded research-source papers (§42, §44).
 *
 * The Research Assistant extracts text from uploaded PDFs. The publication
 * check (§44) needs that text for its originality heuristic, but the two
 * components are separate. This module is the single hand-off point: the
 * assistant registers excerpts here; the check reads them back. Nothing is
 * persisted to the server — it is per-session, in-memory state only.
 */

export interface RegisteredSourcePaper {
  name: string;
  text: string;
}

const registered: RegisteredSourcePaper[] = [];

/** Register (or replace, by name) the extracted text of an uploaded paper. */
export function registerSourcePaper(paper: RegisteredSourcePaper): void {
  const idx = registered.findIndex(p => p.name === paper.name);
  if (idx >= 0) registered[idx] = paper;
  else registered.push(paper);
}

/** Remove a paper from the registry (called when the user removes it). */
export function unregisterSourcePaper(name: string): void {
  const idx = registered.findIndex(p => p.name === name);
  if (idx >= 0) registered.splice(idx, 1);
}

/** Read the current registered source papers. */
export function getRegisteredSourcePapers(): RegisteredSourcePaper[] {
  return registered.map(p => ({ ...p }));
}

/** Clear everything (e.g. tests, sign-out). */
export function clearRegisteredSourcePapers(): void {
  registered.length = 0;
}