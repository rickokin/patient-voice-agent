import { z } from "zod";
import { retrieveByText } from "@/core/retrieval/retrieval-service";
import { handleError, json } from "@/lib/http";

const schema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive().max(50).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

/** Retrieval-only endpoint for debugging / future tools. */
export async function POST(req: Request) {
  try {
    const { query, topK, minScore } = schema.parse(await req.json());
    const moments = await retrieveByText(query, { topK, minScore });
    return json({ count: moments.length, moments });
  } catch (error) {
    return handleError(error);
  }
}
