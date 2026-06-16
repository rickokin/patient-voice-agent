import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { moments, momentEmbeddings, transcripts } from "@/db/schema";
import type { Moment } from "@/db/schema";
import type {
  MomentStats,
  MomentStatus,
  MomentWithEmbedding,
} from "@/core/types";

export interface ListMomentsFilter {
  status?: MomentStatus;
  transcriptId?: string;
}

export async function listMoments(
  filter: ListMomentsFilter = {},
): Promise<MomentWithEmbedding[]> {
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(moments.status, filter.status));
  if (filter.transcriptId)
    conditions.push(eq(moments.transcriptId, filter.transcriptId));

  const rows = await db
    .select({
      moment: moments,
      embeddingId: momentEmbeddings.id,
      transcriptTitle: transcripts.title,
    })
    .from(moments)
    .leftJoin(momentEmbeddings, eq(momentEmbeddings.momentId, moments.id))
    .innerJoin(transcripts, eq(transcripts.id, moments.transcriptId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(moments.createdAt));

  return rows.map((r) => ({
    ...r.moment,
    embedded: r.embeddingId !== null,
    transcriptTitle: r.transcriptTitle,
  }));
}

/**
 * Roll up moment counts per transcript in a single query: total, per-status,
 * and how many have an embedding row. Returns a map keyed by transcript id;
 * transcripts with no moments are simply absent from the map.
 */
export async function momentStatsByTranscript(): Promise<
  Record<string, MomentStats>
> {
  const rows = await db
    .select({
      transcriptId: moments.transcriptId,
      status: moments.status,
      count: sql<number>`count(*)::int`,
      embedded: sql<number>`count(${momentEmbeddings.id})::int`,
    })
    .from(moments)
    .leftJoin(momentEmbeddings, eq(momentEmbeddings.momentId, moments.id))
    .groupBy(moments.transcriptId, moments.status);

  const result: Record<string, MomentStats> = {};
  for (const row of rows) {
    const stats = (result[row.transcriptId] ??= {
      total: 0,
      draft: 0,
      approved: 0,
      rejected: 0,
      embedded: 0,
    });
    stats.total += row.count;
    stats.embedded += row.embedded;
    if (row.status === "approved") stats.approved += row.count;
    else if (row.status === "rejected") stats.rejected += row.count;
    else if (row.status === "draft") stats.draft += row.count;
  }
  return result;
}

export async function getMoment(id: string): Promise<Moment | null> {
  const [row] = await db.select().from(moments).where(eq(moments.id, id));
  return row ?? null;
}

export interface UpdateMomentInput {
  title?: string;
  summary?: string;
  quote?: string;
  themes?: string[];
  audienceTags?: string[];
  consentConfirmed?: boolean;
  consentNotes?: string | null;
}

export async function updateMoment(id: string, patch: UpdateMomentInput) {
  const [row] = await db
    .update(moments)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(moments.id, id))
    .returning();
  if (!row) throw new Error("Moment not found.");
  return row;
}

export async function approveMoment(id: string, approvedBy?: string | null) {
  const [row] = await db
    .update(moments)
    .set({
      status: "approved",
      approvedBy: approvedBy ?? null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(moments.id, id))
    .returning();
  if (!row) throw new Error("Moment not found.");
  return row;
}

export async function rejectMoment(id: string) {
  const [row] = await db
    .update(moments)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(moments.id, id))
    .returning();
  if (!row) throw new Error("Moment not found.");
  return row;
}

/** Text used to embed a moment for retrieval. */
export function buildMomentEmbeddingText(moment: {
  title: string;
  summary: string;
  quote: string;
}): string {
  return `${moment.title}\n\n${moment.summary}\n\n${moment.quote}`;
}
