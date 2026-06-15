import { backfillApprovedEmbeddings } from "@/core/embeddings/embedding-service";
import { handleError, json } from "@/lib/http";

export async function POST() {
  try {
    return json(await backfillApprovedEmbeddings());
  } catch (error) {
    return handleError(error);
  }
}
