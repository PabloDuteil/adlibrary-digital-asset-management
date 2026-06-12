import { AdFormat } from "@prisma/client";

export const FORMAT_LABELS: Record<AdFormat, string> = {
  R1x1: "1:1",
  R4x5: "4:5",
  R9x16: "9:16",
  R1_91x1: "1.91:1",
  OTHER: "other",
};

export const FORMAT_RATIOS: Record<Exclude<AdFormat, "OTHER">, number> = {
  R1x1: 1,
  R4x5: 4 / 5,
  R9x16: 9 / 16,
  R1_91x1: 1.91,
};

export const ALL_FORMATS: AdFormat[] = ["R1x1", "R4x5", "R9x16", "R1_91x1", "OTHER"];

/** Detect a format from pixel dimensions (tolerance covers rounding in exports). */
export function formatFromDimensions(width: number, height: number): AdFormat {
  if (!width || !height) return "OTHER";
  const ratio = width / height;
  for (const [format, target] of Object.entries(FORMAT_RATIOS)) {
    if (Math.abs(ratio - target) / target < 0.04) return format as AdFormat;
  }
  return "OTHER";
}

/** Detect a format from a Figma frame name like "Ad — 9:16" or "story". */
export function formatFromName(name: string): AdFormat | null {
  const n = name.toLowerCase();
  if (/(1[.,]91[:x]1|landscape|feed-wide)/.test(n)) return "R1_91x1";
  if (/(9[:x]16|story|stories|reel|vertical)/.test(n)) return "R9x16";
  if (/(4[:x]5|portrait)/.test(n)) return "R4x5";
  if (/(1[:x]1|square|carr[ée])/.test(n)) return "R1x1";
  return null;
}
