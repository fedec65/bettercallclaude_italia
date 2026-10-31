/**
 * Type definitions for Ollama MCP Server
 *
 * Covers Ollama REST API responses and Italian legal privacy classification.
 */

// ---------------------------------------------------------------------------
// Ollama API types
// ---------------------------------------------------------------------------

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export interface OllamaVersionResponse {
  version: string;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  options?: OllamaOptions;
  stream: false;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  options?: OllamaOptions;
  stream: false;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

// ---------------------------------------------------------------------------
// Privacy classification types
// ---------------------------------------------------------------------------

export type PrivacyLevel = 'PUBLIC' | 'CONFIDENTIAL' | 'PRIVILEGED';

export interface PatternMatch {
  pattern: string;
  meaning: string;
  language: 'it' | 'en' | 'legal';
  level: PrivacyLevel;
  matchedText: string;
}

export interface ClassificationResult {
  level: PrivacyLevel;
  matches: PatternMatch[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Model recommendation types
// ---------------------------------------------------------------------------

export interface ModelRecommendation {
  model: string;
  task: string;
  reason: string;
}
