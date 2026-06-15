import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { moments, momentEmbeddings } from "@/db/schema";
import { getEmbeddingProvider } from "@/core/llm";
import { env } from "@/lib/env";
import type { SupportingMoment } from "@/core/types";

export interface RetrieveOptions {
  topK?: number;
  /** Minimum cosine similarity (0..1) for a moment to be included. */
  minScore?: number;
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

  const rows = await db
    .select({
      id: moments.id,
      title: moments.title,
      summary: moments.summary,
      quote: moments.quote,
      themes: moments.themes,
      audienceTags: moments.audienceTags,
      distance,
    })
    .from(moments)
    .innerJoin(momentEmbeddings, eq(momentEmbeddings.momentId, moments.id))
    .where(eq(moments.status, "approved"))
    .orderBy(distance)
    .limit(topK);

  const results = rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    quote: r.quote,
    themes: r.themes,
    audienceTags: r.audienceTags,
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
