"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Glossary } from "@/lib/glossary";

const SELECT_FILTERS: { param: string; label: string; dimension?: string; options?: { value: string; label: string }[] }[] = [
  {
    param: "type",
    label: "Type",
    options: ["STATIC", "VIDEO", "MOTION", "CARROUSEL", "UGC"].map((t) => ({
      value: t,
      label: t.toLowerCase(),
    })),
  },
  { param: "batch", label: "Batch", dimension: "BATCH" },
  { param: "market", label: "Market", dimension: "MARKET" },
  {
    param: "channel",
    label: "Channel",
    options: [
      { value: "meta", label: "on Meta" },
      { value: "linkedin", label: "on LinkedIn" },
      { value: "google", label: "on Google" },
      { value: "none", label: "not distributed" },
    ],
  },
  { param: "angle", label: "Angle", dimension: "ANGLE" },
  { param: "valueProp", label: "Value prop", dimension: "VALUE_PROP" },
  { param: "feature", label: "Feature", dimension: "FEATURE" },
  { param: "persona", label: "Persona", dimension: "PERSONA" },
  { param: "segment", label: "Segment", dimension: "SEGMENT" },
  { param: "awareness", label: "Awareness", dimension: "AWARENESS" },
  { param: "tone", label: "Tone", dimension: "TONE" },
  { param: "conceptCode", label: "Concept", dimension: "CONCEPT" },
  { param: "hook", label: "Hook", dimension: "HOOK" },
];

export function FilterBar({ glossary }: { glossary: Glossary }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  // Debounced free-text search.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) setParam("q", q);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCount = SELECT_FILTERS.filter((f) => searchParams.get(f.param)).length;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-white p-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name…"
        className="w-48 rounded border border-neutral-300 px-2 py-1 text-xs"
      />
      {SELECT_FILTERS.map((filter) => {
        const options = filter.options ?? glossary[filter.dimension!] ?? [];
        const current = searchParams.get(filter.param) ?? "";
        return (
          <select
            key={filter.param}
            value={current}
            onChange={(e) => setParam(filter.param, e.target.value)}
            className={`rounded border px-1.5 py-1 text-xs ${
              current ? "border-indigo-400 bg-indigo-50 font-semibold" : "border-neutral-300"
            }`}
          >
            <option value="">{filter.label}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value ?? o.label}
              </option>
            ))}
          </select>
        );
      })}
      {(activeCount > 0 || q) && (
        <button
          onClick={() => {
            setQ("");
            router.replace(pathname);
          }}
          className="ml-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
