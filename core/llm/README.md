# core/llm - Provider-agnostic AI layer

Domain services depend only on the `LLMProvider` / `EmbeddingProvider` interfaces
in [`types.ts`](./types.ts). Vendor SDKs and REST calls are confined to
[`providers/`](./providers). Selection is driven by env (`LLM_PROVIDER`,
`EMBEDDING_PROVIDER`); see `docs/ENVIRONMENT.md`.

## Usage

```ts
import {
  getExtractionLLM,
  getGenerationLLM,
  getEmbeddingProvider,
} from "@/core/llm";

const answer = await getGenerationLLM().generate({ system, prompt });
const moments = await getExtractionLLM().generateStructured({ prompt, schema });
const vectors = await getEmbeddingProvider().embed(["text a", "text b"]);
```

## Adding a new provider

1. Create `providers/<name>.ts` implementing `LLMProvider` and/or
   `EmbeddingProvider`. Keep the vendor SDK/REST calls inside this file.
2. Register it in the `switch` statements in [`index.ts`](./index.ts)
   (`createLLM` and/or `getEmbeddingProvider`).
3. Add the provider to the `LLM_PROVIDER` / `EMBEDDING_PROVIDER` enums in
   [`lib/env.ts`](../../lib/env.ts) and document its key in `docs/ENVIRONMENT.md`.

Embeddings must return unit-normalized vectors of length `EMBEDDING_DIMENSION`
(use `normalizeVector` from [`providers/util.ts`](./providers/util.ts)).
