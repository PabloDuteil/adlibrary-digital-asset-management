import { describe, expect, it } from "vitest";
import { buildAdName, parseAdName } from "./nomenclature";

const FULL_LEGACY =
  "JAN_t.static_al.problem-aware_a.administrative-overload_vp.simplicity_f.5min-coverage_t.reassuring_s.company_p.business-owner_c.multitaskingmarmot_h.question_cv.marmot";

describe("parseAdName", () => {
  it("parses the canonical legacy example, disambiguating the overloaded t. prefix", () => {
    const { fields, conforming } = parseAdName(FULL_LEGACY);
    expect(fields.batch).toBe("JAN");
    expect(fields.format).toBe("static");
    expect(fields.tone).toBe("reassuring");
    expect(fields.awareness).toBe("problem-aware");
    expect(fields.angle).toBe("administrative-overload");
    expect(fields.valueProp).toBe("simplicity");
    expect(fields.feature).toBe("5min-coverage");
    expect(fields.segment).toBe("company");
    expect(fields.persona).toBe("business-owner");
    expect(fields.conceptCode).toBe("multitaskingmarmot");
    expect(fields.hook).toBe("question");
    expect(fields.conceptVars).toEqual(["marmot"]);
    expect(conforming).toBe(true);
  });

  it("handles tone appearing before format", () => {
    const { fields } = parseAdName("FEB_t.humorous_t.video_c.pov");
    expect(fields.tone).toBe("humorous");
    expect(fields.format).toBe("video");
  });

  it("accepts the new ft. prefix for format", () => {
    const { fields, conforming } = parseAdName("MAR_ft.motion_t.cute_c.ai-marmot_h.dog");
    expect(fields.format).toBe("motion");
    expect(fields.tone).toBe("cute");
    expect(conforming).toBe(true);
  });

  it("tolerates legacy ':' separators and flags them", () => {
    const { fields, issues, conforming } = parseAdName("APR_t.static_c:ai-marmot_h:insta-comment");
    expect(fields.conceptCode).toBe("ai-marmot");
    expect(fields.hook).toBe("insta-comment");
    expect(conforming).toBe(false);
    expect(issues.some((i) => i.includes("legacy"))).toBe(true);
  });

  it("flags missing fields instead of crashing", () => {
    const { fields, issues, conforming } = parseAdName("some random file name");
    expect(conforming).toBe(false);
    expect(issues).toContain("missing batch");
    expect(issues).toContain("missing format (ft.)");
    expect(fields.conceptVars).toEqual([]);
  });

  it("collects multiple cv. tokens in order", () => {
    const { fields } = parseAdName("MAY_t.static_c.marmot+text_cv.marmot_cv.pharmacy-scene");
    expect(fields.conceptVars).toEqual(["marmot", "pharmacy-scene"]);
  });

  it("parses the market dimension", () => {
    const { fields } = parseAdName("JUN_t.static_c.comparison_m.es");
    expect(fields.market).toBe("es");
  });
});

describe("buildAdName", () => {
  it("builds the canonical name with ft. and m.", () => {
    const name = buildAdName({
      batch: "JAN",
      format: "static",
      awareness: "problem-aware",
      angle: "administrative-overload",
      valueProp: "simplicity",
      feature: "5min-coverage",
      tone: "reassuring",
      segment: "company",
      persona: "business-owner",
      conceptCode: "multitaskingmarmot",
      hook: "question",
      market: "fr",
      conceptVars: ["marmot"],
    });
    expect(name).toBe(
      "JAN_ft.static_al.problem-aware_a.administrative-overload_vp.simplicity_f.5min-coverage_t.reassuring_s.company_p.business-owner_c.multitaskingmarmot_h.question_m.fr_cv.marmot",
    );
  });

  it("round-trips through the parser", () => {
    const parsed = parseAdName(FULL_LEGACY);
    const rebuilt = buildAdName(parsed.fields);
    const reparsed = parseAdName(rebuilt);
    expect(reparsed.fields).toEqual(parsed.fields);
    expect(reparsed.conforming).toBe(true);
  });

  it("omits empty dimensions", () => {
    expect(buildAdName({ batch: "FEB", format: "video", conceptVars: [] })).toBe("FEB_ft.video");
  });
});
