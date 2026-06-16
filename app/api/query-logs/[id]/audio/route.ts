import { getQueryLogAudio } from "@/core/tts/tts-service";
import { requireUserId } from "@/lib/auth";
import { handleError, notFound } from "@/lib/http";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUserId();
    const { id } = await params;
    const stored = await getQueryLogAudio(id);
    if (!stored) return notFound("No audio generated for this answer yet.");

    const body = new Uint8Array(stored.audio);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": stored.mimeType,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `attachment; filename="answer-${id}.wav"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
