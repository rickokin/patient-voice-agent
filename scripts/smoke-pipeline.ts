/**
 * End-to-end pipeline smoke test against the real DB + configured LLM provider.
 * Run: npm run smoke:pipeline  (reads .env.local)
 *
 * Flow: create transcript -> normalize -> extract -> approve -> embed -> ask.
 * Writes real rows (useful as demo seed data).
 */
export {};

const SAMPLE_TRANSCRIPT = `
[00:00] Interviewer: Thanks for sharing your story today. Can you start at the beginning?
[00:04] Maria: Sure. It started about two years ago. I kept feeling exhausted and had this constant pain in my joints, but every time I went to my GP they told me it was just stress.
[00:18] Interviewer: How long did that go on for?
[00:21] Maria: Almost a year of being dismissed. I felt like nobody was listening. I started writing down every symptom because I was scared they'd think I was making it up.
[00:35] Interviewer: What changed?
[00:37] Maria: I finally saw a specialist who actually looked at my notes. Within two weeks I had a diagnosis of lupus. I cried, honestly, because it meant I wasn't imagining it.
[00:52] Interviewer: How did the diagnosis affect your day to day life?
[00:56] Maria: The hardest part now is the cost. My medication is expensive and I had to cut my hours at work, so money is tight. But the support group I found online has been a lifeline. Hearing other women describe the exact same thing made me feel less alone.
`;

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // rely on process.env
  }

  const { createTranscript, normalizeTranscript } = await import(
    "@/core/transcripts/transcript-service"
  );
  const { extractMoments } = await import(
    "@/core/extraction/extraction-service"
  );
  const { approveMoment } = await import("@/core/moments/moment-service");
  const { embedMoment } = await import("@/core/embeddings/embedding-service");
  const { ask } = await import("@/core/answers/answer-service");

  console.log("1. Creating transcript...");
  const transcript = await createTranscript({
    title: "Maria - lupus diagnosis journey",
    rawText: SAMPLE_TRANSCRIPT,
    sourceType: "interview",
  });
  console.log(`   id=${transcript.id} status=${transcript.status}`);

  console.log("2. Normalizing...");
  const normalized = await normalizeTranscript(transcript.id);
  console.log(`   status=${normalized.status}`);

  console.log("3. Extracting moments (LLM)...");
  const extracted = await extractMoments(transcript.id);
  console.log(`   extracted ${extracted.length} moments`);
  for (const m of extracted) console.log(`   - ${m.title}`);

  console.log("4. Approving + embedding each moment...");
  for (const m of extracted) {
    await approveMoment(m.id);
    await embedMoment(m.id);
  }
  console.log(`   approved + embedded ${extracted.length}`);

  console.log("5. Asking the agent (audience: clinician)...");
  const result = await ask({
    question: "What barriers did the patient face in getting diagnosed and treated?",
    audienceMode: "clinician",
  });
  console.log("\n--- ANSWER ---");
  console.log(result.answer);
  console.log("\n--- SUPPORTING MOMENTS ---");
  for (const m of result.supportingMoments) {
    console.log(`   [${m.score.toFixed(3)}] ${m.title}`);
  }
  console.log(`\nqueryLogId=${result.queryLogId} latency=${result.latencyMs}ms`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Pipeline smoke failed:", err);
  process.exit(1);
});
