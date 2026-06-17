import { z } from "zod";
import { ask } from "@/core/answers/answer-service";
import { AUDIENCE_MODES, RESPONSE_STYLES } from "@/core/types";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const schema = z.object({
  question: z.string().min(1),
  audienceMode: z.enum(AUDIENCE_MODES).default("general"),
  responseStyle: z.enum(RESPONSE_STYLES).default("baseline"),
});

export async function POST(req: Request) {
  try {
    const askedBy = await requireUserId();
    const { question, audienceMode, responseStyle } = schema.parse(
      await req.json(),
    );
    const result = await ask({ question, audienceMode, responseStyle, askedBy });
    return json(result);
  } catch (error) {
    return handleError(error);
  }
}
