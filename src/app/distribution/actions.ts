"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { CHANNEL_ADAPTERS, type Channel } from "@/lib/channels";
import { matchAdsToConcepts } from "@/lib/distribution-match";

const CHANNELS: Channel[] = ["meta", "linkedin", "google"];

/** Mark/unmark a whole selection on one channel in a single transaction. */
export async function bulkSetDistribution(
  conceptIds: string[],
  channel: Channel,
  value: boolean,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!CHANNELS.includes(channel)) return { error: "Unknown channel" };
  if (conceptIds.length === 0) return { error: "Nothing selected." };

  const stamp = {
    [channel]: value,
    [`${channel}At`]: value ? new Date() : null,
    [`${channel}By`]: value ? user.email : null,
  };
  await prisma.$transaction(
    conceptIds.map((conceptId) =>
      prisma.distributionStatus.upsert({
        where: { conceptId },
        create: { conceptId, ...stamp },
        update: stamp,
      }),
    ),
  );
  revalidatePath("/distribution");
  revalidatePath("/library");
  return {};
}

export type SyncResult = {
  error?: string;
  adsSeen?: number;
  matched?: number;
  newlyMarked?: number;
  unmatched?: string[];
};

/**
 * Auto-detect: list the channel's live ad names, match them to concepts by
 * nomenclature, and flip any concept found running to "distributed". Never
 * un-marks anything — absence from the ads list is not proof of absence
 * (paused campaigns, other accounts), and manual state must survive a sync.
 */
export async function runAutoDetect(channel: Channel): Promise<SyncResult> {
  const user = await requireUser();
  const adapter = CHANNEL_ADAPTERS[channel];
  if (!adapter) return { error: "Unknown channel" };
  if (!adapter.enabled()) {
    return { error: `${adapter.label} is not configured (${adapter.requiredEnv.join(", ")}).` };
  }

  let adNames: string[];
  try {
    adNames = await adapter.fetchAdNames();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Channel API call failed." };
  }

  const concepts = await prisma.concept.findMany({
    select: { id: true, name: true, batch: true, conceptCode: true, hook: true },
  });
  const { matched, unmatched } = matchAdsToConcepts(adNames, concepts);

  // Only flip concepts not already marked, so existing who/when audit survives.
  const alreadyOn = await prisma.distributionStatus.findMany({
    where: { conceptId: { in: [...matched.keys()] }, [channel]: true },
    select: { conceptId: true },
  });
  const skip = new Set(alreadyOn.map((status) => status.conceptId));
  const toMark = [...matched.keys()].filter((conceptId) => !skip.has(conceptId));

  const stamp = {
    [channel]: true,
    [`${channel}At`]: new Date(),
    [`${channel}By`]: `auto-detect (${user.email})`,
  };
  await prisma.$transaction([
    ...toMark.map((conceptId) =>
      prisma.distributionStatus.upsert({
        where: { conceptId },
        create: { conceptId, ...stamp },
        update: stamp,
      }),
    ),
    prisma.syncRun.create({
      data: {
        channel,
        ranBy: user.email,
        adsSeen: adNames.length,
        matched: matched.size,
        newlyMarked: toMark.length,
        unmatched: unmatched.slice(0, 25),
      },
    }),
  ]);

  revalidatePath("/distribution");
  revalidatePath("/library");
  return {
    adsSeen: adNames.length,
    matched: matched.size,
    newlyMarked: toMark.length,
    unmatched: unmatched.slice(0, 25),
  };
}
