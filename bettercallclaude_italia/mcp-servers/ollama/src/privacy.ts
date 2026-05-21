import { OllamaClient } from "./client.js";
import { PrivacyClassification } from "./types.js";

const PRIVACY_PROMPT = `Classify the privacy level of the following Italian legal text. Consider:
- PUBLIC: General legal information, no client data
- CONFIDENTIAL: Case-specific but not privileged, business-sensitive
- PRIVILEGED: Attorney-client communications, segreto professionale, legal strategy

Respond with ONLY ONE of: PUBLIC, CONFIDENTIAL, or PRIVILEGED.

Text:`;

export async function classifyPrivacy(
  client: OllamaClient,
  text: string
): Promise<PrivacyClassification> {
  const response = await client.generate({
    model: "llama3.2",
    prompt: `${PRIVACY_PROMPT}\n\n${text}`,
    stream: false,
  });

  const classification = response.response.trim().toUpperCase() as
    | "PUBLIC"
    | "CONFIDENTIAL"
    | "PRIVILEGED";

  return {
    classification,
    confidence: 0.7,
    source: "ollama-local",
  };
}
