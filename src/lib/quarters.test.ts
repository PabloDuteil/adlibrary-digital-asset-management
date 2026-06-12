import { describe, expect, it } from "vitest";
import { quarterOf, quarterRange, quartersSince } from "./quarters";

describe("quarterOf", () => {
  it("maps months to quarters", () => {
    expect(quarterOf(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-Q1");
    expect(quarterOf(new Date(Date.UTC(2026, 5, 12)))).toBe("2026-Q2");
    expect(quarterOf(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-Q4");
  });
});

describe("quarterRange", () => {
  it("returns a half-open UTC range", () => {
    const { start, end } = quarterRange("2026-Q2");
    expect(start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("rejects malformed ids", () => {
    expect(() => quarterRange("2026-Q5")).toThrow();
    expect(() => quarterRange("garbage")).toThrow();
  });
});

describe("quartersSince", () => {
  it("lists quarters newest first, spanning year boundaries", () => {
    const list = quartersSince(new Date(Date.UTC(2025, 9, 1))); // 2025-Q4
    expect(list[list.length - 1]).toBe("2025-Q4");
    expect(list).toContain("2026-Q1");
    expect(list[0]).toBe(quarterOf(new Date()));
  });
});
