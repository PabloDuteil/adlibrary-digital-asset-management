"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { AdFormat, AdType } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db";
import { createConceptWithAssets, IncomingVariation } from "@/lib/assets";
import {
  downloadImage,
  exportFramesAsPng,
  fetchConceptNode,
  figmaNodeUrl,
  parseFigmaUrl,
} from "@/lib/figma";
import { FORMAT_LABELS } from "@/lib/formats";
import {
  batchForDate,
  buildAdName,
  NomenclatureFields,
  parseAdName,
  validateAgainstGlossary,
} from "@/lib/nomenclature";
import { fieldsFromForm } from "@/lib/nomenclature-form";

export type FigmaPreview = {
  fileKey: string;
  nodeId: string;
  nodeName: string;
  fields: NomenclatureFields;
  parseIssues: string[];
  frames: {
    nodeId: string;
    name: string;
    width: number;
    height: number;
    format: AdFormat;
    previewUrl: string | null;
  }[];
};

export type FigmaPreviewResult = { preview?: FigmaPreview; error?: string };

/**
 * Step 1: resolve the pasted URL into a concept preview — the frames found,
 * their detected formats, and the nomenclature fields parsed from the Figma
 * layer name (when the ad was named in Figma). Nothing is saved yet.
 */
export async function previewFigmaImport(url: string): Promise<FigmaPreviewResult> {
  await requireUser();
  try {
    const { fileKey, nodeId } = parseFigmaUrl(url);
    if (!nodeId) {
      return { error: "The URL has no node-id. In Figma, select the frame or section and copy its link." };
    }
    const concept = await fetchConceptNode(fileKey, nodeId);

    // Layer names often follow the nomenclature: parse the container name
    // first, then fall back to the first frame whose name parses better.
    const candidates = [concept.nodeName, ...concept.frames.map((f) => f.name)];
    let best = parseAdName(candidates[0]);
    for (const candidate of candidates.slice(1)) {
      const parsed = parseAdName(candidate);
      if (parsed.issues.length < best.issues.length) best = parsed;
    }

    // Auto-naming fallback for the parts the layer name didn't provide.
    if (!best.fields.batch) best.fields.batch = batchForDate();
    if (!best.fields.format) best.fields.format = "static";

    const glossary = await prisma.nomenclatureTerm.findMany({
      select: { dimension: true, value: true },
    });
    const parseIssues = [...best.issues, ...validateAgainstGlossary(best.fields, glossary)];

    // Low-res previews so the user confirms visually before importing.
    let previews: Record<string, string> = {};
    try {
      previews = await exportFramesAsPng(fileKey, concept.frames.map((f) => f.nodeId), 1);
    } catch {
      // Preview rendering is best-effort; import still works without it.
    }

    return {
      preview: {
        fileKey,
        nodeId,
        nodeName: concept.nodeName,
        fields: best.fields,
        parseIssues,
        frames: concept.frames.map((f) => ({ ...f, previewUrl: previews[f.nodeId] ?? null })),
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Figma import failed." };
  }
}

/**
 * Step 2: after human review, export every frame as PNG at 2x, store the
 * files, and create the whole Concept -> Variations -> Localization ->
 * AssetFiles tree in one action.
 */
export async function confirmFigmaImport(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser();

  const fileKey = String(formData.get("fileKey") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");
  const frameSpecs: { nodeId: string; format: AdFormat; rawFormat: string | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("frameFormat:")) {
      const frameNodeId = key.slice("frameFormat:".length);
      const format = String(value) as AdFormat;
      frameSpecs.push({
        nodeId: frameNodeId,
        format,
        rawFormat: format === "OTHER" ? String(formData.get(`frameRaw:${frameNodeId}`) ?? "") : null,
      });
    }
  }
  if (!fileKey || !nodeId || frameSpecs.length === 0) {
    return { error: "Nothing to import — run the preview first." };
  }

  const fields = fieldsFromForm(formData);
  if (!fields.batch || !fields.format) return { error: "Batch and format are required." };
  const name = buildAdName(fields);

  const existing = await prisma.concept.findUnique({ where: { name } });
  if (existing) return { error: `A concept named "${name}" already exists.` };

  const market = fields.market ?? "fr";

  let conceptId: string;
  try {
    const imageUrls = await exportFramesAsPng(fileKey, frameSpecs.map((f) => f.nodeId), 2);

    const variations: IncomingVariation[] = [];
    for (const spec of frameSpecs) {
      const url = imageUrls[spec.nodeId];
      if (!url) return { error: `Figma did not return an export for frame ${spec.nodeId}.` };
      const buffer = await downloadImage(url);
      const meta = await sharp(buffer).metadata();
      variations.push({
        format: spec.format,
        rawFormat: spec.rawFormat,
        figmaNodeId: spec.nodeId,
        localizations: [
          {
            market,
            language: market,
            files: [
              {
                buffer,
                mimeType: "image/png",
                width: meta.width ?? null,
                height: meta.height ?? null,
                suffix: `${FORMAT_LABELS[spec.format].replace(":", "x")}_${market}`,
              },
            ],
          },
        ],
      });
    }

    const glossary = await prisma.nomenclatureTerm.findMany({
      select: { dimension: true, value: true },
    });
    const issues = validateAgainstGlossary(fields, glossary);

    const concept = await createConceptWithAssets({
      title: String(formData.get("title") ?? "").trim() || name,
      name,
      nameStatus: issues.length === 0 ? "CONFORMING" : "NEEDS_REVIEW",
      nameIssues: issues,
      type: (fields.format.toUpperCase() as AdType) ?? "STATIC",
      source: "FIGMA",
      fields,
      figmaFileKey: fileKey,
      figmaNodeId: nodeId,
      sourceUrl: figmaNodeUrl(fileKey, nodeId),
      createdBy: user.email,
      variations,
    });
    conceptId = concept.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import failed." };
  }

  revalidatePath("/library");
  redirect(`/library/${conceptId}`);
}
