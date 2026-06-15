# Patient Voice Agent - Phased Build Plan

A phased, checkbox implementation plan. Each phase is independently shippable and builds on the prior one. See `ARCHITECTURE.md` for the design and `FOLDER_STRUCTURE.md` for where code lives.

---

## Phase 0 - Project Scaffold and Foundations

- [ ] Initialize Next.js (App Router) + TypeScript project
- [ ] Add and configure Tailwind CSS
- [ ] Set up ESLint + Prettier + `tsconfig` path aliases (`@/core`, `@/db`, etc.)
- [ ] Create `.env.example` from `ENVIRONMENT.md`; wire env loading/validation (e.g., Zod schema in `lib/env.ts`)
- [ ] Provision Neon Postgres project; capture `DATABASE_URL`
- [ ] Set up Clerk app; add publishable/secret keys; add middleware to gate admin routes
- [ ] Verify base app boots locally and on a Vercel preview

## Phase 1 - Database Schema and pgvector

- [ ] Enable `pgvector` extension on Neon (`CREATE EXTENSION IF NOT EXISTS vector`)
- [ ] Add Drizzle ORM + `node-postgres` driver and config
- [ ] Define schema: `users`, `transcripts`, `moments`, `moment_embeddings`, `query_logs`, `query_log_moments`
- [ ] Add governance-ready columns (consent, approval, source provenance) per `ARCHITECTURE.md`
- [ ] Add `vector(N)` column matching the configured embedding dimension
- [ ] Generate + run initial migration
- [ ] Create vector index (HNSW or IVFFlat) on `moment_embeddings.embedding`
- [ ] Add `db/client.ts` (pooled connection) and confirm a round-trip query

## Phase 2 - Core Services (framework-agnostic)

- [ ] `core/llm/types.ts`: define `LLMProvider` + `EmbeddingProvider` interfaces (no vendor SDK imports)
- [ ] `core/llm/index.ts`: factory that reads `LLM_PROVIDER`/`EMBEDDING_PROVIDER` and returns the configured adapter
- [ ] Implement the default provider adapter (Gemini) under `core/llm/providers/`
- [ ] Add additional adapters as needed (OpenAI, Anthropic); keep vendor SDKs confined to `core/llm/providers/*`
- [ ] Validate provider selection via env at startup; fail fast on missing keys for the selected provider(s)
- [ ] Document how to add a new provider (implement interface + register in factory)
- [ ] `transcriptService`: create, normalize
- [ ] `extractionService`: extract structured draft moments from normalized text
- [ ] `momentService`: list, update, approve/reject
- [ ] `embeddingService`: embed single moment, backfill approved moments
- [ ] `retrievalService`: embed query + vector similarity search over approved moments (with audience/theme filters)
- [ ] `answerService`: orchestrate ask (embed -> retrieve -> generate grounded answer -> log)
- [ ] `queryLogService`: write + list logs
- [ ] Define shared types/DTOs in `core/types`
- [ ] Unit-test each service against a test DB (or mocked Gemini)

## Phase 3 - Admin / Curation UI + API

- [ ] Route handlers: transcripts (create/normalize/extract), moments (list/update/approve/embed), embeddings backfill
- [ ] Input validation (Zod) + Clerk auth checks in handlers
- [ ] UI: transcript intake (upload/paste) + normalize action
- [ ] UI: extracted moments review/edit screen
- [ ] UI: approve/reject controls + embedding status/trigger
- [ ] UI: list/filter moments by status, transcript, theme

## Phase 4 - Demo Agent UI + API

- [ ] Route handler: `POST /api/agent/ask` (full RAG)
- [ ] (Optional) `POST /api/agent/retrieve` for retrieval-only/debug
- [ ] UI: question input + audience mode selector
- [ ] UI: render grounded answer
- [ ] UI: show supporting moments with similarity scores
- [ ] Handle empty/low-confidence retrieval (graceful decline, no hallucination)

## Phase 5 - Query Logging and Inspection

- [ ] Persist every ask to `query_logs` + `query_log_moments`
- [ ] Route handler: `GET /api/query-logs`
- [ ] Admin UI: query log inspector (question, audience, answer, cited moments, latency, model)
- [ ] Basic filtering/pagination

## Phase 6 - Deployment

- [ ] Configure Vercel project + environment variables (preview + production)
- [ ] Confirm Neon connection from Vercel (pooled/serverless settings)
- [ ] Run migrations against production DB
- [ ] Smoke test full workflow end-to-end on production
- [ ] Add basic monitoring/error logging

## Later - Governance, Privacy, and Standalone Agent

- [ ] Consent model: `consents` table + enforcement in embedding/retrieval
- [ ] PHI/PII detection + redaction in normalize step
- [ ] RBAC via `users.role`/`org_id`; per-org data isolation (multi-tenancy)
- [ ] Field-level encryption + data retention policies
- [ ] Extract `core/` + `db/` into a shared workspace package
- [ ] Stand up the separate agent-only app (import package or call `/api/agent/*` with a service token)
- [ ] Rate limiting + API auth tokens for external/agent consumers
