import type { JsonSchema } from "@/core/llm/types";
import type { AudienceMode, SupportingMoment } from "@/core/types";
import {
  ARTIFACT_DISCLAIMER,
  getArtifactMeta,
  type ArtifactType,
} from "@/lib/artifact-types";

/**
 * Prompt module for the "Helpful Artifacts" feature. Generates one of 10
 * consumer-facing preparation/reflection artifacts from the user's question,
 * the prior agent answer, and the retrieved story moments.
 *
 * SAFETY IS THE FIRST CONCERN. These artifacts must never give medical advice,
 * diagnose, recommend treatment, judge severity, or invent stories/quotes/stats.
 * The instructions below are enforced both in the system prompt (global rules)
 * and per artifact (allowed sections), and the service layer adds a hard-coded
 * disclaimer fallback.
 */

/* -------------------------------------------------------------------------- */
/* Per-artifact instructions                                                  */
/* -------------------------------------------------------------------------- */

interface ArtifactSpec {
  /** What this artifact is for (1 sentence). */
  purpose: string;
  /** The exact section headings the artifact must contain, in order. */
  requiredSections: string[];
  /** Optional extra, artifact-specific rules appended to the global rules. */
  extraRules?: string[];
}

const DISCLAIMER_SECTION = "Disclaimer";

export const ARTIFACT_SPECS: Record<ArtifactType, ArtifactSpec> = {
  visit_preparation_brief: {
    purpose: "Help the user prepare for a healthcare visit.",
    requiredSections: [
      "Main concern",
      "What to explain",
      "What has changed or persisted",
      "What I am worried about",
      "Questions to ask",
      "What I want to leave understanding",
      "Notes to bring",
      DISCLAIMER_SECTION,
    ],
  },
  appointment_question_card: {
    purpose: "A short, mobile-friendly or printable list of questions.",
    requiredSections: [
      "Questions I want to ask",
      "Follow-up questions if I feel unclear",
      "Questions about next steps",
      "Questions about what to watch for",
      DISCLAIMER_SECTION,
    ],
  },
  what_im_trying_to_say: {
    purpose: "Help the user turn a vague concern into clear language.",
    requiredSections: [
      "Plain-language version",
      "More specific version",
      "Concern statement",
      "If I feel dismissed, I can say",
      "What I need clarified",
      DISCLAIMER_SECTION,
    ],
  },
  doctor_message_draft: {
    purpose: "Draft a patient portal message or email.",
    requiredSections: [
      "Subject",
      "Message draft",
      "Optional shorter version",
      "Notes before sending",
      DISCLAIMER_SECTION,
    ],
    extraRules: [
      "Do not invent a doctor name.",
      "Use placeholders like [doctor name], [symptom/concern], [date], and [your name].",
      "Keep the tone respectful and clear.",
    ],
  },
  after_visit_reflection: {
    purpose: "Help the user process a healthcare visit.",
    requiredSections: [
      "What I heard",
      "What I still do not understand",
      "What I wish I had asked",
      "What I am worried was missed",
      "What I need next",
      "Possible follow-up message",
      DISCLAIMER_SECTION,
    ],
  },
  health_story_timeline: {
    purpose: "Help the user organize their health narrative.",
    requiredSections: [
      "When I first noticed something",
      "What changed over time",
      "What I tried",
      "What I was told",
      "What helped",
      "What did not help",
      "What I am worried about now",
      "What I want help deciding or understanding",
      DISCLAIMER_SECTION,
    ],
  },
  what_others_wish_they_asked: {
    purpose:
      "Use archive patterns to suggest questions people often wish they had asked earlier.",
    requiredSections: [
      "Questions others often wish they had asked",
      "Why these questions matter",
      "How to use these questions",
      DISCLAIMER_SECTION,
    ],
    extraRules: [
      "Ground every suggested question in the retrieved story moments.",
      "Do not imply everyone should ask all of these questions.",
    ],
  },
  you_are_not_the_only_one: {
    purpose:
      "Provide emotional validation based on similar patterns in the archive.",
    requiredSections: [
      "What similar moments in the archive suggest",
      "Common feelings that show up",
      "What this does not mean",
      "A gentle next step",
      DISCLAIMER_SECTION,
    ],
    extraRules: [
      'Never say "people like you" in a way that implies a diagnosis. Say "similar concerns" or "similar moments".',
      'In "What this does not mean", gently note that shared feelings do not tell the user what is happening in their own body.',
    ],
  },
  care_partner_brief: {
    purpose:
      "Help the user involve a spouse, friend, adult child, or caregiver.",
    requiredSections: [
      "How someone can help me",
      "What I want them to listen for",
      "Questions they can help me ask",
      "What I want them to understand",
      "After-visit debrief",
      DISCLAIMER_SECTION,
    ],
  },
  what_to_listen_for: {
    purpose:
      "Help the user evaluate whether they got clarity during a visit.",
    requiredSections: [
      "During the visit, listen for",
      "If the answer feels unclear, ask",
      "Before the visit ends, confirm",
      "After the visit, write down",
      DISCLAIMER_SECTION,
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Global rules + system prompt                                               */
/* -------------------------------------------------------------------------- */

const GLOBAL_RULES: string[] = [
  "Use ONLY the supplied story moments and the user's own stated concern as your source material.",
  "Do not invent medical facts, patient stories, quotes, numbers, or statistics.",
  "Do not diagnose, name a condition the user has, or imply what is wrong with them.",
  "Do not recommend or choose a specific treatment.",
  "Do not tell the user whether their symptoms are serious or not serious.",
  'Do not create urgency. Only say something like "you should seek care immediately" if the user\'s own question explicitly describes emergency symptoms, and even then use a generic redirect: "If you think this may be an emergency, contact emergency services or seek urgent care."',
  "Do not claim the archive is representative; it reflects lived experiences, not a statistical sample.",
  "Do not impersonate a patient or speak as if you are one.",
  'Attribute archive material softly, e.g. "People in the archive often describe…" or "Some story moments suggest…".',
  'Use warm, practical, supportive, empowering language. Keep it editable, e.g. "You might say…", "You may want to ask…", "You can edit this before using it.".',
  "Avoid clinical certainty. The goal is to help the user organize their story and prepare better questions.",
];

export const ARTIFACT_SYSTEM =
  "You generate warm, practical, NON-CLINICAL support artifacts that help a " +
  "person prepare for and reflect on their own healthcare. You are not a doctor " +
  "and you never give medical advice, diagnose, judge severity, or recommend " +
  "treatments. You help people organize their thoughts, ask better questions, " +
  "and feel less alone, grounded in lived-experience patterns from a curated " +
  "story archive. You never invent facts, quotes, numbers, or patient stories, " +
  "and you always include the standard disclaimer.";

/* -------------------------------------------------------------------------- */
/* Output schema                                                              */
/* -------------------------------------------------------------------------- */

export const ARTIFACT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    artifactTitle: { type: "string" },
    artifactType: { type: "string" },
    summary: {
      type: "string",
      description:
        "1-2 warm sentences describing what this artifact is and how to use it.",
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          items: {
            type: "array",
            items: { type: "string" },
            description:
              "Bullet items for this section. For prose sections (e.g. a message draft) use a single item containing the full text.",
          },
        },
        required: ["heading", "items"],
      },
    },
    markdown: {
      type: "string",
      description:
        "A clean, user-facing markdown rendering of the whole artifact, ending with the disclaimer.",
    },
    disclaimer: { type: "string" },
  },
  required: ["artifactTitle", "artifactType", "summary", "sections", "markdown", "disclaimer"],
};

