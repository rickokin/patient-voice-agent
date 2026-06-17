"use client";

import type { StoryMomentCard, SupportingMoment } from "@/core/types";

export interface SimilarMomentsState {
  seed: StoryMomentCard;
  busy: boolean;
  moments: SupportingMoment[];
  error?: string;
}

export function SimilarMomentsPanel({
  state,
  showTranscriptTitle,
  onClose,
}: {
  state: SimilarMomentsState | null;
  showTranscriptTitle: boolean;
  onClose: () => void;
}) {
  const open = state !== null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-label="Similar moments"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl transition-transform dark:border-zinc-800 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {state && (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Similar to
                </p>
                <h2 className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {state.seed.narrativeLabel}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {state.seed.title}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {state.busy && (
                <p className="text-sm text-zinc-500">
                  Searching for related moments…
                </p>
              )}
              {state.error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {state.error}
                </p>
              )}
              {!state.busy && !state.error && state.moments.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No other similar moments found.
                </p>
              )}
              <ul className="space-y-3">
                {state.moments.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {m.title}
                      </h3>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {(m.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    {showTranscriptTitle && m.transcriptTitle && (
                      <p className="mt-0.5 truncate text-xs text-zinc-400">
                        {m.transcriptTitle}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {m.summary}
                    </p>
                    {m.quote && (
                      <blockquote className="mt-2 border-l-2 border-indigo-300 pl-3 text-sm italic text-zinc-700 dark:border-indigo-700 dark:text-zinc-300">
                        &ldquo;{m.quote}&rdquo;
                      </blockquote>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
