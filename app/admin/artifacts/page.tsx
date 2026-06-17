"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { GeneratedArtifactViewer } from "@/components/agent/generated-artifact-viewer";
import { getArtifactMeta, type GeneratedArtifact } from "@/lib/artifact-types";

export default function AdminArtifactsPage() {
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [active, setActive] = useState<GeneratedArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const recent = await api.listRecentArtifacts();
        if (!cancelled) setArtifacts(recent);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load artifacts");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Generated Artifacts
        </h1>
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Back to dashboard
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Helpful Artifacts generated from agent answers. Preparation/reflection
        tools — never medical advice.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {artifacts.length === 0 && (
          <p className="text-sm text-zinc-500">No artifacts generated yet.</p>
        )}
        {artifacts.map((a) => {
          const meta = getArtifactMeta(a.artifactType);
          return (
            <div
              key={a.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {meta?.title ?? a.artifactType}
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {a.sourceQuestion}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(a.createdAt).toLocaleString()} -{" "}
                    <span className="font-mono">{a.artifactType}</span> - user:{" "}
                    {a.userId ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    query: {a.queryId ?? "—"} - {a.retrievedMomentIds.length}{" "}
                    moment(s)
                  </p>
                  {a.retrievedMomentIds.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                        Retrieved moment IDs
                      </summary>
                      <ul className="mt-1 space-y-0.5">
                        {a.retrievedMomentIds.map((id) => (
                          <li
                            key={id}
                            className="font-mono text-[11px] text-zinc-500"
                          >
                            {id}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActive(a)}
                  className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  View
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <GeneratedArtifactViewer
          artifact={active}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
