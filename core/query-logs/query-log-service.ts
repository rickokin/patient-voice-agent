import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  moments,
  queryLogAudio,
  queryLogMoments,
  queryLogs,
  users,
} from "@/db/schema";

export interface RecordQueryInput {
  askedBy?: string | null;
  question: string;
  audienceMode: string;
  responseStyle: string;
  answer: string;
  model: string;
  latencyMs: number;
  moments: {
    momentId: string;
    score: number;
    title: string;
    quote: string;
    transcriptTitle: string;
  }[];
}

export async function recordQuery(input: RecordQueryInput): Promise<string> {
  const [log] = await db
    .insert(queryLogs)
    .values({
      askedBy: input.askedBy ?? null,
      question: input.question,
      audienceMode: input.audienceMode,
      responseStyle: input.responseStyle,
      answer: input.answer,
      model: input.model,
      latencyMs: input.latencyMs,
    })
    .returning({ id: queryLogs.id });

  if (input.moments.length > 0) {
    await db.insert(queryLogMoments).values(
      input.moments.map((m) => ({
        queryLogId: log.id,
        momentId: m.momentId,
        score: m.score,
        momentTitle: m.title,
        momentQuote: m.quote,
        transcriptTitle: m.transcriptTitle,
      })),
    );
  }

  return log.id;
}

export async function listQueryLogs(limit = 100) {
  return db
    .select({
      id: queryLogs.id,
      askedBy: queryLogs.askedBy,
      askedByEmail: users.email,
      question: queryLogs.question,
      audienceMode: queryLogs.audienceMode,
      responseStyle: queryLogs.responseStyle,
      answer: queryLogs.answer,
      model: queryLogs.model,
      latencyMs: queryLogs.latencyMs,
      createdAt: queryLogs.createdAt,
    })
    .from(queryLogs)
    .leftJoin(users, eq(users.id, queryLogs.askedBy))
    .orderBy(desc(queryLogs.createdAt))
    .limit(limit);
}

/** Fetch a single query log along with the moments that grounded its answer. */
export async function getQueryLogWithMoments(id: string) {
  const [log] = await db.select().from(queryLogs).where(eq(queryLogs.id, id));
  if (!log) return null;

  // Left join so cited rows persist even after the underlying moment is deleted
  // (e.g. its transcript was removed). Prefer the query-time snapshot, falling
  // back to the live moment for older rows that predate snapshotting.
  const cited = await db
    .select({
      id: queryLogMoments.id,
      momentId: queryLogMoments.momentId,
      score: queryLogMoments.score,
      transcriptTitle: queryLogMoments.transcriptTitle,
      title: sql<string>`coalesce(${queryLogMoments.momentTitle}, ${moments.title}, '(deleted moment)')`,
      quote: sql<string>`coalesce(${queryLogMoments.momentQuote}, ${moments.quote}, '')`,
    })
    .from(queryLogMoments)
    .leftJoin(moments, eq(moments.id, queryLogMoments.momentId))
    .where(eq(queryLogMoments.queryLogId, id));

  // Whether generated TTS narration exists for this log (drives admin playback).
  const [audio] = await db
    .select({ id: queryLogAudio.id })
    .from(queryLogAudio)
    .where(eq(queryLogAudio.queryLogId, id));

  return { ...log, moments: cited, hasAudio: !!audio };
}
