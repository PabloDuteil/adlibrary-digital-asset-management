import { Prisma, AdType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CHANNEL_ADAPTERS } from "@/lib/channels";
import { DistributionFilters } from "./filters";
import { DistributionTable, type DistributionRow } from "./distribution-table";
import { SyncPanel } from "./sync-panel";

export const dynamic = "force-dynamic";

const UNDISTRIBUTED: Prisma.ConceptWhereInput = {
  OR: [
    { distribution: null },
    { distribution: { is: { meta: false, linkedin: false, google: false } } },
  ],
};

export default async function DistributionPage({
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
  if (params.batch) where.batch = params.batch;
  if (params.type) where.type = params.type as AdType;

  const and: Prisma.ConceptWhereInput[] = [];
  if (params.status === "none") and.push(UNDISTRIBUTED);
  if (params.status === "some") {
    and.push({
      distribution: { is: { OR: [{ meta: true }, { linkedin: true }, { google: true }] } },
    });
  }
  if (params.status === "all") {
    and.push({ distribution: { is: { meta: true, linkedin: true, google: true } } });
  }
  if (params.missing === "meta" || params.missing === "linkedin" || params.missing === "google") {
    and.push({
      OR: [{ distribution: null }, { distribution: { is: { [params.missing]: false } } }],
    });
  }
  if (and.length > 0) where.AND = and;

  const [concepts, total, liveSomewhere, liveEverywhere, batches, syncRuns] = await Promise.all([
    prisma.concept.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { distribution: true },
    }),
    prisma.concept.count(),
    prisma.concept.count({
      where: {
        distribution: { is: { OR: [{ meta: true }, { linkedin: true }, { google: true }] } },
      },
    }),
    prisma.concept.count({
      where: { distribution: { is: { meta: true, linkedin: true, google: true } } },
    }),
    prisma.concept.findMany({ select: { batch: true }, distinct: ["batch"], orderBy: { batch: "asc" } }),
    prisma.syncRun.findMany({ orderBy: { ranAt: "desc" }, take: 5 }),
  ]);

  const rows: DistributionRow[] = concepts.map((concept) => ({
    id: concept.id,
    title: concept.title,
    name: concept.name,
    batch: concept.batch,
    type: concept.type,
    thumbnailUrl: concept.thumbnailUrl,
    meta: concept.distribution?.meta ?? false,
    metaInfo: stampLabel(concept.distribution?.metaBy, concept.distribution?.metaAt),
    linkedin: concept.distribution?.linkedin ?? false,
    linkedinInfo: stampLabel(concept.distribution?.linkedinBy, concept.distribution?.linkedinAt),
    google: concept.distribution?.google ?? false,
    googleInfo: stampLabel(concept.distribution?.googleBy, concept.distribution?.googleAt),
  }));

  const channels = Object.values(CHANNEL_ADAPTERS).map((adapter) => ({
    channel: adapter.channel,
    label: adapter.label,
    enabled: adapter.enabled(),
    requiredEnv: adapter.requiredEnv,
    lastRun: toRunSummary(syncRuns.find((run) => run.channel === adapter.channel)),
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-bold">Distribution</h1>
        <span className="text-xs text-neutral-400">{rows.length} shown</span>
        <div className="ml-auto flex gap-4 text-xs text-neutral-600">
          <Stat label="concepts" value={total} />
          <Stat label="live on ≥1 channel" value={liveSomewhere} />
          <Stat label="live everywhere" value={liveEverywhere} />
          <Stat label="not distributed" value={total - liveSomewhere} />
        </div>
      </div>

      <SyncPanel channels={channels} />

      <DistributionFilters batches={batches.map((b) => b.batch)} />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">
          No concepts match these filters.
        </div>
      ) : (
        <DistributionTable rows={rows} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className="font-bold text-neutral-900">{value}</span> {label}
    </span>
  );
}

function stampLabel(by?: string | null, at?: Date | null): string | null {
  if (!by && !at) return null;
  return [by, at ? at.toISOString().slice(0, 10) : null].filter(Boolean).join(" · ");
}

function toRunSummary(run?: {
  ranAt: Date;
  ranBy: string | null;
  adsSeen: number;
  matched: number;
  newlyMarked: number;
  unmatched: string[];
}) {
  if (!run) return null;
  return {
    ranAt: run.ranAt.toISOString().slice(0, 16).replace("T", " "),
    ranBy: run.ranBy,
    adsSeen: run.adsSeen,
    matched: run.matched,
    newlyMarked: run.newlyMarked,
    unmatched: run.unmatched,
  };
}
