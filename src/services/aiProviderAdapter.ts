/**
 * AIProvider adapter interface (§8) — the plan's provider-agnostic contract
 * with `chat()` and `testConnection()`. Implementations wrap a concrete
 * provider's HTTP API (OpenAI-compatible chat completions, Anthropic
 * messages). The web server builds adapters from encrypted provider configs;
 * the Tauri shell keeps its own Rust commands but the contract is identical.
 */

export interface AIProviderAdapter {
  readonly id: string;
  readonly label: string;
  readonly providerType: 'openai' | 'anthropic' | 'custom';
  chat(input: { system: string; prompt: string; maxTokens?: number; temperature?: number }): Promise<string>;
  testConnection(): Promise<string>;
}

interface OpenAIAdapterConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
}

interface AnthropicAdapterConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// Parse an OpenAI-compatible or Anthropic completion response, handling SSE streams.
export function parseCompletionBody(rawBody: string, providerType: string): string {
  const trimmed = rawBody.trim();
  if (trimmed.startsWith('data:')) {
    let fullText = '';
    for (const line of trimmed.split('\n')) {
      const l = line.trim();
      if (!l.startsWith('data:')) continue;
      const payload = l.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        if (providerType === 'anthropic') {
          if (obj.type === 'content_block_delta' && typeof obj.delta?.text === 'string') {
            fullText += obj.delta.text;
          }
        } else {
          const delta = obj.choices?.[0]?.delta?.content;
          const content = obj.choices?.[0]?.message?.content;
          if (typeof delta === 'string') fullText += delta;
          else if (typeof content === 'string') fullText += content;
        }
      } catch {
        // Skip malformed stream chunk
      }
    }
    return fullText || 'No response generated.';
  }

  const data = JSON.parse(trimmed);
  if (providerType === 'anthropic') {
    return data.content?.[0]?.text || 'No response generated.';
  }
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

export class OpenAICompatibleAdapter implements AIProviderAdapter {
  readonly providerType = 'openai' as const;
  readonly id: string;
  readonly label: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly temperature?: number;
  private readonly maxTokens?: number;

  constructor(config: OpenAIAdapterConfig) {
    this.id = config.id;
    this.label = config.label;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.extraHeaders = config.extraHeaders || {};
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
  }

  private targetUrl(): string {
    return this.baseUrl.includes('/chat/completions')
      ? this.baseUrl
      : `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...this.extraHeaders,
    };
  }

  async chat(input: { system: string; prompt: string; maxTokens?: number; temperature?: number }): Promise<string> {
    const response = await fetch(this.targetUrl(), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.prompt },
        ],
        temperature: input.temperature ?? this.temperature ?? 0.3,
        max_tokens: input.maxTokens ?? this.maxTokens ?? 1000,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return parseCompletionBody(await response.text(), 'openai');
  }

  async testConnection(): Promise<string> {
    const response = await fetch(this.targetUrl(), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: 'Ping test' }],
        max_tokens: 5,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Provider API error (${response.status}): ${errText}`);
    }
    return 'OpenAI-compatible response received.';
  }
}

export class AnthropicAdapter implements AIProviderAdapter {
  readonly providerType = 'anthropic' as const;
  readonly id: string;
  readonly label: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature?: number;
  private readonly maxTokens?: number;

  constructor(config: AnthropicAdapterConfig) {
    this.id = config.id;
    this.label = config.label;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async chat(input: { system: string; prompt: string; maxTokens?: number; temperature?: number }): Promise<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens ?? this.maxTokens ?? 1000,
        system: input.system,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return parseCompletionBody(await response.text(), 'anthropic');
  }

  async testConnection(): Promise<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Ping' }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }
    return 'Anthropic response received.';
  }
}

/** Factory: build the adapter for a stored provider config shape. */
export interface ProviderAdapterInput {
  id: string;
  label: string;
  providerType: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeadersJson?: string;
  temperature?: number;
  maxTokens?: number;
}

export function buildProviderAdapter(input: ProviderAdapterInput): AIProviderAdapter {
  if (input.providerType === 'anthropic') {
    return new AnthropicAdapter({
      id: input.id,
      label: input.label,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      model: input.model,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });
  }
  let extraHeaders: Record<string, string> = {};
  if (input.extraHeadersJson) {
    try {
      const parsed = JSON.parse(input.extraHeadersJson) as Record<string, string>;
      if (parsed && typeof parsed === 'object') extraHeaders = parsed;
    } catch {
      // Ignore malformed JSON
    }
  }
  return new OpenAICompatibleAdapter({
    id: input.id,
    label: input.label,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    model: input.model,
    extraHeaders,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });
}