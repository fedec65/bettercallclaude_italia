import { OllamaGenerateRequest, OllamaGenerateResponse } from "./types.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

export class OllamaClient {
  private host: string;

  constructor(host?: string) {
    this.host = host || OLLAMA_HOST;
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const res = await fetch(`${this.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<OllamaGenerateResponse>;
  }
}
