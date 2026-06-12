import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

/**
 * Object storage behind a tiny adapter so the app runs locally (disk) and in
 * production (Supabase Storage) with the same code. Keys are POSIX-style
 * relative paths, e.g. "concepts/<id>/<name>_ft.static_1x1.png".
 */
export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  /** Browser-loadable URL for the object. */
  publicUrl(key: string): string;
}

const LOCAL_ROOT = path.join(process.cwd(), "storage");

class LocalDiskStorage implements Storage {
  async put(key: string, data: Buffer) {
    const filePath = path.join(LOCAL_ROOT, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async get(key: string) {
    return readFile(path.join(LOCAL_ROOT, key));
  }

  publicUrl(key: string) {
    return `/api/files/${key}`;
  }
}

class SupabaseStorage implements Storage {
  private base = process.env.SUPABASE_URL!;
  private key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  private bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "ad-assets";

  async put(key: string, data: Buffer, contentType: string) {
    const res = await fetch(`${this.base}/storage/v1/object/${this.bucket}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Supabase storage upload failed (${res.status}): ${await res.text()}`);
  }

  async get(key: string) {
    const res = await fetch(`${this.base}/storage/v1/object/${this.bucket}/${key}`, {
      headers: { Authorization: `Bearer ${this.key}` },
    });
    if (!res.ok) throw new Error(`Supabase storage download failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  publicUrl(key: string) {
    return `${this.base}/storage/v1/object/public/${this.bucket}/${key}`;
  }
}

export const storage: Storage =
  process.env.STORAGE_DRIVER === "supabase" ? new SupabaseStorage() : new LocalDiskStorage();

export function safeKeySegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9._+-]/g, "-").slice(0, 180);
}
