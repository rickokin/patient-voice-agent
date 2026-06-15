import { listQueryLogs } from "@/core/query-logs/query-log-service";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export async function GET(req: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "100");
    return json(await listQueryLogs(Number.isFinite(limit) ? limit : 100));
  } catch (error) {
    return handleError(error);
  }
}
