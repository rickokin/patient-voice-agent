import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/**
 * Embedding vector size. MUST match EMBEDDING_DIMENSION in the environment and
 * the chosen EMBEDDING_MODEL's output. Changing it requires a migration + full
 * re-embed of approved moments.
 */
export const EMBEDDING_DIMENSION = 768;

/** Clerk-backed users. org_id/role exist now to enable future RBAC/multi-tenancy. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  orgId: text("org_id"),
  role: text("role").notNull().default("curator"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Raw + normalized transcripts. source_* fields capture provenance/governance. */
export const transcripts = pgTable("transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  rawText: text("raw_text").notNull(),
  normalizedText: text("normalized_text"),
  // uploaded -> normalized -> extracted
  status: text("status").notNull().default("uploaded"),
  sourceType: text("source_type"),
  sourceMetadata: jsonb("source_metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Curated story moments. Only `approved` moments are eligible for retrieval.
 * Consent and approval columns exist now for future governance and audit.
 */
export const moments = pgTable(
  "moments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transcriptId: uuid("transcript_id")
      .notNull()
      .references(() => transcripts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    quote: text("quote").notNull(),
    themes: text("themes").array().notNull().default([]),
    audienceTags: text("audience_tags").array().notNull().default([]),
    // draft -> approved | rejected
    status: text("status").notNull().default("draft"),
    consentConfirmed: boolean("consent_confirmed").notNull().default(false),
    consentNotes: text("consent_notes"),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("moments_status_idx").on(table.status),
    index("moments_transcript_idx").on(table.transcriptId),
  ],
);

/** One current embedding per moment. provider/model recorded for auditability. */
export const momentEmbeddings = pgTable(
  "moment_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    embedding: vector("embedding", {
      dimensions: EMBEDDING_DIMENSION,
    }).notNull(),
    embeddingProvider: text("embedding_provider").notNull(),
    embeddingModel: text("embedding_model").notNull(),
    embeddingDim: integer("embedding_dim").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("moment_embeddings_moment_idx").on(table.momentId),
    index("moment_embeddings_vector_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

/** Audit log of every demo agent question + answer. */
export const queryLogs = pgTable("query_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  askedBy: uuid("asked_by").references(() => users.id, {
    onDelete: "set null",
  }),
  question: text("question").notNull(),
  audienceMode: text("audience_mode").notNull(),
  answer: text("answer").notNull(),
  model: text("model").notNull(),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Which moments grounded each answer, with similarity scores. */
export const queryLogMoments = pgTable(
  "query_log_moments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queryLogId: uuid("query_log_id")
      .notNull()
      .references(() => queryLogs.id, { onDelete: "cascade" }),
    momentId: uuid("moment_id")
      .notNull()
      .references(() => moments.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
  },
  (table) => [
    index("query_log_moments_log_idx").on(table.queryLogId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
export type Moment = typeof moments.$inferSelect;
export type NewMoment = typeof moments.$inferInsert;
export type MomentEmbedding = typeof momentEmbeddings.$inferSelect;
export type NewMomentEmbedding = typeof momentEmbeddings.$inferInsert;
export type QueryLog = typeof queryLogs.$inferSelect;
export type NewQueryLog = typeof queryLogs.$inferInsert;
export type QueryLogMoment = typeof queryLogMoments.$inferSelect;
export type NewQueryLogMoment = typeof queryLogMoments.$inferInsert;
