import assert from "node:assert/strict";
import { test } from "node:test";
import { buildArtifactPrintHtml, escapeHtml } from "../lib/artifact-print";
import {
  ARTIFACT_DISCLAIMER,
  type GeneratedArtifact,
} from "../lib/artifact-types";

function makeArtifact(
  overrides: Partial<GeneratedArtifact> = {},
): GeneratedArtifact {
  const base: GeneratedArtifact = {
    id: "a1",
    userId: null,
    queryId: null,
    artifactType: "visit_preparation_brief",
    artifactTitle: "Visit Preparation Brief",
    sourceQuestion: "What should I ask about my knee?",
    sourceAnswer: null,
    retrievedMomentIds: [],
    content: {
      artifactTitle: "Visit Preparation Brief",
      artifactType: "visit_preparation_brief",
      summary: "A short intro.",
      sections: [
        { heading: "Questions to ask", items: ["Why?", "What next?"] },
        { heading: "Message draft", items: ["A single prose paragraph."] },
        { heading: "Disclaimer", items: ["inline disclaimer text"] },
      ],
      markdown: "# Visit Preparation Brief",
      disclaimer: ARTIFACT_DISCLAIMER,
    },
    markdown: "# Visit Preparation Brief",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

test("escapeHtml neutralizes HTML-significant characters", () => {
  assert.equal(
    escapeHtml(`<script>alert("x")&'</script>`),
    "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;",
  );
});

test("buildArtifactPrintHtml produces a complete printable document", () => {
  const html = buildArtifactPrintHtml(makeArtifact());

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>Visit Preparation Brief<\/title>/);
  // Auto-triggers the print dialog on load.
  assert.match(html, /window\.print\(\)/);
  // Multi-item section -> list; single-item section -> paragraph.
  assert.match(html, /<h2>Questions to ask<\/h2><ul><li>Why\?<\/li>/);
  assert.match(html, /<h2>Message draft<\/h2><p>A single prose paragraph\.<\/p>/);
  // Source question + summary are included.
  assert.match(html, /What should I ask about my knee\?/);
  assert.match(html, /A short intro\./);
  // The standard disclaimer is rendered once in the footer; the inline
  // "Disclaimer" section is not duplicated.
  assert.equal(html.match(/inline disclaimer text/), null);
  assert.ok(html.includes(ARTIFACT_DISCLAIMER));
});

test("buildArtifactPrintHtml escapes user/model-supplied content", () => {
  const html = buildArtifactPrintHtml(
    makeArtifact({ sourceQuestion: "<b>hurt</b> & pain" }),
  );
  assert.match(html, /&lt;b&gt;hurt&lt;\/b&gt; &amp; pain/);
  assert.equal(html.match(/<b>hurt<\/b>/), null);
});

test("buildArtifactPrintHtml omits the meta line for an invalid date", () => {
  const html = buildArtifactPrintHtml(makeArtifact({ createdAt: "not-a-date" }));
  assert.equal(html.match(/class="meta"/), null);
});
