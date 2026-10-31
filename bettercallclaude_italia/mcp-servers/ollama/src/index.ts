#!/usr/bin/env node
/**
 * Ollama MCP Server
 * Local LLM Processing for Italian Legal Privacy Protection
 *
 * Enables local processing of privileged legal content via Ollama,
 * enforcing Art. 622 CP / L. 247/2012 (segreto professionale) compliance.
 *
 * Tools:
 * - ollama_check_status: Check if Ollama is running, get version + models
 * - ollama_generate: Generate text locally (for PRIVILEGED content)
 * - ollama_chat: Chat completion with message history
 * - ollama_classify_privacy: Classify text by Italian privacy level (offline)
 * - ollama_list_models: List models with task-specific recommendations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { OllamaClient } from './client.js';
import { classifyPrivacy } from './privacy.js';
import type { OllamaChatMessage, OllamaOptions } from './types.js';

// Initialize server
const server = new Server(
  {
    name: 'ollama',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize client (reads OLLAMA_HOST from env, falls back to localhost:11434)
const client = new OllamaClient();

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ollama_check_status',
        description: `Check if Ollama is running locally and report its status.

Returns:
- Whether Ollama is online
- Ollama version
- List of installed models with sizes
- Model recommendations for Italian legal work

Use this before attempting generate or chat to verify Ollama is available.`,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'ollama_generate',
        description: `Generate text locally using Ollama for privacy-sensitive Italian legal content.

Use this for PRIVILEGED content (Art. 622 CP, segreto professionale) that must not be sent to cloud APIs:
- Attorney-client communications
- Legal opinions and memoranda
- Case strategy documents

Requires Ollama to be running locally (ollama serve).
Supports optional system prompt for context and generation options.`,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model name (e.g., "llama3", "mixtral", "phi3")',
            },
            prompt: {
              type: 'string',
              description: 'The prompt to generate from',
            },
            system_prompt: {
              type: 'string',
              description: 'Optional system prompt for context (e.g., "You are an Italian legal assistant")',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature (0.0-2.0, default: model default)',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (default: model default)',
            },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'ollama_chat',
        description: `Chat completion with message history using a local Ollama model.

Use for multi-turn conversations about privileged legal content.
Supports system, user, and assistant message roles.

Requires Ollama to be running locally (ollama serve).`,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              description: 'Model name (e.g., "llama3", "mixtral", "phi3")',
            },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['system', 'user', 'assistant'],
                  },
                  content: { type: 'string' },
                },
                required: ['role', 'content'],
              },
              description: 'Chat messages with role and content',
            },
            temperature: {
              type: 'number',
              description: 'Sampling temperature (0.0-2.0, default: model default)',
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (default: model default)',
            },
          },
          required: ['model', 'messages'],
        },
      },
      {
        name: 'ollama_classify_privacy',
        description: `Classify text by Italian legal privacy level using pattern detection.

Works entirely OFFLINE — no Ollama or network connection required.

Detects patterns in Italian and English:
- PRIVILEGED: segreto professionale, segreto del mandato, strettamente riservato,
  riserbatissimo, segreto istruttorio, riservatezza professionale,
  attorney-client privilege, work product, etc.
- CONFIDENTIAL: riservato, confidenziale, uso interno, non divulgare, plus norm
  citations and contract boilerplate (Art. 622 CP, L. 247/2012, CDF Art. 13/28,
  obbligo/vincolo di riservatezza, segreto commerciale) — only when a
  client/case discriminator is present (cliente, mandante, dossier,
  controparte, or 2+ weak signals). Generic legal vocabulary (avvocato,
  giudice, tribunale, ricorso, ...) is NOT a discriminator.
- PUBLIC: No privacy patterns detected

Returns the classification level, matched patterns, and routing guidance.`,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to classify for privacy level',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'ollama_list_models',
        description: `List installed Ollama models with Italian legal task recommendations.

Returns:
- All installed models with name, size, and quantization details
- Task-specific recommendations for Italian legal work:
  - Legal analysis (large models: mixtral, llama3)
  - Quick classification (small models: phi, gemma)
  - Multilingual IT/EN (aya, mixtral, qwen)
  - Document embeddings (nomic-embed, mxbai-embed)

Requires Ollama to be running locally.`,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
        },
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'ollama_check_status': {
        const status = await client.checkStatus();

        if (!status.online) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    online: false,
                    error: status.error,
                    hint: 'Start Ollama with: ollama serve',
                    privacy_note:
                      'Privacy classification (ollama_classify_privacy) works without Ollama.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const recommendations = client.getRecommendations(status.models ?? []);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  online: true,
                  version: status.version,
                  model_count: status.models?.length ?? 0,
                  models: (status.models ?? []).map((m) => ({
                    name: m.name,
                    size_gb: (m.size / 1_073_741_824).toFixed(1),
                    family: m.details.family,
                    parameter_size: m.details.parameter_size,
                    quantization: m.details.quantization_level,
                  })),
                  recommendations,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'ollama_generate': {
        const model = args?.model as string;
        const prompt = args?.prompt as string;
        const systemPrompt = args?.system_prompt as string | undefined;

        if (!model || !prompt) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Both "model" and "prompt" are required',
                }),
              },
            ],
            isError: true,
          };
        }

        const options: OllamaOptions = {};
        if (args?.temperature != null) options.temperature = args.temperature as number;
        if (args?.max_tokens != null) options.num_predict = args.max_tokens as number;

        const result = await client.generate(
          model,
          prompt,
          systemPrompt,
          Object.keys(options).length > 0 ? options : undefined,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  model: result.model,
                  response: result.response,
                  eval_count: result.eval_count,
                  total_duration_ms: result.total_duration
                    ? Math.round(result.total_duration / 1_000_000)
                    : undefined,
                  privacy_note: 'Processed locally — content never left this machine.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'ollama_chat': {
        const model = args?.model as string;
        const messages = args?.messages as OllamaChatMessage[] | undefined;

        if (!model || !messages || messages.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Both "model" and "messages" (non-empty array) are required',
                }),
              },
            ],
            isError: true,
          };
        }

        const options: OllamaOptions = {};
        if (args?.temperature != null) options.temperature = args.temperature as number;
        if (args?.max_tokens != null) options.num_predict = args.max_tokens as number;

        const result = await client.chat(
          model,
          messages,
          Object.keys(options).length > 0 ? options : undefined,
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  model: result.model,
                  message: result.message,
                  eval_count: result.eval_count,
                  total_duration_ms: result.total_duration
                    ? Math.round(result.total_duration / 1_000_000)
                    : undefined,
                  privacy_note: 'Processed locally — content never left this machine.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'ollama_classify_privacy': {
        const text = args?.text as string;

        if (!text) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: '"text" parameter is required',
                }),
              },
            ],
            isError: true,
          };
        }

        const result = classifyPrivacy(text);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  level: result.level,
                  match_count: result.matches.length,
                  matches: result.matches.map((m) => ({
                    pattern: m.meaning,
                    language: m.language,
                    level: m.level,
                    matched_text: m.matchedText,
                  })),
                  summary: result.summary,
                  routing: {
                    PUBLIC: 'Cloud API permitted',
                    CONFIDENTIAL: 'Anonymize before cloud; prefer local',
                    PRIVILEGED: 'Local processing ONLY (Art. 622 CP)',
                  }[result.level],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'ollama_list_models': {
        const models = await client.listModels();
        const recommendations = client.getRecommendations(models);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  count: models.length,
                  models: models.map((m) => ({
                    name: m.name,
                    size_gb: (m.size / 1_073_741_824).toFixed(1),
                    family: m.details.family,
                    parameter_size: m.details.parameter_size,
                    quantization: m.details.quantization_level,
                    modified_at: m.modified_at,
                  })),
                  recommendations,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${name}`,
              }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
            hint: errorMessage.includes('Cannot connect')
              ? 'Start Ollama with: ollama serve'
              : undefined,
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ollama MCP Server v1.0.0 running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
