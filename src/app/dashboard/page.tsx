import { AdFormat, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { FORMAT_LABELS } from "@/lib/formats";
import { quarterOf, quarterRange, quartersSince } from "@/lib/quarters";
import { QuarterFilter } from "./quarter-filter";
import { TargetRow } from "./target-row";

export const dynamic = "force-dynamic";

const TYPE_COLORS: Record<string, string> = {
  STATIC: "bg-indigo-500",
  VIDEO: "bg-emerald-500",
  MOTION: "bg-amber-500",
  CARROUSEL: "bg-sky-500",
  UGC: "bg-rose-500",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>;
}) {
  const params = await searchParams;
  const currentQuarter = quarterOf(new Date());
  const quarter = params.quarter ?? currentQuarter;
  const range = quarter === "all" ? null : quarterRange(quarter);

  const conceptDateWhere = range ? { createdAt: { gte: range.start, lt: range.end } } : {};
  const dateSql = range
    ? Prisma.sql`AND c."createdAt" >= ${range.start} AND c."createdAt" < ${range.end}`
    : Prisma.empty;

  const [oldest, conceptsByType, variations, assets, marketRows, crossRows, marketTerms, targets] =
    await Promise.all([
      prisma.concept.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.concept.groupBy({ by: ["type"], _count: { _all: true }, where: conceptDateWhere }),
      prisma.variation.count({ where: { concept: conceptDateWhere } }),
      prisma.assetFile.count({
        where: { localization: { variation: { concept: conceptDateWhere } } },
      }),
      prisma.$queryRaw<{ market: string; count: bigint }[]>`
        SELECT l.market, COUNT(af.id)::bigint AS count
        FROM "AssetFile" af
        JOIN "Localization" l ON l.id = af."localizationId"
        JOIN "Variation" v ON v.id = l."variationId"
        JOIN "Concept" c ON c.id = v."conceptId"
        WHERE TRUE ${dateSql}
        GROUP BY l.market ORDER BY count DESC`,
      prisma.$queryRaw<{ format: AdFormat; market: string; count: bigint }[]>`
        SELECT v.format::text AS format, l.market, COUNT(af.id)::bigint AS count
        FROM "AssetFile" af
        JOIN "Localization" l ON l.id = af."localizationId"
        JOIN "Variation" v ON v.id = l."variationId"
        JOIN "Concept" c ON c.id = v."conceptId"
        WHERE TRUE ${dateSql}
        GROUP BY v.format, l.market`,
      prisma.nomenclatureTerm.findMany({ where: { dimension: "MARKET" }, orderBy: { value: "asc" } }),
      quarter === "all" ? [] : prisma.target.findMany({ where: { quarter } }),
    ]);

  const quarters = quartersSince(oldest?.createdAt ?? new Date());
  const concepts = conceptsByType.reduce((sum, row) => sum + row._count._all, 0);
  const typeCount = (type: string) =>
    conceptsByType.find((row) => row.type === type)?._count._all ?? 0;

  // Market breakdown including markets with zero assets (glossary-driven).
  const marketCounts = new Map(marketRows.map((row) => [row.market, Number(row.count)]));
  const allMarkets = [
    ...new Set([...marketTerms.map((t) => t.value), ...marketCounts.keys()]),
  ].sort();
  const maxMarketCount = Math.max(1, ...marketCounts.values());
  const marketLabel = new Map(marketTerms.map((t) => [t.value, t.label]));

  // Cross-tab format × market.
  const observedFormats = [
    ...new Set(crossRows.map((row) => row.format)),
  ].sort() as AdFormat[];
  const cross = new Map(crossRows.map((row) => [`${row.format}|${row.market}`, Number(row.count)]));

  const actuals: Record<string, number> = {
    concepts,
    variations,
    total_assets: assets,
    statics: typeCount("STATIC"),
    videos: typeCount("VIDEO"),
    motion: typeCount("MOTION"),
  };
  const METRIC_LABELS: Record<string, string> = {
    concepts: "Unique concepts",
    variations: "Variations",
    total_assets: "Assets delivered",
    statics: "Static concepts",
    videos: "Video concepts",
    motion: "Motion concepts",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <QuarterFilter quarters={quarters} current={quarter} />
        <span className="text-xs text-neutral-400">
          {quarter === "all" ? "all time" : quarter} · live from the library
        </span>
      </div>

      {/* Core counters: the three distinct production questions */}
      <div className="grid grid-cols-3 gap-3 lg:max-w-3xl">
        {[
          { label: "Unique concepts", value: concepts, hint: "true creative output" },
          { label: "Variations", value: variations, hint: "format declination work" },
          { label: "Assets delivered", value: assets, hint: "concepts × formats × markets" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-xs font-semibold text-neutral-700">{stat.label}</div>
            <div className="text-[10px] text-neutral-400">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Type split */}
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-bold">Static / video / motion split</h2>
          {concepts === 0 ? (
            <p className="mt-2 text-xs text-neutral-400">No concepts in this period.</p>
          ) : (
            <>
              <div className="mt-3 flex h-5 w-full overflow-hidden rounded">
                {conceptsByType.map((row) => (
                  <div
                    key={row.type}
                    className={TYPE_COLORS[row.type] ?? "bg-neutral-400"}
                    style={{ width: `${(row._count._all / concepts) * 100}%` }}
                    title={`${row.type.toLowerCase()}: ${row._count._all}`}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {conceptsByType.map((row) => (
                  <span key={row.type} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${TYPE_COLORS[row.type] ?? "bg-neutral-400"}`} />
                    {row.type.toLowerCase()}{" "}
                    <strong>{row._count._all}</strong>
                    <span className="text-neutral-400">
                      ({Math.round((row._count._all / concepts) * 100)}%)
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Market breakdown */}
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-bold">Assets per market</h2>
          <div className="mt-3 space-y-1.5">
            {allMarkets.map((market) => {
              const count = marketCounts.get(market) ?? 0;
              return (
                <div key={market} className="flex items-center gap-2 text-xs">
                  <span className="w-20 truncate" title={market}>
                    <span className="font-semibold uppercase">{market}</span>{" "}
                    <span className="text-neutral-400">{marketLabel.get(market) ?? ""}</span>
                  </span>
                  <div className="h-4 flex-1 rounded bg-neutral-100">
                    <div
                      className="h-4 rounded bg-emerald-500"
                      style={{ width: `${(count / maxMarketCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Targets */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-bold">Progress vs target {quarter !== "all" && `· ${quarter}`}</h2>
        {quarter === "all" ? (
          <p className="mt-2 text-xs text-neutral-400">Targets are quarterly — pick a quarter to track them.</p>
        ) : (
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-400">
                <th className="py-1 font-semibold">Metric</th>
                <th className="py-1 font-semibold">Actual</th>
                <th className="py-1 font-semibold">Target</th>
                <th className="w-1/3 py-1 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(METRIC_LABELS).map(([metric, label]) => (
                <TargetRow
                  key={metric}
                  quarter={quarter}
                  metric={metric}
                  label={label}
                  actual={actuals[metric] ?? 0}
                  target={targets.find((t) => t.metric === metric)?.targetValue ?? null}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Cross-tab format × market */}
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-bold">
          Format × market {quarter !== "all" && `· ${quarter}`}
          <span className="ml-2 font-normal text-neutral-400">(asset files delivered)</span>
        </h2>
        {observedFormats.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400">No assets in this period.</p>
        ) : (
          <table className="mt-2 text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-400">
                <th className="py-1 pr-6 font-semibold">Format</th>
                {allMarkets.map((market) => (
                  <th key={market} className="px-3 py-1 text-right font-semibold uppercase">
                    {market}
                  </th>
                ))}
                <th className="px-3 py-1 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {observedFormats.map((format) => {
                const total = allMarkets.reduce(
                  (sum, market) => sum + (cross.get(`${format}|${market}`) ?? 0),
                  0,
                );
                return (
                  <tr key={format} className="border-b border-neutral-100 last:border-0">
                    <td className="py-1 pr-6 font-semibold">{FORMAT_LABELS[format]}</td>
                    {allMarkets.map((market) => {
                      const count = cross.get(`${format}|${market}`) ?? 0;
                      return (
                        <td
                          key={market}
                          className={`px-3 py-1 text-right ${count === 0 ? "text-neutral-300" : ""}`}
                        >
                          {count}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1 text-right font-bold">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
