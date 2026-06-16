import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { queryLogAudio } from "@/db/schema";
import { getQueryLogWithMoments } from "@/core/query-logs/query-log-service";
import { env, requireGeminiApiKey } from "@/lib/env";
import { pcmToWav, sampleRateFromMimeType } from "./wav";

const OUTPUT_MIME_TYPE = "audio/wav";

/**
 * Upper bound on the narration script length. Gemini TTS has a finite context
 * window; capping keeps generation fast and well within limits for the demo.
 */
const MAX_SCRIPT_CHARS = 5000;

interface StoredAudio {
  audio: Buffer;
  mimeType: string;
}

/** Build the spoken script: the answer followed by each cited moment quote. */
function buildNarrationScript(
  answer: string,
  quotes: string[],
): string {
  const parts = [answer.trim()];
  const cited = quotes.map((q) => q.trim()).filter(Boolean);
  if (cited.length > 0) {
    parts.push("Supporting quotes.");
    cited.forEach((quote, i) => {
      parts.push(`Quote ${i + 1}. ${quote}`);
    });
  }
  const script = parts.join("\n\n");
  return script.length > MAX_SCRIPT_CHARS
    ? script.slice(0, MAX_SCRIPT_CHARS)
    : script;
}

/** Fetch previously generated audio for a query log, or null if none exists. */
export async function getQueryLogAudio(
  queryLogId: string,
): Promise<StoredAudio | null> {
  const [row] = await db
    .select({ audio: queryLogAudio.audio, mimeType: queryLogAudio.mimeType })
    .from(queryLogAudio)
    .where(eq(queryLogAudio.queryLogId, queryLogId));
  return row ?? null;
}

/**
 * Generate (or regenerate) TTS narration for a query log's answer plus its cited
 * moment quotes, store it as WAV bytes keyed to the query log, and return its
 * mime type. If audio already exists it is returned without re-synthesizing.
 */
export async function synthesizeForQueryLog(
  queryLogId: string,
): Promise<{ mimeType: string; cached: boolean }> {
  const existing = await getQueryLogAudio(queryLogId);
  if (existing) return { mimeType: existing.mimeType, cached: true };

  const log = await getQueryLogWithMoments(queryLogId);
  if (!log) throw new Error("Query log not found.");

  const script = buildNarrationScript(
    log.answer,
    log.moments.map((m) => m.quote),
  );

  const client = new GoogleGenAI({ apiKey: requireGeminiApiKey() });
  const res = await client.models.generateContent({
    model: env.LLM_TTS_MODEL,
    contents: script,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: env.TTS_VOICE },
        },
      },
    },
  });

  const part = res.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data,
  );
  const base64 = part?.inlineData?.data;
  if (!base64) {
    throw new Error("Gemini returned no audio for the narration request.");
  }

  const pcm = Buffer.from(base64, "base64");
  const sampleRate = sampleRateFromMimeType(part?.inlineData?.mimeType);
  const wav = pcmToWav(pcm, sampleRate);

  await db
    .insert(queryLogAudio)
    .values({
      queryLogId,
      mimeType: OUTPUT_MIME_TYPE,
      voice: env.TTS_VOICE,
      model: env.LLM_TTS_MODEL,
      audio: wav,
    })
    .onConflictDoUpdate({
      target: queryLogAudio.queryLogId,
      set: {
        mimeType: OUTPUT_MIME_TYPE,
        voice: env.TTS_VOICE,
        model: env.LLM_TTS_MODEL,
        audio: wav,
      },
    });

  return { mimeType: OUTPUT_MIME_TYPE, cached: false };
}
