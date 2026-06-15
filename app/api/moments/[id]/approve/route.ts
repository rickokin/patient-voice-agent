import { z } from "zod";
import { approveMoment, rejectMoment } from "@/core/moments/moment-service";
import { embedMoment } from "@/core/embeddings/embedding-service";
import { getCurrentUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const bodySchema = z
  .object({
    action: z.enum(["approve", "reject"]).default("approve"),
    embed: z.boolean().default(true),
  })
  .default({ action: "approve", embed: true });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const { action, embed } = bodySchema.parse(raw);

    if (action === "reject") {
      return json(await rejectMoment(id));
    }

    const approvedBy = await getCurrentUserId();
    const moment = await approveMoment(id, approvedBy);

    // Embed on approval so the moment is immediately retrievable.
    let embedded = false;
    if (embed) {
      await embedMoment(id);
      embedded = true;
    }

    return json({ ...moment, embedded });
  } catch (error) {
    return handleError(error);
  }
}
