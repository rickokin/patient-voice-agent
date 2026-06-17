import { ask, type AskInput } from "@/core/answers/answer-service";
import { generateFollowUps } from "@/core/followups/followup-service";
import { buildStoryCards } from "@/core/moments/story-card-service";
import type { InsightResult } from "@/core/types";

export type AskInsightInput = AskInput;

/**
 * Insight Studio orchestration (the second agent). Reuses the original grounded
 * `ask()` flow verbatim — same retrieval, generation, and query logging — then
 * layers on the exploration aids that make this a workspace rather than a raw
 * chatbot: suggested follow-up questions and enriched Story Moment Cards.
 *
 * The two enrichment steps run in parallel after the answer is ready and depend
 * only on the already-retrieved moments, so no extra retrieval happens here.
 */
export async function askInsight(
  input: AskInsightInput,
): Promise<InsightResult> {
  const base = await ask(input);

  const [followUps, storyCards] = await Promise.all([
    generateFollowUps({
      question: input.question,
      answer: base.answer,
      audienceMode: base.audienceMode,
      moments: base.supportingMoments,
    }),
    buildStoryCards({
      question: input.question,
      audienceMode: base.audienceMode,
      moments: base.supportingMoments,
    }),
  ]);

  return {
    answer: base.answer,
    audienceMode: base.audienceMode,
    responseStyle: base.responseStyle,
    queryLogId: base.queryLogId,
    model: base.model,
    latencyMs: base.latencyMs,
    storyCards,
    followUps,
  };
}
