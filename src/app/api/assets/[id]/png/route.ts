import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getSessionUser } from "@/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

/**
 * PNG export: downloads any static asset as a PNG named after its ad name,
 * converting from JPG/WebP when needed. Videos are returned in their native
 * format (a video can't be a PNG).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionUser())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;

  const asset = await prisma.assetFile.findUnique({
    where: { id },
    include: {
      localization: { include: { variation: { include: { concept: true } } } },
    },
  });
  if (!asset) return new NextResponse("Not found", { status: 404 });

  const data = await storage.get(asset.fileKey);
  const baseName = asset.fileKey.split("/").pop()!.replace(/\.[^.]+$/, "");

  if (asset.mimeType.startsWith("video/")) {
    const ext = asset.fileKey.split(".").pop();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Disposition": `attachment; filename="${baseName}.${ext}"`,
      },
    });
  }

  const png = asset.mimeType === "image/png" ? data : await sharp(data).png().toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${baseName}.png"`,
    },
  });
}
