import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMarkdownFallback,
  normalizeArtifactContent,
  normalizeSections,
} from "../core/artifacts/artifact-content";
import { ARTIFACT_DISCLAIMER } from "../lib/artifact-types";

test("normalizeSections coerces messy input into clean sections", () => {
  const sections = normalizeSections([
    { heading: "  Questions  ", items: ["  ask this ", "", "  ", "and this"] },
    { heading: "Prose", items: "single string body" },
    { heading: "", items: ["dropped — no heading"] },
    null,
    "garbage",
    { items: ["no heading object"] },
  ]);

  assert.deepEqual(sections, [
    { heading: "Questions", items: ["ask this", "and this"] },
    { heading: "Prose", items: ["single string body"] },
  ]);
});

test("normalizeSections returns [] for non-array input", () => {
  assert.deepEqual(normalizeSections(undefined), []);
  assert.deepEqual(normalizeSections(null), []);
  assert.deepEqual(normalizeSections("nope"), []);
});

test("buildMarkdownFallback renders title, summary, sections, and disclaimer", () => {
  const md = buildMarkdownFallback({
    title: "My Artifact",
    summary: "A short intro.",
    sections: [
      { heading: "Questions", items: ["One?", "Two?"] },
      { heading: "Draft", items: ["A single prose paragraph."] },
      { heading: "Disclaimer", items: ["should be skipped here"] },
    ],
    disclaimer: ARTIFACT_DISCLAIMER,
  });

  assert.match(md, /^# My Artifact/);
  assert.match(md, /A short intro\./);
  assert.match(md, /## Questions/);
  assert.match(md, /- One\?/);
  assert.match(md, /- Two\?/);
  // Single-item section renders as a paragraph, not a bullet.
  assert.match(md, /## Draft\n\nA single prose paragraph\./);
  // The inline "Disclaimer" section is skipped; the standard disclaimer is appended once.
  assert.equal(md.match(/should be skipped here/), null);
  assert.match(md, new RegExp(`> ${ARTIFACT_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("normalizeArtifactContent uses model markdown but enforces the disclaimer", () => {
  const content = normalizeArtifactContent(
    {
      artifactTitle: "Visit Prep",
      artifactType: "ignored_by_design",
      summary: "Get ready.",
      sections: [{ heading: "Main concern", items: ["Knee pain"] }],
      markdown: "# Visit Prep\n\nGet ready.\n\n## Main concern\n\nKnee pain",
    },
    { artifactType: "visit_preparation_brief", fallbackTitle: "Fallback" },
  );

  // Artifact type is forced to the validated value, never the model's.
  assert.equal(content.artifactType, "visit_preparation_brief");
  assert.equal(content.artifactTitle, "Visit Prep");
  assert.equal(content.disclaimer, ARTIFACT_DISCLAIMER);
  // Model markdown lacked the disclaimer, so it must be appended.
  assert.ok(content.markdown.includes(ARTIFACT_DISCLAIMER));
});

test("normalizeArtifactContent builds markdown fallback when markdown is missing", () => {
  const content = normalizeArtifactContent(
    {
      summary: "",
      sections: [{ heading: "Questions I want to ask", items: ["Why?"] }],
      // no markdown field at all
    },
    { artifactType: "appointment_question_card", fallbackTitle: "Question Card" },
  );

  // Falls back to the metadata title when the model omits one.
  assert.equal(content.artifactTitle, "Question Card");
  assert.match(content.markdown, /^# Question Card/);
  assert.match(content.markdown, /## Questions I want to ask/);
  assert.ok(content.markdown.includes(ARTIFACT_DISCLAIMER));
});

test("normalizeArtifactContent tolerates an entirely empty response", () => {
  const content = normalizeArtifactContent(
    {},
    { artifactType: "what_to_listen_for", fallbackTitle: "What to Listen For" },
  );
  assert.equal(content.artifactTitle, "What to Listen For");
  assert.equal(content.sections.length, 0);
  assert.equal(content.summary, "");
  assert.ok(content.markdown.includes(ARTIFACT_DISCLAIMER));
});
