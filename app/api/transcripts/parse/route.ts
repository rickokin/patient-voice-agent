import {
  extractTextFromFile,
  UnsupportedFileError,
} from "@/core/transcripts/file-extract";
import { requireAdmin } from "@/lib/auth";
import { badRequest, handleError, json } from "@/lib/http";

export const runtime = "nodejs";

/** Max upload size (bytes). PDFs/Word docs of transcripts are well under this. */
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Accept a single uploaded file (PDF / Word / plain text) and return its
 * extracted text + a suggested title. The client then lets the curator review
 * and edit before saving via POST /api/transcripts.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return badRequest("No file provided.");
    }
    if (file.size === 0) {
      return badRequest("The uploaded file is empty.");
    }
    if (file.size > MAX_BYTES) {
      return badRequest("File is too large (max 20 MB).");
    }

    const extracted = await extractTextFromFile(file);
    return json(extracted);
  } catch (error) {
    if (error instanceof UnsupportedFileError) {
      return badRequest(error.message);
    }
    return handleError(error);
  }
}
