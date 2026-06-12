"use server";

import { revalidatePath } from "next/cache";
import { Dimension } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { DIMENSION_BY_KEY } from "@/lib/dimensions";

const addTermSchema = z.object({
  dimension: z.nativeEnum(Dimension),
  value: z
    .string()
    .min(1)
    .max(60)
    .transform((v) => v.trim()),
  label: z.string().max(120).optional(),
  definition: z.string().min(1).max(1000),
});

export async function addTerm(formData: FormData): Promise<{ error?: string }> {
  await requireUser();
  const parsed = addTermSchema.safeParse({
    dimension: formData.get("dimension"),
    value: formData.get("value"),
    label: formData.get("label") || undefined,
    definition: formData.get("definition"),
  });
  if (!parsed.success) return { error: "Value and definition are required." };

  const { dimension, value, label, definition } = parsed.data;
  // Batches are uppercase bare tokens; every other dimension is kebab-case.
  const normalized =
    dimension === "BATCH" ? value.toUpperCase() : value.toLowerCase().replace(/\s+/g, "-");
  if (dimension !== "BATCH" && !/^[a-z0-9+][a-z0-9+.-]*$/.test(normalized)) {
    return { error: "Values must be kebab-case (letters, digits, hyphens)." };
  }

  const existing = await prisma.nomenclatureTerm.findUnique({
    where: { dimension_value: { dimension, value: normalized } },
  });
  if (existing) return { error: `"${normalized}" already exists in this dimension.` };

  const user = await requireUser();
  await prisma.nomenclatureTerm.create({
    data: {
      dimension,
      prefix: DIMENSION_BY_KEY[dimension].prefix,
      value: normalized,
      label: label || normalized,
      definition,
      createdBy: user.email,
    },
  });
  revalidatePath("/nomenclature");
  return {};
}

export async function updateTermDefinition(formData: FormData): Promise<{ error?: string }> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const definition = String(formData.get("definition") ?? "").trim();
  if (!id || !definition) return { error: "Definition cannot be empty." };
  await prisma.nomenclatureTerm.update({ where: { id }, data: { definition } });
  revalidatePath("/nomenclature");
  return {};
}
