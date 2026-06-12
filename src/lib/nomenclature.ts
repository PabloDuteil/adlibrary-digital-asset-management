/**
 * Parser + builder for the Ad Creative Lab naming convention.
 *
 * Canonical (new) format:
 *   <BATCH>_ft.<format>_al.<awareness>_a.<angle>_vp.<value-prop>_f.<feature>
 *     _t.<tone>_s.<segment>_p.<persona>_c.<concept>_h.<hook>_m.<market>_cv.<var>...
 *
 * The legacy convention overloaded `t.` for both Format and Tone. Going
 * forward Format uses `ft.`; the parser still accepts legacy `t.` and
 * disambiguates: a `t.` value that is a known format token is the Format,
 * any other `t.` is the Tone. Legacy `:` separators (e.g. `c:ai-marmot`)
 * are tolerated. Anything unparseable is reported in `issues`, never thrown.
 */

export const BATCHES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

export const FORMAT_VALUES = ["static", "video", "carrousel", "ugc", "motion"] as const;

export type NomenclatureFields = {
  batch?: string;
  format?: string; // ft. (ad type: static | video | ...)
  awareness?: string; // al.
  angle?: string; // a.
  valueProp?: string; // vp.
  feature?: string; // f.
  tone?: string; // t.
  segment?: string; // s.
  persona?: string; // p.
  conceptCode?: string; // c.
  hook?: string; // h.
  market?: string; // m.
  conceptVars: string[]; // cv.
};

export type ParseResult = {
  fields: NomenclatureFields;
  issues: string[];
  conforming: boolean;
};

const PREFIX_TO_FIELD: Record<string, keyof Omit<NomenclatureFields, "conceptVars">> = {
  ft: "format",
  al: "awareness",
  a: "angle",
  vp: "valueProp",
  f: "feature",
  s: "segment",
  p: "persona",
  c: "conceptCode",
  h: "hook",
  m: "market",
};

const FIELD_ORDER: { field: keyof Omit<NomenclatureFields, "conceptVars">; prefix: string }[] = [
  { field: "format", prefix: "ft." },
  { field: "awareness", prefix: "al." },
  { field: "angle", prefix: "a." },
  { field: "valueProp", prefix: "vp." },
  { field: "feature", prefix: "f." },
  { field: "tone", prefix: "t." },
  { field: "segment", prefix: "s." },
  { field: "persona", prefix: "p." },
  { field: "conceptCode", prefix: "c." },
  { field: "hook", prefix: "h." },
  { field: "market", prefix: "m." },
];

export function parseAdName(rawName: string): ParseResult {
  const fields: NomenclatureFields = { conceptVars: [] };
  const issues: string[] = [];

  const name = rawName.trim();
  if (!name) return { fields, issues: ["empty name"], conforming: false };

  const tokens = name.split("_").filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Batch: bare uppercase month token, expected first.
    if (BATCHES.includes(token.toUpperCase() as (typeof BATCHES)[number])) {
      if (fields.batch) issues.push(`duplicate batch token "${token}"`);
      else {
        fields.batch = token.toUpperCase();
        if (i !== 0) issues.push(`batch "${token}" not in first position`);
      }
      continue;
    }

    // Prefixed token; tolerate legacy ":" separator.
    const match = token.match(/^([a-z]{1,3})[.:](.+)$/i);
    if (!match) {
      issues.push(`unparseable token "${token}"`);
      continue;
    }
    const prefix = match[1].toLowerCase();
    const value = match[2].toLowerCase();
    if (token.includes(":") && !token.includes(".")) {
      issues.push(`legacy ":" separator in "${token}"`);
    }

    if (prefix === "cv") {
      fields.conceptVars.push(value);
      continue;
    }

    if (prefix === "t") {
      // Overloaded legacy prefix: format values win, everything else is tone.
      if (FORMAT_VALUES.includes(value as (typeof FORMAT_VALUES)[number]) && !fields.format) {
        fields.format = value;
      } else if (!fields.tone) {
        fields.tone = value;
      } else {
        issues.push(`extra t. token "${token}" (tone already set to "${fields.tone}")`);
      }
      continue;
    }

    const field = PREFIX_TO_FIELD[prefix];
    if (!field) {
      issues.push(`unknown prefix "${prefix}." in "${token}"`);
      continue;
    }
    if (fields[field]) {
      issues.push(`duplicate ${prefix}. token "${token}"`);
      continue;
    }
    fields[field] = value;
  }

  if (!fields.batch) issues.push("missing batch");
  if (!fields.format) issues.push("missing format (ft.)");

  return { fields, issues, conforming: issues.length === 0 };
}

/** Build the canonical name from structured fields. Omits empty dimensions. */
export function buildAdName(fields: NomenclatureFields): string {
  const parts: string[] = [];
  if (fields.batch) parts.push(fields.batch.toUpperCase());
  for (const { field, prefix } of FIELD_ORDER) {
    const value = fields[field];
    if (value) parts.push(`${prefix}${value}`);
  }
  for (const cv of fields.conceptVars) parts.push(`cv.${cv}`);
  return parts.join("_");
}

/** Validate parsed values against the glossary; returns warnings for unknown values. */
export function validateAgainstGlossary(
  fields: NomenclatureFields,
  glossary: { dimension: string; value: string }[],
): string[] {
  const byDimension = new Map<string, Set<string>>();
  for (const term of glossary) {
    if (!byDimension.has(term.dimension)) byDimension.set(term.dimension, new Set());
    byDimension.get(term.dimension)!.add(term.value.toLowerCase());
  }
  const checks: [keyof NomenclatureFields, string][] = [
    ["format", "FORMAT"],
    ["awareness", "AWARENESS"],
    ["angle", "ANGLE"],
    ["valueProp", "VALUE_PROP"],
    ["feature", "FEATURE"],
    ["tone", "TONE"],
    ["segment", "SEGMENT"],
    ["persona", "PERSONA"],
    ["conceptCode", "CONCEPT"],
    ["hook", "HOOK"],
    ["market", "MARKET"],
  ];
  const warnings: string[] = [];
  for (const [field, dimension] of checks) {
    const value = fields[field];
    if (typeof value !== "string" || !value) continue;
    const known = byDimension.get(dimension);
    if (known && !known.has(value.toLowerCase())) {
      warnings.push(`unknown ${dimension.toLowerCase()} value "${value}"`);
    }
  }
  return warnings;
}

export function batchForDate(date = new Date()): string {
  return BATCHES[date.getMonth()];
}
