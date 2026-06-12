"use client";

import { useRef, useState, useTransition } from "react";
import type { Glossary } from "@/lib/glossary";
import type { NomenclatureFields } from "@/lib/nomenclature";
import { NomenclatureFieldsEditor } from "@/components/nomenclature-fields";
import { aiProposeFromUpload, uploadConcept } from "../actions";

export function UploadForm({
  glossary,
  defaultBatch,
  aiEnabled,
}: {
  glossary: Glossary;
  defaultBatch: string;
  aiEnabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [proposal, setProposal] = useState<Partial<NomenclatureFields>>({});
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const [proposing, startProposing] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function proposeWithAi() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setError(null);
    setAiNote(null);
    startProposing(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await aiProposeFromUpload(formData);
      if (result.error) setError(result.error);
      else {
        setProposal((prev) => ({ ...prev, ...result.fields }));
        setAiNote(result.rationale ?? null);
        setEditorKey((k) => k + 1);
      }
    });
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await uploadConcept(formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <label className="block text-sm">
        <span className="font-semibold">Files</span>
        <input
          ref={fileInput}
          type="file"
          name="files"
          multiple
          required
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            setFileCount(files.length);
            if (files.length > 0) {
              setProposal((prev) => ({
                ...prev,
                format: files[0].type.startsWith("video/") ? "video" : "static",
              }));
              setEditorKey((k) => k + 1);
            }
          }}
          className="mt-1 block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
        />
        {fileCount > 1 && (
          <span className="mt-1 block text-xs text-neutral-500">
            {fileCount} files → one concept, one variation per detected format.
          </span>
        )}
      </label>

      <label className="block text-sm">
        <span className="font-semibold">Title</span>
        <input
          name="title"
          placeholder="Short human title (defaults to the generated name)"
          className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </label>

      {aiEnabled && (
        <div>
          <button
            type="button"
            onClick={proposeWithAi}
            disabled={proposing || fileCount === 0}
            className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            {proposing ? "Analyzing creative…" : "✨ Propose fields with AI"}
          </button>
          {aiNote && <p className="mt-1 text-xs text-neutral-500">AI: {aiNote}</p>}
        </div>
      )}

      <NomenclatureFieldsEditor
        key={editorKey}
        glossary={glossary}
        initial={{ batch: defaultBatch, market: "fr", conceptVars: [], ...proposal }}
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Save to library"}
      </button>
    </form>
  );
}
