import { getGlossary } from "@/lib/glossary";
import { FigmaImportForm } from "./figma-import-form";

export const dynamic = "force-dynamic";

export default async function FigmaImportPage() {
  const glossary = await getGlossary();
  const configured = Boolean(process.env.FIGMA_TOKEN);
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Import from Figma</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Paste the link of a Figma section/group containing the format frames of one concept
          (or a single frame). Frames are exported as PNG automatically; the layer name is
          parsed into the nomenclature when it follows the convention.
        </p>
      </div>
      {!configured && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span className="font-semibold">FIGMA_TOKEN is not configured.</span> Add a Figma
          personal access token to the server environment to enable imports.
        </div>
      )}
      <FigmaImportForm glossary={glossary} aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />
    </div>
  );
}