/* -------------------------------------------------------------------------- */
/* Prompt builder                                                             */
/* -------------------------------------------------------------------------- */

function formatMoments(moments: SupportingMoment[]): string {
  if (moments.length === 0) {
    return "(No story moments were retrieved. Do not invent any. Lean on the user's own stated concern and keep suggestions general and clearly editable.)";
  }
  return moments
    .map((m, i) => {
      const themes = m.themes.length ? ` (themes: ${m.themes.join(", ")})` : "";
      return `[${i + 1}] ${m.title}${themes}\nSummary: ${m.summary}\nQuote: "${m.quote}"`;
    })
    .join("\n\n");
}

export interface BuildArtifactPromptInput {
  artifactType: ArtifactType;
  question: string;
  answer?: string | null;
  audienceMode?: AudienceMode | null;
  moments: SupportingMoment[];
}

/** Build the user prompt for generating a single helpful artifact. */
export function buildHelpfulArtifactPrompt(
  input: BuildArtifactPromptInput,
): string {
  const meta = getArtifactMeta(input.artifactType);
  const spec = ARTIFACT_SPECS[input.artifactType];
  if (!meta || !spec) {
    throw new Error(`Unknown artifact type: ${input.artifactType}`);
  }

  const sections = spec.requiredSections
    .map((s) => `- ${s}`)
    .join("\n");

  const rules = [...GLOBAL_RULES, ...(spec.extraRules ?? [])]
    .map((r) => `- ${r}`)
    .join("\n");

  return [
    `ARTIFACT TYPE: ${input.artifactType}`,
    `ARTIFACT TITLE: ${meta.title}`,
    `PURPOSE: ${spec.purpose}`,
    input.audienceMode ? `AUDIENCE MODE: ${input.audienceMode}` : null,
    "",
    "REQUIRED SECTIONS (use these exact headings, in this order):",
    sections,
    "",
    "RULES (follow ALL of these):",
    rules,
    `- The final "${DISCLAIMER_SECTION}" section and the "disclaimer" field must contain exactly: "${ARTIFACT_DISCLAIMER}"`,
    "",
    "USER'S QUESTION / CONCERN:",
    input.question,
    "",
    "PRIOR AGENT ANSWER (context only; do not contradict, and do not treat as medical advice):",
    input.answer?.trim() ? input.answer : "(none provided)",
    "",
    "RETRIEVED STORY MOMENTS (the only archive material you may draw on):",
    formatMoments(input.moments),
    "",
    "Return strict JSON matching the schema. The `markdown` field should be a " +
      "clean, user-facing rendering of the artifact (a title, a short intro, the " +
      "sections as headings with bullet points or paragraphs), ending with the " +
      "disclaimer. Set `artifactType` to the value above.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
