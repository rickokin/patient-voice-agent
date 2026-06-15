/**
 * Smoke test for the provider-agnostic LLM layer.
 * Run: npm run smoke:llm  (reads .env.local)
 *
 * Prints the active provider config, and if an API key is present, performs a
 * live embedding + generation call.
 */
export {};

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // rely on process.env
  }

  const { env } = await import("@/lib/env");
  console.log("LLM provider:    ", env.LLM_PROVIDER, "/", env.LLM_GENERATION_MODEL);
  console.log("Extraction model:", env.LLM_EXTRACTION_MODEL);
  console.log(
    "Embedding:       ",
    env.EMBEDDING_PROVIDER,
    "/",
    env.EMBEDDING_MODEL,
    `(dim ${env.EMBEDDING_DIMENSION})`,
  );

  const hasEmbeddingKey =
    env.EMBEDDING_PROVIDER === "gemini"
      ? !!env.GEMINI_API_KEY
      : !!env.OPENAI_API_KEY;
  if (!hasEmbeddingKey) {
    console.log("\nNo API key set for the selected provider; skipping live calls.");
    return;
  }

  const { getEmbeddingProvider, getGenerationLLM } = await import("@/core/llm");

  const [vector] = await getEmbeddingProvider().embed([
    "A patient describes waiting months for a diagnosis.",
  ]);
  console.log(`\nEmbedding OK: ${vector.length} dimensions.`);

  const text = await getGenerationLLM().generate({
    prompt: "Reply with exactly the word: ok",
    temperature: 0,
  });
  console.log("Generation OK:", JSON.stringify(text.trim().slice(0, 60)));
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
