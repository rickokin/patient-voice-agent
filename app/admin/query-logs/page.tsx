"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type QueryLogDetail } from "@/lib/api";
import type { QueryLog } from "@/db/schema";

export default function QueryLogsPage() {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueryLogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      <div className="mt-6 space-y-3">
        {logs.length === 0 && (
          <p className="text-sm text-zinc-500">No queries logged yet.</p>
        )}
        {logs.map((log) => (
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
                          key={m.momentId}
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
                          <p className="mt-1 italic text-zinc-600 dark:text-zinc-400">
                            &ldquo;{m.quote}&rdquo;
                          </p>
                        </li>
                      ))}
                    </ul>
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
