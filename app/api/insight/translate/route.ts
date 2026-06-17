import { z } from "zod";
import { translateInsight } from "@/core/translation/translation-service";
import { TRANSLATION_AUDIENCES } from "@/core/types";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const momentSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  quote: z.string(),
  themes: z.array(z.string()).default([]),
  audienceTags: z.array(z.string()).default([]),
  score: z.number().default(0),
  transcriptTitle: z.string().default(""),
});

const schema = z.object({
  audience: z.enum(TRANSLATION_AUDIENCES),
  question: z.string().min(1),
  answer: z.string().min(1),
  moments: z.array(momentSchema).min(1),
});

/**
 * Re-express an existing insight for a downstream audience. Reuses the evidence
 * supplied by the caller (the same moments shown in the workspace) and does NOT
 * retrieve anything new.
 */
export async function POST(req: Request) {
  try {
    await requireUserId();
    const { audience, question, answer, moments } = schema.parse(
      await req.json(),
    );
    const result = await translateInsight({
      audience,
      question,
      answer,
      moments,
    });
    return json(result);
  } catch (error) {
    return handleError(error);
  }
}
