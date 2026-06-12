import { prisma } from "./db";

export type GlossaryOption = { value: string; label: string };
export type Glossary = Record<string, GlossaryOption[]>;

/** All nomenclature terms grouped by dimension, for selects and validation. */
export async function getGlossary(): Promise<Glossary> {
  const terms = await prisma.nomenclatureTerm.findMany({
    orderBy: [{ dimension: "asc" }, { value: "asc" }],
    select: { dimension: true, value: true, label: true },
  });
  const glossary: Glossary = {};
  for (const term of terms) {
    (glossary[term.dimension] ??= []).push({ value: term.value, label: term.label });
  }
  return glossary;
}
