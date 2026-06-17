import {
  ARTIFACT_DISCLAIMER,
  type ArtifactSection,
  type ArtifactType,
  type GeneratedArtifactContent,
} from "@/lib/artifact-types";

/**
 * Pure helpers for shaping a raw LLM JSON response into a safe, well-formed
 * `GeneratedArtifactContent`. Kept free of any LLM/DB dependency so they can be
 * unit-tested without network access and reused by the consumer-facing app.
 */

/** The loosely-typed shape we expect back from the model (before validation). */
export interface RawArtifactModelOutput {
  artifactTitle?: unknown;
  artifactType?: unknown;
  summary?: unknown;
  sections?: unknown;
  markdown?: unknown;
  disclaimer?: unknown;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Coerce an unknown `items` value into a clean array of non-empty strings. */
function normalizeItems(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

/** Coerce an unknown `sections` value into well-formed `ArtifactSection[]`. */
export function normalizeSections(value: unknown): ArtifactSection[] {
  if (!Array.isArray(value)) return [];
  const sections: ArtifactSection[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const heading = asTrimmedString((entry as { heading?: unknown }).heading);
    if (!heading) continue;
    const items = normalizeItems((entry as { items?: unknown }).items);
    sections.push({ heading, items });
  }
  return sections;
}

/** Render a single section to markdown (paragraph for prose, bullets for lists). */
function sectionToMarkdown(section: ArtifactSection): string {
  const heading = `## ${section.heading}`;
  if (section.items.length === 0) return heading;
  // A single item is usually prose (e.g. a message draft); render as a paragraph.
  if (section.items.length === 1) return `${heading}\n\n${section.items[0]}`;
  return `${heading}\n\n${section.items.map((i) => `- ${i}`).join("\n")}`;
}

/**
 * Build a clean, user-facing markdown rendering from the structured fields.
 * Used as a fallback when the model omits/empties the `markdown` field.
 */
export function buildMarkdownFallback(input: {
  title: string;
  summary: string;
  sections: ArtifactSection[];
  disclaimer: string;
}): string {
  const parts: string[] = [`# ${input.title}`];
  if (input.summary) parts.push(input.summary);
  for (const section of input.sections) {
    // The disclaimer is appended explicitly below, so skip a disclaimer section
    // here to avoid duplicating it.
    if (/disclaimer/i.test(section.heading)) continue;
    parts.push(sectionToMarkdown(section));
  }
  parts.push(`> ${input.disclaimer}`);
  return parts.join("\n\n");
}

/** Ensure the standard disclaimer text appears in the markdown body. */
function ensureDisclaimer(markdown: string, disclaimer: string): string {
  return markdown.includes(disclaimer)
    ? markdown
    : `${markdown.trimEnd()}\n\n> ${disclaimer}`;
}

/**
 * Normalize a raw model response into a safe `GeneratedArtifactContent`:
 * - the artifact type is forced to the validated value (never trust the model),
 * - the disclaimer is forced to the standard text,
 * - `markdown` falls back to a generated rendering when missing/empty,
 * - the disclaimer is guaranteed to appear in the markdown.
 */
export function normalizeArtifactContent(
  raw: RawArtifactModelOutput,
  options: { artifactType: ArtifactType; fallbackTitle: string },
): GeneratedArtifactContent {
  const title = asTrimmedString(raw.artifactTitle) || options.fallbackTitle;
  const summary = asTrimmedString(raw.summary);
  const sections = normalizeSections(raw.sections);
  const disclaimer = ARTIFACT_DISCLAIMER;

  const providedMarkdown = asTrimmedString(raw.markdown);
  const markdown = providedMarkdown
    ? ensureDisclaimer(providedMarkdown, disclaimer)
    : buildMarkdownFallback({ title, summary, sections, disclaimer });

  return {
    artifactTitle: title,
    artifactType: options.artifactType,
    summary,
    sections,
    markdown,
    disclaimer,
  };
}
