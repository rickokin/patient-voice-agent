import { z } from "zod";
import {
  createTranscript,
  listTranscripts,
} from "@/core/transcripts/transcript-service";
import { getCurrentUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const createSchema = z.object({
  title: z.string().min(1),
  rawText: z.string().min(1),
  sourceType: z.string().optional(),
});

export async function GET() {
  try {
    return json(await listTranscripts());
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());
    const uploadedBy = await getCurrentUserId();
    const transcript = await createTranscript({ ...body, uploadedBy });
    return json(transcript, 201);
  } catch (error) {
    return handleError(error);
  }
}
