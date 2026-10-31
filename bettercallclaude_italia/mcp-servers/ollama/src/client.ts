/**
 * Ollama HTTP Client
 *
 * Uses Node 18+ built-in fetch to communicate with the Ollama REST API.
 * Configurable via OLLAMA_HOST env var (default: http://localhost:11434).
 */

import type {
  OllamaTagsResponse,
  OllamaVersionResponse,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatMessage,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaOptions,
  OllamaModel,
  ModelRecommendation,
} from './types.js';

const DEFAULT_HOST = 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 120_000;

export class OllamaClient {
  private readonly host: string;
  private readonly timeoutMs: number;

  constructor(host?: string, timeoutMs?: number) {
    // Cowork Desktop does not surface a userConfig settings UI, so the
    // OLLAMA_HOST env from .mcp.json arrives empty or as an unresolved
    // `${user_config.ollama_host}` template. Fall back to the local default
    // instead of trying to fetch against a blank host (v4.11.4 lesson).
    // An explicit host (e.g. CLI users with a custom setup) is still honoured.
    const configured = (host ?? process.env.OLLAMA_HOST ?? '').trim();
    const effective = configured && !configured.startsWith('${') ? configured : DEFAULT_HOST;
    // Privacy gate: the hook treats ollama* tools as "local" and lets
    // privileged content through. Honouring a non-loopback OLLAMA_HOST would
    // silently send that content to a third-party endpoint. Require an
    // explicit opt-in for remote hosts (e.g. a trusted LAN server).
    const hostname = (() => {
      try { return new URL(effective).hostname; } catch { return ''; }
    })();
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
    if (!isLoopback && process.env.OLLAMA_ALLOW_REMOTE !== '1') {
      throw new Error(
        `OLLAMA_HOST punta a un host remoto (${effective}) e il contenuto privilegiato potrebbe lasciare la macchina. ` +
        'Per un server Ollama fidato (es. LAN dello studio) imposta OLLAMA_ALLOW_REMOTE=1; ' +
        'altrimenti usa il default localhost.'
      );
    }
    this.host = effective.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // -------------------------------------------------------------------------
  // Status & Models
  // -------------------------------------------------------------------------

  async checkStatus(): Promise<{
    online: boolean;
    version?: string;
    models?: OllamaModel[];
    error?: string;
  }> {
    try {
      const [versionRes, tagsRes] = await Promise.all([
        this.get<OllamaVersionResponse>('/api/version'),
        this.get<OllamaTagsResponse>('/api/tags'),
      ]);

      return {
        online: true,
        version: versionRes.version,
        models: tagsRes.models,
      };
    } catch (err) {
      return {
        online: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    const res = await this.get<OllamaTagsResponse>('/api/tags');
    return res.models;
  }

  // -------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------

  async generate(
    model: string,
    prompt: string,
    systemPrompt?: string,
    options?: OllamaOptions,
  ): Promise<OllamaGenerateResponse> {
    const body: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      ...(systemPrompt && { system: systemPrompt }),
      ...(options && { options }),
    };
    return this.post<OllamaGenerateResponse>('/api/generate', body);
  }

  async chat(
    model: string,
    messages: OllamaChatMessage[],
    options?: OllamaOptions,
  ): Promise<OllamaChatResponse> {
    const body: OllamaChatRequest = {
      model,
      messages,
      stream: false,
      ...(options && { options }),
    };
    return this.post<OllamaChatResponse>('/api/chat', body);
  }

  // -------------------------------------------------------------------------
  // Recommendations (pure logic, no network)
  // -------------------------------------------------------------------------

  getRecommendations(availableModels: OllamaModel[]): ModelRecommendation[] {
    const names = availableModels.map((m) => m.name.toLowerCase());
    const recommendations: ModelRecommendation[] = [];

    const match = (keywords: string[]): string | undefined =>
      names.find((n) => keywords.some((k) => n.includes(k)));

    const legal = match(['mixtral', 'llama3', 'llama-3', 'qwen2.5', 'qwen2']);
    if (legal) {
      recommendations.push({
        model: legal,
        task: 'Italian legal analysis',
        reason: 'Large model suitable for complex legal reasoning on Italian-language content',
      });
    }

    const fast = match(['phi', 'gemma', 'tinyllama', 'qwen2']);
    if (fast) {
      recommendations.push({
        model: fast,
        task: 'Quick classification / summarization',
        reason: 'Small model with fast inference for privacy classification and short tasks',
      });
    }

    const multilingual = match(['aya', 'mixtral', 'qwen']);
    if (multilingual) {
      recommendations.push({
        model: multilingual,
        task: 'Multilingual legal text (IT/EN)',
        reason: 'Strong multilingual capabilities for legal documents mixing Italian and English',
      });
    }

    const embedding = match(['nomic-embed', 'mxbai-embed', 'all-minilm']);
    if (embedding) {
      recommendations.push({
        model: embedding,
        task: 'Document embeddings / semantic search',
        reason: 'Embedding model for local vector search over privileged documents',
      });
    }

    if (recommendations.length === 0 && availableModels.length > 0) {
      recommendations.push({
        model: availableModels[0].name,
        task: 'General purpose',
        reason: 'Default available model — consider pulling a larger model for legal work',
      });
    }

    return recommendations;
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.host}${path}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeoutMs}ms`);
      }
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('ECONNREFUSED'))) {
        throw new Error(
          `Cannot connect to Ollama at ${this.host}. Is Ollama running? Start it with: ollama serve`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.host}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ollama API error: ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeoutMs}ms`);
      }
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('ECONNREFUSED'))) {
        throw new Error(
          `Cannot connect to Ollama at ${this.host}. Is Ollama running? Start it with: ollama serve`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
