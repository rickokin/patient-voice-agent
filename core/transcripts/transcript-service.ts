import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { moments, transcripts } from "@/db/schema";
import { extractMoments } from "@/core/extraction/extraction-service";

export interface CreateTranscriptInput {
  title: string;
  rawText: string;
  uploadedBy?: string | null;
  sourceType?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
}

/**
 * Thrown when an upload matches the content of an existing transcript. Mapped to
 * HTTP 409 by the API layer.
 */
export class DuplicateTranscriptError extends Error {
  constructor(public readonly existingId: string) {
    super("A transcript with identical content already exists.");
    this.name = "DuplicateTranscriptError";
  }
}

export async function createTranscript(input: CreateTranscriptInput) {
  const duplicate = await findDuplicateTranscript(input.rawText);
  if (duplicate) throw new DuplicateTranscriptError(duplicate.id);

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

/**
 * Return an existing transcript whose raw content matches `rawText` (ignoring
 * leading/trailing whitespace), or null. Used to block duplicate uploads.
 */
export async function findDuplicateTranscript(rawText: string) {
  const [row] = await db
    .select({ id: transcripts.id })
    .from(transcripts)
    .where(sql`btrim(${transcripts.rawText}) = btrim(${rawText})`)
    .limit(1);
  return row ?? null;
}

/**
 * Delete a transcript and every record derived from it: its moments and their
 * embeddings (via cascade). Query-log audit rows are intentionally preserved —
 * their `moment_id` is set to null and the captured snapshots remain intact.
 */
export async function deleteTranscript(id: string) {
  const existing = await getTranscript(id);
  if (!existing) throw new Error("Transcript not found.");
  // Cascades to moments -> moment_embeddings; query_log_moments.moment_id is
  // set null so query-log history is retained.
  await db.delete(transcripts).where(eq(transcripts.id, id));
  return existing;
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

export interface ReprocessTranscriptInput {
  /** Optional revised raw transcript text. Falls back to the stored text. */
  rawText?: string;
  /** Optional revised title. Falls back to the stored title. */
  title?: string;
}

/**
 * Re-run the full ingestion pipeline (normalize -> extract) for an existing
 * transcript, treating the result as an update to the existing record rather
 * than a new transcript. The transcript keeps its id/created_at; any optional
 * revised raw text/title is saved first.
 *
 * Re-extraction is authoritative: all previously derived moments for this
 * transcript (and their embeddings, via cascade) are removed and replaced with
 * the freshly extracted ones. This includes approved/embedded moments, so the
 * caller should confirm intent before invoking.
 */
export async function reprocessTranscript(
  id: string,
  input: ReprocessTranscriptInput = {},
) {
  const existing = await getTranscript(id);
  if (!existing) throw new Error("Transcript not found.");

  const rawText =
    input.rawText && input.rawText.trim() ? input.rawText : existing.rawText;
  const title =
    input.title && input.title.trim() ? input.title : existing.title;
  const normalizedText = normalizeText(rawText);

  // Update the existing transcript in place (same id) and reset to normalized.
  await db
    .update(transcripts)
    .set({ title, rawText, normalizedText, status: "normalized" })
    .where(eq(transcripts.id, id));

  // Clear previously derived moments; embeddings cascade-delete with them.
  await db.delete(moments).where(eq(moments.transcriptId, id));

  // Re-run extraction, which also advances status to "extracted".
  const extracted = await extractMoments(id);

  const transcript = await getTranscript(id);
  return { transcript, moments: extracted };
}
