"use client";

import { useState, useTransition } from "react";
import type { Concept } from "@prisma/client";
import type { Glossary } from "@/lib/glossary";
import { NomenclatureFieldsEditor } from "@/components/nomenclature-fields";
import { updateConceptFields } from "../actions";

export function EditFieldsForm({ concept, glossary }: { concept: Concept; glossary: Glossary }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateConceptFields(concept.id, formData);
          if (result.error) setError(result.error);
          else setSaved(true);
        });
      }}
      className="space-y-3"
    >
      <label className="block text-xs">
        <span className="font-semibold text-neutral-600">Title</span>
        <input
          name="title"
          defaultValue={concept.title}
          className="mt-0.5 w-full rounded border border-neutral-300 px-1.5 py-1 text-xs"
        />
      </label>
      <NomenclatureFieldsEditor
        glossary={glossary}
        initial={{
          batch: concept.batch,
          format: concept.type.toLowerCase(),
          awareness: concept.awareness ?? undefined,
          angle: concept.angle ?? undefined,
          valueProp: concept.valueProp ?? undefined,
          feature: concept.feature ?? undefined,
          tone: concept.tone ?? undefined,
          segment: concept.segment ?? undefined,
          persona: concept.persona ?? undefined,
          conceptCode: concept.conceptCode ?? undefined,
          hook: concept.hook ?? undefined,
          conceptVars: concept.conceptVars,
        }}
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      {saved && <div className="text-xs text-emerald-600">Saved — name regenerated.</div>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save fields"}
      </button>
    </form>
  );
}
