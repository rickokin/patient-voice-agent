import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { moments, momentEmbeddings } from "@/db/schema";
import { getEmbeddingProvider } from "@/core/llm";
import { buildMomentEmbeddingText, getMoment } from "@/core/moments/moment-service";

async function upsertEmbedding(
  momentId: string,
  vector: number[],
  provider: { name: string; model: string; dimension: number },
) {
  await db
    .insert(momentEmbeddings)
    .values({
      momentId,
      embedding: vector,
      embeddingProvider: provider.name,
      embeddingModel: provider.model,
      embeddingDim: provider.dimension,
    })
    .onConflictDoUpdate({
      target: momentEmbeddings.momentId,
      set: {
        embedding: vector,
        embeddingProvider: provider.name,
        embeddingModel: provider.model,
        embeddingDim: provider.dimension,
        createdAt: new Date(),
      },
    });
}

/** Generate (or refresh) the embedding for a single moment. */
export async function embedMoment(momentId: string) {
  const moment = await getMoment(momentId);
  if (!moment) throw new Error("Moment not found.");

  const provider = getEmbeddingProvider();
  const [vector] = await provider.embed([buildMomentEmbeddingText(moment)]);
  await upsertEmbedding(momentId, vector, provider);

  return { momentId, dimension: provider.dimension, model: provider.model };
}

/** Embed all approved moments that do not yet have an embedding. */
export async function backfillApprovedEmbeddings() {
  const pending = await db
    .select({
      id: moments.id,
      title: moments.title,
      summary: moments.summary,
      quote: moments.quote,
    })
    .from(moments)
    .leftJoin(momentEmbeddings, eq(momentEmbeddings.momentId, moments.id))
    .where(and(eq(moments.status, "approved"), isNull(momentEmbeddings.id)));

  if (pending.length === 0) return { embedded: 0 };

  const provider = getEmbeddingProvider();
  const vectors = await provider.embed(
    pending.map((m) => buildMomentEmbeddingText(m)),
  );

  for (let i = 0; i < pending.length; i++) {
    await upsertEmbedding(pending[i].id, vectors[i], provider);
  }

  return { embedded: pending.length };
}
