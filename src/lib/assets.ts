import { randomUUID } from "crypto";
import { AdFormat, AdType, AssetSource, NameStatus } from "@prisma/client";
import { prisma } from "./db";
import { storage, safeKeySegment } from "./storage";
import { NomenclatureFields } from "./nomenclature";

export type IncomingFile = {
  buffer: Buffer;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  durationS?: number | null;
  /** Suffix used in the stored filename, e.g. "1x1" or "9x16_es". */
  suffix: string;
};

export type IncomingLocalization = {
  market: string;
  language: string;
  files: IncomingFile[];
};

export type IncomingVariation = {
  format: AdFormat;
  rawFormat?: string | null;
  figmaNodeId?: string | null;
  localizations: IncomingLocalization[];
};

export function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[mime] ?? "bin";
}

/**
 * Persist a full concept: upload every file to storage under the ad's
 * nomenclature name, then create the Concept -> Variation -> Localization ->
 * AssetFile hierarchy in one transaction-ish pass (storage first, DB second,
 * so a DB failure never leaves dangling DB rows pointing at missing files).
 */
export async function createConceptWithAssets(input: {
  title: string;
  name: string;
  nameStatus: NameStatus;
  nameIssues: string[];
  type: AdType;
  source: AssetSource;
  fields: NomenclatureFields;
  figmaFileKey?: string | null;
  figmaNodeId?: string | null;
  sourceUrl?: string | null;
  createdBy: string;
  variations: IncomingVariation[];
}) {
  const folder = `concepts/${safeKeySegment(input.name)}-${randomUUID().slice(0, 8)}`;

  // Upload all files first and remember their keys.
  const uploaded: {
    variation: IncomingVariation;
    localization: IncomingLocalization;
    file: IncomingFile;
    key: string;
  }[] = [];
  for (const variation of input.variations) {
    for (const localization of variation.localizations) {
      for (const file of localization.files) {
        const ext = extensionForMime(file.mimeType);
        const key = `${folder}/${safeKeySegment(input.name)}_${safeKeySegment(file.suffix)}.${ext}`;
        await storage.put(key, file.buffer, file.mimeType);
        uploaded.push({ variation, localization, file, key });
      }
    }
  }

  const thumbnailKey = uploaded.find((u) => u.file.mimeType.startsWith("image/"))?.key;

  const { fields } = input;
  const concept = await prisma.concept.create({
    data: {
      title: input.title,
      name: input.name,
      nameStatus: input.nameStatus,
      nameIssues: input.nameIssues,
      batch: fields.batch ?? "JAN",
      type: input.type,
      source: input.source,
      figmaFileKey: input.figmaFileKey,
      figmaNodeId: input.figmaNodeId,
      sourceUrl: input.sourceUrl,
      thumbnailUrl: thumbnailKey ? storage.publicUrl(thumbnailKey) : null,
      awareness: fields.awareness,
      angle: fields.angle,
      valueProp: fields.valueProp,
      feature: fields.feature,
      tone: fields.tone,
      segment: fields.segment,
      persona: fields.persona,
      conceptCode: fields.conceptCode,
      hook: fields.hook,
      conceptVars: fields.conceptVars,
      createdBy: input.createdBy,
      distribution: { create: {} },
      variations: {
        create: input.variations.map((variation) => ({
          format: variation.format,
          rawFormat: variation.rawFormat,
          figmaNodeId: variation.figmaNodeId,
          localizations: {
            create: variation.localizations.map((localization) => ({
              market: localization.market,
              language: localization.language,
              assetFiles: {
                create: localization.files.map((file) => ({
                  fileKey: uploaded.find(
                    (u) => u.file === file && u.localization === localization,
                  )!.key,
                  mimeType: file.mimeType,
                  width: file.width,
                  height: file.height,
                  durationS: file.durationS,
                  fileSize: file.buffer.length,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  return concept;
}
