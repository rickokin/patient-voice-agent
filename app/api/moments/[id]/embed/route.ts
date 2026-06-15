import { embedMoment } from "@/core/embeddings/embedding-service";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUserId();
    const { id } = await params;
    return json(await embedMoment(id));
  } catch (error) {
    return handleError(error);
  }
}
