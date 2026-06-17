"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/preferences";
import {
  AUDIENCE_MODES,
  RESPONSE_STYLES,
  type AskResult,
  type AudienceMode,
  type ResponseStyle,
} from "@/core/types";
import {
  RESPONSE_STYLE_PROMPTS,
  getResponseStylePrompt,
} from "@/core/prompts/answer";

export default function AgentPage() {
  const { preferences } = usePreferences();
  const [question, setQuestion] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("general");
  const [responseStyle, setResponseStyle] =
    useState<ResponseStyle>("baseline");
  const [showPrompts, setShowPrompts] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const activeStyle = getResponseStylePrompt(responseStyle);

  function resetAudio() {
    setAudioBusy(false);
    setAudioReady(false);
    setAudioError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    resetAudio();
    try {
      setResult(await api.ask({ question, audienceMode, responseStyle }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function readAloud() {
    if (!result) return;
    setAudioBusy(true);
    setAudioError(null);
    try {
      await api.generateAnswerAudio(result.queryLogId);
      setAudioReady(true);
    } catch (err) {
      setAudioError(
        err instanceof Error ? err.message : "Could not generate audio",
      );
    } finally {
      setAudioBusy(false);
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
        <div className="flex flex-wrap items-center gap-3">
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

          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Response type
          </label>
          <select
            value={responseStyle}
            onChange={(e) =>
              setResponseStyle(e.target.value as ResponseStyle)
            }
            className="rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
          >
            {RESPONSE_STYLES.map((s) => (
              <option key={s} value={s}>
                {RESPONSE_STYLE_PROMPTS[s].label}
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

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {activeStyle.description}
            </p>
            <button
              type="button"
              onClick={() => setShowPrompts((v) => !v)}
              className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {showPrompts ? "Hide prompts" : "View prompts"}
            </button>
          </div>

          {showPrompts && (
            <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  System prompt
                </h4>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-zinc-700 dark:text-zinc-300">
                  {activeStyle.system}
                </p>
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Answer instruction
                </h4>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-zinc-700 dark:text-zinc-300">
                  {activeStyle.instruction}
                </p>
              </div>
            </div>
          )}
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
              {RESPONSE_STYLE_PROMPTS[result.responseStyle]?.label ??
                result.responseStyle}{" "}
              - {result.model} - {result.latencyMs}ms -{" "}
              {result.supportingMoments.length} supporting moments
            </p>

            <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              {!audioReady && (
                <button
                  type="button"
                  onClick={readAloud}
                  disabled={audioBusy}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {audioBusy ? "Generating audio..." : "Read aloud"}
                </button>
              )}

              {audioError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {audioError}
                </p>
              )}

              {audioReady && (
                <div className="space-y-2">
                  <audio
                    controls
                    autoPlay
                    src={api.answerAudioUrl(result.queryLogId)}
                    className="w-full"
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <a
                    href={api.answerAudioUrl(result.queryLogId)}
                    download={`answer-${result.queryLogId}.wav`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Download audio
                  </a>
                </div>
              )}
            </div>
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
                    {preferences.showTranscriptTitles && m.transcriptTitle && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        <span className="font-medium uppercase tracking-wide">
                          Transcript
                        </span>
                        <span className="truncate text-zinc-700 dark:text-zinc-300">
                          {m.transcriptTitle}
                        </span>
                      </div>
                    )}
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
