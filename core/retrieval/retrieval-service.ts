import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { moments, momentEmbeddings, transcripts } from "@/db/schema";
import { getEmbeddingProvider } from "@/core/llm";
import { env } from "@/lib/env";
import type { SupportingMoment } from "@/core/types";

export interface RetrieveOptions {
  topK?: number;
  /** Minimum cosine similarity (0..1) for a moment to be included. */
  minScore?: number;
  /** Exclude this moment id from results (e.g. the seed of a similarity search). */
  excludeMomentId?: string;
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/** Vector similarity search over approved moments using a precomputed query vector. */
export async function retrieve(
  queryVector: number[],
  options: RetrieveOptions = {},
): Promise<SupportingMoment[]> {
  const topK = options.topK ?? env.RETRIEVAL_TOP_K;
  const literal = toVectorLiteral(queryVector);

  // pgvector cosine distance (0 = identical). Similarity = 1 - distance.
  const distance = sql<number>`${momentEmbeddings.embedding} <=> ${literal}::vector`;

  const where = options.excludeMomentId
    ? and(
        eq(moments.status, "approved"),
        ne(moments.id, options.excludeMomentId),
      )
    : eq(moments.status, "approved");

  const rows = await db
    .select({
      id: moments.id,
      title: moments.title,
      summary: moments.summary,
      quote: moments.quote,
      themes: moments.themes,
      audienceTags: moments.audienceTags,
      transcriptTitle: transcripts.title,
      distance,
    })
    .from(moments)
    .innerJoin(momentEmbeddings, eq(momentEmbeddings.momentId, moments.id))
    .innerJoin(transcripts, eq(transcripts.id, moments.transcriptId))
    .where(where)
    .orderBy(distance)
    .limit(topK);

  const results = rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    quote: r.quote,
    themes: r.themes,
    audienceTags: r.audienceTags,
    transcriptTitle: r.transcriptTitle,
    score: 1 - Number(r.distance),
  }));

  return options.minScore != null
    ? results.filter((r) => r.score >= options.minScore!)
    : results;
}

/** Embed a free-text query, then retrieve. */
export async function retrieveByText(
  query: string,
  options: RetrieveOptions = {},
): Promise<SupportingMoment[]> {
  const [vector] = await getEmbeddingProvider().embed([query]);
  return retrieve(vector, options);
}

/**
 * Thrown when a similarity search is requested for a moment that has no stored
 * embedding (e.g. a draft moment that was never approved/embedded).
 */
export class MomentNotEmbeddedError extends Error {
  constructor() {
    super("This moment has no embedding, so similar moments can't be found.");
    this.name = "MomentNotEmbeddedError";
  }
}

/**
 * Find approved moments most similar to an existing moment, using that moment's
 * own stored embedding. The seed moment is excluded from its own results.
 */
export async function retrieveSimilarToMoment(
  momentId: string,
  options: RetrieveOptions = {},
): Promise<SupportingMoment[]> {
  const [row] = await db
    .select({ embedding: momentEmbeddings.embedding })
    .from(momentEmbeddings)
    .where(eq(momentEmbeddings.momentId, momentId));

  if (!row) throw new MomentNotEmbeddedError();

  // drizzle's pgvector column reads back as number[].
  const vector = row.embedding as number[];
  return retrieve(vector, { ...options, excludeMomentId: momentId });
}
