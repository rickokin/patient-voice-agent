import { momentStatsByTranscript } from "@/core/moments/moment-service";
import { requireAdmin } from "@/lib/auth";
import { handleError, json } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    return json(await momentStatsByTranscript());
  } catch (error) {
    return handleError(error);
  }
}
