import { GoogleGenAI } from "@google/genai";
import type {
  EmbeddingProvider,
  GenerateInput,
  GenerateStructuredInput,
  LLMProvider,
} from "../types";
import { normalizeVector, parseJsonResponse } from "./util";

export class GeminiLLMProvider implements LLMProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate({ system, prompt, temperature }: GenerateInput): Promise<string> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { systemInstruction: system, temperature },
    });
    return res.text ?? "";
  }

  async generateStructured<T>({
    system,
    prompt,
    schema,
    temperature,
  }: GenerateStructuredInput): Promise<T> {
    const res = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: system,
        temperature,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
    return parseJsonResponse<T>(res.text ?? "");
  }
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    readonly model: string,
    readonly dimension: number,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.client.models.embedContent({
      model: this.model,
      contents: texts,
      config: { outputDimensionality: this.dimension },
    });
    const embeddings = res.embeddings ?? [];
    if (embeddings.length !== texts.length) {
      throw new Error(
        `Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs.`,
      );
    }
    return embeddings.map((e) => normalizeVector(e.values ?? []));
  }
}
