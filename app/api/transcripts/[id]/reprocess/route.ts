import { z } from "zod";
import { reprocessTranscript } from "@/core/transcripts/transcript-service";
import { requireAdmin } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const reprocessSchema = z
  .object({
    title: z.string().optional(),
    rawText: z.string().optional(),
  })
  .optional();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = reprocessSchema.parse(await req.json().catch(() => ({})));
    const { transcript, moments } = await reprocessTranscript(id, body ?? {});
    return json({ transcript, count: moments.length, moments });
  } catch (error) {
    return handleError(error);
  }
}
