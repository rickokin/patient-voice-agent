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
 * that foregrounds human connection with the people behind the moments.
 */
export const RESPONSE_STYLES = ["baseline", "humanized"] as const;

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
