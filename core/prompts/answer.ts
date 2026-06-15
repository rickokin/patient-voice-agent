import type { AudienceMode, SupportingMoment } from "@/core/types";

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

export const ANSWER_SYSTEM =
  "You are the Patient Voice Agent for Under the Sisterhood. " +
  "You answer questions using ONLY the provided story moments, which are curated, " +
  "approved, lived-experience excerpts. Ground every claim in the moments and cite " +
  "them inline as [#] using their numbers. If the moments do not contain enough " +
  "information, say so plainly rather than inventing an answer. Never fabricate quotes.";

export function buildAnswerPrompt(
  question: string,
  audienceMode: AudienceMode,
  moments: SupportingMoment[],
): string {
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
    "Write a grounded answer that cites the relevant moments inline as [#].",
  ].join("\n");
}
