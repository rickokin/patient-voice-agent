import type {
  GenerateInput,
  GenerateStructuredInput,
  LLMProvider,
} from "../types";
import { parseJsonResponse } from "./util";

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 2048;

interface MessagesResponse {
  content: { type: string; text?: string }[];
}

export class AnthropicLLMProvider implements LLMProvider {
  readonly name = "anthropic";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async generate({ system, prompt, temperature }: GenerateInput): Promise<string> {
    return this.call(system, prompt, temperature);
  }

  async generateStructured<T>({
    system,
    prompt,
    schema,
    temperature,
  }: GenerateStructuredInput): Promise<T> {
    // Anthropic has no native JSON mode; steer with an instruction + schema.
    const jsonSystem = [
      system ?? "",
      "Respond with a single JSON value that conforms to this JSON schema. Output JSON only, with no prose or code fences.",
      JSON.stringify(schema),
    ]
      .filter(Boolean)
      .join("\n\n");
    const text = await this.call(jsonSystem, prompt, temperature);
    return parseJsonResponse<T>(text);
  }

  private async call(
    system: string | undefined,
    prompt: string,
    temperature: number | undefined,
  ): Promise<string> {
    const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: DEFAULT_MAX_TOKENS,
        temperature,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Anthropic request failed (${res.status}): ${detail}`);
    }
    const data = (await res.json()) as MessagesResponse;
    return data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");
  }
}
