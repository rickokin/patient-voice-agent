"use client";

import {
  FOLLOWUP_LAYERS,
  FOLLOWUP_LAYER_LABELS,
  type FollowUpLayer,
  type FollowUpQuestion,
} from "@/core/types";

const LAYER_ACCENT: Record<FollowUpLayer, string> = {
  emotional: "border-rose-200 dark:border-rose-900/60",
  system: "border-sky-200 dark:border-sky-900/60",
  decision: "border-violet-200 dark:border-violet-900/60",
  audience: "border-emerald-200 dark:border-emerald-900/60",
  evidence: "border-amber-200 dark:border-amber-900/60",
};

const LAYER_DOT: Record<FollowUpLayer, string> = {
  emotional: "bg-rose-400",
  system: "bg-sky-400",
  decision: "bg-violet-400",
  audience: "bg-emerald-400",
  evidence: "bg-amber-400",
};

export function FollowUpQuestions({
  followUps,
  onPick,
  disabled,
}: {
  followUps: FollowUpQuestion[];
  onPick: (question: string) => void;
  disabled?: boolean;
}) {
  if (followUps.length === 0) return null;

  // Preserve the canonical layer ordering, dropping empty groups.
  const grouped = FOLLOWUP_LAYERS.map((layer) => ({
    layer,
    items: followUps.filter((f) => f.layer === layer),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Keep exploring
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Suggested follow-ups, grouped by the angle they open up.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {grouped.map(({ layer, items }) => (
          <div
            key={layer}
            className={`rounded-xl border bg-zinc-50/50 p-3 dark:bg-zinc-800/30 ${LAYER_ACCENT[layer]}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${LAYER_DOT[layer]}`}
                aria-hidden
              />
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {FOLLOWUP_LAYER_LABELS[layer]}
              </h3>
            </div>
            <ul className="mt-2 space-y-1.5">
              {items.map((f, i) => (
                <li key={`${layer}-${i}`}>
                  <button
                    type="button"
                    onClick={() => onPick(f.question)}
                    disabled={disabled}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm leading-5 text-zinc-700 transition-colors hover:bg-white hover:text-indigo-700 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-indigo-300"
                  >
                    {f.question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
