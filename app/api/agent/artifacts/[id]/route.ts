import { getGeneratedArtifactById } from "@/core/artifacts/generated-artifacts-repository";
import { requireUserId } from "@/lib/auth";
import { handleError, json, notFound } from "@/lib/http";

/** Fetch a single generated artifact by id. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUserId();
    const { id } = await params;
    const artifact = await getGeneratedArtifactById(id);
    if (!artifact) return notFound("Artifact not found");
    return json(artifact);
  } catch (error) {
    return handleError(error);
  }
}
