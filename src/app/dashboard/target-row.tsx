"use client";

import { useState, useTransition } from "react";
import { setTarget } from "./actions";

/** One metric row in the targets table: actual, inline-editable target, progress bar. */
export function TargetRow({
  quarter,
  metric,
  label,
  actual,
  target,
}: {
  quarter: string;
  metric: string;
  label: string;
  actual: number;
  target: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const pct = target ? Math.round((actual / target) * 100) : null;

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 font-bold">{actual}</td>
      <td className="py-1.5">
        {editing ? (
          <form
            action={(formData) => {
              startTransition(async () => {
                await setTarget(formData);
                setEditing(false);
              });
            }}
            className="flex items-center gap-1"
          >
            <input type="hidden" name="quarter" value={quarter} />
            <input type="hidden" name="metric" value={metric} />
            <input
              name="value"
              type="number"
              min={0}
              defaultValue={target ?? 0}
              autoFocus
              className="w-16 rounded border border-neutral-300 px-1 py-0.5 text-xs"
            />
            <button
              type="submit"
              disabled={pending}
              className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {pending ? "…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-neutral-400">
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left hover:text-indigo-700"
            title="Click to edit target (0 removes it)"
          >
            {target ?? <span className="text-neutral-300">set target</span>}
          </button>
        )}
      </td>
      <td className="py-1.5">
        {target ? (
          <div className="flex items-center gap-2">
            <div className="h-3 w-full max-w-48 rounded bg-neutral-100">
              <div
                className={`h-3 rounded ${pct! >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                style={{ width: `${Math.min(100, pct!)}%` }}
              />
            </div>
            <span className={`font-semibold ${pct! >= 100 ? "text-emerald-600" : ""}`}>{pct}%</span>
          </div>
        ) : (
          <span className="text-neutral-300">—</span>
        )}
      </td>
    </tr>
  );
}
