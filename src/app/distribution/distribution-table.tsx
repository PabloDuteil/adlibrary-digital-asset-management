"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleDistribution } from "../library/actions";
import { bulkSetDistribution } from "./actions";
import type { Channel } from "@/lib/channels";

export type DistributionRow = {
  id: string;
  title: string;
  name: string;
  batch: string;
  type: string;
  thumbnailUrl: string | null;
  meta: boolean;
  metaInfo: string | null;
  linkedin: boolean;
  linkedinInfo: string | null;
  google: boolean;
  googleInfo: string | null;
};

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "meta", label: "Meta" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "google", label: "Google" },
];

export function DistributionTable({ rows }: { rows: DistributionRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  // Optimistic overrides so checkboxes respond instantly; server revalidation wins.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const checked = (row: DistributionRow, channel: Channel) =>
    overrides[`${row.id}:${channel}`] ?? row[channel];

  const setOne = (row: DistributionRow, channel: Channel, value: boolean) => {
    setOverrides((prev) => ({ ...prev, [`${row.id}:${channel}`]: value }));
    startTransition(() => toggleDistribution(row.id, channel, value));
  };

  const bulk = (channel: Channel, value: boolean) => {
    const ids = [...selected];
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of ids) next[`${id}:${channel}`] = value;
      return next;
    });
    startTransition(async () => {
      await bulkSetDistribution(ids, channel, value);
      setSelected(new Set());
    });
  };

  return (
    <div className="space-y-2">
      {selected.size > 0 && (
        <div className="sticky top-12 z-30 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs">
          <span className="font-bold text-indigo-900">{selected.size} selected</span>
          <span className="text-indigo-700">mark live:</span>
          {CHANNELS.map((channel) => (
            <button
              key={`on-${channel.key}`}
              disabled={pending}
              onClick={() => bulk(channel.key, true)}
              className="rounded bg-indigo-600 px-2 py-1 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              ✓ {channel.label}
            </button>
          ))}
          <span className="ml-2 text-indigo-700">unmark:</span>
          {CHANNELS.map((channel) => (
            <button
              key={`off-${channel.key}`}
              disabled={pending}
              onClick={() => bulk(channel.key, false)}
              className="rounded border border-indigo-300 bg-white px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              ✕ {channel.label}
            </button>
          ))}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto font-semibold text-indigo-500 hover:text-indigo-800"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[10px] uppercase tracking-wide text-neutral-500">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-indigo-600"
                />
              </th>
              <th className="px-2 py-2">Concept</th>
              <th className="px-2 py-2">Batch</th>
              <th className="px-2 py-2">Type</th>
              {CHANNELS.map((channel) => (
                <th key={channel.key} className="px-2 py-2 text-center">
                  {channel.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-neutral-100 last:border-0 ${
                  selected.has(row.id) ? "bg-indigo-50/60" : "hover:bg-neutral-50"
                }`}
              >
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    className="h-3.5 w-3.5 accent-indigo-600"
                  />
                </td>
                <td className="max-w-md px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    {row.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.thumbnailUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded bg-neutral-100" />
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/library/${row.id}`}
                        className="block truncate font-semibold hover:text-indigo-700"
                      >
                        {row.title}
                      </Link>
                      <div className="truncate font-mono text-[10px] text-neutral-400">
                        {row.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-1.5 font-semibold text-neutral-600">{row.batch}</td>
                <td className="px-2 py-1.5 lowercase text-neutral-600">{row.type}</td>
                {CHANNELS.map((channel) => {
                  const info = row[`${channel.key}Info` as const];
                  return (
                    <td key={channel.key} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={checked(row, channel.key)}
                        onChange={(e) => setOne(row, channel.key, e.target.checked)}
                        title={info ?? `Not live on ${channel.label}`}
                        className="h-4 w-4 cursor-pointer accent-indigo-600"
                      />
                      {checked(row, channel.key) && info && (
                        <div className="mt-0.5 max-w-32 truncate text-[9px] text-neutral-400" title={info}>
                          {info}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
