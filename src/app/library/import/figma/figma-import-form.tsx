"use client";

import { useState, useTransition } from "react";
import type { Glossary } from "@/lib/glossary";
import { NomenclatureFieldsEditor } from "@/components/nomenclature-fields";
import { FORMAT_LABELS } from "@/lib/formats";
import { ALL_FORMATS } from "@/lib/formats";
import { aiProposeFromUrl } from "../../actions";
import { confirmFigmaImport, FigmaPreview, previewFigmaImport } from "./actions";

export function FigmaImportForm({ glossary, aiEnabled }: { glossary: Glossary; aiEnabled: boolean }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<FigmaPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const [proposing, startProposing] = useTransition();

  function proposeWithAi() {
    const frame = preview?.frames.find((f) => f.previewUrl);
    if (!preview || !frame?.previewUrl) return;
    setError(null);
    startProposing(async () => {
      const result = await aiProposeFromUrl(frame.previewUrl!, `Figma layer name: ${preview.nodeName}`);
      if (result.error) setError(result.error);
      else {
        setPreview((p) => (p ? { ...p, fields: { ...p.fields, ...result.fields } } : p));
        setAiNote(result.rationale ?? null);
        setEditorKey((k) => k + 1);
      }
    });
  }

  function loadPreview() {
    setError(null);
    startTransition(async () => {
      const result = await previewFigmaImport(url);
      if (result.error) setError(result.error);
      else setPreview(result.preview ?? null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-lg border border-neutral-200 bg-white p-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.figma.com/design/<file>/...?node-id=123-456"
          className="flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button
          onClick={loadPreview}
          disabled={pending || !url}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending && !preview ? "Loading…" : "Preview"}
        </button>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {preview && (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await confirmFigmaImport(formData);
              if (result?.error) setError(result.error);
            });
          }}
          className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <input type="hidden" name="fileKey" value={preview.fileKey} />
          <input type="hidden" name="nodeId" value={preview.nodeId} />

          <div>
            <h2 className="text-sm font-bold">
              {preview.frames.length} frame{preview.frames.length > 1 ? "s" : ""} found under{" "}
              <code className="rounded bg-neutral-100 px-1">{preview.nodeName}</code>
            </h2>
            {preview.parseIssues.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Layer-name parsing: {preview.parseIssues.join(" · ")} — review the fields below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {preview.frames.map((frame) => (
              <div key={frame.nodeId} className="rounded border border-neutral-200 p-2">
                {frame.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={frame.previewUrl}
                    alt={frame.name}
                    className="aspect-square w-full rounded bg-neutral-50 object-contain"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded bg-neutral-50 text-xs text-neutral-400">
                    no preview
                  </div>
                )}
                <div className="mt-1 truncate text-[10px] text-neutral-500" title={frame.name}>
                  {frame.name} · {frame.width}×{frame.height}
                </div>
                <select
                  name={`frameFormat:${frame.nodeId}`}
                  defaultValue={frame.format}
                  className="mt-1 w-full rounded border border-neutral-300 px-1 py-0.5 text-xs"
                >
                  {ALL_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {FORMAT_LABELS[format]}
                    </option>
                  ))}
                </select>
                <input
                  type="hidden"
                  name={`frameRaw:${frame.nodeId}`}
                  value={`${frame.width}x${frame.height}`}
                />
              </div>
            ))}
          </div>

          <label className="block text-sm">
            <span className="font-semibold">Title</span>
            <input
              name="title"
              defaultValue={preview.nodeName}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>

          {aiEnabled && (
            <div>
              <button
                type="button"
                onClick={proposeWithAi}
                disabled={proposing || !preview.frames.some((f) => f.previewUrl)}
                className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {proposing ? "Analyzing creative…" : "✨ Complete fields with AI"}
              </button>
              {aiNote && <p className="mt-1 text-xs text-neutral-500">AI: {aiNote}</p>}
            </div>
          )}

          <NomenclatureFieldsEditor key={editorKey} glossary={glossary} initial={preview.fields} />

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Importing…" : `Import ${preview.frames.length} frames as one concept`}
          </button>
        </form>
      )}
    </div>
  );
}
