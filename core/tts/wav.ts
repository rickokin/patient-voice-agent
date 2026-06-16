/**
 * Gemini TTS returns raw, headerless PCM (16-bit signed, little-endian, mono)
 * with a mime type like `audio/L16;codec=pcm;rate=24000`. Browsers can't play
 * that directly, so we wrap it in a minimal WAV (RIFF) container.
 */

const DEFAULT_SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

/** Parse the sample rate out of a mime type such as `audio/L16;codec=pcm;rate=24000`. */
export function sampleRateFromMimeType(mimeType: string | undefined): number {
  const match = /rate=(\d+)/.exec(mimeType ?? "");
  const rate = match ? Number(match[1]) : NaN;
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_SAMPLE_RATE;
}

/** Wrap raw little-endian PCM samples in a WAV (RIFF) container. */
export function pcmToWav(
  pcm: Buffer,
  sampleRate: number = DEFAULT_SAMPLE_RATE,
): Buffer {
  const blockAlign = (NUM_CHANNELS * BITS_PER_SAMPLE) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4); // file size minus first 8 bytes
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
