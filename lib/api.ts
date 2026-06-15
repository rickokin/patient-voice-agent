import type { Moment, QueryLog, Transcript } from "@/db/schema";
import type { AskResult, AudienceMode } from "@/core/types";

export interface QueryLogDetail extends QueryLog {
  moments: { momentId: string; score: number; title: string; quote: string }[];
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

  // Moments
  listMoments: (params?: { status?: string; transcriptId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.transcriptId) qs.set("transcriptId", params.transcriptId);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<Moment[]>(`/api/moments${suffix}`);
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
  ask: (input: { question: string; audienceMode: AudienceMode }) =>
    apiFetch<AskResult>("/api/agent/ask", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Query logs
  listQueryLogs: () => apiFetch<QueryLog[]>("/api/query-logs"),
  getQueryLog: (id: string) =>
    apiFetch<QueryLogDetail>(`/api/query-logs/${id}`),
};
