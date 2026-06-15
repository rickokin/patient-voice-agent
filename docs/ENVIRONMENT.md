# Patient Voice Agent - Environment Variables

All secrets are server-side only. The single exception is the Clerk publishable key, which is intentionally public (`NEXT_PUBLIC_` prefix). Validate these at startup (e.g., a Zod schema in `lib/env.ts`).

## Required

| Variable | Scope | Description |
| --- | --- | --- |
| `DATABASE_URL` | Server | Neon Postgres connection string (pooled). Must point at a DB with the `pgvector` extension enabled. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Clerk publishable key (client-side). |
| `CLERK_SECRET_KEY` | Server | Clerk secret key (server-side auth). |

## LLM provider selection

The app is provider-agnostic. Choose a generation provider and an embedding provider independently, then supply the matching API key(s). Only the key(s) for the selected provider(s) are required.

| Variable | Scope | Default | Description |
| --- | --- | --- | --- |
| `LLM_PROVIDER` | Server | `gemini` | Generation provider for extraction + answers. One of `gemini` \| `openai` \| `anthropic`. |
| `EMBEDDING_PROVIDER` | Server | `gemini` | Embedding provider. One of `gemini` \| `openai`. (Anthropic has no first-party embeddings.) |
| `GEMINI_API_KEY` | Server | - | Required if `gemini` is used for generation and/or embeddings. |
| `OPENAI_API_KEY` | Server | - | Required if `openai` is used for generation and/or embeddings. |
| `ANTHROPIC_API_KEY` | Server | - | Required if `LLM_PROVIDER=anthropic`. Note: still set an embedding provider/key, since Anthropic provides no embeddings. |

## Model / RAG configuration

Model names are provider-neutral; defaults are resolved per provider when unset (see the per-provider table in `ARCHITECTURE.md`).

| Variable | Example default | Description |
| --- | --- | --- |
| `LLM_EXTRACTION_MODEL` | `gemini-2.5-flash` | Model used to extract story moments from transcripts. |
| `LLM_GENERATION_MODEL` | `gemini-2.5-flash` | Model used to generate grounded answers. |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Model used for moment + query embeddings. |
| `EMBEDDING_DIMENSION` | `768` | Embedding vector size. **Must match both the chosen `EMBEDDING_MODEL`'s output and the `vector(N)` column** in the schema; changing it requires a migration + full re-embed. |
| `RETRIEVAL_TOP_K` | `6` | Number of supporting moments retrieved per query. |

## Clerk routing (optional, recommended)

| Variable | Example | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Sign-in route. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Sign-up route. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` | Post-sign-in redirect. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` | Post-sign-up redirect. |

## App

| Variable | Example | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL of the app; used for client fetches and absolute links. |
| `NODE_ENV` | `development` | Standard Node environment flag (set automatically by most hosts). |

## Future (not needed in Phase 1)

| Variable | Description |
| --- | --- |
| `AGENT_API_TOKEN` | Service token a future standalone agent app uses to call `/api/agent/*`. |
| `PII_REDACTION_ENABLED` | Toggle for PHI/PII redaction in the normalize step. |

## Notes

- **Local:** copy `.env.example` to `.env.local` and fill in values. Never commit real secrets.
- **Vercel:** set the same variables in Project Settings > Environment Variables for both Preview and Production. Use Neon's pooled connection string for serverless.
- **Only configure what you use:** set the API key(s) for the selected `LLM_PROVIDER` / `EMBEDDING_PROVIDER` only. Unused provider keys can be omitted.
- **Embedding dimension is load-bearing:** `EMBEDDING_DIMENSION` must equal both the chosen `EMBEDDING_MODEL`'s output size and the `vector(N)` definition in `db/schema.ts`. Mismatches cause insert/search failures, and switching embedding providers/models requires a migration + full re-embed.
