import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fall back to process.env
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const now = await db.execute(sql`select now() as now`);
  const ext = await pool.query(
    "select extname from pg_extension where extname = 'vector'",
  );
  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  );

  console.log("DB connection OK. Server time:", now.rows[0].now);
  console.log("pgvector extension:", ext.rowCount ? "enabled" : "MISSING");
  console.log(
    "public tables:",
    tables.rows.map((r) => r.table_name).join(", ") || "(none)",
  );

  await pool.end();
}

main().catch((err) => {
  console.error("DB check failed:", err);
  process.exit(1);
});
