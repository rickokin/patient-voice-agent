import type {
  EmbeddingProvider,
  GenerateInput,
  GenerateStructuredInput,
  LLMProvider,
} from "../types";
import { normalizeVector, parseJsonResponse } from "./util";

const OPENAI_BASE = "https://api.openai.com/v1";

interface ChatResponse {
  choices: { message: { content: string | null } }[];
}

interface EmbeddingsResponse {
  data: { embedding: number[] }[];
}

async function postJson<T>(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

export class OpenAILLMProvider implements LLMProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async generate({ system, prompt, temperature }: GenerateInput): Promise<string> {
    const data = await postJson<ChatResponse>(
      `${OPENAI_BASE}/chat/completions`,
      this.apiKey,
      {
        model: this.model,
        temperature,
        messages: messagesFor(system, prompt),
      },
    );
    return data.choices[0]?.message?.content ?? "";
  }

  async generateStructured<T>({
    system,
    prompt,
    temperature,
  }: GenerateStructuredInput): Promise<T> {
    const data = await postJson<ChatResponse>(
      `${OPENAI_BASE}/chat/completions`,
      this.apiKey,
      {
        model: this.model,
        temperature,
        response_format: { type: "json_object" },
        messages: messagesFor(system, prompt),
      },
    );
    return parseJsonResponse<T>(data.choices[0]?.message?.content ?? "");
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    readonly dimension: number,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const data = await postJson<EmbeddingsResponse>(
      `${OPENAI_BASE}/embeddings`,
      this.apiKey,
      {
        model: this.model,
        input: texts,
        dimensions: this.dimension,
      },
    );
    return data.data.map((d) => normalizeVector(d.embedding));
  }
}

function messagesFor(system: string | undefined, prompt: string) {
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return messages;
}
