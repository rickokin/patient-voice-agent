import { jsPDF } from "jspdf";
import {
  ARTIFACT_DISCLAIMER,
  type ArtifactSection,
  type GeneratedArtifact,
} from "@/lib/artifact-types";

/**
 * Build a real, vector-text PDF document for a generated artifact using jsPDF.
 *
 * Unlike the print-HTML builder (`lib/artifact-print.ts`), this produces an
 * actual `.pdf` the browser can download directly — no popup window and no
 * browser print dialog. Kept free of DOM/window access so it can be unit-tested
 * and reused by the consumer-facing app; the caller is responsible for turning
 * the document into a Blob and triggering the download.
 */

// Layout constants (points; 72pt = 1in).
const PAGE_FORMAT = "letter";
const MARGIN = 56;
const COLOR_TEXT: [number, number, number] = [24, 24, 27]; // zinc-900
const COLOR_MUTED: [number, number, number] = [113, 113, 122]; // zinc-500

/** Slugify text for use in a download filename. */
function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "artifact"
  );
}

/** Build a sensible download filename like `visit-preparation-brief.pdf`. */
export function buildArtifactPdfFilename(artifact: GeneratedArtifact): string {
  const title = artifact.artifactTitle || artifact.content.artifactTitle;
  return `${slugify(title)}.pdf`;
}

/**
 * Cursor that lays out flowing text top-to-bottom, adding pages as needed.
 */
class Layout {
  private y: number;
  private readonly maxWidth: number;
  private readonly bottom: number;

  constructor(private readonly doc: jsPDF) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    this.maxWidth = pageWidth - MARGIN * 2;
    this.bottom = pageHeight - MARGIN;
    this.y = MARGIN;
  }

  private ensureSpace(height: number): void {
    if (this.y + height > this.bottom) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  /** Advance the cursor by a fixed amount of vertical space. */
  gap(amount: number): void {
    this.y += amount;
  }

  /**
   * Render a block of text (wrapped to the content width) at the current
   * cursor, advancing past it. Splits across pages line-by-line if needed.
   */
  text(
    value: string,
    opts: {
      fontSize: number;
      fontStyle?: "normal" | "bold" | "italic";
      color?: [number, number, number];
      lineHeight?: number;
      indent?: number;
      bullet?: boolean;
    },
  ): void {
    const {
      fontSize,
      fontStyle = "normal",
      color = COLOR_TEXT,
      lineHeight = 1.4,
      indent = 0,
      bullet = false,
    } = opts;

    this.doc.setFont("helvetica", fontStyle);
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(color[0], color[1], color[2]);

    const x = MARGIN + indent;
    const bulletGap = bullet ? 12 : 0;
    const lines: string[] = this.doc.splitTextToSize(
      value,
      this.maxWidth - indent - bulletGap,
    );
    const step = fontSize * lineHeight;

    lines.forEach((line, i) => {
      this.ensureSpace(step);
      if (bullet && i === 0) {
        this.doc.text("\u2022", x, this.y);
      }
      this.doc.text(line, x + bulletGap, this.y);
      this.y += step;
    });
  }

  /** Draw a thin horizontal rule across the content width. */
  rule(color: [number, number, number] = [228, 228, 231]): void {
    this.ensureSpace(8);
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.setLineWidth(0.75);
    this.doc.line(MARGIN, this.y, MARGIN + this.maxWidth, this.y);
    this.y += 8;
  }
}

function renderSection(layout: Layout, section: ArtifactSection): void {
  layout.gap(10);
  layout.text(section.heading, { fontSize: 12, fontStyle: "bold" });
  layout.gap(4);
  if (section.items.length === 1) {
    layout.text(section.items[0], { fontSize: 10.5 });
    return;
  }
  for (const item of section.items) {
    layout.text(item, { fontSize: 10.5, indent: 4, bullet: true });
    layout.gap(2);
  }
}

/** Build the full PDF document for an artifact. */
export function buildArtifactPdf(artifact: GeneratedArtifact): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: PAGE_FORMAT });
  const layout = new Layout(doc);

  const title = artifact.artifactTitle || artifact.content.artifactTitle;
  const disclaimer = artifact.content.disclaimer || ARTIFACT_DISCLAIMER;
  const created = (() => {
    const d = new Date(artifact.createdAt);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  })();

  // Title + metadata.
  layout.text(title, { fontSize: 18, fontStyle: "bold" });
  if (created) {
    layout.gap(2);
    layout.text(`Generated ${created}`, {
      fontSize: 9,
      color: COLOR_MUTED,
    });
  }

  // Source question.
  layout.gap(14);
  layout.text("YOUR QUESTION", { fontSize: 8, color: COLOR_MUTED });
  layout.gap(3);
  layout.text(artifact.sourceQuestion, { fontSize: 10.5 });

  // Summary.
  if (artifact.content.summary) {
    layout.gap(12);
    layout.text(artifact.content.summary, { fontSize: 10.5 });
  }

  // Body sections (skip any inline disclaimer section; shown once below).
  const sections = artifact.content.sections.filter(
    (s) => !/disclaimer/i.test(s.heading),
  );
  for (const section of sections) renderSection(layout, section);

  // Disclaimer footer.
  layout.gap(18);
  layout.rule();
  layout.gap(4);
  layout.text(disclaimer, {
    fontSize: 9,
    fontStyle: "italic",
    color: COLOR_MUTED,
  });

  return doc;
}
