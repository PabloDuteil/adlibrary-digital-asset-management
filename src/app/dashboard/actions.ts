"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";

export const TARGET_METRICS = [
  "concepts",
  "variations",
  "total_assets",
  "statics",
  "videos",
  "motion",
] as const;
export type TargetMetric = (typeof TARGET_METRICS)[number];

export async function setTarget(formData: FormData): Promise<{ error?: string }> {
  await requireUser();
  const quarter = String(formData.get("quarter") ?? "");
  const metric = String(formData.get("metric") ?? "");
  const value = Number(formData.get("value"));
  if (!/^\d{4}-Q[1-4]$/.test(quarter)) return { error: "Invalid quarter." };
  if (!(TARGET_METRICS as readonly string[]).includes(metric) && !metric.startsWith("market:")) {
    return { error: "Unknown metric." };
  }
  if (!Number.isFinite(value) || value < 0) return { error: "Target must be a positive number." };

  if (value === 0) {
    await prisma.target.deleteMany({ where: { quarter, metric } });
  } else {
    await prisma.target.upsert({
      where: { quarter_metric: { quarter, metric } },
      create: { quarter, metric, targetValue: value },
      update: { targetValue: value },
    });
  }
  revalidatePath("/dashboard");
  return {};
}
