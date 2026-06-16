import {
  extractMoments,
  TranscriptNotNormalizedError,
} from "@/core/extraction/extraction-service";
import { requireAdmin } from "@/lib/auth";
import { badRequest, handleError, json } from "@/lib/http";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const moments = await extractMoments(id);
    return json({ count: moments.length, moments });
  } catch (error) {
    if (error instanceof TranscriptNotNormalizedError) {
      return badRequest(error.message);
    }
    return handleError(error);
  }
}
