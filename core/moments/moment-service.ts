import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { moments } from "@/db/schema";
import type { Moment } from "@/db/schema";
import type { MomentStatus } from "@/core/types";

export interface ListMomentsFilter {
  status?: MomentStatus;
  transcriptId?: string;
}

export async function listMoments(filter: ListMomentsFilter = {}) {
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(moments.status, filter.status));
  if (filter.transcriptId)
    conditions.push(eq(moments.transcriptId, filter.transcriptId));

  return db
    .select()
    .from(moments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(moments.createdAt));
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
