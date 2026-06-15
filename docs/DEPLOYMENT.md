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

The keys in `.env.local` belong to a Clerk **development** instance, which is
fine for an MVP/demo on the default `*.vercel.app` URL. A Clerk **production**
instance is more secure (HTTPS-only, dedicated per-provider OAuth credentials,
no dev banner, higher limits) but **requires a custom domain you own** — you
cannot run a production instance on `*.vercel.app` because Clerk needs CNAME
DNS records (e.g. `clerk.yourdomain.com`) that you can't add to `vercel.app`.

No application code changes are needed for either path; the switch is entirely
dashboard + DNS + Vercel env vars.

### Staying on the dev instance (current MVP setup)

Nothing to do. Auth is boot-safe: if Clerk keys are absent the app still serves
the public home + agent pages and admin gating is simply disabled.

### Switching to a production instance (when you have a domain)

1. **Custom domain** — buy one (Vercel Domains / Namecheap / Cloudflare) and add
   it to your Vercel project (Project → Settings → Domains). Point your apex /
   `www` to Vercel per Vercel's instructions.
2. **Create the production instance** — in the Clerk Dashboard, toggle from
   *Development* and create a Production instance (clone or start fresh).
3. **Add Clerk's DNS records** — Clerk's *Domains* page lists the CNAME records
   to add at your DNS provider (Frontend API `clerk.`, account portal
   `accounts.`, email `clkmail` + two `clk._domainkey` DKIM records). If using
   Cloudflare, set them to **DNS only** (no proxy/orange cloud). Then click
   *Deploy certificates*. Propagation can take up to 48h.
4. **Swap the keys in Vercel** env vars (step 3) with the production
   `pk_live_…` / `sk_live_…` keys, and set `NEXT_PUBLIC_APP_URL` to your custom
   domain. Redeploy.
5. **Re-register OAuth providers** — production uses your own OAuth credentials
   (not Clerk's shared dev ones); configure each provider you enabled.
6. **CAA check** — ensure your domain's CAA records don't block Let's Encrypt or
   Google Trust Services: `dig <yourdomain> +short CAA`.

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
