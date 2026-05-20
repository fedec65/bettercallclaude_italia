#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

interface OllamaResponse {
  response: string;
}

async function classifyPrivacy(text: string): Promise<string> {
  const prompt = `Classify the privacy level of the following Italian legal text as PUBLIC, CONFIDENTIAL, or PRIVILEGED (segreto professionale). Respond with only one word.

Text: ${text}`;

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OllamaResponse;
  return data.response.trim();
}

async function summarizeText(text: string): Promise<string> {
  const prompt = `Summarize the following Italian legal text in Italian. Preserve all legal conclusions and citations. Be concise.

Text: ${text}`;

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OllamaResponse;
  return data.response.trim();
}

const server = new Server(
  {
    name: "bettercallclaude-italia-ollama",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "classify_privacy",
        description: "Classify Italian legal text privacy level (PUBLIC/CONFIDENTIAL/PRIVILEGED)",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text to classify" },
          },
          required: ["text"],
        },
      },
      {
        name: "summarize_text",
        description: "Summarize Italian legal text locally",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text to summarize" },
          },
          required: ["text"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "classify_privacy") {
    const text = (args as { text: string }).text;
    const classification = await classifyPrivacy(text);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ classification, source: "ollama-local" }),
        },
      ],
    };
  }

  if (name === "summarize_text") {
    const text = (args as { text: string }).text;
    const summary = await summarizeText(text);
    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
