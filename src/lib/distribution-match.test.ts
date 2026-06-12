import { describe, expect, it } from "vitest";
import { matchAdsToConcepts, normalizeAdName, type MatchableConcept } from "./distribution-match";

const marmot: MatchableConcept = {
  id: "c1",
  name: "JAN_ft.static_al.problem-aware_a.administrative-overload_vp.simplicity_f.5min-coverage_t.reassuring_s.company_p.business-owner_c.multitaskingmarmot_h.question_cv.marmot",
  batch: "JAN",
  conceptCode: "multitaskingmarmot",
  hook: "question",
};
const refund: MatchableConcept = {
  id: "c2",
  name: "FEB_ft.static_al.solution-aware_a.reimbursement-friction_vp.fast-reimbursement_f.24h-refund_t.direct_s.company_p.hr_c.comparison_h.big-number",
  batch: "FEB",
  conceptCode: "comparison",
  hook: "big-number",
};
const refundTwin: MatchableConcept = {
  id: "c3",
  name: "FEB_ft.video_c.comparison_h.testimonial",
  batch: "FEB",
  conceptCode: "comparison",
  hook: "testimonial",
};
const CONCEPTS = [marmot, refund, refundTwin];

describe("normalizeAdName", () => {
  it("strips ads-manager copy suffixes and whitespace", () => {
    expect(normalizeAdName("  NAME - Copy 2 ")).toBe("NAME");
    expect(normalizeAdName("NAME – copy")).toBe("NAME");
    expect(normalizeAdName("NAME")).toBe("NAME");
  });
});

describe("matchAdsToConcepts", () => {
  it("matches exact names case-insensitively", () => {
    const { matched, unmatched } = matchAdsToConcepts([marmot.name.toUpperCase()], CONCEPTS);
    expect(matched.get("c1")).toHaveLength(1);
    expect(unmatched).toHaveLength(0);
  });

  it("matches duplicated ads (\"- Copy\") back to the same concept", () => {
    const { matched } = matchAdsToConcepts([`${refund.name} - Copy 3`], CONCEPTS);
    expect(matched.get("c2")).toEqual([`${refund.name} - Copy 3`]);
  });

  it("matches when the live ad appended a suffix after a token boundary", () => {
    const { matched } = matchAdsToConcepts([`${marmot.name}_cv.blue-bg`], CONCEPTS);
    expect(matched.get("c1")).toHaveLength(1);
  });

  it("does not prefix-match without a token boundary", () => {
    // "…_h.big-numberx": no boundary for the prefix tier, and the corrupted
    // hook no longer disambiguates the two FEB comparison concepts.
    const { matched, unmatched } = matchAdsToConcepts([`${refund.name}x`], CONCEPTS);
    expect(matched.size).toBe(0);
    expect(unmatched).toHaveLength(1);
  });

  it("falls back to parsed batch + concept code for legacy-styled names", () => {
    const { matched } = matchAdsToConcepts(
      ["JAN_t.static_c:multitaskingmarmot_h:question"],
      CONCEPTS,
    );
    expect(matched.get("c1")).toHaveLength(1);
  });

  it("uses the hook to disambiguate concepts sharing batch + code", () => {
    const { matched } = matchAdsToConcepts(["FEB_ft.video_c.comparison_h.testimonial_x.junk"], CONCEPTS);
    expect(matched.get("c3")).toHaveLength(1);
  });

  it("reports ambiguous matches as unmatched instead of guessing", () => {
    const { matched, unmatched } = matchAdsToConcepts(["FEB_ft.static_c.comparison"], CONCEPTS);
    expect(matched.size).toBe(0);
    expect(unmatched).toEqual(["FEB_ft.static_c.comparison"]);
  });

  it("reports garbage as unmatched", () => {
    const { unmatched } = matchAdsToConcepts(["Untitled ad (3)"], CONCEPTS);
    expect(unmatched).toEqual(["Untitled ad (3)"]);
  });
});
