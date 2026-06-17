/**
 * "Helpful Artifacts" feature: consumer-facing health support artifacts that
 * turn an agent answer + retrieved story moments into practical, editable tools
 * for preparing, reflecting, and organizing one's thoughts.
 *
 * These artifacts are NOT medical advice. They never diagnose, recommend
 * treatment, or make clinical claims — they help a person prepare to ask better
 * questions and feel less alone, grounded in lived-experience patterns from the
 * archive.
 *
 * This module is intentionally dependency-free (no server/DB/LLM imports) so it
 * can be reused verbatim by a separate consumer-facing agent app.
 */

/** The standard disclaimer shown at the bottom of every generated artifact. */
export const ARTIFACT_DISCLAIMER =
  "This is not medical advice. It is a preparation and reflection tool based on " +
  "lived-experience patterns from the archive.";

/** How sensitive an artifact's content is, used for UI emphasis/safety review. */
export type ArtifactSafetyLevel = "low" | "medium";

/** Stable identifiers for each supported artifact type. */
export const ARTIFACT_TYPE_IDS = [
  "visit_preparation_brief",
  "appointment_question_card",
  "what_im_trying_to_say",
  "doctor_message_draft",
  "after_visit_reflection",
  "health_story_timeline",
  "what_others_wish_they_asked",
  "you_are_not_the_only_one",
  "care_partner_brief",
  "what_to_listen_for",
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPE_IDS)[number];

/** Display + behavior metadata for a single artifact type. */
export interface ArtifactTypeMeta {
  id: ArtifactType;
  title: string;
  shortDescription: string;
  bestFor: string;
  /** Placeholder icon name (mapped to an icon set by the consuming app). */
  iconName: string;
  safetyLevel: ArtifactSafetyLevel;
}

/**
 * The canonical registry of the 10 artifact types, in the order they should be
 * offered to the user.
 */
export const ARTIFACT_TYPES: readonly ArtifactTypeMeta[] = [
  {
    id: "visit_preparation_brief",
    title: "Visit Preparation Brief",
    shortDescription:
      "Organize what you want to explain and ask before a healthcare visit.",
    bestFor: "Getting ready for an upcoming appointment.",
    iconName: "clipboard-list",
    safetyLevel: "low",
  },
  {
    id: "appointment_question_card",
    title: "Appointment Question Card",
    shortDescription:
      "A short, printable list of questions to bring with you.",
    bestFor: "Having questions ready in the room.",
    iconName: "list-checks",
    safetyLevel: "low",
  },
  {
    id: "what_im_trying_to_say",
    title: "What I'm Trying to Say",
    shortDescription:
      "Turn a vague worry into clear language you can use out loud.",
    bestFor: "Finding the words for a concern that's hard to express.",
    iconName: "message-circle",
    safetyLevel: "low",
  },
  {
    id: "doctor_message_draft",
    title: "Doctor Message Draft",
    shortDescription:
      "A respectful draft for a patient portal message or email.",
    bestFor: "Reaching out between visits.",
    iconName: "mail",
    safetyLevel: "medium",
  },
  {
    id: "after_visit_reflection",
    title: "After-Visit Reflection",
    shortDescription:
      "Process what you heard and notice what still feels unclear.",
    bestFor: "Making sense of a visit afterward.",
    iconName: "notebook-pen",
    safetyLevel: "low",
  },
  {
    id: "health_story_timeline",
    title: "My Health Story Timeline",
    shortDescription:
      "Lay out your health narrative from first signs to now.",
    bestFor: "Organizing a story that spans months or years.",
    iconName: "calendar-clock",
    safetyLevel: "low",
  },
  {
    id: "what_others_wish_they_asked",
    title: "What Others Wish They Had Asked",
    shortDescription:
      "Questions people in the archive often wished they'd asked earlier.",
    bestFor: "Spotting questions you might not have thought of.",
    iconName: "lightbulb",
    safetyLevel: "medium",
  },
  {
    id: "you_are_not_the_only_one",
    title: "You Are Not the Only One",
    shortDescription:
      "Gentle validation drawn from similar moments in the archive.",
    bestFor: "Feeling less alone with a concern.",
    iconName: "heart-handshake",
    safetyLevel: "medium",
  },
  {
    id: "care_partner_brief",
    title: "Care Partner Brief",
    shortDescription:
      "Help a partner, friend, or family member support you.",
    bestFor: "Bringing someone with you or keeping them in the loop.",
    iconName: "users",
    safetyLevel: "low",
  },
  {
    id: "what_to_listen_for",
    title: "What to Listen For in the Answer",
    shortDescription:
      "Know what clarity sounds like so you can tell if you got it.",
    bestFor: "Evaluating whether a visit actually answered your question.",
    iconName: "ear",
    safetyLevel: "low",
  },
];

/** Quick lookup of artifact metadata by id. */
const ARTIFACT_TYPE_MAP: Record<ArtifactType, ArtifactTypeMeta> =
  ARTIFACT_TYPES.reduce(
    (acc, meta) => {
      acc[meta.id] = meta;
      return acc;
    },
    {} as Record<ArtifactType, ArtifactTypeMeta>,
  );

/** Type guard: is the value one of the known artifact type ids? */
export function isArtifactType(value: unknown): value is ArtifactType {
  return (
    typeof value === "string" &&
    (ARTIFACT_TYPE_IDS as readonly string[]).includes(value)
  );
}

/**
 * Look up metadata for an artifact type. Returns `undefined` for unknown ids so
 * callers can decide how to handle invalid input (e.g. throw a 400).
 */
export function getArtifactMeta(
  type: string,
): ArtifactTypeMeta | undefined {
  return isArtifactType(type) ? ARTIFACT_TYPE_MAP[type] : undefined;
}

/* -------------------------------------------------------------------------- */
/* Generated artifact content shapes                                          */
/* -------------------------------------------------------------------------- */

/** One titled section of a generated artifact (a heading plus bullet items). */
export interface ArtifactSection {
  heading: string;
  items: string[];
}

/**
 * The structured content of a generated artifact. Mirrors the strict JSON the
 * model is asked to return.
 */
export interface GeneratedArtifactContent {
  artifactTitle: string;
  artifactType: ArtifactType;
  summary: string;
  sections: ArtifactSection[];
  markdown: string;
  disclaimer: string;
}

/**
 * A persisted, generated artifact as returned to clients. `content` is the
 * structured JSON; `markdown` is the ready-to-render/copy version.
 */
export interface GeneratedArtifact {
  id: string;
  userId: string | null;
  queryId: string | null;
  artifactType: ArtifactType;
  artifactTitle: string;
  sourceQuestion: string;
  sourceAnswer: string | null;
  retrievedMomentIds: string[];
  content: GeneratedArtifactContent;
  markdown: string;
  createdAt: string;
}
