"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const STATUS_OPTIONS = [
  { value: "none", label: "not distributed" },
  { value: "some", label: "live on ≥1 channel" },
  { value: "all", label: "live everywhere" },
];

const MISSING_OPTIONS = [
  { value: "meta", label: "missing on Meta" },
  { value: "linkedin", label: "missing on LinkedIn" },
  { value: "google", label: "missing on Google" },
];

const TYPE_OPTIONS = ["STATIC", "VIDEO", "MOTION", "CARROUSEL", "UGC"];

export function DistributionFilters({ batches }: { batches: string[] }) {
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

  useEffect(() => {
    const handle = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) setParam("q", q);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const selects: { param: string; label: string; options: { value: string; label: string }[] }[] = [
    { param: "status", label: "Status", options: STATUS_OPTIONS },
    { param: "missing", label: "Missing on…", options: MISSING_OPTIONS },
    {
      param: "batch",
      label: "Batch",
      options: batches.map((batch) => ({ value: batch, label: batch })),
    },
    {
      param: "type",
      label: "Type",
      options: TYPE_OPTIONS.map((type) => ({ value: type, label: type.toLowerCase() })),
    },
  ];
  const anyActive = q || selects.some((select) => searchParams.get(select.param));

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-white p-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name…"
        className="w-48 rounded border border-neutral-300 px-2 py-1 text-xs"
      />
      {selects.map((select) => {
        const current = searchParams.get(select.param) ?? "";
        return (
          <select
            key={select.param}
            value={current}
            onChange={(e) => setParam(select.param, e.target.value)}
            className={`rounded border px-1.5 py-1 text-xs ${
              current ? "border-indigo-400 bg-indigo-50 font-semibold" : "border-neutral-300"
            }`}
          >
            <option value="">{select.label}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      })}
      {anyActive && (
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
