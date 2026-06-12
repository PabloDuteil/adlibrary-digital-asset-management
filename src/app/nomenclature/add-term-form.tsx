"use client";

import { useState, useTransition } from "react";
import { addTerm } from "./actions";

/**
 * Inline add-term form. While typing a value, surfaces existing values that
 * look similar so the user checks an equivalent term doesn't already exist.
 */
export function AddTermForm({
  dimension,
  existingValues,
}: {
  dimension: string;
  existingValues: string[];
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
        + Add value
      </button>
    );
  }

  const needle = value.trim().toLowerCase();
  const similar =
    needle.length >= 2
      ? existingValues.filter((v) => v.toLowerCase().includes(needle)).slice(0, 8)
      : [];

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addTerm(formData);
          if (result.error) setError(result.error);
          else {
            setOpen(false);
            setValue("");
          }
        });
      }}
      className="flex flex-wrap items-start gap-2"
    >
      <input type="hidden" name="dimension" value={dimension} />
      <div>
        <input
          name="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="value (kebab-case)"
          required
          className="w-48 rounded border border-neutral-300 px-2 py-1 text-xs"
        />
        {similar.length > 0 && (
          <div className="mt-1 text-xs text-amber-700">
            Already exists? {similar.join(", ")}
          </div>
        )}
      </div>
      <input
        name="label"
        placeholder="label (optional)"
        className="w-40 rounded border border-neutral-300 px-2 py-1 text-xs"
      />
      <input
        name="definition"
        placeholder="definition — when should this value be used?"
        required
        className="w-96 rounded border border-neutral-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800"
      >
        Cancel
      </button>
      {error && <div className="w-full text-xs text-red-600">{error}</div>}
    </form>
  );
}
