"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ARTIFACT_TYPES,
  type ArtifactType,
  type GeneratedArtifact,
} from "@/lib/artifact-types";
import type { AudienceMode } from "@/core/types";
import { GeneratedArtifactViewer } from "./generated-artifact-viewer";

export interface HelpfulArtifactsPanelProps {
  question: string;
  answer?: string;
  queryId?: string;
  mode?: AudienceMode;
  retrievedMomentIds: string[];
}

/**
 * Offers the 10 Helpful Artifact types as cards beneath an agent answer. Each
 * card can generate (or, if one already exists for this query, view) an
 * artifact built from the question, the answer, and the retrieved moments.
 */
export function HelpfulArtifactsPanel({
  question,
  answer,
  queryId,
  mode,
  retrievedMomentIds,
}: HelpfulArtifactsPanelProps) {
  const [generated, setGenerated] = useState<
    Partial<Record<ArtifactType, GeneratedArtifact>>
  >({});
  const [busyType, setBusyType] = useState<ArtifactType | null>(null);
  const [errorType, setErrorType] = useState<
    Partial<Record<ArtifactType, string>>
  >({});
  const [activeType, setActiveType] = useState<ArtifactType | null>(null);

  // Load any artifacts already generated for this query so cards can offer
  // "View" instead of "Generate".
  useEffect(() => {
    if (!queryId) return;
    let cancelled = false;
    void (async () => {
      try {
        const existing = await api.listArtifactsForQuery(queryId);
        if (cancelled) return;
        const map: Partial<Record<ArtifactType, GeneratedArtifact>> = {};
        // List is newest-first; keep the first (most recent) per type.
        for (const a of existing) map[a.artifactType] ??= a;
        setGenerated(map);
      } catch {
        // Non-fatal: the user can still generate fresh artifacts.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryId]);

  const generate = useCallback(
    async (artifactType: ArtifactType) => {
      setBusyType(artifactType);
      setErrorType((prev) => ({ ...prev, [artifactType]: undefined }));
      try {
        const artifact = await api.generateArtifact({
          artifactType,
          question,
          answer,
          mode,
          queryId,
          retrievedMomentIds,
        });
        setGenerated((prev) => ({ ...prev, [artifactType]: artifact }));
        setActiveType(artifactType);
      } catch (err) {
        setErrorType((prev) => ({
          ...prev,
          [artifactType]:
            err instanceof Error ? err.message : "Could not generate this.",
        }));
      } finally {
        setBusyType(null);
      }
    },
    [question, answer, mode, queryId, retrievedMomentIds],
  );

  const active = activeType ? generated[activeType] : undefined;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Helpful Artifacts
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Turn this answer into practical tools for preparing, reflecting, or
        discussing your health concern. These artifacts are based on the
        retrieved story moments and are not medical advice.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {ARTIFACT_TYPES.map((meta) => {
          const existing = generated[meta.id];
          const busy = busyType === meta.id;
          const error = errorType[meta.id];
          return (
            <div
              key={meta.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                {meta.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {meta.shortDescription}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                <span className="font-medium uppercase tracking-wide">
                  Best for
                </span>{" "}
                {meta.bestFor}
              </p>

              {error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                {existing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveType(meta.id)}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      View
                    </button>
                    <span className="text-emerald-500" aria-hidden>
                      ✓
                    </span>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void generate(meta.id)}
                    disabled={busy}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {busy ? "Generating…" : "Generate"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {active && activeType && (
        <GeneratedArtifactViewer
          artifact={active}
          onClose={() => setActiveType(null)}
          onRegenerate={() => void generate(activeType)}
          regenerating={busyType === activeType}
        />
      )}
    </section>
  );
}
