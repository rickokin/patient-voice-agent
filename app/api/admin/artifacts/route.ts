import { listRecentGeneratedArtifacts } from "@/core/artifacts/generated-artifacts-repository";
import { requireAdmin } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

/** List the most recently generated artifacts across all queries (admin view). */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "100");
    return json(
      await listRecentGeneratedArtifacts(Number.isFinite(limit) ? limit : 100),
    );
  } catch (error) {
    return handleError(error);
  }
}
