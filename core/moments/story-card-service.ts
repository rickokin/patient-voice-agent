import { getGenerationLLM } from "@/core/llm";
import {
  buildStoryCardPrompt,
  STORY_CARD_SCHEMA,
  STORY_CARD_SYSTEM,
} from "@/core/prompts/insight";
import type {
  AudienceMode,
  StoryMomentCard,
  SupportingMoment,
} from "@/core/types";

export interface BuildStoryCardsInput {
  question: string;
  audienceMode: AudienceMode;
  moments: SupportingMoment[];
}

interface StoryCardModelResult {
  cards: {
    index: number;
    narrativeLabel: string;
    emotionalTags: string[];
    barrierTags: string[];
    journeyStage: string;
    whyItMatters: string;
  }[];
}

function fallbackCard(moment: SupportingMoment): StoryMomentCard {
  return {
    ...moment,
    narrativeLabel: moment.title,
    emotionalTags: [],
    barrierTags: [],
    journeyStage: "",
    whyItMatters: "",
  };
}

/**
 * Enrich retrieved supporting moments into Story Moment Cards: a narrative
 * label, emotional/barrier tags, journey stage, and a "why it matters" framing.
 *
 * These fields are not stored on the moment, so they are generated at answer
 * time in a single batched LLM call. If enrichment fails or a moment is not
 * covered by the model output, that moment degrades gracefully to a card built
 * from its stored fields rather than failing the whole request.
 */
export async function buildStoryCards(
  input: BuildStoryCardsInput,
): Promise<StoryMomentCard[]> {
  const { moments } = input;
  if (moments.length === 0) return [];

  let byIndex = new Map<number, StoryCardModelResult["cards"][number]>();
  try {
    const llm = getGenerationLLM();
    const result = await llm.generateStructured<StoryCardModelResult>({
      system: STORY_CARD_SYSTEM,
      prompt: buildStoryCardPrompt(
        input.question,
        input.audienceMode,
        moments,
      ),
      schema: STORY_CARD_SCHEMA,
      temperature: 0.4,
    });
    byIndex = new Map((result.cards ?? []).map((c) => [c.index, c]));
  } catch (error) {
    // Enrichment is additive; never let it break answering. Fall back to plain
    // cards built from the stored moment fields.
    console.error("Story card enrichment failed:", error);
    return moments.map(fallbackCard);
  }

  return moments.map((moment, i) => {
    const enriched = byIndex.get(i + 1);
    if (!enriched) return fallbackCard(moment);
    return {
      ...moment,
      narrativeLabel: enriched.narrativeLabel?.trim() || moment.title,
      emotionalTags: (enriched.emotionalTags ?? []).filter(Boolean),
      barrierTags: (enriched.barrierTags ?? []).filter(Boolean),
      journeyStage: enriched.journeyStage?.trim() ?? "",
      whyItMatters: enriched.whyItMatters?.trim() ?? "",
    };
  });
}
