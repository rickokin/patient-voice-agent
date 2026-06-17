"use client";

import type { StoryMomentCard as StoryMomentCardData } from "@/core/types";

function TagRow({
  label,
  tags,
  className,
}: {
  label: string;
  tags: string[];
  className: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {tags.map((t) => (
        <span
          key={t}
          className={`rounded-full px-2 py-0.5 text-xs ${className}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export function StoryMomentCard({
  card,
  index,
  showTranscriptTitle,
  onFindSimilar,
  finding,
}: {
  card: StoryMomentCardData;
  index: number;
  showTranscriptTitle: boolean;
  onFindSimilar: (card: StoryMomentCardData) => void;
  finding: boolean;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
            {card.narrativeLabel}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <span className="text-zinc-400">[{index}]</span> {card.title}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {(card.score * 100).toFixed(0)}%
        </span>
      </div>

      {card.journeyStage && (
        <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <span aria-hidden>•</span>
          {card.journeyStage}
        </p>
      )}

      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {card.summary}
      </p>

      {card.quote && (
        <blockquote className="mt-3 border-l-2 border-indigo-300 pl-3 text-sm italic leading-6 text-zinc-700 dark:border-indigo-700 dark:text-zinc-300">
          &ldquo;{card.quote}&rdquo;
        </blockquote>
      )}

      {card.whyItMatters && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Why it matters
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {card.whyItMatters}
          </p>
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        <TagRow
          label="Emotions"
          tags={card.emotionalTags}
          className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        />
        <TagRow
          label="Barriers"
          tags={card.barrierTags}
          className="bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
        />
        {card.themes.length > 0 && (
          <TagRow
            label="Themes"
            tags={card.themes}
            className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {showTranscriptTitle && card.transcriptTitle ? (
          <span className="truncate text-xs text-zinc-400">
            {card.transcriptTitle}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onFindSimilar(card)}
          disabled={finding}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {finding ? "Finding..." : "Find similar moments"}
        </button>
      </div>
    </article>
  );
}
