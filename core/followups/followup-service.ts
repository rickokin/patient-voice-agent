import { getGenerationLLM } from "@/core/llm";
import {
  buildFollowUpPrompt,
  FOLLOWUP_SCHEMA,
  FOLLOWUP_SYSTEM,
} from "@/core/prompts/insight";
import {
  isFollowUpLayer,
  type AudienceMode,
  type FollowUpQuestion,
  type SupportingMoment,
} from "@/core/types";

export interface GenerateFollowUpsInput {
  question: string;
  answer: string;
  audienceMode: AudienceMode;
  moments: SupportingMoment[];
}

interface FollowUpModelResult {
  followUps: { layer: string; question: string }[];
}

/**
 * Generate 3-5 suggested follow-up questions for an answered insight, grouped
 * across exploration layers. Returns an empty list when there is no grounding
 * evidence (nothing meaningful to follow up on).
 */
export async function generateFollowUps(
  input: GenerateFollowUpsInput,
): Promise<FollowUpQuestion[]> {
  if (input.moments.length === 0) return [];

  const llm = getGenerationLLM();
  const result = await llm.generateStructured<FollowUpModelResult>({
    system: FOLLOWUP_SYSTEM,
    prompt: buildFollowUpPrompt(
      input.question,
      input.answer,
      input.audienceMode,
      input.moments,
    ),
    schema: FOLLOWUP_SCHEMA,
    temperature: 0.5,
  });

  return (result.followUps ?? [])
    .filter(
      (f): f is FollowUpQuestion =>
        isFollowUpLayer(f.layer) && !!f.question?.trim(),
    )
    .map((f) => ({ layer: f.layer, question: f.question.trim() }))
    .slice(0, 5);
}
