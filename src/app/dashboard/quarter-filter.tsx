"use client";

import { usePathname, useRouter } from "next/navigation";

export function QuarterFilter({ quarters, current }: { quarters: string[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      value={current}
      onChange={(e) => router.replace(`${pathname}?quarter=${e.target.value}`)}
      className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold"
    >
      {quarters.map((quarter) => (
        <option key={quarter} value={quarter}>
          {quarter}
        </option>
      ))}
      <option value="all">All time</option>
    </select>
  );
}
