import { getQueryLogWithMoments } from "@/core/query-logs/query-log-service";
import { handleError, json, notFound } from "@/lib/http";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const log = await getQueryLogWithMoments(id);
    if (!log) return notFound("Query log not found");
    return json(log);
  } catch (error) {
    return handleError(error);
  }
}
