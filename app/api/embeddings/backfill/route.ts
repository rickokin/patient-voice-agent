import { backfillApprovedEmbeddings } from "@/core/embeddings/embedding-service";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export async function POST() {
  try {
    await requireUserId();
    return json(await backfillApprovedEmbeddings());
  } catch (error) {
    return handleError(error);
  }
}
