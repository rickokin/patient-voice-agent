import { z } from "zod";
import { synthesizeForQueryLog } from "@/core/tts/tts-service";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const schema = z.object({
  queryLogId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    await requireUserId();
    const { queryLogId } = schema.parse(await req.json());
    const { mimeType, cached } = await synthesizeForQueryLog(queryLogId);
    return json({ ready: true, mimeType, cached });
  } catch (error) {
    return handleError(error);
  }
}
