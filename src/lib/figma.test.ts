import { describe, expect, it } from "vitest";
import { parseFigmaUrl } from "./figma";
import { formatFromDimensions, formatFromName } from "./formats";

describe("parseFigmaUrl", () => {
  it("parses design URLs with node ids", () => {
    const { fileKey, nodeId } = parseFigmaUrl(
      "https://www.figma.com/design/AbC123xyz/Ads-Q2?node-id=12-345&t=foo",
    );
    expect(fileKey).toBe("AbC123xyz");
    expect(nodeId).toBe("12:345");
  });

  it("parses legacy file URLs", () => {
    const { fileKey, nodeId } = parseFigmaUrl("https://www.figma.com/file/Key456/Name");
    expect(fileKey).toBe("Key456");
    expect(nodeId).toBeNull();
  });

  it("rejects non-Figma URLs", () => {
    expect(() => parseFigmaUrl("https://example.com/whatever")).toThrow();
  });
});

describe("formatFromDimensions", () => {
  it("maps the four standard ratios", () => {
    expect(formatFromDimensions(1080, 1080)).toBe("R1x1");
    expect(formatFromDimensions(1080, 1350)).toBe("R4x5");
    expect(formatFromDimensions(1080, 1920)).toBe("R9x16");
    expect(formatFromDimensions(1200, 628)).toBe("R1_91x1");
  });

  it("tolerates small export rounding", () => {
    expect(formatFromDimensions(1080, 1349)).toBe("R4x5");
  });

  it("falls back to OTHER", () => {
    expect(formatFromDimensions(800, 2000)).toBe("OTHER");
  });
});

describe("formatFromName", () => {
  it("reads ratios and aliases from frame names", () => {
    expect(formatFromName("Ad — 9:16")).toBe("R9x16");
    expect(formatFromName("story version")).toBe("R9x16");
    expect(formatFromName("Square 1:1")).toBe("R1x1");
    expect(formatFromName("feed 4:5")).toBe("R4x5");
    expect(formatFromName("landscape 1.91:1")).toBe("R1_91x1");
    expect(formatFromName("Frame 42")).toBeNull();
  });
});
