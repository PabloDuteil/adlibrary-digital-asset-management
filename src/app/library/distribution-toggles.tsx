"use client";

import { useOptimistic, useTransition } from "react";
import type { DistributionStatus } from "@prisma/client";
import { Channel, toggleDistribution } from "./actions";

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "meta", label: "Meta" },
  { key: "linkedin", label: "LkdIn" },
  { key: "google", label: "Google" },
];

export function DistributionToggles({
  conceptId,
  distribution,
}: {
  conceptId: string;
  distribution: DistributionStatus | null;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic({
    meta: distribution?.meta ?? false,
    linkedin: distribution?.linkedin ?? false,
    google: distribution?.google ?? false,
  });

  return (
    <div className="flex gap-2 text-[10px] text-neutral-600">
      {CHANNELS.map((channel) => (
        <label key={channel.key} className="flex cursor-pointer items-center gap-0.5">
          <input
            type="checkbox"
            checked={optimistic[channel.key]}
            onChange={(e) => {
              const value = e.target.checked;
              startTransition(async () => {
                setOptimistic((prev) => ({ ...prev, [channel.key]: value }));
                await toggleDistribution(conceptId, channel.key, value);
              });
            }}
            className="h-3 w-3 accent-indigo-600"
          />
          {channel.label}
        </label>
      ))}
    </div>
  );
}
