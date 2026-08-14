import { describe, it, expect } from 'vitest';
import {
  createEditorTools,
  parseAgentEdits,
  buildAgentPrompt,
  MAX_EDITS_PER_TURN,
  AgentEdit,
} from '../agenticChat';
import { ProjectFile } from '../../types';

const file = (path: string, content: string): ProjectFile => ({
  id: `f-${path}`,
  projectId: 'p1',
  path,
  type: path.endsWith('.bib') ? 'BIB' : 'TEX',
  content,
  sizeBytes: content.length,
  updatedAt: new Date().toISOString(),
});

describe('createEditorTools (§50)', () => {
  const files = [
    file('main.tex', '\\title{Paper}\n\\begin{document}\nHello world\n\\end{document}'),
    file('refs.bib', '@article{x, title={Hello Research}}'),
  ];
  const tools = createEditorTools(files);

  it('lists the project file tree', () => {
    expect(tools.listFiles()).toEqual(['main.tex', 'refs.bib']);
  });

  it('reads a file by path', () => {
    expect(tools.readFile('main.tex')).toContain('\\title{Paper}');
    expect(tools.readFile('missing.tex')).toBeNull();
  });

  it('searches the project with line numbers', () => {
    const hits = tools.searchProject('Hello');
    expect(hits.length).toBe(2);
    const texHit = hits.find(h => h.path === 'main.tex');
    expect(texHit?.line).toBe(3);
    expect(texHit?.snippet).toContain('Hello world');
  });
});

describe('parseAgentEdits (§50 structured-output mode)', () => {
  const validEdit: AgentEdit = { path: 'main.tex', newContent: '\\title{Fixed}', explanation: 'add title' };

  it('parses a bare JSON object', () => {
    const result = parseAgentEdits(JSON.stringify({ message: 'done', edits: [validEdit] }));
    expect(result.ok).toBe(true);
    expect(result.edits).toHaveLength(1);
    expect(result.edits[0].path).toBe('main.tex');
    expect(result.edits[0].newContent).toBe('\\title{Fixed}');
  });

  it('strips markdown fences', () => {
    const result = parseAgentEdits('```json\n' + JSON.stringify({ edits: [validEdit] }) + '\n```');
    expect(result.ok).toBe(true);
    expect(result.edits).toHaveLength(1);
  });

  it('accepts a bare JSON array', () => {
    const result = parseAgentEdits(JSON.stringify([validEdit]));
    expect(result.ok).toBe(true);
    expect(result.edits).toHaveLength(1);
  });

  it('rejects invalid JSON', () => {
    const result = parseAgentEdits('Sorry, I could not process that.');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects schema-violating edits', () => {
    const result = parseAgentEdits(JSON.stringify({ edits: [{ path: '', newContent: 'x' }] }));
    expect(result.ok).toBe(false);
  });

  it('caps edits at 20 per turn (§50 guardrail)', () => {
    const edits = Array.from({ length: 30 }, (_, i) => ({ path: `f${i}.tex`, newContent: 'x', explanation: 'e' }));
    const result = parseAgentEdits(JSON.stringify({ edits }));
    expect(result.ok).toBe(false);
    expect(MAX_EDITS_PER_TURN).toBe(20);
  });
});

describe('buildAgentPrompt (§50)', () => {
  it('embeds the file tree and readable file bodies', () => {
    const tools = createEditorTools([file('main.tex', '\\begin{document}Hi\\end{document}')]);
    const prompt = buildAgentPrompt({
      userMessage: 'Add an abstract',
      tools,
      includeFiles: [{ path: 'main.tex', content: '\\begin{document}Hi\\end{document}' }],
    });
    expect(prompt).toContain('main.tex');
    expect(prompt).toContain('Add an abstract');
    expect(prompt).toContain('"edits"');
    expect(prompt).toContain('propose');
  });
});