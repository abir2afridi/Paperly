import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  AnthropicAdapter,
  OpenAICompatibleAdapter,
  buildProviderAdapter,
  parseCompletionBody,
} from '../aiProviderAdapter';

const originalFetch = globalThis.fetch;

function mockFetchOnce(status: number, body: string) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as Response);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('parseCompletionBody', () => {
  it('parses a plain OpenAI JSON response', () => {
    const raw = JSON.stringify({ choices: [{ message: { content: 'Hello there' } }] });
    expect(parseCompletionBody(raw, 'openai')).toBe('Hello there');
  });

  it('parses an OpenAI SSE stream', () => {
    const raw = ['data: {"choices":[{"delta":{"content":"A"}}]}', 'data: {"choices":[{"delta":{"content":"B"}}]}', 'data: [DONE]'].join('\n');
    expect(parseCompletionBody(raw, 'openai')).toBe('AB');
  });

  it('parses an Anthropic response', () => {
    const raw = JSON.stringify({ content: [{ type: 'text', text: 'Anthropic answer' }] });
    expect(parseCompletionBody(raw, 'anthropic')).toBe('Anthropic answer');
  });

  it('parses an Anthropic SSE delta stream', () => {
    const raw = ['data: {"type":"content_block_delta","delta":{"text":"Yes"}}', 'data: [DONE]'].join('\n');
    expect(parseCompletionBody(raw, 'anthropic')).toBe('Yes');
  });

  it('returns a fallback message on empty bodies', () => {
    expect(parseCompletionBody('data: [DONE]', 'openai')).toBe('No response generated.');
  });
});

describe('OpenAICompatibleAdapter', () => {
  const adapter = new OpenAICompatibleAdapter({
    id: 'p1',
    label: 'Test',
    baseUrl: 'https://example.com/api/v1',
    apiKey: 'sk-test',
    model: 'gpt-4o-mini',
    extraHeaders: { 'X-Custom': 'yes' },
  });

  it('chat posts to /chat/completions with bearer auth and parses the answer', async () => {
    mockFetchOnce(200, JSON.stringify({ choices: [{ message: { content: 'Hi' } }] }));
    const answer = await adapter.chat({ system: 'sys', prompt: 'hi' });
    expect(answer).toBe('Hi');

    const fetchMock = vi.mocked(globalThis.fetch);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/api/v1/chat/completions');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test');
    expect(headers['X-Custom']).toBe('yes');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages[0].role).toBe('system');
  });

  it('does not double the /chat/completions path when already present', async () => {
    const direct = new OpenAICompatibleAdapter({
      id: 'p2',
      label: 'Direct',
      baseUrl: 'https://x.com/v1/chat/completions',
      apiKey: 'k',
      model: 'm',
    });
    mockFetchOnce(200, JSON.stringify({ choices: [{ message: { content: 'ok' } }] }));
    await direct.chat({ system: 's', prompt: 'p' });
    const [url] = vi.mocked(globalThis.fetch).mock.calls[0] as [string];
    expect(url).toBe('https://x.com/v1/chat/completions');
  });

  it('testConnection throws on provider errors', async () => {
    mockFetchOnce(401, 'unauthorized');
    await expect(adapter.testConnection()).rejects.toThrow('Provider API error (401)');
  });
});

describe('AnthropicAdapter', () => {
  const adapter = new AnthropicAdapter({
    id: 'p3',
    label: 'Claude',
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'sk-ant',
    model: 'claude-sonnet-4',
  });

  it('chat posts to /v1/messages with x-api-key and system prompt', async () => {
    mockFetchOnce(200, JSON.stringify({ content: [{ type: 'text', text: 'Sure' }] }));
    const answer = await adapter.chat({ system: 'be brief', prompt: 'hi' });
    expect(answer).toBe('Sure');

    const fetchMock = vi.mocked(globalThis.fetch);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(String(init.body));
    expect(body.system).toBe('be brief');
  });

  it('testConnection throws on errors', async () => {
    mockFetchOnce(429, 'rate limited');
    await expect(adapter.testConnection()).rejects.toThrow('Anthropic API error (429)');
  });
});

describe('buildProviderAdapter', () => {
  it('routes anthropic types to the Anthropic adapter', () => {
    const adapter = buildProviderAdapter({
      id: 'a',
      label: 'Claude',
      providerType: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: 'k',
      model: 'm',
    });
    expect(adapter).toBeInstanceOf(AnthropicAdapter);
  });

  it('routes openai/custom to the OpenAI-compatible adapter and merges extra headers', () => {
    const adapter = buildProviderAdapter({
      id: 'b',
      label: 'Ollama',
      providerType: 'custom',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'k',
      model: 'llama3',
      extraHeadersJson: '{"X-Foo":"bar"}',
    });
    expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);

    mockFetchOnce(200, JSON.stringify({ choices: [{ message: { content: 'x' } }] }));
    void adapter.chat({ system: 's', prompt: 'p' }).then(() => {
      const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)['X-Foo']).toBe('bar');
    });
  });

  it('ignores malformed extra headers JSON', () => {
    const adapter = buildProviderAdapter({
      id: 'c',
      label: 'Bad headers',
      providerType: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'k',
      model: 'm',
      extraHeadersJson: '{oops',
    });
    expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
  });
});