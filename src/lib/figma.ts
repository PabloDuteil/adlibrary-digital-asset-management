/**
 * Minimal Figma REST API client for the import flow.
 *
 * Import model: the user pastes a URL to a frame/section/group in Figma. A
 * "concept" in Figma is a node whose children are ~4 frames, one per format.
 * If the pasted node is itself a single frame, it is treated as a one-frame
 * concept. Frames are mapped to formats by aspect ratio first, frame name
 * second; PNG export goes through Figma's /v1/images endpoint.
 */

import { AdFormat } from "@prisma/client";
import { formatFromDimensions, formatFromName } from "./formats";

const FIGMA_API = "https://api.figma.com/v1";

function token(): string {
  const t = process.env.FIGMA_TOKEN;
  if (!t) throw new Error("FIGMA_TOKEN is not configured. Add it to the environment to enable Figma import.");
  return t;
}

async function figmaGet<T>(path: string): Promise<T> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { "X-Figma-Token": token() },
  });
  if (!res.ok) {
    throw new Error(`Figma API ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Accepts figma.com/file/<key>/... and figma.com/design/<key>/...?node-id=1-23 URLs. */
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } {
  const match = url.match(/figma\.com\/(?:file|design|board|proto)\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error("Not a recognizable Figma URL. Paste a link to a frame or section.");
  const nodeIdParam = new URL(url).searchParams.get("node-id");
  // URLs encode node ids as "12-345"; the API wants "12:345".
  const nodeId = nodeIdParam ? nodeIdParam.replace(/-/g, ":") : null;
  return { fileKey: match[1], nodeId };
}

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: { width: number; height: number } | null;
  children?: FigmaNode[];
};

export type FigmaFrameInfo = {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  format: AdFormat;
};

export type FigmaConceptPreview = {
  fileKey: string;
  nodeId: string;
  nodeName: string;
  frames: FigmaFrameInfo[];
};

const FRAME_TYPES = new Set(["FRAME", "COMPONENT", "INSTANCE", "GROUP"]);

function toFrameInfo(node: FigmaNode): FigmaFrameInfo | null {
  const box = node.absoluteBoundingBox;
  if (!box) return null;
  const width = Math.round(box.width);
  const height = Math.round(box.height);
  const format = formatFromName(node.name) ?? formatFromDimensions(width, height);
  return { nodeId: node.id, name: node.name, width, height, format };
}

/** Fetch the pasted node and resolve the list of format frames underneath it. */
export async function fetchConceptNode(fileKey: string, nodeId: string): Promise<FigmaConceptPreview> {
  const data = await figmaGet<{ nodes: Record<string, { document: FigmaNode } | null> }>(
    `/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=2`,
  );
  const entry = data.nodes[nodeId];
  if (!entry) throw new Error(`Node ${nodeId} not found in file ${fileKey}.`);
  const node = entry.document;

  const childFrames = (node.children ?? [])
    .filter((c) => FRAME_TYPES.has(c.type))
    .map(toFrameInfo)
    .filter((f): f is FigmaFrameInfo => f !== null);

  // A container with frame children = one concept with N format variations.
  // A leaf frame = a single-variation concept.
  const frames = childFrames.length > 0 ? childFrames : [toFrameInfo(node)].filter((f): f is FigmaFrameInfo => f !== null);
  if (frames.length === 0) {
    throw new Error("No exportable frames found under this node.");
  }
  return { fileKey, nodeId, nodeName: node.name, frames };
}

/** Render frames as PNG and return nodeId -> temporary image URL. */
export async function exportFramesAsPng(
  fileKey: string,
  nodeIds: string[],
  scale = 2,
): Promise<Record<string, string>> {
  const ids = nodeIds.map(encodeURIComponent).join(",");
  const data = await figmaGet<{ err: string | null; images: Record<string, string | null> }>(
    `/images/${fileKey}?ids=${ids}&format=png&scale=${scale}`,
  );
  if (data.err) throw new Error(`Figma image export failed: ${data.err}`);
  const out: Record<string, string> = {};
  for (const [id, url] of Object.entries(data.images)) {
    if (url) out[id] = url;
  }
  return out;
}

export async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download exported image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export function figmaNodeUrl(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(/:/g, "-")}`;
}
