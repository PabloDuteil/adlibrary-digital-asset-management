/**
 * AI auto-naming for statics (section 6b of the brief): given the creative
 * itself, propose the nomenclature fields, constrained to the glossary. The
 * human always reviews before saving. Active only when ANTHROPIC_API_KEY is
 * configured; callers should check aiNamingEnabled() and fall back to the
 * manual dropdowns otherwise.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { Glossary } from "./glossary";
import { NomenclatureFields } from "./nomenclature";

export function aiNamingEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const ProposalSchema = z.object({
  awareness: z.string().describe("Awareness level (al.) — one of the provided values"),
  angle: z.string().describe("Angle / user pain (a.) — one of the provided values"),
  valueProp: z.string().describe("Key value prop (vp.) — one of the provided values"),
  feature: z.string().describe("Feature (f.) — one of the provided values, 'nofeatures' if none"),
  tone: z.string().describe("Tone (t.) — one of the provided values"),
  segment: z.string().describe("Segment (s.) — one of the provided values"),
  persona: z.string().describe("Persona (p.) — one of the provided values"),
  conceptCode: z.string().describe("Creative concept (c.) — one of the provided values"),
  hook: z.string().describe("Hook (h.) — one of the provided values"),
  conceptVars: z
    .array(z.string())
    .describe("Freeform execution details (cv.), kebab-case, empty if none stand out"),
  rationale: z.string().describe("One short sentence explaining the riskiest guesses"),
});

const SUPPORTED_MEDIA = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type SupportedMedia = (typeof SUPPORTED_MEDIA)[number];

export type AiProposal = {
  fields: Partial<NomenclatureFields>;
  rationale: string;
};

export async function proposeFieldsFromImage(
  image: Buffer,
  mediaType: string,
  glossary: Glossary,
  context?: string,
): Promise<AiProposal> {
  if (!aiNamingEnabled()) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!SUPPORTED_MEDIA.includes(mediaType as SupportedMedia)) {
    throw new Error(`AI naming supports ${SUPPORTED_MEDIA.join(", ")} — got ${mediaType}.`);
  }

  const glossaryText = (
    [
      ["AWARENESS", "al."],
      ["ANGLE", "a."],
      ["VALUE_PROP", "vp."],
      ["FEATURE", "f."],
      ["TONE", "t."],
      ["SEGMENT", "s."],
      ["PERSONA", "p."],
      ["CONCEPT", "c."],
      ["HOOK", "h."],
    ] as const
  )
    .map(
      ([dimension, prefix]) =>
        `${dimension} (${prefix}): ${(glossary[dimension] ?? []).map((t) => t.value).join(", ")}`,
    )
    .join("\n");

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    system:
      "You classify ad creatives for Alan (digital health insurance) into the team's naming taxonomy. " +
      "Pick exactly one value per dimension, strictly from the provided glossary values. " +
      "Judge from what is visible in the creative: the headline, the visual device, the audience it addresses.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as SupportedMedia,
              data: image.toString("base64"),
            },
          },
          {
            type: "text",
            text:
              `Glossary (allowed values per dimension):\n${glossaryText}\n\n` +
              (context ? `Additional context: ${context}\n\n` : "") +
              "Classify this ad creative into the taxonomy.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ProposalSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error("AI naming returned no parseable proposal.");

  // Drop any value that drifted outside the glossary rather than persisting it.
  const valid = (dimension: string, value: string) =>
    (glossary[dimension] ?? []).some((t) => t.value === value) ? value : undefined;

  return {
    fields: {
      awareness: valid("AWARENESS", parsed.awareness),
      angle: valid("ANGLE", parsed.angle),
      valueProp: valid("VALUE_PROP", parsed.valueProp),
      feature: valid("FEATURE", parsed.feature),
      tone: valid("TONE", parsed.tone),
      segment: valid("SEGMENT", parsed.segment),
      persona: valid("PERSONA", parsed.persona),
      conceptCode: valid("CONCEPT", parsed.conceptCode),
      hook: valid("HOOK", parsed.hook),
      conceptVars: parsed.conceptVars.map((v) => v.toLowerCase().replace(/\s+/g, "-")),
    },
    rationale: parsed.rationale,
  };
}
