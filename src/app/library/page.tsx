import Link from "next/link";
import { AdType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getGlossary } from "@/lib/glossary";
import { FilterBar } from "./filter-bar";
import { ConceptCard } from "./concept-card";

export const dynamic = "force-dynamic";

const NOMENCLATURE_FILTERS = [
  "batch",
  "awareness",
  "angle",
  "valueProp",
  "feature",
  "tone",
  "segment",
  "persona",
  "conceptCode",
  "hook",
] as const;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const where: Prisma.ConceptWhereInput = {};

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { title: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.type) where.type = params.type as AdType;
  for (const field of NOMENCLATURE_FILTERS) {
    if (params[field]) where[field] = params[field];
  }
  if (params.market) {
    where.variations = { some: { localizations: { some: { market: params.market } } } };
  }
  if (params.channel === "meta") where.distribution = { is: { meta: true } };
  if (params.channel === "linkedin") where.distribution = { is: { linkedin: true } };
  if (params.channel === "google") where.distribution = { is: { google: true } };
  if (params.channel === "none") {
    where.OR = [
      ...(where.OR ?? []),
      { distribution: null },
      { distribution: { is: { meta: false, linkedin: false, google: false } } },
    ];
  }

  const [concepts, glossary, total] = await Promise.all([
    prisma.concept.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        distribution: true,
        variations: { include: { localizations: { select: { market: true } } } },
      },
    }),
    getGlossary(),
    prisma.concept.count(),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Library</h1>
        <span className="text-xs text-neutral-400">
          {concepts.length} of {total} concepts
        </span>
        <div className="ml-auto flex gap-2">
          <Link
            href="/library/import/figma"
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Import from Figma
          </Link>
          <Link
            href="/library/upload"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50"
          >
            Upload
          </Link>
        </div>
      </div>

      <FilterBar glossary={glossary} />

      {concepts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">
          No concepts match. Import from Figma or upload to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {concepts.map((concept) => (
            <ConceptCard key={concept.id} concept={concept} />
          ))}
        </div>
      )}
    </div>
  );
}
