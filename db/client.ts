import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

/**
 * Pooled Postgres connection shared across the app. Cached on globalThis to
 * survive Next.js dev hot-reloads (avoids exhausting connections).
 */
const globalForDb = globalThis as unknown as {
  pvaPool?: Pool;
};

/**
 * Build pool config from DATABASE_URL while avoiding the `pg-connection-string`
 * deprecation warning for `sslmode=require`. We strip the SSL-related query
 * params from the URL and configure TLS explicitly, preserving certificate
 * verification (equivalent to the current `verify-full` behavior).
 */
function poolConfig() {
  const url = new URL(requireDatabaseUrl());
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 10,
  };
}

const pool = globalForDb.pvaPool ?? new Pool(poolConfig());

if (process.env.NODE_ENV !== "production") {
  globalForDb.pvaPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
