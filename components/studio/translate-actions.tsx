"use client";

import {
  TRANSLATION_AUDIENCES,
  TRANSLATION_AUDIENCE_META,
  type TranslationAudience,
} from "@/core/types";

export interface TranslationState {
  text?: string;
  busy?: boolean;
  error?: string;
}

export function TranslateActions({
  states,
  active,
  onTranslate,
  onSelect,
}: {
  /** Per-audience translation state (text/busy/error), keyed by audience. */
  states: Partial<Record<TranslationAudience, TranslationState>>;
  active: TranslationAudience | null;
  onTranslate: (audience: TranslationAudience) => void;
  onSelect: (audience: TranslationAudience) => void;
}) {
  const activeState = active ? states[active] : undefined;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Translate this insight
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Reframe the same evidence for a different reader. No new moments are
        retrieved.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TRANSLATION_AUDIENCES.map((audience) => {
          const state = states[audience];
          const isActive = active === audience;
          const hasResult = !!state?.text;
          return (
            <button
              key={audience}
              type="button"
              title={TRANSLATION_AUDIENCE_META[audience].blurb}
              onClick={() =>
                hasResult ? onSelect(audience) : onTranslate(audience)
              }
              disabled={state?.busy}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {TRANSLATION_AUDIENCE_META[audience].label}
              {state?.busy && <span className="text-zinc-400">…</span>}
              {hasResult && !state?.busy && (
                <span className="text-emerald-500" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {TRANSLATION_AUDIENCE_META[active].label}
          </p>
          {activeState?.busy && (
            <p className="mt-2 text-sm text-zinc-500">Translating…</p>
          )}
          {activeState?.error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {activeState.error}
            </p>
          )}
          {activeState?.text && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
              {activeState.text}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
