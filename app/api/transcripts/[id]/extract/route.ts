import { extractMoments } from "@/core/extraction/extraction-service";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUserId();
    const { id } = await params;
    const moments = await extractMoments(id);
    return json({ count: moments.length, moments });
  } catch (error) {
    return handleError(error);
  }
}
