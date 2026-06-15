import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { transcripts } from "@/db/schema";

export interface CreateTranscriptInput {
  title: string;
  rawText: string;
  uploadedBy?: string | null;
  sourceType?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
}

export async function createTranscript(input: CreateTranscriptInput) {
  const [row] = await db
    .insert(transcripts)
    .values({
      title: input.title,
      rawText: input.rawText,
      uploadedBy: input.uploadedBy ?? null,
      sourceType: input.sourceType ?? null,
      sourceMetadata: input.sourceMetadata ?? null,
      status: "uploaded",
    })
    .returning();
  return row;
}

export async function listTranscripts() {
  return db.select().from(transcripts).orderBy(desc(transcripts.createdAt));
}

export async function getTranscript(id: string) {
  const [row] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.id, id));
  return row ?? null;
}

/**
 * Deterministic normalization: strip timestamps and speaker labels, normalize
 * whitespace. LLM-based cleanup can be layered in later behind the same call.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, "") // [00:01] / [00:01:23]
    .replace(/^\s*[A-Z][A-Za-z0-9 ._-]{0,40}:\s/gm, "") // "Speaker 1: "
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export async function normalizeTranscript(id: string) {
  const transcript = await getTranscript(id);
  if (!transcript) throw new Error("Transcript not found.");

  const normalizedText = normalizeText(transcript.rawText);
  const [row] = await db
    .update(transcripts)
    .set({ normalizedText, status: "normalized" })
    .where(eq(transcripts.id, id))
    .returning();
  return row;
}
