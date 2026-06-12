import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { storage } from "@/lib/storage";

/** Serves files from the local storage driver in dev. Supabase serves its own URLs. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!(await getSessionUser())) return new NextResponse("Unauthorized", { status: 401 });
  const { path } = await params;
  const key = path.join("/");
  if (key.includes("..")) return new NextResponse("Bad request", { status: 400 });
  try {
    const data = await storage.get(key);
    const ext = key.split(".").pop() ?? "";
    const types: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      mp4: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",
    };
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": types[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
