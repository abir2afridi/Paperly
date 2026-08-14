/**
 * §50 Agentic AI chat — structured-output mode.
 *
 * Our BYO provider adapters are completion-only (no live function/tool
 * calling), so this implements the plan's required *fallback* mode: prompt the
 * model to return a Zod-validated JSON array of proposed edits
 * `{path, newContent, explanation}[]`, rendered through the same diff-review
 * UI. Read tools (listFiles/readFile/searchProject) are provided as
 * client-side functions scoped to the CURRENT project's in-memory files only —
 * the chat panel never sees any other project's data (RLS already scopes the
 * underlying Supabase rows to the owner).
 */

import { ProjectFile } from '../types';
import { z } from 'zod';

// ---- Editor tools (§50) ----

export interface EditorTools {
  listFiles(): string[];
  readFile(path: string): string | null;
  searchProject(query: string): { path: string; line: number; snippet: string }[];
}

/** Build scoped read-tools over the current project's files. */
export function createEditorTools(files: ProjectFile[]): EditorTools {
  return {
    listFiles: () => files.map(f => f.path),
    readFile: path => files.find(f => f.path === path)?.content ?? null,
    searchProject: query => {
      const results: { path: string; line: number; snippet: string }[] = [];
      const lower = query.toLowerCase();
      for (const f of files) {
        const lines = f.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lower)) {
            results.push({ path: f.path, line: i + 1, snippet: lines[i].trim().slice(0, 120) });
            if (results.length >= 20) return results;
          }
        }
      }
      return results;
    },
  };
}

// ---- Structured-output schema (§50) ----

export const AgentEditSchema = z.object({
  path: z.string().min(1),
  newContent: z.string(),
  explanation: z.string().min(1),
});

export const AgentEditListSchema = z.object({
  edits: z.array(AgentEditSchema).max(20),
  message: z.string().optional(),
});

export type AgentEdit = z.infer<typeof AgentEditSchema>;
export type AgentEditList = z.infer<typeof AgentEditListSchema>;

export const MAX_EDITS_PER_TURN = 20;

/**
 * Parse a model reply into a validated edit list. Strips markdown fences and
 * accepts either a bare JSON array or `{"edits": [...]}`.
 */
export function parseAgentEdits(raw: string): {
  ok: boolean;
  edits: AgentEdit[];
  message?: string;
  error?: string;
} {
  let cleaned = raw.trim();
  // Strip fenced code blocks.
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  // If the reply leads with prose, extract the JSON-ish tail — but only when
  // the string doesn't already start with a JSON container (arrays included).
  if (!/^[\[{]/.test(cleaned)) {
    const start = cleaned.indexOf('{');
    const arrStart = cleaned.indexOf('[');
    const jsonStart = arrStart >= 0 && (start < 0 || arrStart < start) ? arrStart : start;
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (jsonStart >= 0 && end > jsonStart) cleaned = cleaned.slice(jsonStart, end + 1);
  }

  let parsed: unknown;
  try {
    const top = JSON.parse(cleaned);
    parsed = Array.isArray(top) ? { edits: top } : top;
  } catch {
    // Try as a bare array.
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart >= 0 && arrEnd > arrStart) {
      try {
        const raw = cleaned.slice(arrStart, arrEnd + 1);
        const arr = JSON.parse(raw);
        parsed = Array.isArray(arr) ? { edits: arr } : arr;
      } catch {
        return { ok: false, edits: [], error: 'The model response was not valid JSON.' };
      }
    } else {
      return { ok: false, edits: [], error: 'The model response was not valid JSON.' };
    }
  }

  const result = AgentEditListSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, edits: [], error: 'The model response did not match the expected edit schema.' };
  }
  return { ok: true, edits: result.data.edits, message: result.data.message };
}

// ---- Prompt building (§50) ----

export interface AgentTurnInput {
  userMessage: string;
  tools: EditorTools;
  /** Files the model is allowed to see/edit this turn (name → content). */
  includeFiles: { path: string; content: string }[];
}

/** Build the structured-output agent prompt for one turn. */
export function buildAgentPrompt(input: AgentTurnInput): string {
  const tree = input.tools.listFiles().map(p => `- ${p}`).join('\n');
  const bodies = input.includeFiles
    .map(f => `### ${f.path}\n${f.content.slice(0, 20000)}`)
    .join('\n\n');

  return [
    'You are an AI coding agent connected to a LaTeX project editor.',
    '',
    'Project file tree:',
    tree || '(empty project)',
    '',
    'File contents you may read in this turn:',
    bodies || '(none — say which files you need)',
    '',
    'Rules:',
    '- You may PROPOSE edits to files. You never write directly.',
    '- You may read any file in the tree when given its contents above.',
    '- Only propose edits to files whose full content you have seen this turn.',
    '- Keep changes minimal and targeted. Do not rewrite files wholesale.',
    '',
    'User request:',
    input.userMessage,
    '',
    'Respond with ONLY a JSON object of this exact shape (no markdown fence, no prose outside it):',
    '{ "message": "short summary for the user", "edits": [ { "path": "main.tex", "newContent": "<full new file content>", "explanation": "why this change" } ] }',
    'If no file changes are needed, respond with { "message": "...", "edits": [] }.',
  ].join('\n');
}