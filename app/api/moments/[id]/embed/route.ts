import { embedMoment } from "@/core/embeddings/embedding-service";
import { handleError, json } from "@/lib/http";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return json(await embedMoment(id));
  } catch (error) {
    return handleError(error);
  }
}
