import { listGeneratedArtifactsForQuery } from "@/core/artifacts/generated-artifacts-repository";
import { requireUserId } from "@/lib/auth";
import { badRequest, handleError, json } from "@/lib/http";

/** List previously generated artifacts for a given originating query. */
export async function GET(req: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("queryId");
    if (!queryId) return badRequest("queryId is required");
    return json(await listGeneratedArtifactsForQuery(queryId));
  } catch (error) {
    return handleError(error);
  }
}
