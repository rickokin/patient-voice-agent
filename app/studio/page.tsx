"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePreferences } from "@/lib/preferences";
import {
  AUDIENCE_MODES,
  RESPONSE_STYLES,
  type AudienceMode,
  type InsightResult,
  type ResponseStyle,
  type StoryMomentCard as StoryMomentCardData,
  type TranslationAudience,
} from "@/core/types";
import {
  RESPONSE_STYLE_PROMPTS,
  getResponseStylePrompt,
} from "@/core/prompts/answer";
import { StoryMomentCard } from "@/components/studio/story-moment-card";
import { FollowUpQuestions } from "@/components/studio/follow-up-questions";
import {
  TranslateActions,
  type TranslationState,
} from "@/components/studio/translate-actions";
import {
  SimilarMomentsPanel,
  type SimilarMomentsState,
} from "@/components/studio/similar-moments-panel";

export default function StudioPage() {
  const { preferences } = usePreferences();
  const [question, setQuestion] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("general");
  const [responseStyle, setResponseStyle] =
    useState<ResponseStyle>("baseline");
  const [showPrompts, setShowPrompts] = useState(false);

  const [result, setResult] = useState<InsightResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioBusy, setAudioBusy] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const [translations, setTranslations] = useState<
    Partial<Record<TranslationAudience, TranslationState>>
  >({});
  const [activeTranslation, setActiveTranslation] =
    useState<TranslationAudience | null>(null);

  const [similar, setSimilar] = useState<SimilarMomentsState | null>(null);
  const [findingId, setFindingId] = useState<string | null>(null);

  const activeStyle = getResponseStylePrompt(responseStyle);

  async function runAsk(q: string) {
    const trimmed = q.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setAudioBusy(false);
    setAudioReady(false);
    setAudioError(null);
    setTranslations({});
    setActiveTranslation(null);
    try {
      setResult(
        await api.askInsight({ question: trimmed, audienceMode, responseStyle }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void runAsk(question);
  }

  function askFollowUp(q: string) {
    setQuestion(q);
    void runAsk(q);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  async function translate(audience: TranslationAudience) {
    if (!result) return;
    setActiveTranslation(audience);
    setTranslations((prev) => ({ ...prev, [audience]: { busy: true } }));
    try {
      const res = await api.translateInsight({
        audience,
        question,
        answer: result.answer,
        moments: result.storyCards,
      });
      setTranslations((prev) => ({
        ...prev,
        [audience]: { text: res.translation },
      }));
    } catch (err) {
      setTranslations((prev) => ({
        ...prev,
        [audience]: {
          error: err instanceof Error ? err.message : "Translation failed",
        },
      }));
    }
  }

  async function findSimilar(card: StoryMomentCardData) {
    setFindingId(card.id);
    setSimilar({ seed: card, busy: true, moments: [] });
    try {
      const res = await api.findSimilarMoments(card.id);
      setSimilar({ seed: card, busy: false, moments: res.moments });
    } catch (err) {
      setSimilar({
        seed: card,
        busy: false,
        moments: [],
        error: err instanceof Error ? err.message : "Could not load similar moments",
      });
    } finally {
      setFindingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          Insight Studio
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Explore the lived experience
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Ask a question and get a grounded answer, a deck of story moment cards,
        suggested directions to explore next, and one-click translations for
        different audiences — all anchored only in approved story moments.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do you want to understand about these lived experiences?"
          required
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none dark:border-zinc-700"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
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
            onChange={(e) => setResponseStyle(e.target.value as ResponseStyle)}
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
            {busy ? "Exploring..." : "Explore"}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
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
          <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
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
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Answer
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-800 dark:text-zinc-200">
                {result.answer}
              </p>
              <p className="mt-3 text-xs text-zinc-400">
                {RESPONSE_STYLE_PROMPTS[result.responseStyle]?.label ??
                  result.responseStyle}{" "}
                · {result.model} · {result.latencyMs}ms ·{" "}
                {result.storyCards.length} story moments
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
                      download={`insight-${result.queryLogId}.wav`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                      Download audio
                    </a>
                  </div>
                )}
              </div>
            </div>

            {result.storyCards.length > 0 && (
              <section>
                <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                  Story moments
                </h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {result.storyCards.map((card, i) => (
                    <StoryMomentCard
                      key={card.id}
                      card={card}
                      index={i + 1}
                      showTranscriptTitle={preferences.showTranscriptTitles}
                      onFindSimilar={findSimilar}
                      finding={findingId === card.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6 lg:col-span-4">
            <FollowUpQuestions
              followUps={result.followUps}
              onPick={askFollowUp}
              disabled={busy}
            />
            <TranslateActions
              states={translations}
              active={activeTranslation}
              onTranslate={translate}
              onSelect={setActiveTranslation}
            />
          </div>
        </div>
      )}

      <SimilarMomentsPanel
        state={similar}
        showTranscriptTitle={preferences.showTranscriptTitles}
        onClose={() => setSimilar(null)}
      />
    </div>
  );
}
