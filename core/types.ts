/** Shared domain types/DTOs used across services and API handlers. */

import type { Moment } from "@/db/schema";

/** A moment plus whether it currently has an embedding row and its transcript title. */
export type MomentWithEmbedding = Moment & {
  embedded: boolean;
  transcriptTitle: string;
};

/** Per-transcript rollup of moment counts by status (plus embedded count). */
export interface MomentStats {
  total: number;
  draft: number;
  approved: number;
  rejected: number;
  embedded: number;
}

export const AUDIENCE_MODES = [
  "researcher",
  "clinician",
  "policymaker",
  "innovator",
  "general",
] as const;

export type AudienceMode = (typeof AUDIENCE_MODES)[number];

export function isAudienceMode(value: unknown): value is AudienceMode {
  return (
    typeof value === "string" &&
    (AUDIENCE_MODES as readonly string[]).includes(value)
  );
}

/**
 * The style/voice of the generated answer. `baseline` is the original concise,
 * neutral, grounded response; `humanized` is a warmer, conversational response
 * that foregrounds human connection with the people behind the moments; `human1`
 * is a warm, conversational response that interweaves quotes without any citation
 * symbols; `human-ee` is a conversational, empathetic response that lets
 * participants' voices lead with direct quotes and inline citations.
 */
export const RESPONSE_STYLES = [
  "baseline",
  "humanized",
  "human1",
  "human-ee",
] as const;

export type ResponseStyle = (typeof RESPONSE_STYLES)[number];

export const DEFAULT_RESPONSE_STYLE: ResponseStyle = "baseline";

export function isResponseStyle(value: unknown): value is ResponseStyle {
  return (
    typeof value === "string" &&
    (RESPONSE_STYLES as readonly string[]).includes(value)
  );
}

export const TRANSCRIPT_STATUSES = [
  "uploaded",
  "normalized",
  "extracted",
] as const;
export type TranscriptStatus = (typeof TRANSCRIPT_STATUSES)[number];

export const MOMENT_STATUSES = ["draft", "approved", "rejected"] as const;
export type MomentStatus = (typeof MOMENT_STATUSES)[number];

/** A story moment returned from retrieval, with its similarity score. */
export interface SupportingMoment {
  id: string;
  title: string;
  summary: string;
  quote: string;
  themes: string[];
  audienceTags: string[];
  score: number;
  transcriptTitle: string;
}

/** Result of a full agent ask (RAG) call. */
export interface AskResult {
  answer: string;
  audienceMode: AudienceMode;
  responseStyle: ResponseStyle;
  supportingMoments: SupportingMoment[];
  queryLogId: string;
  model: string;
  latencyMs: number;
}

/** A single moment as extracted by the LLM, before persistence. */
export interface ExtractedMoment {
  title: string;
  summary: string;
  quote: string;
  themes: string[];
  audienceTags: string[];
}

/* -------------------------------------------------------------------------- */
/* Insight Studio (second agent) types                                        */
/* -------------------------------------------------------------------------- */

/**
 * The layers a suggested follow-up question can belong to. The Insight Studio
 * groups generated follow-ups under these headings so the reader can explore an
 * insight from multiple angles rather than down a single thread.
 */
export const FOLLOWUP_LAYERS = [
  "emotional",
  "system",
  "decision",
  "audience",
  "evidence",
] as const;

export type FollowUpLayer = (typeof FOLLOWUP_LAYERS)[number];

/** Human-readable labels for each follow-up layer, shown as group headings. */
export const FOLLOWUP_LAYER_LABELS: Record<FollowUpLayer, string> = {
  emotional: "Emotional layer",
  system: "System layer",
  decision: "Decision layer",
  audience: "Audience-specific layer",
  evidence: "Evidence / gap layer",
};

export function isFollowUpLayer(value: unknown): value is FollowUpLayer {
  return (
    typeof value === "string" &&
    (FOLLOWUP_LAYERS as readonly string[]).includes(value)
  );
}

/** A single suggested follow-up question, tagged with the layer it explores. */
export interface FollowUpQuestion {
  layer: FollowUpLayer;
  question: string;
}

/**
 * A supporting moment enriched into a "story card" for the exploration
 * workspace. Extends the retrieved moment with narrative framing that is
 * generated at answer time when it is not stored on the moment itself.
 */
export interface StoryMomentCard extends SupportingMoment {
  /** A short narrative label, e.g. "The Self-Doubt Moment". */
  narrativeLabel: string;
  /** Emotional texture tags, e.g. "fear", "relief". */
  emotionalTags: string[];
  /** Barriers the person encountered, e.g. "cost", "dismissed by clinician". */
  barrierTags: string[];
  /** Where this sits in the patient journey, e.g. "diagnosis", "treatment". */
  journeyStage: string;
  /** Why this moment matters for the current question/audience. */
  whyItMatters: string;
}

/** Result of an Insight Studio ask: a grounded answer plus exploration aids. */
export interface InsightResult {
  answer: string;
  audienceMode: AudienceMode;
  responseStyle: ResponseStyle;
  queryLogId: string;
  model: string;
  latencyMs: number;
  storyCards: StoryMomentCard[];
  followUps: FollowUpQuestion[];
}

/**
 * The audiences an existing insight can be re-expressed for. These differ from
 * the retrieval `AudienceMode`s: translation reframes the SAME evidence into a
 * format tailored to a downstream reader without retrieving new moments.
 */
export const TRANSLATION_AUDIENCES = [
  "clinicians",
  "researchers",
  "product",
  "policymakers",
  "comms",
] as const;

export type TranslationAudience = (typeof TRANSLATION_AUDIENCES)[number];

export function isTranslationAudience(
  value: unknown,
): value is TranslationAudience {
  return (
    typeof value === "string" &&
    (TRANSLATION_AUDIENCES as readonly string[]).includes(value)
  );
}

/** Display metadata for each translation audience action. */
export const TRANSLATION_AUDIENCE_META: Record<
  TranslationAudience,
  { label: string; blurb: string }
> = {
  clinicians: {
    label: "For clinicians",
    blurb: "Care implications and what to do differently at the bedside.",
  },
  researchers: {
    label: "For researchers",
    blurb: "Patterns, hypotheses, and gaps worth studying further.",
  },
  product: {
    label: "For product teams",
    blurb: "Unmet needs and opportunities to build better solutions.",
  },
  policymakers: {
    label: "For policymakers",
    blurb: "Systemic, access, and equity implications at population scale.",
  },
  comms: {
    label: "For messaging / comms",
    blurb: "A faithful, human narrative for outreach and communications.",
  },
};

/** Result of translating an insight for a downstream audience. */
export interface TranslationResult {
  audience: TranslationAudience;
  translation: string;
  model: string;
}
