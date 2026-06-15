# Patient Voice Agent - Deployment (Vercel + Neon)

This guide deploys the app to Vercel with Neon Postgres (pgvector) and Clerk.

## 0. Prerequisites

- A Neon project with the `pgvector` extension (already enabled by `db:migrate`).
- A Clerk **production** instance (the local `.env.local` keys are a dev instance;
  see step 4).
- A Google Gemini API key (or OpenAI/Anthropic if you switch providers).
- The repo pushed to GitHub/GitLab/Bitbucket, or the Vercel CLI installed.

## 1. Runtime notes (already handled in code)

- API route handlers run on the **Node.js runtime** (default) so `pg` works.
  Do not add `export const runtime = "edge"` to routes that touch the DB.
- The DB pool is cached on `globalThis` to survive warm serverless invocations
  (`db/client.ts`).
- Use Neon's **pooled** connection string (`-pooler` host) for serverless.

## 2. Push the code

Option A - Git (recommended):

```bash
git add -A
git commit -m "Patient Voice Agent MVP"
git remote add origin <your-repo-url>
git push -u origin main
```

Then in the Vercel dashboard: **Add New Project -> Import** the repo. Framework
is auto-detected as Next.js. No custom build/output settings needed.

Option B - Vercel CLI:

```bash
npm i -g vercel
vercel        # preview deploy (prompts for login + project)
vercel --prod # production deploy
```

## 3. Environment variables (set in Vercel: Preview + Production)

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk production publishable key |
| `CLERK_SECRET_KEY` | Clerk production secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `GEMINI_API_KEY` | Or `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` per provider |
| `LLM_PROVIDER` | `gemini` (default) |
| `EMBEDDING_PROVIDER` | `gemini` (default) |
| `LLM_EXTRACTION_MODEL` | `gemini-2.5-flash` |
| `LLM_GENERATION_MODEL` | `gemini-2.5-flash` |
| `EMBEDDING_MODEL` | `gemini-embedding-001` |
| `EMBEDDING_DIMENSION` | `768` (must match the `vector(N)` column) |
| `RETRIEVAL_TOP_K` | `6` |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://your-app.vercel.app` |

See `docs/ENVIRONMENT.md` for full descriptions.

## 4. Clerk production setup

The keys in `.env.local` belong to a Clerk **development** instance. For a real
domain:

1. In Clerk, create/enable a **Production** instance and add your Vercel domain.
2. Copy its publishable/secret keys into Vercel env vars (step 3).
3. Add the production domain to Clerk's allowed origins.

Auth is boot-safe: if Clerk keys are absent, the app still serves the public
home + agent pages, and admin/API gating is disabled.

## 5. Migrate the production database

Migrations are not run during the Vercel build. Run them once against the prod DB
(idempotent; Drizzle tracks applied migrations):

```bash
DATABASE_URL="<neon-pooled-url>" npm run db:migrate
# verify
DATABASE_URL="<neon-pooled-url>" npm run db:check
```

`db:migrate` also enables `CREATE EXTENSION IF NOT EXISTS vector` automatically.

## 6. Post-deploy smoke test

1. Visit the deployed URL; confirm the landing page loads.
2. Sign in via Clerk; open **Admin -> Transcripts**.
3. Paste a transcript -> Normalize -> Extract moments.
4. **Admin -> Moments**: edit, then Approve + embed.
5. **Agent**: ask a question; confirm a grounded answer + supporting moments.
6. **Admin -> Query Logs**: confirm the query was logged with cited moments.

## 7. Monitoring (MVP)

- API errors are logged via `console.error` in `lib/http.ts` and surface in
  Vercel's function logs.
- Next step (optional): add Sentry or Vercel Observability for structured error
  tracking and latency metrics on `/api/agent/ask`.
