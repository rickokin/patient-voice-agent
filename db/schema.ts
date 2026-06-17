import {
  boolean,
  customType,
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

/** Raw binary column (Postgres `bytea`), surfaced to JS as a Node `Buffer`. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/**
 * Embedding vector size. MUST match EMBEDDING_DIMENSION in the environment and
 * the chosen EMBEDDING_MODEL's output. Changing it requires a migration + full
 * re-embed of approved moments.
 */
export const EMBEDDING_DIMENSION = 768;

/**
 * Allowlist of who is permitted to use the app. This is the source of truth for
 * "known users": a Clerk identity may only be provisioned (and may only keep
 * access) while its primary email is present here. Seed it with
 * `npm run allowlist -- add <email> [role]`.
 */
export const allowedEmails = pgTable("allowed_emails", {
  // Stored normalized (trimmed + lowercased) so lookups are case-insensitive.
  email: text("email").primaryKey(),
  role: text("role").notNull().default("curator"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Clerk-backed users. org_id/role exist now to enable future RBAC/multi-tenancy. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  // Normalized primary email captured at provisioning; used to re-check the
  // allowlist on every request without an extra Clerk API call.
  email: text("email"),
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
  responseStyle: text("response_style").notNull().default("baseline"),
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
    // Nullable + set null so deleting a moment (e.g. when its transcript is
    // deleted) preserves the query-log audit row rather than cascade-removing it.
    momentId: uuid("moment_id").references(() => moments.id, {
      onDelete: "set null",
    }),
    score: real("score").notNull(),
    // Snapshots captured at query time so the audit log survives even after the
    // source moment/transcript is renamed or deleted.
    momentTitle: text("moment_title"),
    momentQuote: text("moment_quote"),
    transcriptTitle: text("transcript_title"),
  },
  (table) => [
    index("query_log_moments_log_idx").on(table.queryLogId),
  ],
);

/**
 * Generated text-to-speech narration of an answer, keyed 1:1 to its query log.
 * Stored inline as `bytea` so audio persists with the audit trail and can be
 * replayed/downloaded without external object storage.
 */
export const queryLogAudio = pgTable("query_log_audio", {
  id: uuid("id").primaryKey().defaultRandom(),
  queryLogId: uuid("query_log_id")
    .notNull()
    .unique()
    .references(() => queryLogs.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  voice: text("voice").notNull(),
  model: text("model").notNull(),
  audio: bytea("audio").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Consumer-facing "Helpful Artifacts" generated from an agent answer + the
 * retrieved story moments. These are preparation/reflection tools (never
 * medical advice). Kept independent of the curation tables so the feature can
 * be reused by a separate consumer-facing agent app. `query_id` is nullable +
 * set null so an artifact survives deletion of its originating query log.
 */
export const generatedArtifacts = pgTable(
  "generated_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Stored as text (not a users FK) so the feature can persist artifacts for
    // anonymous/consumer sessions in a future app without a provisioned user.
    userId: text("user_id"),
    queryId: uuid("query_id").references(() => queryLogs.id, {
      onDelete: "set null",
    }),
    artifactType: text("artifact_type").notNull(),
    artifactTitle: text("artifact_title").notNull(),
    sourceQuestion: text("source_question").notNull(),
    sourceAnswer: text("source_answer"),
    retrievedMomentIds: uuid("retrieved_moment_ids").array().notNull().default([]),
    contentJson: jsonb("content_json").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("generated_artifacts_query_idx").on(table.queryId),
    index("generated_artifacts_user_idx").on(table.userId),
    index("generated_artifacts_type_idx").on(table.artifactType),
    index("generated_artifacts_created_idx").on(table.createdAt),
  ],
);

export type AllowedEmail = typeof allowedEmails.$inferSelect;
export type NewAllowedEmail = typeof allowedEmails.$inferInsert;
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
export type QueryLogAudio = typeof queryLogAudio.$inferSelect;
export type NewQueryLogAudio = typeof queryLogAudio.$inferInsert;
export type GeneratedArtifactRow = typeof generatedArtifacts.$inferSelect;
export type NewGeneratedArtifactRow = typeof generatedArtifacts.$inferInsert;
