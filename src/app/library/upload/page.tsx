import { getGlossary } from "@/lib/glossary";
import { batchForDate } from "@/lib/nomenclature";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const glossary = await getGlossary();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Upload assets</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Select the format files of one concept (e.g. its 1:1, 4:5, 9:16 and 1.91:1 exports).
          Formats are detected from the image dimensions; the name is generated from the fields
          below — review before saving.
        </p>
      </div>
      <UploadForm
        glossary={glossary}
        defaultBatch={batchForDate()}
        aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
