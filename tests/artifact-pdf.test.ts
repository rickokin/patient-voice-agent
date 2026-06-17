import assert from "node:assert/strict";
import { test } from "node:test";
import { buildArtifactPdf, buildArtifactPdfFilename } from "../lib/artifact-pdf";
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

test("buildArtifactPdf produces a valid PDF document", () => {
  const doc = buildArtifactPdf(makeArtifact());
  const buffer = Buffer.from(doc.output("arraybuffer"));
  // Every PDF starts with the %PDF- magic header.
  assert.equal(buffer.subarray(0, 5).toString("latin1"), "%PDF-");
  assert.ok(buffer.length > 0);
});

test("buildArtifactPdf handles long content across multiple pages", () => {
  const longItems = Array.from({ length: 80 }, (_, i) => `Question number ${i}`);
  const doc = buildArtifactPdf(
    makeArtifact({
      content: {
        ...makeArtifact().content,
        sections: [{ heading: "Many questions", items: longItems }],
      },
    }),
  );
  assert.ok(doc.getNumberOfPages() > 1);
});

test("buildArtifactPdf does not throw on an invalid created date", () => {
  assert.doesNotThrow(() =>
    buildArtifactPdf(makeArtifact({ createdAt: "not-a-date" })),
  );
});

test("buildArtifactPdfFilename slugifies the title", () => {
  assert.equal(
    buildArtifactPdfFilename(makeArtifact()),
    "visit-preparation-brief.pdf",
  );
});

test("buildArtifactPdfFilename falls back when the title is empty", () => {
  const artifact = makeArtifact({ artifactTitle: "" });
  artifact.content.artifactTitle = "";
  assert.equal(buildArtifactPdfFilename(artifact), "artifact.pdf");
});
