"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type QueryLogDetail, type QueryLogListItem } from "@/lib/api";

export default function QueryLogsPage() {
  const [logs, setLogs] = useState<QueryLogListItem[]>([]);
  const [emailFilter, setEmailFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueryLogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    const q = emailFilter.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) =>
      (log.askedByEmail ?? "").toLowerCase().includes(q),
    );
  }, [logs, emailFilter]);

  const load = useCallback(async () => {
    try {
      setLogs(await api.listQueryLogs());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: string) {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    setDetail(null);
    try {
      setDetail(await api.getQueryLog(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load detail");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Query Logs
        </h1>
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Back to dashboard
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6">
        <label
          htmlFor="email-filter"
          className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Filter by email
        </label>
        <input
          id="email-filter"
          type="search"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          placeholder="e.g. user@example.com"
          className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="mt-6 space-y-3">
        {logs.length === 0 && (
          <p className="text-sm text-zinc-500">No queries logged yet.</p>
        )}
        {logs.length > 0 && filteredLogs.length === 0 && (
          <p className="text-sm text-zinc-500">
            No queries match &ldquo;{emailFilter}&rdquo;.
          </p>
        )}
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              onClick={() => void toggle(log.id)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {log.question}
                </p>
                <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {log.askedByEmail ?? "Unknown user"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  <span className="capitalize">{log.audienceMode}</span> -{" "}
                  {log.model} - {log.latencyMs ?? "?"}ms -{" "}
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="text-xs text-zinc-400">
                {expanded === log.id ? "Hide" : "View"}
              </span>
            </button>

            {expanded === log.id && (
              <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                {!detail && (
                  <p className="text-sm text-zinc-500">Loading...</p>
                )}
                {detail && detail.id === log.id && (
                  <>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Answer
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                      {detail.answer}
                    </p>
                    <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Cited moments ({detail.moments.length})
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {detail.moments.map((m, i) => (
                        <li
                          key={m.id}
                          className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">
                              [{i + 1}] {m.title}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {(m.score * 100).toFixed(0)}%
                            </span>
                          </div>
                          {m.transcriptTitle && (
                            <p className="mt-1 text-xs text-zinc-500">
                              <span className="font-medium uppercase tracking-wide">
                                Transcript
                              </span>{" "}
                              {m.transcriptTitle}
                            </p>
                          )}
                          <p className="mt-1 italic text-zinc-600 dark:text-zinc-400">
                            &ldquo;{m.quote}&rdquo;
                          </p>
                        </li>
                      ))}
                    </ul>
                    <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Audio narration
                    </h3>
                    {detail.hasAudio ? (
                      <div className="mt-2 space-y-2">
                        <audio
                          controls
                          src={api.answerAudioUrl(detail.id)}
                          className="w-full"
                        >
                          Your browser does not support the audio element.
                        </audio>
                        <a
                          href={api.answerAudioUrl(detail.id)}
                          download={`answer-${detail.id}.wav`}
                          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                          Download audio
                        </a>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">
                        No audio generated for this answer yet.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
