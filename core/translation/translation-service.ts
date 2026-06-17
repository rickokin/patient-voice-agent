import { getGenerationLLM } from "@/core/llm";
import {
  buildTranslationPrompt,
  TRANSLATION_SYSTEM,
} from "@/core/prompts/insight";
import type {
  SupportingMoment,
  TranslationAudience,
  TranslationResult,
} from "@/core/types";

export interface TranslateInsightInput {
  audience: TranslationAudience;
  question: string;
  answer: string;
  /** The same evidence used for the original answer; NOT re-retrieved. */
  moments: SupportingMoment[];
}

/**
 * Re-express an already-generated insight for a downstream audience, working
 * only from the supplied answer and supporting moments. This intentionally does
 * not retrieve new moments: it reframes the existing evidence so the audience
 * comparison is apples-to-apples.
 */
export async function translateInsight(
  input: TranslateInsightInput,
): Promise<TranslationResult> {
  const llm = getGenerationLLM();
  const translation = await llm.generate({
    system: TRANSLATION_SYSTEM,
    prompt: buildTranslationPrompt(
      input.audience,
      input.question,
      input.answer,
      input.moments,
    ),
    temperature: 0.4,
  });

  return {
    audience: input.audience,
    translation: translation.trim(),
    model: llm.model,
  };
}
