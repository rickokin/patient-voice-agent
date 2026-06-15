import { listMoments } from "@/core/moments/moment-service";
import { MOMENT_STATUSES, type MomentStatus } from "@/core/types";
import { handleError, json } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const transcriptId = searchParams.get("transcriptId") ?? undefined;

    const status =
      statusParam && (MOMENT_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as MomentStatus)
        : undefined;

    return json(await listMoments({ status, transcriptId }));
  } catch (error) {
    return handleError(error);
  }
}
