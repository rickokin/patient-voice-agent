import { env, requireEmbeddingApiKey, requireLlmApiKey } from "@/lib/env";
import { GeminiEmbeddingProvider, GeminiLLMProvider } from "./providers/gemini";
import { OpenAIEmbeddingProvider, OpenAILLMProvider } from "./providers/openai";
import { AnthropicLLMProvider } from "./providers/anthropic";
import type { EmbeddingProvider, LLMProvider } from "./types";

export type { EmbeddingProvider, LLMProvider } from "./types";

const llmCache = new Map<string, LLMProvider>();
let embeddingProvider: EmbeddingProvider | undefined;

function createLLM(model: string): LLMProvider {
  const apiKey = requireLlmApiKey();
  switch (env.LLM_PROVIDER) {
    case "gemini":
      return new GeminiLLMProvider(apiKey, model);
    case "openai":
      return new OpenAILLMProvider(apiKey, model);
    case "anthropic":
      return new AnthropicLLMProvider(apiKey, model);
  }
}

function getLLM(model: string): LLMProvider {
  const key = `${env.LLM_PROVIDER}:${model}`;
  let provider = llmCache.get(key);
  if (!provider) {
    provider = createLLM(model);
    llmCache.set(key, provider);
  }
  return provider;
}

/** LLM used for moment extraction (LLM_EXTRACTION_MODEL). */
export function getExtractionLLM(): LLMProvider {
  return getLLM(env.LLM_EXTRACTION_MODEL);
}

/** LLM used for grounded answer generation (LLM_GENERATION_MODEL). */
export function getGenerationLLM(): LLMProvider {
  return getLLM(env.LLM_GENERATION_MODEL);
}

/** Embedding provider for both moment indexing and query embedding. */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (embeddingProvider) return embeddingProvider;
  const apiKey = requireEmbeddingApiKey();
  switch (env.EMBEDDING_PROVIDER) {
    case "gemini":
      embeddingProvider = new GeminiEmbeddingProvider(
        apiKey,
        env.EMBEDDING_MODEL,
        env.EMBEDDING_DIMENSION,
      );
      break;
    case "openai":
      embeddingProvider = new OpenAIEmbeddingProvider(
        apiKey,
        env.EMBEDDING_MODEL,
        env.EMBEDDING_DIMENSION,
      );
      break;
  }
  return embeddingProvider;
}

/**
 * Fail-fast configuration check. Returns the active provider/model selection or
 * throws if the required API key(s) are missing. Useful for a health endpoint.
 */
export function assertLlmConfigured(): {
  llmProvider: string;
  embeddingProvider: string;
  generationModel: string;
  extractionModel: string;
  embeddingModel: string;
  embeddingDimension: number;
} {
  requireLlmApiKey();
  requireEmbeddingApiKey();
  return {
    llmProvider: env.LLM_PROVIDER,
    embeddingProvider: env.EMBEDDING_PROVIDER,
    generationModel: env.LLM_GENERATION_MODEL,
    extractionModel: env.LLM_EXTRACTION_MODEL,
    embeddingModel: env.EMBEDDING_MODEL,
    embeddingDimension: env.EMBEDDING_DIMENSION,
  };
}
