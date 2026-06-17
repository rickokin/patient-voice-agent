"use client";

import { useState } from "react";
import {
  ARTIFACT_DISCLAIMER,
  type GeneratedArtifact,
} from "@/lib/artifact-types";
import { buildArtifactPdf, buildArtifactPdfFilename } from "@/lib/artifact-pdf";

/** Render one section's items as a paragraph (prose) or a bullet list. */
function SectionBody({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  if (items.length === 1) {
    return (
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        {items[0]}
      </p>
    );
  }
  return (
    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Modal viewer for a single generated Helpful Artifact. Renders the structured
 * content (so it looks warm and readable) and lets the user copy the markdown,
 * regenerate, and close. The standard disclaimer always shows at the bottom.
 */
export function GeneratedArtifactViewer({
  artifact,
  onClose,
  onRegenerate,
  regenerating = false,
}: {
  artifact: GeneratedArtifact;
  onClose: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const [pdfError, setPdfError] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(artifact.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore silently.
    }
  }

  /** Generate a real PDF client-side and download it (no popup/print dialog). */
  function saveAsPdf() {
    setPdfError(false);
    try {
      const doc = buildArtifactPdf(artifact);
      doc.save(buildArtifactPdfFilename(artifact));
    } catch {
      setPdfError(true);
    }
  }

  // Don't double-render a disclaimer section; it's always shown at the bottom.
  const sections = artifact.content.sections.filter(
    (s) => !/disclaimer/i.test(s.heading),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {artifact.artifactTitle}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Generated {new Date(artifact.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <span className="font-medium uppercase tracking-wide">
              Your question
            </span>
            <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">
              {artifact.sourceQuestion}
            </p>
          </div>

          {artifact.content.summary && (
            <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {artifact.content.summary}
            </p>
          )}

          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {section.heading}
              </h3>
              <SectionBody items={section.items} />
            </div>
          ))}

          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs italic leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            {artifact.content.disclaimer || ARTIFACT_DISCLAIMER}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {copied ? "Copied!" : "Copy artifact"}
            </button>
            <button
              type="button"
              onClick={saveAsPdf}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Save as PDF
            </button>
            {pdfError && (
              <span className="text-xs text-red-600 dark:text-red-400">
                Couldn&apos;t generate the PDF. Please try again.
              </span>
            )}
          </div>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50 dark:text-indigo-400"
            >
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
