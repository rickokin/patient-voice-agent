"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { MomentWithEmbedding } from "@/core/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function MomentCard({
  moment,
  onChanged,
}: {
  moment: MomentWithEmbedding;
  onChanged: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(moment.title);
  const [summary, setSummary] = useState(moment.summary);
  const [quote, setQuote] = useState(moment.quote);
  const [themes, setThemes] = useState(moment.themes.join(", "));
  const [audienceTags, setAudienceTags] = useState(
    moment.audienceTags.join(", "),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toList = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
        <span className="font-medium uppercase tracking-wide">Transcript</span>
        <span className="truncate text-zinc-700 dark:text-zinc-300">
          {moment.transcriptTitle}
        </span>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              STATUS_STYLES[moment.status] ?? STATUS_STYLES.draft
            }`}
          >
            {moment.status}
          </span>
          {moment.embedded ? (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              embedded
            </span>
          ) : (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                moment.status === "approved"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "border border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              not embedded
            </span>
          )}
        </div>
      </div>

      <label className="block text-xs font-medium text-zinc-500">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
      />

      <label className="mt-3 block text-xs font-medium text-zinc-500">
        Summary
      </label>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
      />

      <label className="mt-3 block text-xs font-medium text-zinc-500">
        Quote
      </label>
      <textarea
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 font-mono text-sm dark:border-zinc-700"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Themes (comma-separated)
          </label>
          <input
            value={themes}
            onChange={(e) => setThemes(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500">
            Audience tags (comma-separated)
          </label>
          <input
            value={audienceTags}
            onChange={(e) => setAudienceTags(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() =>
            void run("save", () =>
              api
                .updateMoment(moment.id, {
                  title,
                  summary,
                  quote,
                  themes: toList(themes),
                  audienceTags: toList(audienceTags),
                })
                .then(() => undefined),
            )
          }
          disabled={busy !== null}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {busy === "save" ? "Saving..." : "Save edits"}
        </button>
        <button
          onClick={() =>
            void run("approve", () =>
              api.approveMoment(moment.id, true).then(() => undefined),
            )
          }
          disabled={busy !== null || moment.status === "approved"}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {busy === "approve" ? "Approving..." : "Approve + embed"}
        </button>
        <button
          onClick={() =>
            void run("reject", () =>
              api.rejectMoment(moment.id).then(() => undefined),
            )
          }
          disabled={busy !== null || moment.status === "rejected"}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
        >
          {busy === "reject" ? "..." : "Reject"}
        </button>
        <button
          onClick={() =>
            void run("embed", () =>
              api.embedMoment(moment.id).then(() => undefined),
            )
          }
          disabled={busy !== null}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {busy === "embed"
            ? "Embedding..."
            : moment.embedded
              ? "Re-embed"
              : "Embed"}
        </button>
      </div>
    </div>
  );
}
