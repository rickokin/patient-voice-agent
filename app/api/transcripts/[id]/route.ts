import {
  deleteTranscript,
  getTranscript,
} from "@/core/transcripts/transcript-service";
import { requireAdmin } from "@/lib/auth";
import { handleError, json, notFound } from "@/lib/http";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const transcript = await getTranscript(id);
    if (!transcript) return notFound("Transcript not found.");
    return json(transcript);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteTranscript(id);
    return json({ id, deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
