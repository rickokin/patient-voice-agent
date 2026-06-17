import { getEmbeddingProvider, getGenerationLLM } from "@/core/llm";
import { retrieve } from "@/core/retrieval/retrieval-service";
import { recordQuery } from "@/core/query-logs/query-log-service";
import {
  buildAnswerPrompt,
  getResponseStylePrompt,
} from "@/core/prompts/answer";
import { env } from "@/lib/env";
import {
  DEFAULT_RESPONSE_STYLE,
  type AskResult,
  type AudienceMode,
  type ResponseStyle,
} from "@/core/types";

export interface AskInput {
  question: string;
  audienceMode: AudienceMode;
  responseStyle?: ResponseStyle;
  askedBy?: string | null;
}

const NO_CONTEXT_ANSWER =
  "I don't have enough approved story moments to answer that question yet.";

/**
 * Full RAG flow: embed query -> retrieve approved moments -> generate a grounded
 * answer -> log the query and its supporting moments.
 */
export async function ask(input: AskInput): Promise<AskResult> {
  const start = Date.now();
  const responseStyle = input.responseStyle ?? DEFAULT_RESPONSE_STYLE;
  const style = getResponseStylePrompt(responseStyle);

  const [queryVector] = await getEmbeddingProvider().embed([input.question]);
  const supportingMoments = await retrieve(queryVector, {
    topK: env.RETRIEVAL_TOP_K,
  });

  const llm = getGenerationLLM();
  let answer: string;
  if (supportingMoments.length === 0) {
    answer = NO_CONTEXT_ANSWER;
  } else {
    answer = await llm.generate({
      system: style.system,
      prompt: buildAnswerPrompt(
        input.question,
        input.audienceMode,
        responseStyle,
        supportingMoments,
      ),
      // The humanized style leans on warmth and voice, so give it a little more
      // room to breathe than the precise baseline answer.
      temperature: responseStyle === "humanized" ? 0.6 : 0.3,
    });
  }

  const latencyMs = Date.now() - start;
  const queryLogId = await recordQuery({
    askedBy: input.askedBy ?? null,
    question: input.question,
    audienceMode: input.audienceMode,
    responseStyle,
    answer,
    model: llm.model,
    latencyMs,
    moments: supportingMoments.map((m) => ({
      momentId: m.id,
      score: m.score,
      title: m.title,
      quote: m.quote,
      transcriptTitle: m.transcriptTitle,
    })),
  });

  return {
    answer,
    audienceMode: input.audienceMode,
    responseStyle,
    supportingMoments,
    queryLogId,
    model: llm.model,
    latencyMs,
  };
}
