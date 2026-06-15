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

const pool =
  globalForDb.pvaPool ??
  new Pool({
    connectionString: requireDatabaseUrl(),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pvaPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
