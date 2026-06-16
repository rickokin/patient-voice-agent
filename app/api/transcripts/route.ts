import { z } from "zod";
import {
  createTranscript,
  DuplicateTranscriptError,
  listTranscripts,
} from "@/core/transcripts/transcript-service";
import { requireAdmin } from "@/lib/auth";
import { conflict, handleError, json } from "@/lib/http";

const createSchema = z.object({
  title: z.string().min(1),
  rawText: z.string().min(1),
  sourceType: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    return json(await listTranscripts());
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const uploadedBy = await requireAdmin();
    const body = createSchema.parse(await req.json());
    const transcript = await createTranscript({ ...body, uploadedBy });
    return json(transcript, 201);
  } catch (error) {
    if (error instanceof DuplicateTranscriptError) {
      return conflict(error.message, { existingId: error.existingId });
    }
    return handleError(error);
  }
}
