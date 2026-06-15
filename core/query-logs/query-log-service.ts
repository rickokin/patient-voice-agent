import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { moments, queryLogMoments, queryLogs } from "@/db/schema";

export interface RecordQueryInput {
  askedBy?: string | null;
  question: string;
  audienceMode: string;
  answer: string;
  model: string;
  latencyMs: number;
  moments: { momentId: string; score: number }[];
}

export async function recordQuery(input: RecordQueryInput): Promise<string> {
  const [log] = await db
    .insert(queryLogs)
    .values({
      askedBy: input.askedBy ?? null,
      question: input.question,
      audienceMode: input.audienceMode,
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
      })),
    );
  }

  return log.id;
}

export async function listQueryLogs(limit = 100) {
  return db
    .select()
    .from(queryLogs)
    .orderBy(desc(queryLogs.createdAt))
    .limit(limit);
}

/** Fetch a single query log along with the moments that grounded its answer. */
export async function getQueryLogWithMoments(id: string) {
  const [log] = await db.select().from(queryLogs).where(eq(queryLogs.id, id));
  if (!log) return null;

  const cited = await db
    .select({
      momentId: queryLogMoments.momentId,
      score: queryLogMoments.score,
      title: moments.title,
      quote: moments.quote,
    })
    .from(queryLogMoments)
    .innerJoin(moments, eq(moments.id, queryLogMoments.momentId))
    .where(eq(queryLogMoments.queryLogId, id));

  return { ...log, moments: cited };
}
