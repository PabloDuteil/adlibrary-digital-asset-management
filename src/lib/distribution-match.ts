/**
 * Matches live ad names (as found in a channel's ads manager) to Library
 * concepts. The nomenclature name is the join key, but ad names in the wild
 * drift: trailing "- Copy 2", appended variation suffixes, legacy `t.`/`:`
 * tokens. Matching is tiered — exact, then prefix, then parsed-field — and
 * anything ambiguous is reported as unmatched rather than guessed.
 */
import { parseAdName } from "./nomenclature";

export type MatchableConcept = {
  id: string;
  name: string;
  batch: string;
  conceptCode: string | null;
  hook: string | null;
};

export type MatchResult = {
  /** conceptId -> ad names that resolved to it */
  matched: Map<string, string[]>;
  /** ad names that resolved to no concept (or to several) */
  unmatched: string[];
};

/** Strip ads-manager noise: surrounding whitespace, "- Copy", "- Copy 3". */
export function normalizeAdName(raw: string): string {
  return raw
    .trim()
    .replace(/\s*[-–—]\s*copy(\s*\d+)?$/i, "")
    .trim();
}

export function matchAdsToConcepts(
  adNames: string[],
  concepts: MatchableConcept[],
): MatchResult {
  const byExactName = new Map<string, MatchableConcept>();
  for (const concept of concepts) byExactName.set(concept.name.toLowerCase(), concept);

  // batch|conceptCode -> concepts, for the parsed-field tier.
  const byBatchAndCode = new Map<string, MatchableConcept[]>();
  for (const concept of concepts) {
    if (!concept.conceptCode) continue;
    const key = `${concept.batch.toUpperCase()}|${concept.conceptCode.toLowerCase()}`;
    byBatchAndCode.set(key, [...(byBatchAndCode.get(key) ?? []), concept]);
  }

  const matched = new Map<string, string[]>();
  const unmatched: string[] = [];
  const record = (concept: MatchableConcept, adName: string) => {
    matched.set(concept.id, [...(matched.get(concept.id) ?? []), adName]);
  };

  for (const rawName of adNames) {
    const adName = normalizeAdName(rawName);
    const lower = adName.toLowerCase();

    const exact = byExactName.get(lower);
    if (exact) {
      record(exact, rawName);
      continue;
    }

    // Prefix: the live ad appended something (e.g. "_cv.blue_v2") to the
    // canonical name. Token boundary required; short names are too risky.
    const prefixHits = concepts.filter(
      (concept) =>
        concept.name.length >= 12 &&
        lower.startsWith(concept.name.toLowerCase()) &&
        ["_", "-", " ", "."].includes(lower[concept.name.length] ?? ""),
    );
    if (prefixHits.length === 1) {
      record(prefixHits[0], rawName);
      continue;
    }

    // Parsed: legacy separators or reordered tokens — match on the identity
    // dimensions (batch + concept code, hook as tiebreaker).
    const { fields } = parseAdName(adName);
    if (fields.batch && fields.conceptCode) {
      const candidates =
        byBatchAndCode.get(`${fields.batch}|${fields.conceptCode.toLowerCase()}`) ?? [];
      const narrowed =
        candidates.length > 1 && fields.hook
          ? candidates.filter((concept) => concept.hook === fields.hook)
          : candidates;
      if (narrowed.length === 1) {
        record(narrowed[0], rawName);
        continue;
      }
    }

    unmatched.push(rawName);
  }

  return { matched, unmatched };
}
