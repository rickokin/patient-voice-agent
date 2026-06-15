"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Transcript } from "@/db/schema";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  normalized: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  extracted: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setMessage(null);
    setBusy("upload");
    try {
      const parsed = await api.parseTranscriptFile(file);
      setRawText(parsed.text);
      setFileName(file.name);
      setSourceType(parsed.sourceType);
      if (!title.trim()) {
        setTitle(parsed.title);
      }
      setMessage(`Loaded "${file.name}". Review the text below before saving.`);
    } catch (e) {
      setFileName(null);
      setError(
        e instanceof Error ? e.message : "Could not read that file.",
      );
    } finally {
      setBusy(null);
    }
  }

  const load = useCallback(async () => {
    try {
      setTranscripts(await api.listTranscripts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transcripts");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Transcripts
        </h1>
        <Link
          href="/admin"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Back to dashboard
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
          Add transcript
        </h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run("create", async () => {
              const t = await api.createTranscript({
                title,
                rawText,
                sourceType: sourceType ?? "pasted",
              });
              setTitle("");
              setRawText("");
              setFileName(null);
              setSourceType(null);
              setMessage(`Created "${t.title}".`);
              await load();
            });
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            required
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex items-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700 ${
                busy === "upload"
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {busy === "upload" ? "Reading file..." : "Upload file"}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.markdown,.vtt,.srt,.json,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                disabled={busy === "upload"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-xs text-zinc-500">
              {fileName
                ? `Loaded "${fileName}" — review below or edit before saving.`
                : "Upload a PDF, Word (.docx), or text file, or paste below."}
            </span>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the raw transcript here..."
            required
            rows={8}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-700"
          />
          <button
            type="submit"
            disabled={busy === "create"}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy === "create" ? "Saving..." : "Add transcript"}
          </button>
        </form>
      </section>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {message}
        </p>
      )}

      <section className="mt-8 space-y-3">
        {transcripts.length === 0 && (
          <p className="text-sm text-zinc-500">No transcripts yet.</p>
        )}
        {transcripts.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                  {t.title}
                </h3>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                    STATUS_STYLES[t.status] ?? STATUS_STYLES.uploaded
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    void run(`norm-${t.id}`, async () => {
                      await api.normalizeTranscript(t.id);
                      setMessage("Transcript normalized.");
                      await load();
                    })
                  }
                  disabled={busy === `norm-${t.id}`}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {busy === `norm-${t.id}` ? "..." : "Normalize"}
                </button>
                <button
                  onClick={() =>
                    void run(`ext-${t.id}`, async () => {
                      const res = await api.extractTranscript(t.id);
                      setMessage(`Extracted ${res.count} moments.`);
                      await load();
                    })
                  }
                  disabled={busy === `ext-${t.id}`}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {busy === `ext-${t.id}` ? "Extracting..." : "Extract moments"}
                </button>
                <Link
                  href={`/admin/moments?transcriptId=${t.id}`}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  View moments
                </Link>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
