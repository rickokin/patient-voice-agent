/**
 * Provider-agnostic LLM interfaces. Domain services depend ONLY on these types,
 * never on a vendor SDK. Concrete adapters live in ./providers/*.
 */

export type JsonSchema = Record<string, unknown>;

export interface GenerateInput {
  /** Optional system instruction / persona. */
  system?: string;
  /** The user prompt. */
  prompt: string;
  /** 0..1 sampling temperature. Defaults are provider-specific. */
  temperature?: number;
}

export interface GenerateStructuredInput extends GenerateInput {
  /** JSON Schema the model output must conform to. */
  schema: JsonSchema;
}

export interface LLMProvider {
  /** Provider identifier, e.g. "gemini" | "openai" | "anthropic". */
  readonly name: string;
  /** Concrete model id in use. */
  readonly model: string;
  /** Free-form text generation (used for grounded answers). */
  generate(input: GenerateInput): Promise<string>;
  /** Schema-constrained JSON generation (used for moment extraction). */
  generateStructured<T>(input: GenerateStructuredInput): Promise<T>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  /** Output vector size; must match the pgvector column + EMBEDDING_DIMENSION. */
  readonly dimension: number;
  /** Embed a batch of texts, returning one unit-normalized vector per input. */
  embed(texts: string[]): Promise<number[][]>;
}
