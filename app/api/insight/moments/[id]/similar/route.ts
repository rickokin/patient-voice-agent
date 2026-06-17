import { z } from "zod";
import { retrieveSimilarToMoment } from "@/core/retrieval/retrieval-service";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const schema = z.object({
  topK: z.number().int().positive().max(20).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

/** Find approved moments similar to a given moment, via its stored embedding. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUserId();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { topK, minScore } = schema.parse(body);
    const moments = await retrieveSimilarToMoment(id, { topK, minScore });
    return json({ count: moments.length, moments });
  } catch (error) {
    return handleError(error);
  }
}
