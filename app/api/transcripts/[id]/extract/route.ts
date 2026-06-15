import { extractMoments } from "@/core/extraction/extraction-service";
import { handleError, json } from "@/lib/http";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const moments = await extractMoments(id);
    return json({ count: moments.length, moments });
  } catch (error) {
    return handleError(error);
  }
}
