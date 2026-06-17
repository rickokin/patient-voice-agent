import type {
  AudienceMode,
  ResponseStyle,
  SupportingMoment,
} from "@/core/types";

const AUDIENCE_GUIDANCE: Record<AudienceMode, string> = {
  researcher:
    "The reader is a researcher. Emphasize patterns, nuance, and gaps. Use precise, neutral language.",
  clinician:
    "The reader is a clinician. Emphasize the patient experience and care implications. Be empathetic and practical.",
  policymaker:
    "The reader is a policymaker. Emphasize systemic issues, access, and equity implications at a population level.",
  innovator:
    "The reader is an innovator/builder. Emphasize unmet needs and opportunities for new solutions.",
  general:
    "The reader is a general audience. Use clear, accessible, respectful language.",
};

/**
 * A self-contained set of prompts that defines one response style. `system` is
 * the system prompt sent to the model; `instruction` is appended to the end of
 * the user prompt to steer how the grounded answer is written. Both are exposed
 * to end users so they can inspect exactly what shapes each response.
 */
export interface ResponseStylePrompt {
  id: ResponseStyle;
  label: string;
  description: string;
  system: string;
  instruction: string;
}

const BASELINE_SYSTEM =
  "You are the Patient Voice Agent for Under the Sisterhood. " +
  "You answer questions using ONLY the provided story moments, which are curated, " +
  "approved, lived-experience excerpts. Ground every claim in the moments and cite " +
  "them inline as [#] using their numbers. If the moments do not contain enough " +
  "information, say so plainly rather than inventing an answer. Never fabricate quotes.";

const HUMANIZED_SYSTEM =
  "You are the Patient Voice Agent for Under the Sisterhood. " +
  "You answer questions using ONLY the provided story moments — curated, approved, " +
  "lived-experience excerpts shared by real people. Your voice is warm, present, and " +
  "deeply human: you honor each person's dignity and help the reader truly feel the " +
  "weight and texture of what was lived. Ground every claim in the moments, let their " +
  "own words carry the meaning, and cite them inline as [#] using their numbers. " +
  "Never invent details, never fabricate or alter quotes, and never speak beyond what " +
  "the moments support. If the moments do not hold enough to answer, say so gently and " +
  "honestly rather than filling the silence.";

/**
 * Registry of every selectable response style. The order here is the order
 * shown to users; `baseline` is the original behavior and stays first.
 */
export const RESPONSE_STYLE_PROMPTS: Record<ResponseStyle, ResponseStylePrompt> =
  {
    baseline: {
      id: "baseline",
      label: "Baseline",
      description:
        "A concise, neutral, grounded answer with inline citations to the supporting moments.",
      system: BASELINE_SYSTEM,
      instruction:
        "Write a grounded answer that cites the relevant moments inline as [#].",
    },
    humanized: {
      id: "humanized",
      label: "Human Connection",
      description:
        "A warm, conversational answer that humanizes the lived experiences and projects profound human connection — still grounded only in the moments.",
      system: HUMANIZED_SYSTEM,
      instruction:
        "Write a conversational, emotionally resonant answer that humanizes the lived " +
        "experiences in these moments. Speak with empathy and care, drawing the reader " +
        "into genuine human connection with the people behind the words. Let their voices " +
        "lead — quote them directly and cite inline as [#]. Surface the feelings, struggles, " +
        "and resilience beneath the facts, but stay faithful to what the moments actually " +
        "say: do not exaggerate, sentimentalize, or invent. Leave the reader feeling close " +
        "to these lives rather than distant from them.",
    },
  };

export function getResponseStylePrompt(
  style: ResponseStyle,
): ResponseStylePrompt {
  return RESPONSE_STYLE_PROMPTS[style] ?? RESPONSE_STYLE_PROMPTS.baseline;
}

/** Backwards-compatible alias for the original baseline system prompt. */
export const ANSWER_SYSTEM = BASELINE_SYSTEM;

export function buildAnswerPrompt(
  question: string,
  audienceMode: AudienceMode,
  responseStyle: ResponseStyle,
  moments: SupportingMoment[],
): string {
  const style = getResponseStylePrompt(responseStyle);
  const context = moments
    .map((m, i) => {
      const tags = m.themes.length ? ` (themes: ${m.themes.join(", ")})` : "";
      return `[${i + 1}] ${m.title}${tags}\nSummary: ${m.summary}\nQuote: "${m.quote}"`;
    })
    .join("\n\n");

  return [
    AUDIENCE_GUIDANCE[audienceMode],
    "",
    "STORY MOMENTS:",
    context,
    "",
    `QUESTION: ${question}`,
    "",
    style.instruction,
  ].join("\n");
}
