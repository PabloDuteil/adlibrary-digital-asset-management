import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getGlossary } from "@/lib/glossary";
import { FORMAT_LABELS } from "@/lib/formats";
import { storage } from "@/lib/storage";
import { DistributionToggles } from "../distribution-toggles";
import { EditFieldsForm } from "./edit-fields-form";

export const dynamic = "force-dynamic";

export default async function ConceptDetailPage({
  params,
}: {
  params: Promise<{ conceptId: string }>;
}) {
  const { conceptId } = await params;
  const [concept, glossary] = await Promise.all([
    prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        distribution: true,
        variations: {
          orderBy: { format: "asc" },
          include: {
            localizations: { orderBy: { market: "asc" }, include: { assetFiles: true } },
          },
        },
      },
    }),
    getGlossary(),
  ]);
  if (!concept) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <Link href="/library" className="text-xs text-neutral-500 hover:text-neutral-800">
          ← Library
        </Link>
        <h1 className="break-all font-mono text-sm font-bold">{concept.name}</h1>
        {concept.nameStatus === "NEEDS_REVIEW" && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
            needs review
          </span>
        )}
      </div>

      {concept.nameIssues.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Name issues:</span> {concept.nameIssues.join(" · ")}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {concept.variations.map((variation) => (
            <section key={variation.id} className="rounded-lg border border-neutral-200 bg-white p-3">
              <h2 className="text-sm font-bold">
                {FORMAT_LABELS[variation.format]}
                {variation.rawFormat && (
                  <span className="ml-2 text-xs font-normal text-neutral-400">{variation.rawFormat}</span>
                )}
              </h2>
              <div className="mt-2 flex flex-wrap gap-3">
                {variation.localizations.map((localization) =>
                  localization.assetFiles.map((asset) => (
                    <figure key={asset.id} className="w-52">
                      {asset.mimeType.startsWith("video/") ? (
                        <video
                          src={storage.publicUrl(asset.fileKey)}
                          controls
                          className="w-full rounded border border-neutral-200 bg-neutral-50"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={storage.publicUrl(asset.fileKey)}
                          alt={concept.title}
                          className="w-full rounded border border-neutral-200 bg-neutral-50 object-contain"
                        />
                      )}
                      <figcaption className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
                        <span className="uppercase">{localization.market}</span>
                        <span>
                          {asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.mimeType}
                          {" · "}
                          {(asset.fileSize / 1024).toFixed(0)} KB
                        </span>
                        <a
                          href={`/api/assets/${asset.id}/png`}
                          className="font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          PNG ↓
                        </a>
                      </figcaption>
                    </figure>
                  )),
                )}
                {variation.localizations.length === 0 && (
                  <p className="text-xs text-neutral-400">No localizations yet.</p>
                )}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-3">
          <section className="rounded-lg border border-neutral-200 bg-white p-3">
            <h2 className="text-sm font-bold">Distribution</h2>
            <div className="mt-2">
              <DistributionToggles conceptId={concept.id} distribution={concept.distribution} />
            </div>
            {concept.distribution && (
              <dl className="mt-2 space-y-0.5 text-[10px] text-neutral-500">
                {(["meta", "linkedin", "google"] as const).map((channel) => {
                  const at = concept.distribution![`${channel}At`];
                  const by = concept.distribution![`${channel}By`];
                  if (!at) return null;
                  return (
                    <div key={channel}>
                      {channel}: {at.toISOString().slice(0, 10)} by {by}
                    </div>
                  );
                })}
              </dl>
            )}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-3">
            <h2 className="text-sm font-bold">Source</h2>
            <dl className="mt-1 space-y-1 text-xs text-neutral-600">
              <div>
                <dt className="inline font-semibold">Origin: </dt>
                <dd className="inline">{concept.source.toLowerCase()}</dd>
              </div>
              {concept.sourceUrl && (
                <div>
                  <a
                    href={concept.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Open in {concept.source === "FIGMA" ? "Figma" : "source"} ↗
                  </a>
                </div>
              )}
              <div>
                <dt className="inline font-semibold">Created: </dt>
                <dd className="inline">
                  {concept.createdAt.toISOString().slice(0, 10)} by {concept.createdBy ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-3">
            <h2 className="text-sm font-bold">Nomenclature</h2>
            <div className="mt-2">
              <EditFieldsForm concept={concept} glossary={glossary} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
