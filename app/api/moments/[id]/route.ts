import { z } from "zod";
import { updateMoment } from "@/core/moments/moment-service";
import { requireUserId } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  quote: z.string().min(1).optional(),
  themes: z.array(z.string()).optional(),
  audienceTags: z.array(z.string()).optional(),
  consentConfirmed: z.boolean().optional(),
  consentNotes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUserId();
    const { id } = await params;
    const patch = patchSchema.parse(await req.json());
    return json(await updateMoment(id, patch));
  } catch (error) {
    return handleError(error);
  }
}
