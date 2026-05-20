export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface PrivacyClassification {
  classification: "PUBLIC" | "CONFIDENTIAL" | "PRIVILEGED";
  confidence: number;
  source: string;
}
