import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

/** Plain-text extensions we can decode directly without any parsing. */
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "vtt",
  "srt",
  "json",
  "csv",
  "log",
]);

export interface ExtractedFile {
  /** Best-effort title derived from the file name (no extension). */
  title: string;
  /** Extracted plain text. */
  text: string;
  /** Canonical source type stored on the transcript. */
  sourceType: "pdf" | "docx" | "text";
}

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

function titleFromName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return base || fileName;
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

/**
 * Extract plain text from an uploaded transcript file. Supports PDF (.pdf),
 * Word (.docx), and a range of plain-text formats. Legacy binary .doc and other
 * unknown types throw {@link UnsupportedFileError}.
 */
export async function extractTextFromFile(
  file: File,
): Promise<ExtractedFile> {
  const ext = extensionOf(file.name);
  const mime = file.type;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "pdf" || mime === "application/pdf") {
    const text = collapseWhitespace(await extractPdf(buffer));
    if (!text) {
      throw new UnsupportedFileError(
        "No text found in this PDF. It may be a scanned image that needs OCR.",
      );
    }
    return { title: titleFromName(file.name), text, sourceType: "pdf" };
  }

  if (
    ext === "docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const text = collapseWhitespace(await extractDocx(buffer));
    if (!text) {
      throw new UnsupportedFileError("No text found in this Word document.");
    }
    return { title: titleFromName(file.name), text, sourceType: "docx" };
  }

  if (ext === "doc" || mime === "application/msword") {
    throw new UnsupportedFileError(
      "Legacy .doc files aren't supported. Please save as .docx or PDF and re-upload.",
    );
  }

  if (TEXT_EXTENSIONS.has(ext) || mime.startsWith("text/")) {
    const text = collapseWhitespace(buffer.toString("utf-8"));
    return { title: titleFromName(file.name), text, sourceType: "text" };
  }

  throw new UnsupportedFileError(
    `Unsupported file type "${ext || mime || "unknown"}". Upload a PDF, Word (.docx), or plain-text file.`,
  );
}
