import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { generatedArtifacts } from "@/db/schema";
import type { GeneratedArtifactRow } from "@/db/schema";
import {
  type ArtifactType,
  type GeneratedArtifact,
  type GeneratedArtifactContent,
} from "@/lib/artifact-types";

export interface CreateGeneratedArtifactInput {
  userId?: string | null;
  queryId?: string | null;
  artifactType: ArtifactType;
  artifactTitle: string;
  sourceQuestion: string;
  sourceAnswer?: string | null;
  retrievedMomentIds?: string[];
  content: GeneratedArtifactContent;
  markdown: string;
}

/** Map a raw DB row to the client-facing `GeneratedArtifact` DTO. */
function toArtifact(row: GeneratedArtifactRow): GeneratedArtifact {
  return {
    id: row.id,
    userId: row.userId,
    queryId: row.queryId,
    artifactType: row.artifactType as ArtifactType,
    artifactTitle: row.artifactTitle,
    sourceQuestion: row.sourceQuestion,
    sourceAnswer: row.sourceAnswer,
    retrievedMomentIds: row.retrievedMomentIds ?? [],
    content: row.contentJson as GeneratedArtifactContent,
    markdown: row.contentMarkdown,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
  };
}

/** Persist a newly generated artifact and return the saved DTO. */
export async function createGeneratedArtifact(
  input: CreateGeneratedArtifactInput,
): Promise<GeneratedArtifact> {
  const [row] = await db
    .insert(generatedArtifacts)
    .values({
      userId: input.userId ?? null,
      queryId: input.queryId ?? null,
      artifactType: input.artifactType,
      artifactTitle: input.artifactTitle,
      sourceQuestion: input.sourceQuestion,
      sourceAnswer: input.sourceAnswer ?? null,
      retrievedMomentIds: input.retrievedMomentIds ?? [],
      contentJson: input.content,
      contentMarkdown: input.markdown,
    })
    .returning();
  return toArtifact(row);
}

/** Fetch a single generated artifact by id, or null if not found. */
export async function getGeneratedArtifactById(
  id: string,
): Promise<GeneratedArtifact | null> {
  const [row] = await db
    .select()
    .from(generatedArtifacts)
    .where(eq(generatedArtifacts.id, id));
  return row ? toArtifact(row) : null;
}

/** List all generated artifacts for a given originating query, newest first. */
export async function listGeneratedArtifactsForQuery(
  queryId: string,
): Promise<GeneratedArtifact[]> {
  const rows = await db
    .select()
    .from(generatedArtifacts)
    .where(eq(generatedArtifacts.queryId, queryId))
    .orderBy(desc(generatedArtifacts.createdAt));
  return rows.map(toArtifact);
}

/** List the most recently generated artifacts across all queries (admin view). */
export async function listRecentGeneratedArtifacts(
  limit = 100,
): Promise<GeneratedArtifact[]> {
  const rows = await db
    .select()
    .from(generatedArtifacts)
    .orderBy(desc(generatedArtifacts.createdAt))
    .limit(limit);
  return rows.map(toArtifact);
}
