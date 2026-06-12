import Link from "next/link";
import type { Concept, DistributionStatus, Variation } from "@prisma/client";
import { FORMAT_LABELS } from "@/lib/formats";
import { DistributionToggles } from "./distribution-toggles";

type ConceptWithRelations = Concept & {
  distribution: DistributionStatus | null;
  variations: (Variation & { localizations: { market: string }[] })[];
};

export function ConceptCard({ concept }: { concept: ConceptWithRelations }) {
  const markets = [
    ...new Set(concept.variations.flatMap((v) => v.localizations.map((l) => l.market))),
  ].sort();

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <Link href={`/library/${concept.id}`} className="relative block aspect-square bg-neutral-100">
        {concept.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={concept.thumbnailUrl}
            alt={concept.title}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
            {concept.type.toLowerCase()}
          </div>
        )}
        {concept.nameStatus === "NEEDS_REVIEW" && (
          <span className="absolute left-1 top-1 rounded bg-amber-500 px-1 py-0.5 text-[10px] font-bold text-white">
            review
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <Link
          href={`/library/${concept.id}`}
          className="break-all font-mono text-[10px] leading-tight text-neutral-700 hover:text-indigo-700"
          title={concept.name}
        >
          {concept.name}
        </Link>
        <div className="flex flex-wrap gap-1 text-[10px]">
          <span className="rounded bg-neutral-100 px-1 py-0.5 font-semibold">{concept.batch}</span>
          <span className="rounded bg-indigo-50 px-1 py-0.5 text-indigo-700">
            {concept.type.toLowerCase()}
          </span>
          {concept.variations.map((variation) => (
            <span key={variation.id} className="rounded bg-neutral-100 px-1 py-0.5">
              {FORMAT_LABELS[variation.format]}
            </span>
          ))}
          {markets.map((market) => (
            <span key={market} className="rounded bg-emerald-50 px-1 py-0.5 uppercase text-emerald-700">
              {market}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-1">
          <DistributionToggles conceptId={concept.id} distribution={concept.distribution} />
        </div>
      </div>
    </div>
  );
}
