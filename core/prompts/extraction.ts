import type { JsonSchema } from "@/core/llm/types";

export const EXTRACTION_SYSTEM =
  "You are a careful qualitative researcher curating lived-experience patient stories. " +
  "You extract discrete, self-contained story moments from a transcript. " +
  "Each moment must be faithful to the source: do not invent facts, names, or quotes. " +
  "Quotes must be copied verbatim from the transcript.";

export const EXTRACTION_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    moments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "A short, specific title for the moment.",
          },
          summary: {
            type: "string",
            description:
              "A 1-3 sentence neutral summary of what happens in this moment.",
          },
          quote: {
            type: "string",
            description: "A verbatim quote from the transcript for this moment.",
          },
          themes: {
            type: "array",
            items: { type: "string" },
            description: "Short thematic tags, e.g. 'diagnosis', 'access'.",
          },
          audienceTags: {
            type: "array",
            items: { type: "string" },
            description:
              "Audiences who would find this moment relevant: researcher, clinician, policymaker, innovator, general.",
          },
        },
        required: ["title", "summary", "quote", "themes", "audienceTags"],
      },
    },
  },
  required: ["moments"],
};

export function buildExtractionPrompt(normalizedText: string): string {
  return [
    "Extract the meaningful story moments from the transcript below.",
    "Aim for 3-10 moments depending on length. Skip filler and small talk.",
    "Return JSON only.",
    "",
    "TRANSCRIPT:",
    normalizedText,
  ].join("\n");
}
