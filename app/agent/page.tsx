"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { AUDIENCE_MODES, type AskResult, type AudienceMode } from "@/core/types";

export default function AgentPage() {
  const [question, setQuestion] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("general");
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.ask({ question, audienceMode }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Demo Agent
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Answers are grounded only in approved story moments, with citations.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the lived experiences..."
          required
          rows={3}
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Audience
          </label>
          <select
            value={audienceMode}
            onChange={(e) => setAudienceMode(e.target.value as AudienceMode)}
            className="rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm capitalize dark:border-zinc-700"
          >
            {AUDIENCE_MODES.map((m) => (
              <option key={m} value={m} className="capitalize">
                {m}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="ml-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Thinking..." : "Ask"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-8">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Answer
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
              {result.answer}
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              {result.model} - {result.latencyMs}ms -{" "}
              {result.supportingMoments.length} supporting moments
            </p>
          </div>

          {result.supportingMoments.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Supporting moments
              </h2>
              <ol className="mt-3 space-y-3">
                {result.supportingMoments.map((m, i) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                        [{i + 1}] {m.title}
                      </h3>
                      <span className="text-xs text-zinc-400">
                        {(m.score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {m.summary}
                    </p>
                    <blockquote className="mt-2 border-l-2 border-indigo-300 pl-3 text-sm italic text-zinc-700 dark:text-zinc-300">
                      &ldquo;{m.quote}&rdquo;
                    </blockquote>
                    {m.themes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.themes.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
