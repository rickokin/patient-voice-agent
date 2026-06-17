import type { Moment, QueryLog, Transcript } from "@/db/schema";
import type {
  AskResult,
  AudienceMode,
  InsightResult,
  MomentStats,
  MomentWithEmbedding,
  ResponseStyle,
  SupportingMoment,
  TranslationAudience,
  TranslationResult,
} from "@/core/types";
import type { ArtifactType, GeneratedArtifact } from "@/lib/artifact-types";

export interface QueryLogListItem extends QueryLog {
  askedByEmail: string | null;
}

export interface QueryLogDetail extends QueryLog {
  moments: {
    id: string;
    momentId: string | null;
    score: number;
    title: string;
    quote: string;
    transcriptTitle: string | null;
  }[];
  hasAudio: boolean;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // Transcripts
  listTranscripts: () => apiFetch<Transcript[]>("/api/transcripts"),
  getTranscript: (id: string) =>
    apiFetch<Transcript>(`/api/transcripts/${id}`),
  deleteTranscript: (id: string) =>
    apiFetch<{ id: string; deleted: boolean }>(`/api/transcripts/${id}`, {
      method: "DELETE",
    }),
  createTranscript: (input: {
    title: string;
    rawText: string;
    sourceType?: string;
  }) =>
    apiFetch<Transcript>("/api/transcripts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  parseTranscriptFile: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/transcripts/parse", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? `Upload failed (${res.status})`);
    }
    return (await res.json()) as {
      title: string;
      text: string;
      sourceType: "pdf" | "docx" | "text";
    };
  },
  normalizeTranscript: (id: string) =>
    apiFetch<Transcript>(`/api/transcripts/${id}/normalize`, {
      method: "POST",
    }),
  extractTranscript: (id: string) =>
    apiFetch<{ count: number; moments: Moment[] }>(
      `/api/transcripts/${id}/extract`,
      { method: "POST" },
    ),
  reprocessTranscript: (
    id: string,
    input?: { title?: string; rawText?: string },
  ) =>
    apiFetch<{ transcript: Transcript; count: number; moments: Moment[] }>(
      `/api/transcripts/${id}/reprocess`,
      { method: "POST", body: JSON.stringify(input ?? {}) },
    ),

  // Moments
  momentStats: () =>
    apiFetch<Record<string, MomentStats>>("/api/moments/stats"),
  listMoments: (params?: { status?: string; transcriptId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.transcriptId) qs.set("transcriptId", params.transcriptId);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<MomentWithEmbedding[]>(`/api/moments${suffix}`);
  },
  updateMoment: (id: string, patch: Partial<Moment>) =>
    apiFetch<Moment>(`/api/moments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  approveMoment: (id: string, embed = true) =>
    apiFetch<Moment & { embedded: boolean }>(`/api/moments/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ action: "approve", embed }),
    }),
  rejectMoment: (id: string) =>
    apiFetch<Moment>(`/api/moments/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ action: "reject" }),
    }),
  embedMoment: (id: string) =>
    apiFetch<{ momentId: string; dimension: number; model: string }>(
      `/api/moments/${id}/embed`,
      { method: "POST" },
    ),
  backfillEmbeddings: () =>
    apiFetch<{ embedded: number }>("/api/embeddings/backfill", {
      method: "POST",
    }),

  // Agent
  ask: (input: {
    question: string;
    audienceMode: AudienceMode;
    responseStyle: ResponseStyle;
  }) =>
    apiFetch<AskResult>("/api/agent/ask", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  generateAnswerAudio: (queryLogId: string) =>
    apiFetch<{ ready: boolean; mimeType: string; cached: boolean }>(
      "/api/agent/tts",
      { method: "POST", body: JSON.stringify({ queryLogId }) },
    ),
  answerAudioUrl: (queryLogId: string) =>
    `/api/query-logs/${queryLogId}/audio`,

  // Insight Studio (second agent)
  askInsight: (input: {
    question: string;
    audienceMode: AudienceMode;
    responseStyle: ResponseStyle;
  }) =>
    apiFetch<InsightResult>("/api/insight/ask", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  translateInsight: (input: {
    audience: TranslationAudience;
    question: string;
    answer: string;
    moments: SupportingMoment[];
  }) =>
    apiFetch<TranslationResult>("/api/insight/translate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  findSimilarMoments: (momentId: string, topK?: number) =>
    apiFetch<{ count: number; moments: SupportingMoment[] }>(
      `/api/insight/moments/${momentId}/similar`,
      { method: "POST", body: JSON.stringify(topK ? { topK } : {}) },
    ),

  // Helpful Artifacts
  generateArtifact: (input: {
    artifactType: ArtifactType;
    question: string;
    answer?: string;
    mode?: AudienceMode;
    queryId?: string;
    retrievedMomentIds?: string[];
  }) =>
    apiFetch<GeneratedArtifact>("/api/agent/artifacts/generate", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listArtifactsForQuery: (queryId: string) =>
    apiFetch<GeneratedArtifact[]>(
      `/api/agent/artifacts?queryId=${encodeURIComponent(queryId)}`,
    ),
  getArtifact: (id: string) =>
    apiFetch<GeneratedArtifact>(`/api/agent/artifacts/${id}`),
  listRecentArtifacts: (limit = 100) =>
    apiFetch<GeneratedArtifact[]>(`/api/admin/artifacts?limit=${limit}`),

  // Query logs
  listQueryLogs: () => apiFetch<QueryLogListItem[]>("/api/query-logs"),
  getQueryLog: (id: string) =>
    apiFetch<QueryLogDetail>(`/api/query-logs/${id}`),
};
