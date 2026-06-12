import { prisma } from "@/lib/db";
import { DIMENSIONS } from "@/lib/dimensions";
import { AddTermForm } from "./add-term-form";

export const dynamic = "force-dynamic";

export default async function NomenclaturePage() {
  const terms = await prisma.nomenclatureTerm.findMany({
    orderBy: [{ dimension: "asc" }, { createdAt: "asc" }],
  });
  const byDimension = new Map<string, typeof terms>();
  for (const term of terms) {
    const list = byDimension.get(term.dimension) ?? [];
    list.push(term);
    byDimension.set(term.dimension, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Nomenclature</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Source of truth for the naming generator. Name format:{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
            BATCH_ft.format_al.awareness_a.angle_vp.value-prop_f.feature_t.tone_s.segment_p.persona_c.concept_h.hook_m.market_cv.var…
          </code>
          <br />
          Convention change: Format now uses <code className="rounded bg-amber-100 px-1 text-xs">ft.</code> (was{" "}
          <code className="rounded bg-neutral-100 px-1 text-xs">t.</code>, which collided with Tone). Legacy names
          are still parsed correctly.
        </p>
      </div>

      {DIMENSIONS.map((dim) => {
        const dimTerms = byDimension.get(dim.dimension) ?? [];
        return (
          <section key={dim.dimension} className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-baseline gap-3 border-b border-neutral-200 px-4 py-2">
              <h2 className="text-sm font-bold">{dim.label}</h2>
              <code className="text-xs text-indigo-600">{dim.prefix || "(no prefix)"}</code>
              <span className="text-xs text-neutral-500">{dim.description}</span>
              <span className="ml-auto text-xs text-neutral-400">{dimTerms.length} values</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {dimTerms.map((term) => (
                  <tr key={term.id} className="border-b border-neutral-100 last:border-0">
                    <td className="w-64 px-4 py-1.5 align-top">
                      <code className="text-xs font-semibold">
                        {term.prefix}
                        {term.value}
                      </code>
                    </td>
                    <td className="w-48 px-2 py-1.5 align-top text-neutral-700">{term.label}</td>
                    <td className="px-2 py-1.5 align-top text-neutral-500">{term.definition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-neutral-100 px-4 py-2">
              <AddTermForm
                dimension={dim.dimension}
                existingValues={dimTerms.map((t) => t.value)}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
