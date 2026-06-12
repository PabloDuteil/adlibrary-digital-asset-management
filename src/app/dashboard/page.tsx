import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [concepts, variations, assetFiles] = await Promise.all([
    prisma.concept.count(),
    prisma.variation.count(),
    prisma.assetFile.count(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-3 sm:max-w-2xl">
        {[
          { label: "Unique concepts", value: concepts },
          { label: "Variations", value: variations },
          { label: "Assets delivered", value: assetFiles },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-neutral-500">{stat.label}</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-neutral-500">
        Full metrics (splits, markets, targets, cross-tabs) land in Phase 2.
      </p>
    </div>
  );
}
