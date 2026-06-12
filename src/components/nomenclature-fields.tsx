"use client";

import { useMemo, useState } from "react";
import type { Glossary } from "@/lib/glossary";
import { buildAdName, NomenclatureFields } from "@/lib/nomenclature";

const SELECTS: { name: keyof NomenclatureFields; label: string; dimension: string; required?: boolean }[] = [
  { name: "batch", label: "Batch", dimension: "BATCH", required: true },
  { name: "format", label: "Format ft.", dimension: "FORMAT", required: true },
  { name: "awareness", label: "Awareness al.", dimension: "AWARENESS" },
  { name: "angle", label: "Angle a.", dimension: "ANGLE" },
  { name: "valueProp", label: "Value prop vp.", dimension: "VALUE_PROP" },
  { name: "feature", label: "Feature f.", dimension: "FEATURE" },
  { name: "tone", label: "Tone t.", dimension: "TONE" },
  { name: "segment", label: "Segment s.", dimension: "SEGMENT" },
  { name: "persona", label: "Persona p.", dimension: "PERSONA" },
  { name: "conceptCode", label: "Concept c.", dimension: "CONCEPT" },
  { name: "hook", label: "Hook h.", dimension: "HOOK" },
  { name: "market", label: "Market m.", dimension: "MARKET" },
];

/**
 * Dropdown editor for all nomenclature dimensions, fed by the glossary, with
 * a live preview of the generated name. Renders plain form inputs so any
 * server action can read it via fieldsFromForm().
 */
export function NomenclatureFieldsEditor({
  glossary,
  initial,
}: {
  glossary: Glossary;
  initial?: Partial<NomenclatureFields>;
}) {
  const [fields, setFields] = useState<NomenclatureFields>({
    conceptVars: initial?.conceptVars ?? [],
    ...initial,
  });
  const [conceptVarsText, setConceptVarsText] = useState((initial?.conceptVars ?? []).join(", "));

  const name = useMemo(
    () =>
      buildAdName({
        ...fields,
        conceptVars: conceptVarsText
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      }),
    [fields, conceptVarsText],
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {SELECTS.map((select) => {
          const options = glossary[select.dimension] ?? [];
          const current = (fields[select.name] as string | undefined) ?? "";
          const unknownValue = current && !options.some((o) => o.value === current);
          return (
            <label key={select.name} className="block text-xs">
              <span className="font-semibold text-neutral-600">
                {select.label}
                {select.required && <span className="text-red-500"> *</span>}
              </span>
              <select
                name={select.name}
                value={current}
                required={select.required}
                onChange={(e) => setFields((f) => ({ ...f, [select.name]: e.target.value || undefined }))}
                className={`mt-0.5 w-full rounded border px-1.5 py-1 text-xs ${
                  unknownValue ? "border-amber-400 bg-amber-50" : "border-neutral-300"
                }`}
              >
                <option value="">—</option>
                {unknownValue && <option value={current}>{current} (not in glossary)</option>}
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
        <label className="col-span-2 block text-xs">
          <span className="font-semibold text-neutral-600">Concept vars cv. (comma-separated)</span>
          <input
            name="conceptVars"
            value={conceptVarsText}
            onChange={(e) => setConceptVarsText(e.target.value)}
            placeholder="marmot, pharmacy-scene"
            className="mt-0.5 w-full rounded border border-neutral-300 px-1.5 py-1 text-xs"
          />
        </label>
      </div>
      <div className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5">
        <div className="text-[10px] font-semibold uppercase text-neutral-400">Generated name</div>
        <code className="break-all text-xs">{name || "—"}</code>
      </div>
    </div>
  );
}
