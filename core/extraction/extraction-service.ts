import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { moments, transcripts } from "@/db/schema";
import { getExtractionLLM } from "@/core/llm";
import {
  buildExtractionPrompt,
  EXTRACTION_SCHEMA,
  EXTRACTION_SYSTEM,
} from "@/core/prompts/extraction";
import type { ExtractedMoment } from "@/core/types";

interface ExtractionResult {
  moments: ExtractedMoment[];
}

/**
 * Thrown when extraction is attempted on a transcript that has not yet been
 * normalized. Mapped to HTTP 400 by the API layer.
 */
export class TranscriptNotNormalizedError extends Error {
  constructor() {
    super("Transcript must be normalized before moments can be extracted.");
    this.name = "TranscriptNotNormalizedError";
  }
}

/**
 * Extract draft story moments from a transcript's normalized text using the
 * configured extraction LLM, then persist them as `draft` moments.
 */
export async function extractMoments(transcriptId: string) {
  const [transcript] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.id, transcriptId));
  if (!transcript) throw new Error("Transcript not found.");

  if (!transcript.normalizedText?.trim()) {
    throw new TranscriptNotNormalizedError();
  }

  const text = transcript.normalizedText;

  const llm = getExtractionLLM();
  const result = await llm.generateStructured<ExtractionResult>({
    system: EXTRACTION_SYSTEM,
    prompt: buildExtractionPrompt(text),
    schema: EXTRACTION_SCHEMA,
    temperature: 0.2,
  });

  const extracted = (result.moments ?? []).filter(
    (m) => m.title && m.summary && m.quote,
  );

  if (extracted.length === 0) {
    await db
      .update(transcripts)
      .set({ status: "extracted" })
      .where(eq(transcripts.id, transcriptId));
    return [];
  }

  const inserted = await db
    .insert(moments)
    .values(
      extracted.map((m) => ({
        transcriptId,
        title: m.title,
        summary: m.summary,
        quote: m.quote,
        themes: m.themes ?? [],
        audienceTags: m.audienceTags ?? [],
        status: "draft" as const,
      })),
    )
    .returning();

  await db
    .update(transcripts)
    .set({ status: "extracted" })
    .where(eq(transcripts.id, transcriptId));

  return inserted;
}
