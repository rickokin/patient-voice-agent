# Patient Voice Agent - Proposed Folder Structure

The layout enforces one rule above all: **business logic lives in `core/` and never imports Next.js.** This is the reusability boundary that lets a future standalone agent app share the same logic. See `ARCHITECTURE.md` for the rationale.

```text
patient-voice-agent/
├── app/                          # Next.js App Router (UI + API adapters only)
│   ├── (admin)/                  # Admin / curation app (Clerk-gated)
│   │   ├── transcripts/          # Intake, normalize, extract screens
│   │   ├── moments/              # Review, edit, approve, embed screens
│   │   └── query-logs/           # Query log inspector
│   ├── (agent)/                  # Demo agent app
│   │   └── ask/                  # Question UI + audience mode + answer view
│   ├── api/                      # Route handlers = thin adapters over core/
│   │   ├── transcripts/          # create, [id]/normalize, [id]/extract
│   │   ├── moments/              # list, [id], [id]/approve, [id]/embed
│   │   ├── embeddings/           # backfill
│   │   ├── agent/                # ask, retrieve
│   │   └── query-logs/           # list
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── core/                         # Framework-agnostic business logic (NO next/* imports)
│   ├── transcripts/              # transcriptService (create, normalize)
│   ├── extraction/               # extractionService (moments from transcript)
│   ├── moments/                  # momentService (list, update, approve)
│   ├── embeddings/               # embeddingService (embed moment, backfill)
│   ├── retrieval/                # retrievalService (vector search)
│   ├── answers/                  # answerService (RAG orchestration)
│   ├── query-logs/               # queryLogService (write, list)
│   ├── llm/                      # Provider-agnostic AI layer
│   │   ├── types.ts              # LLMProvider + EmbeddingProvider interfaces
│   │   ├── index.ts              # Factory: reads LLM_PROVIDER/EMBEDDING_PROVIDER, returns adapter
│   │   └── providers/           # Vendor SDK adapters (isolated here)
│   │       ├── gemini.ts
│   │       ├── openai.ts
│   │       └── anthropic.ts
│   ├── prompts/                  # Prompt templates (extraction, answer generation)
│   └── types/                    # Shared DTOs / domain types
│
├── db/                           # Data layer (imported by core/, not by app/api directly)
│   ├── schema.ts                 # Drizzle schema (tables incl. pgvector column)
│   ├── client.ts                 # Pooled node-postgres / Drizzle client
│   ├── migrations/               # Generated SQL migrations
│   └── index.ts
│
├── components/                   # Reusable React UI components
│   ├── admin/
│   ├── agent/
│   └── ui/                       # Shared primitives (buttons, inputs, etc.)
│
├── lib/                          # App-level helpers (browser/server, not domain logic)
│   ├── env.ts                    # Env var parsing/validation (Zod)
│   ├── auth.ts                   # Clerk helpers / current-user resolution
│   └── api.ts                    # Client fetch helpers, response types
│
├── docs/                         # Architecture + planning docs
│   ├── ARCHITECTURE.md
│   ├── BUILD_PLAN.md
│   ├── FOLDER_STRUCTURE.md
│   └── ENVIRONMENT.md
│
├── middleware.ts                 # Clerk middleware (gates admin routes)
├── drizzle.config.ts             # Drizzle migration/config
├── .env.example                  # Documented env vars (see ENVIRONMENT.md)
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json                 # Path aliases: @/core, @/db, @/lib, @/components
├── package.json
└── README.md
```

## Layer responsibilities and dependency direction

| Layer | Imports from | Must NOT import |
| --- | --- | --- |
| `app/` (UI + `app/api`) | `core/`, `lib/`, `components/` | `db/` directly |
| `core/` services | `db/`, `core/llm` interfaces | `next/*`, React, vendor LLM SDKs |
| `core/llm/providers/*` | vendor SDKs (Gemini/OpenAI/Anthropic) | other `core/` services, `next/*` |
| `db/` | Drizzle, `node-postgres` | `core/`, `app/` |
| `lib/` | `next/*`, Clerk, env | `core/` domain logic |
| `components/` | React, `lib/` | `core/`, `db/` |

Allowed direction: `app -> core -> db`. UI never touches the database directly; all data access flows through a `core/` service. This single chokepoint is where future governance/consent/PHI controls will live.

Vendor LLM SDKs are confined to `core/llm/providers/*`. Domain services depend only on the `LLMProvider`/`EmbeddingProvider` interfaces, so adding a new provider or switching vendors touches only that one folder plus config.

## Why this supports the future standalone agent app

- `core/` + `db/` have zero Next.js dependencies, so they can be lifted into a shared workspace package and imported by a separate agent-only app.
- Alternatively, that app can call the stable `/api/agent/*` HTTP contract.
- Either way, no business logic needs to be rewritten.
