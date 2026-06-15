import { normalizeTranscript } from "@/core/transcripts/transcript-service";
import { handleError, json } from "@/lib/http";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return json(await normalizeTranscript(id));
  } catch (error) {
    return handleError(error);
  }
}
