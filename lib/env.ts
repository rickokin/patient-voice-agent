import { z } from "zod";

/**
 * Centralized, validated environment configuration.
 *
 * Secrets for external services (DB, Clerk, LLM providers) are optional at boot
 * so the app can start and be inspected before every integration is wired.
 * Features that need a given secret call the `require*` helpers below, which
 * fail fast with a clear message when the secret is missing.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Database (Neon Postgres + pgvector)
  DATABASE_URL: z.string().min(1).optional(),

  // Clerk auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),

  // LLM provider selection (see docs/ENVIRONMENT.md)
  LLM_PROVIDER: z.enum(["gemini", "openai", "anthropic"]).default("gemini"),
  EMBEDDING_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),

  // Per-provider API keys (only the selected provider's key is required at use time)
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // Provider-neutral model + RAG configuration
  LLM_EXTRACTION_MODEL: z.string().default("gemini-2.5-flash"),
  LLM_GENERATION_MODEL: z.string().default("gemini-2.5-flash"),
  EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(768),
  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(6),

  // Text-to-speech (Gemini-only; uses GEMINI_API_KEY regardless of LLM_PROVIDER)
  LLM_TTS_MODEL: z.string().default("gemini-2.5-flash-preview-tts"),
  TTS_VOICE: z.string().default("Kore"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // Treat empty strings (e.g. `DATABASE_URL=` in .env.local) as unset so that
  // optional fields and defaults behave correctly.
  const raw = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
  );
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon Postgres connection string to .env.local.",
    );
  }
  return env.DATABASE_URL;
}

/** API key for the configured generation provider (LLM_PROVIDER). */
export function requireLlmApiKey(): string {
  const key = providerKey(env.LLM_PROVIDER);
  if (!key) {
    throw new Error(
      `Missing API key for LLM_PROVIDER="${env.LLM_PROVIDER}". Set the matching *_API_KEY in .env.local.`,
    );
  }
  return key;
}

/** API key for the configured embedding provider (EMBEDDING_PROVIDER). */
export function requireEmbeddingApiKey(): string {
  const key = providerKey(env.EMBEDDING_PROVIDER);
  if (!key) {
    throw new Error(
      `Missing API key for EMBEDDING_PROVIDER="${env.EMBEDDING_PROVIDER}". Set the matching *_API_KEY in .env.local.`,
    );
  }
  return key;
}

/**
 * API key for Gemini specifically. Text-to-speech is only available via Gemini,
 * so it always requires GEMINI_API_KEY even when LLM_PROVIDER is openai/anthropic.
 */
export function requireGeminiApiKey(): string {
  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Text-to-speech requires a Gemini API key in .env.local.",
    );
  }
  return env.GEMINI_API_KEY;
}

function providerKey(provider: "gemini" | "openai" | "anthropic"): string | undefined {
  switch (provider) {
    case "gemini":
      return env.GEMINI_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
  }
}
