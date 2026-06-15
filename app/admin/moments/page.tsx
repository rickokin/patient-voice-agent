"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { MOMENT_STATUSES } from "@/core/types";
import { MomentCard } from "@/components/admin/moment-card";
import type { Moment } from "@/db/schema";

const FILTERS = ["all", ...MOMENT_STATUSES] as const;

function MomentsView() {
  const searchParams = useSearchParams();
  const transcriptId = searchParams.get("transcriptId") ?? undefined;

  const [moments, setMoments] = useState<Moment[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.listMoments({
        status: filter === "all" ? undefined : filter,
        transcriptId,
      });
      setMoments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load moments");
    }
  }, [filter, transcriptId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Story Moments
        </h1>
        <Link
          href="/admin/transcripts"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Transcripts
        </Link>
      </div>

      {transcriptId && (
        <p className="mt-2 text-sm text-zinc-500">
          Filtered to one transcript.{" "}
          <Link href="/admin/moments" className="underline">
            Show all
          </Link>
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            void (async () => {
              setBusy(true);
              setMessage(null);
              setError(null);
              try {
                const res = await api.backfillEmbeddings();
                setMessage(`Backfilled ${res.embedded} embeddings.`);
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Backfill failed");
              } finally {
                setBusy(false);
              }
            })()
          }
          disabled={busy}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {busy ? "Backfilling..." : "Backfill approved"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {moments.length === 0 && (
          <p className="text-sm text-zinc-500">No moments for this filter.</p>
        )}
        {moments.map((m) => (
          <MomentCard key={m.id} moment={m} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

export default function MomentsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-zinc-500">Loading...</div>}>
      <MomentsView />
    </Suspense>
  );
}
