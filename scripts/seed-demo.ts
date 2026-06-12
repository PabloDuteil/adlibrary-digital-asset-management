/**
 * Dev-only: creates a handful of demo concepts with generated images so the
 * Library and Dashboard can be exercised without Figma access.
 *
 *   npx tsx scripts/seed-demo.ts
 */
import sharp from "sharp";
import { AdFormat } from "@prisma/client";
import { createConceptWithAssets } from "../src/lib/assets";
import { FORMAT_LABELS } from "../src/lib/formats";
import { parseAdName } from "../src/lib/nomenclature";
import { prisma } from "../src/lib/db";

const SIZES: Record<Exclude<AdFormat, "OTHER">, [number, number]> = {
  R1x1: [1080, 1080],
  R4x5: [1080, 1350],
  R9x16: [1080, 1920],
  R1_91x1: [1200, 628],
};

async function image(width: number, height: number, rgb: [number, number, number], text: string) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="rgb(${rgb.join(",")})"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(width / 12)}"
      fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const DEMOS: { name: string; title: string; markets: string[]; color: [number, number, number] }[] = [
  {
    name: "JAN_ft.static_al.problem-aware_a.administrative-overload_vp.simplicity_f.5min-coverage_t.reassuring_s.company_p.business-owner_c.multitaskingmarmot_h.question_cv.marmot",
    title: "Multitasking marmot",
    markets: ["fr"],
    color: [79, 70, 229],
  },
  {
    name: "FEB_ft.static_al.solution-aware_a.reimbursement-friction_vp.fast-reimbursement_f.24h-refund_t.direct_s.company_p.hr_c.comparison_h.big-number",
    title: "24h refund comparison",
    markets: ["fr", "es"],
    color: [16, 130, 110],
  },
  {
    name: "MAR_ft.static_al.product-aware_a.lack-of-control_vp.all-in-one-app_f.claim-view_t.confident_s.tns_p.freelance_c.product-ui_h.ui-focus",
    title: "Claim view product UI",
    markets: ["fr", "be", "ca"],
    color: [190, 80, 35],
  },
];

async function main() {
  for (const demo of DEMOS) {
    if (await prisma.concept.findUnique({ where: { name: demo.name } })) {
      console.log(`skip (exists): ${demo.title}`);
      continue;
    }
    const { fields, issues } = parseAdName(demo.name);
    const variations = [];
    for (const [format, [width, height]] of Object.entries(SIZES) as [
      Exclude<AdFormat, "OTHER">,
      [number, number],
    ][]) {
      variations.push({
        format: format as AdFormat,
        localizations: demo.markets.map((market) => ({
          market,
          language: market,
          files: [
            {
              buffer: undefined as unknown as Buffer, // filled below
              mimeType: "image/png",
              width,
              height,
              suffix: `${FORMAT_LABELS[format].replace(":", "x")}_${market}`,
            },
          ],
        })),
      });
    }
    for (const variation of variations) {
      for (const localization of variation.localizations) {
        const [width, height] = SIZES[variation.format as Exclude<AdFormat, "OTHER">];
        localization.files[0].buffer = await image(
          width,
          height,
          demo.color,
          `${demo.title} ${FORMAT_LABELS[variation.format]} ${localization.market.toUpperCase()}`,
        );
      }
    }
    const concept = await createConceptWithAssets({
      title: demo.title,
      name: demo.name,
      nameStatus: issues.length === 0 ? "CONFORMING" : "NEEDS_REVIEW",
      nameIssues: issues,
      type: "STATIC",
      source: "UPLOAD",
      fields,
      createdBy: "seed@alan.eu",
      variations,
    });
    // Backdate to the batch month so the dashboard quarter filter has data to slice.
    const monthIndex = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(fields.batch ?? "JAN");
    await prisma.concept.update({
      where: { id: concept.id },
      data: { createdAt: new Date(Date.UTC(new Date().getUTCFullYear(), monthIndex, 15)) },
    });
    console.log(`created: ${demo.title} (${variations.length} formats × ${demo.markets.length} markets)`);
  }

  // Demo quarterly targets so the progress section renders.
  const year = new Date().getUTCFullYear();
  for (const [quarter, metric, targetValue] of [
    [`${year}-Q1`, "concepts", 5],
    [`${year}-Q1`, "total_assets", 40],
    [`${year}-Q1`, "statics", 4],
  ] as const) {
    await prisma.target.upsert({
      where: { quarter_metric: { quarter, metric } },
      create: { quarter, metric, targetValue },
      update: { targetValue },
    });
  }
  console.log("seeded demo targets");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
