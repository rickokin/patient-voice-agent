import type { JsonSchema } from "@/core/llm/types";
import {
  FOLLOWUP_LAYERS,
  TRANSLATION_AUDIENCE_META,
  type AudienceMode,
  type SupportingMoment,
  type TranslationAudience,
} from "@/core/types";

/**
 * Prompts for the Insight Studio (second agent). These are deliberately kept
 * separate from `answer.ts` so the original Demo Agent behavior is untouched:
 * the studio reuses the same grounded answer generation, then layers on
 * follow-up suggestions, story-card enrichment, and audience translation.
 */

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

function formatMoments(moments: SupportingMoment[]): string {
  return moments
    .map((m, i) => {
      const tags = m.themes.length ? ` (themes: ${m.themes.join(", ")})` : "";
      return `[${i + 1}] ${m.title}${tags}\nSummary: ${m.summary}\nQuote: "${m.quote}"`;
    })
    .join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* 1. Suggested follow-up questions                                           */
/* -------------------------------------------------------------------------- */

export const FOLLOWUP_SYSTEM =
  "You help a researcher explore curated lived-experience patient stories. " +
  "Given a question, the grounded answer, the audience, and the supporting " +
  "moments, you propose insightful follow-up questions that open new angles of " +
  "exploration. Questions must be answerable from this kind of qualitative " +
  "lived-experience evidence, be specific to the material at hand (not generic), " +
  "and never assume facts beyond what the moments support.";

export const FOLLOWUP_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    followUps: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          layer: {
            type: "string",
            enum: [...FOLLOWUP_LAYERS],
            description:
              "Which exploration layer this question opens: 'emotional' (feelings, " +
              "inner experience), 'system' (how care systems/processes shaped it), " +
              "'decision' (choices, trade-offs, turning points), 'audience' (tailored " +
              "to the current reader's perspective), or 'evidence' (gaps, what is " +
              "under-represented, what to corroborate).",
          },
          question: {
            type: "string",
            description: "A concise, specific follow-up question.",
          },
        },
        required: ["layer", "question"],
      },
    },
  },
  required: ["followUps"],
};

export function buildFollowUpPrompt(
  question: string,
  answer: string,
  audienceMode: AudienceMode,
  moments: SupportingMoment[],
): string {
  return [
    AUDIENCE_GUIDANCE[audienceMode],
    "",
    "Propose 3-5 follow-up questions that would deepen exploration of this insight.",
    "Cover a spread of layers (emotional, system, decision, audience-specific, " +
      "evidence/gap) rather than clustering on one. Each must be grounded in and " +
      "answerable from lived-experience story moments like the ones below.",
    "",
    "ORIGINAL QUESTION:",
    question,
    "",
    "ANSWER GIVEN:",
    answer,
    "",
    "SUPPORTING MOMENTS:",
    formatMoments(moments),
    "",
    "Return JSON only.",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* 2. Story Moment Cards                                                      */
/* -------------------------------------------------------------------------- */

export const STORY_CARD_SYSTEM =
  "You are a qualitative researcher framing curated lived-experience patient " +
  "moments as story cards for an exploration workspace. For each moment you craft " +
  "a short evocative narrative label, name the emotions and barriers present, place " +
  "it in the patient journey, and explain why it matters for the reader's question. " +
  "Stay strictly faithful to the moment: never invent facts, feelings, or quotes, " +
  "and never contradict the summary or quote provided.";

export const STORY_CARD_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: {
            type: "integer",
            description:
              "The 1-based number of the moment this card describes, matching the input list.",
          },
          narrativeLabel: {
            type: "string",
            description:
              'A short, evocative narrative label, e.g. "The Self-Doubt Moment". 2-5 words.',
          },
          emotionalTags: {
            type: "array",
            items: { type: "string" },
            description:
              "1-4 short emotion words present in the moment, e.g. 'fear', 'relief', 'isolation'.",
          },
          barrierTags: {
            type: "array",
            items: { type: "string" },
            description:
              "0-4 short barrier tags the person encountered, e.g. 'cost', 'dismissed by clinician', 'long wait'.",
          },
          journeyStage: {
            type: "string",
            description:
              "Where this sits in the patient journey, e.g. 'pre-diagnosis', 'diagnosis', 'treatment', 'recovery', 'living with'.",
          },
          whyItMatters: {
            type: "string",
            description:
              "1-2 sentences on why this moment matters for the reader's question, grounded only in the moment.",
          },
        },
        required: [
          "index",
          "narrativeLabel",
          "emotionalTags",
          "barrierTags",
          "journeyStage",
          "whyItMatters",
        ],
      },
    },
  },
  required: ["cards"],
};

export function buildStoryCardPrompt(
  question: string,
  audienceMode: AudienceMode,
  moments: SupportingMoment[],
): string {
  return [
    AUDIENCE_GUIDANCE[audienceMode],
    "",
    "Frame each of the following story moments as a card. Produce exactly one card " +
      "per moment, referencing it by its number. Keep everything faithful to the " +
      "moment's summary and quote.",
    "",
    `READER'S QUESTION: ${question}`,
    "",
    "STORY MOMENTS:",
    formatMoments(moments),
    "",
    "Return JSON only.",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* 4. Translate this insight                                                  */
/* -------------------------------------------------------------------------- */

const TRANSLATION_GUIDANCE: Record<TranslationAudience, string> = {
  clinicians:
    "Translate for practicing clinicians. Foreground care implications, what to " +
    "watch for, and concrete changes to bedside practice. Be empathetic and practical.",
  researchers:
    "Translate for researchers. Surface patterns, candidate hypotheses, and gaps or " +
    "open questions worth studying. Use precise, neutral language.",
  product:
    "Translate for product teams and builders. Highlight unmet needs, pain points, " +
    "and concrete opportunities for new or improved solutions.",
  policymakers:
    "Translate for policymakers. Emphasize systemic, access, and equity implications " +
    "at a population level, and where policy could change outcomes.",
  comms:
    "Translate for messaging and communications. Produce a faithful, human, " +
    "respectful narrative suitable for outreach — vivid but never sensational.",
};

export const TRANSLATION_SYSTEM =
  "You re-express an existing, evidence-grounded insight for a specific downstream " +
  "audience. You do NOT introduce new facts or claims: you work ONLY from the answer " +
  "and supporting moments already provided, reframing the same evidence for the new " +
  "reader. Never fabricate or alter quotes, and never go beyond what the evidence " +
  "supports. If the evidence does not support something the audience would want, say so.";

export function buildTranslationPrompt(
  audience: TranslationAudience,
  question: string,
  answer: string,
  moments: SupportingMoment[],
): string {
  return [
    TRANSLATION_GUIDANCE[audience],
    `Goal: ${TRANSLATION_AUDIENCE_META[audience].blurb}`,
    "",
    "Reframe the insight below for this audience using ONLY the evidence provided. " +
      "Do not retrieve or invent anything new. Keep it concise and well-structured " +
      "(short paragraphs or bullets as appropriate).",
    "",
    "ORIGINAL QUESTION:",
    question,
    "",
    "GROUNDED INSIGHT:",
    answer,
    "",
    "SUPPORTING MOMENTS:",
    formatMoments(moments),
  ].join("\n");
}
