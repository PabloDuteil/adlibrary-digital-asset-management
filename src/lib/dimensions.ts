import { Dimension } from "@prisma/client";

export type DimensionMeta = {
  dimension: Dimension;
  prefix: string;
  label: string;
  /** Concept column the dimension maps to for filtering, if any. */
  conceptField:
    | "batch"
    | "awareness"
    | "angle"
    | "valueProp"
    | "feature"
    | "tone"
    | "segment"
    | "persona"
    | "conceptCode"
    | "hook"
    | null;
  description: string;
};

export const DIMENSIONS: DimensionMeta[] = [
  { dimension: "BATCH", prefix: "", label: "Batch", conceptField: "batch", description: "Monthly production batch. First token of the name, uppercase, no prefix." },
  { dimension: "FORMAT", prefix: "ft.", label: "Format / Ad Type", conceptField: null, description: "The ad type. New names use ft.; legacy names used t. (disambiguated from Tone by value)." },
  { dimension: "AWARENESS", prefix: "al.", label: "Awareness level", conceptField: "awareness", description: "Where the audience sits on the awareness ladder." },
  { dimension: "ANGLE", prefix: "a.", label: "Angle", conceptField: "angle", description: "User pain that exists without Alan." },
  { dimension: "VALUE_PROP", prefix: "vp.", label: "Key Value Prop", conceptField: "valueProp", description: "Product strength that exists because of Alan." },
  { dimension: "FEATURE", prefix: "f.", label: "Feature", conceptField: "feature", description: "Specific product feature highlighted in the ad." },
  { dimension: "TONE", prefix: "t.", label: "Tone", conceptField: "tone", description: "Register of the creative. Keeps the t. prefix; Format moved to ft." },
  { dimension: "SEGMENT", prefix: "s.", label: "Segment", conceptField: "segment", description: "Commercial segment targeted." },
  { dimension: "PERSONA", prefix: "p.", label: "Persona", conceptField: "persona", description: "Person the ad speaks to." },
  { dimension: "CONCEPT", prefix: "c.", label: "Concept", conceptField: "conceptCode", description: "The creative concept / mechanic. Extend freely." },
  { dimension: "HOOK", prefix: "h.", label: "Hook", conceptField: "hook", description: "The attention device of the first seconds / first glance." },
  { dimension: "CONCEPT_VAR", prefix: "cv.", label: "Concept Variables", conceptField: null, description: "Freeform execution details tied to a specific concept. A name can carry several." },
  { dimension: "MARKET", prefix: "m.", label: "Market / Locale", conceptField: null, description: "Market the localized ad targets. Drives the international dashboard breakdown." },
];

export const DIMENSION_BY_KEY = Object.fromEntries(DIMENSIONS.map((d) => [d.dimension, d])) as Record<
  Dimension,
  DimensionMeta
>;
