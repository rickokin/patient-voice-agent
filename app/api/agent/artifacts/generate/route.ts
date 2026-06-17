import { z } from "zod";
import { generateHelpfulArtifact } from "@/core/artifacts/artifact-service";
import { ARTIFACT_TYPE_IDS } from "@/lib/artifact-types";
import { AUDIENCE_MODES } from "@/core/types";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const schema = z.object({
  artifactType: z.enum(ARTIFACT_TYPE_IDS),
  question: z.string().min(1),
  answer: z.string().optional(),
  mode: z.enum(AUDIENCE_MODES).optional(),
  queryId: z.string().uuid().optional(),
  retrievedMomentIds: z.array(z.string().uuid()).optional(),
});

/** Generate a single Helpful Artifact from a question + answer + moments. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = schema.parse(await req.json());
    const artifact = await generateHelpfulArtifact({
      artifactType: body.artifactType,
      question: body.question,
      answer: body.answer,
      mode: body.mode,
      queryId: body.queryId,
      retrievedMomentIds: body.retrievedMomentIds,
      userId,
    });
    return json(artifact, 201);
  } catch (error) {
    return handleError(error);
  }
}
