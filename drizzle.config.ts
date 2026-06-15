import { defineConfig } from "drizzle-kit";

// Load local env when running drizzle-kit outside Next (Node 20.6+/24).
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may not exist in CI; rely on process.env instead.
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder",
  },
  strict: true,
  verbose: true,
});
