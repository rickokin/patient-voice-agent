import {
  ARTIFACT_DISCLAIMER,
  type ArtifactSection,
  type GeneratedArtifact,
} from "@/lib/artifact-types";

/**
 * Build a self-contained, print-optimized HTML document for a generated
 * artifact. Used to let the user "Save as PDF" via the browser's print dialog
 * without pulling in a PDF dependency.
 *
 * Kept pure (no DOM/window access) so it can be unit-tested and reused by the
 * consumer-facing app. All user/model-supplied text is HTML-escaped.
 */

/** Escape a string for safe interpolation into HTML text/attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSection(section: ArtifactSection): string {
  const heading = `<h2>${escapeHtml(section.heading)}</h2>`;
  if (section.items.length === 0) return heading;
  if (section.items.length === 1) {
    return `${heading}<p>${escapeHtml(section.items[0])}</p>`;
  }
  const items = section.items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return `${heading}<ul>${items}</ul>`;
}

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #18181b;
    line-height: 1.55;
    margin: 0;
    padding: 2.5rem;
    max-width: 720px;
  }
  h1 { font-size: 1.6rem; margin: 0 0 0.25rem; }
  h2 { font-size: 1.05rem; margin: 1.5rem 0 0.35rem; }
  p { margin: 0.35rem 0; }
  ul { margin: 0.35rem 0; padding-left: 1.25rem; }
  li { margin: 0.2rem 0; }
  .meta { color: #71717a; font-size: 0.8rem; margin: 0 0 1rem; }
  .question {
    background: #f4f4f5;
    border-radius: 8px;
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
    margin: 0 0 1.25rem;
  }
  .question .label {
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
    color: #71717a;
    font-size: 0.7rem;
  }
  .summary { font-size: 0.95rem; }
  .disclaimer {
    margin-top: 2rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e4e4e7;
    color: #71717a;
    font-size: 0.8rem;
    font-style: italic;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 1.6cm; }
  }
`;

/** Build the full printable HTML document for an artifact. */
export function buildArtifactPrintHtml(artifact: GeneratedArtifact): string {
  const sections = artifact.content.sections.filter(
    (s) => !/disclaimer/i.test(s.heading),
  );
  const disclaimer = artifact.content.disclaimer || ARTIFACT_DISCLAIMER;
  const title = artifact.artifactTitle || artifact.content.artifactTitle;
  const created = (() => {
    const d = new Date(artifact.createdAt);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  })();

  const body = [
    `<h1>${escapeHtml(title)}</h1>`,
    created ? `<p class="meta">Generated ${escapeHtml(created)}</p>` : "",
    `<div class="question"><span class="label">Your question</span><div>${escapeHtml(
      artifact.sourceQuestion,
    )}</div></div>`,
    artifact.content.summary
      ? `<p class="summary">${escapeHtml(artifact.content.summary)}</p>`
      : "",
    ...sections.map(renderSection),
    `<p class="disclaimer">${escapeHtml(disclaimer)}</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${PRINT_STYLES}</style>`,
    "</head>",
    '<body onload="window.focus();window.print();">',
    body,
    "</body>",
    "</html>",
  ].join("\n");
}
