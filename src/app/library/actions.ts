"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { AdType, NameStatus } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { createConceptWithAssets } from "@/lib/assets";
import { formatFromDimensions, FORMAT_LABELS } from "@/lib/formats";
import {
  buildAdName,
  NomenclatureFields,
  parseAdName,
  validateAgainstGlossary,
} from "@/lib/nomenclature";
import { fieldsFromForm } from "@/lib/nomenclature-form";

const CHANNELS = ["meta", "linkedin", "google"] as const;
export type Channel = (typeof CHANNELS)[number];

export async function toggleDistribution(conceptId: string, channel: Channel, value: boolean) {
  const user = await requireUser();
  if (!CHANNELS.includes(channel)) throw new Error("Unknown channel");
  await prisma.distributionStatus.upsert({
    where: { conceptId },
    create: {
      conceptId,
      [channel]: value,
      [`${channel}At`]: value ? new Date() : null,
      [`${channel}By`]: value ? user.email : null,
    },
    update: {
      [channel]: value,
      [`${channel}At`]: value ? new Date() : null,
      [`${channel}By`]: value ? user.email : null,
    },
  });
  revalidatePath("/library");
}

async function nameStatusFor(fields: NomenclatureFields): Promise<{
  status: NameStatus;
  issues: string[];
}> {
  const glossary = await prisma.nomenclatureTerm.findMany({
    select: { dimension: true, value: true },
  });
  const issues = validateAgainstGlossary(fields, glossary);
  if (!fields.batch) issues.push("missing batch");
  if (!fields.format) issues.push("missing format");
  return { status: issues.length === 0 ? "CONFORMING" : "NEEDS_REVIEW", issues };
}

export type UploadResult = { error?: string };

/** Native upload: one or more files become one concept (one variation per detected format). */
export async function uploadConcept(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Pick at least one file." };

  const fields = fieldsFromForm(formData);
  if (!fields.batch || !fields.format) return { error: "Batch and format are required." };

  const name = buildAdName(fields);
  const existing = await prisma.concept.findUnique({ where: { name } });
  if (existing) return { error: `A concept named "${name}" already exists.` };

  const type = (fields.format?.toUpperCase() ?? "STATIC") as AdType;
  const market = fields.market ?? "fr";
  const language = String(formData.get("language") ?? "").trim() || market;

  const variations = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const isImage = file.type.startsWith("image/");
    let width: number | null = null;
    let height: number | null = null;
    if (isImage) {
      const meta = await sharp(buffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    }
    const format = width && height ? formatFromDimensions(width, height) : "OTHER";
    variations.push({
      format,
      rawFormat: format === "OTHER" ? (width && height ? `${width}x${height}` : file.name) : null,
      localizations: [
        {
          market,
          language,
          files: [
            {
              buffer,
              mimeType: file.type || "application/octet-stream",
              width,
              height,
              suffix: `${FORMAT_LABELS[format].replace(":", "x")}_${market}`,
            },
          ],
        },
      ],
    });
  }

  const { status, issues } = await nameStatusFor(fields);
  await createConceptWithAssets({
    title: String(formData.get("title") ?? "").trim() || name,
    name,
    nameStatus: status,
    nameIssues: issues,
    type,
    source: "UPLOAD",
    fields,
    createdBy: user.email,
    variations,
  });

  revalidatePath("/library");
  redirect("/library");
}

/** Edit nomenclature fields from the detail view; regenerates the name. */
export async function updateConceptFields(
  conceptId: string,
  formData: FormData,
): Promise<UploadResult> {
  await requireUser();
  const fields = fieldsFromForm(formData);
  if (!fields.batch || !fields.format) return { error: "Batch and format are required." };

  const name = buildAdName(fields);
  const clash = await prisma.concept.findUnique({ where: { name } });
  if (clash && clash.id !== conceptId) {
    return { error: `Another concept already uses the name "${name}".` };
  }

  const { status, issues } = await nameStatusFor(fields);
  await prisma.concept.update({
    where: { id: conceptId },
    data: {
      name,
      nameStatus: status,
      nameIssues: issues,
      batch: fields.batch,
      type: fields.format.toUpperCase() as AdType,
      awareness: fields.awareness ?? null,
      angle: fields.angle ?? null,
      valueProp: fields.valueProp ?? null,
      feature: fields.feature ?? null,
      tone: fields.tone ?? null,
      segment: fields.segment ?? null,
      persona: fields.persona ?? null,
      conceptCode: fields.conceptCode ?? null,
      hook: fields.hook ?? null,
      conceptVars: fields.conceptVars,
      title: String(formData.get("title") ?? "").trim() || name,
    },
  });
  revalidatePath("/library");
  revalidatePath(`/library/${conceptId}`);
  return {};
}

export type AiProposeResult = {
  fields?: Partial<NomenclatureFields>;
  rationale?: string;
  error?: string;
};

/** AI auto-naming (6b): propose nomenclature fields from an uploaded creative. */
export async function aiProposeFromUpload(formData: FormData): Promise<AiProposeResult> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };
  try {
    const { proposeFieldsFromImage } = await import("@/lib/ai-naming");
    const { getGlossary } = await import("@/lib/glossary");
    const proposal = await proposeFieldsFromImage(
      Buffer.from(await file.arrayBuffer()),
      file.type,
      await getGlossary(),
    );
    return { fields: proposal.fields, rationale: proposal.rationale };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI proposal failed." };
  }
}

/** Same, from an image URL (Figma export previews). */
export async function aiProposeFromUrl(url: string, context?: string): Promise<AiProposeResult> {
  await requireUser();
  try {
    const res = await fetch(url);
    if (!res.ok) return { error: `Could not download the preview image (${res.status}).` };
    const mediaType = res.headers.get("content-type")?.split(";")[0] ?? "image/png";
    const { proposeFieldsFromImage } = await import("@/lib/ai-naming");
    const { getGlossary } = await import("@/lib/glossary");
    const proposal = await proposeFieldsFromImage(
      Buffer.from(await res.arrayBuffer()),
      mediaType,
      await getGlossary(),
      context,
    );
    return { fields: proposal.fields, rationale: proposal.rationale };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI proposal failed." };
  }
}

export async function reparseConceptName(conceptId: string) {
  await requireUser();
  const concept = await prisma.concept.findUniqueOrThrow({ where: { id: conceptId } });
  const { fields, issues } = parseAdName(concept.name);
  const glossary = await prisma.nomenclatureTerm.findMany({
    select: { dimension: true, value: true },
  });
  issues.push(...validateAgainstGlossary(fields, glossary));
  await prisma.concept.update({
    where: { id: conceptId },
    data: {
      nameStatus: issues.length === 0 ? "CONFORMING" : "NEEDS_REVIEW",
      nameIssues: issues,
    },
  });
  revalidatePath(`/library/${conceptId}`);
}
