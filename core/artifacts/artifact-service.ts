import { getGenerationLLM } from "@/core/llm";
import {
  ARTIFACT_SCHEMA,
  ARTIFACT_SYSTEM,
  buildHelpfulArtifactPrompt,
} from "@/core/prompts/artifacts";
import { getSupportingMomentsByIds } from "@/core/retrieval/retrieval-service";
import {
  getArtifactMeta,
  isArtifactType,
  type ArtifactType,
  type GeneratedArtifact,
} from "@/lib/artifact-types";
import type { AudienceMode, SupportingMoment } from "@/core/types";
import {
  normalizeArtifactContent,
  type RawArtifactModelOutput,
} from "./artifact-content";
import { createGeneratedArtifact } from "./generated-artifacts-repository";

export interface GenerateHelpfulArtifactInput {
  artifactType: string;
  question: string;
  answer?: string | null;
  mode?: AudienceMode | null;
  queryId?: string | null;
  /** Pre-loaded grounding moments. If omitted, `retrievedMomentIds` is used. */
  retrievedMoments?: SupportingMoment[];
  /** Moment ids to re-hydrate as grounding when `retrievedMoments` is absent. */
  retrievedMomentIds?: string[];
  userId?: string | null;
}

/** Thrown when an unknown artifact type is requested (maps to a 400). */
export class UnknownArtifactTypeError extends Error {
  constructor(type: string) {
    super(`Unknown artifact type: ${type}`);
    this.name = "UnknownArtifactTypeError";
  }
}

/**
 * Generate one Helpful Artifact from the user's question, the prior agent
 * answer, and the retrieved story moments, then persist and return it.
 *
 * The LLM output is normalized defensively (disclaimer + markdown enforced) so a
 * malformed response never produces an unsafe or unrenderable artifact.
 */
export async function generateHelpfulArtifact(
  input: GenerateHelpfulArtifactInput,
): Promise<GeneratedArtifact> {
  if (!isArtifactType(input.artifactType)) {
    throw new UnknownArtifactTypeError(input.artifactType);
  }
  const artifactType: ArtifactType = input.artifactType;
  const meta = getArtifactMeta(artifactType)!;

  const moments =
    input.retrievedMoments ??
    (await getSupportingMomentsByIds(input.retrievedMomentIds ?? []));

  const llm = getGenerationLLM();
  const raw = await llm.generateStructured<RawArtifactModelOutput>({
    system: ARTIFACT_SYSTEM,
    prompt: buildHelpfulArtifactPrompt({
      artifactType,
      question: input.question,
      answer: input.answer,
      audienceMode: input.mode,
      moments,
    }),
    schema: ARTIFACT_SCHEMA,
    temperature: 0.6,
  });

  const content = normalizeArtifactContent(raw, {
    artifactType,
    fallbackTitle: meta.title,
  });

  return createGeneratedArtifact({
    userId: input.userId ?? null,
    queryId: input.queryId ?? null,
    artifactType,
    artifactTitle: content.artifactTitle,
    sourceQuestion: input.question,
    sourceAnswer: input.answer ?? null,
    retrievedMomentIds: moments.map((m) => m.id),
    content,
    markdown: content.markdown,
  });
}
