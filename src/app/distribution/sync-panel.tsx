"use client";

import { useState, useTransition } from "react";
import { runAutoDetect, type SyncResult } from "./actions";
import type { Channel } from "@/lib/channels";

type ChannelInfo = {
  channel: Channel;
  label: string;
  enabled: boolean;
  requiredEnv: string[];
  lastRun: {
    ranAt: string;
    ranBy: string | null;
    adsSeen: number;
    matched: number;
    newlyMarked: number;
    unmatched: string[];
  } | null;
};

/**
 * Auto-detect: pulls live ad names from a channel's ads API and marks the
 * matching concepts as distributed (names are matched on the nomenclature).
 */
export function SyncPanel({ channels }: { channels: ChannelInfo[] }) {
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null);
  const [results, setResults] = useState<Partial<Record<Channel, SyncResult>>>({});
  const [, startTransition] = useTransition();

  const run = (channel: Channel) => {
    setPendingChannel(channel);
    startTransition(async () => {
      const result = await runAutoDetect(channel);
      setResults((prev) => ({ ...prev, [channel]: result }));
      setPendingChannel(null);
    });
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-bold">Auto-detect</h2>
        <span className="text-[11px] text-neutral-500">
          reads live ad names from the channel and marks matching concepts as distributed —
          nothing is ever un-marked
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {channels.map((info) => {
          const result = results[info.channel];
          return (
            <div key={info.channel} className="rounded border border-neutral-200 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{info.label}</span>
                <button
                  disabled={!info.enabled || pendingChannel !== null}
                  onClick={() => run(info.channel)}
                  className="rounded bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {pendingChannel === info.channel ? "Syncing…" : "Sync now"}
                </button>
              </div>
              {!info.enabled && (
                <p className="mt-1 text-[10px] leading-snug text-neutral-400">
                  Not configured — set{" "}
                  <span className="font-mono">{info.requiredEnv.join(", ")}</span> to enable.
                </p>
              )}
              {result?.error && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">{result.error}</p>
              )}
              {result && !result.error && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  {result.adsSeen} ads seen · {result.matched} matched ·{" "}
                  <span className="font-bold">{result.newlyMarked} newly marked</span>
                  {result.unmatched && result.unmatched.length > 0 && (
                    <span className="block text-neutral-500">
                      unmatched: {result.unmatched.slice(0, 5).join(", ")}
                      {result.unmatched.length > 5 ? "…" : ""}
                    </span>
                  )}
                </p>
              )}
              {!result && info.lastRun && (
                <p className="mt-1 text-[10px] text-neutral-500">
                  last run {info.lastRun.ranAt} by {info.lastRun.ranBy ?? "?"} ·{" "}
                  {info.lastRun.adsSeen} ads · {info.lastRun.matched} matched ·{" "}
                  {info.lastRun.newlyMarked} newly marked
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
