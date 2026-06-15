/** Shared domain types/DTOs used across services and API handlers. */

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
}

/** Result of a full agent ask (RAG) call. */
export interface AskResult {
  answer: string;
  audienceMode: AudienceMode;
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
