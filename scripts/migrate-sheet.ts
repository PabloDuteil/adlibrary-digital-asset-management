/**
 * One-off migration: imports the "Content tracker" tab of the legacy
 * "🧪 Ad Creative Lab - monitoring" Google Sheet.
 *
 *   1. In the Sheet: File → Download → Comma Separated Values (.csv)
 *      (with the "Content tracker" tab open)
 *   2. npx tsx scripts/migrate-sheet.ts <file.csv>            # dry-run report
 *      npx tsx scripts/migrate-sheet.ts <file.csv> --apply    # write to DB
 *
 * Expected columns (header names are matched loosely, order doesn't matter):
 *   link, preview, Meta, Google, LinkedIn, Batch, Ad Format, Awareness level,
 *   Angle, Key Value prop, Features, Tone, Segment, Persona, Concept, Hook,
 *   Concept variable 1..3, Ad Name, Helper, Lenght
 *
 * The "Ad Name" column (legacy `t.` format names) is the source of truth;
 * when it is empty the name is rebuilt from the dimension columns. Names are
 * parsed tolerantly — anything off-convention is imported and flagged
 * NEEDS_REVIEW, never dropped. Meta/Google/LinkedIn checkbox columns become
 * DistributionStatus. Re-running skips concepts that already exist.
 */
import { AdType, NameStatus } from "@prisma/client";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import {
  buildAdName,
  parseAdName,
  validateAgainstGlossary,
  FORMAT_VALUES,
} from "../src/lib/nomenclature";

// ── tiny RFC-4180 CSV parser (quoted fields, embedded commas/newlines) ──
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

// ── loose header matching ───────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const COLUMNS: Record<string, string[]> = {
  link: ["link"],
  meta: ["meta"],
  google: ["google"],
  linkedin: ["linkedin"],
  batch: ["batch"],
  format: ["adformat", "format"],
  awareness: ["awarenesslevel", "awareness"],
  angle: ["angle"],
  valueProp: ["keyvalueprop", "valueprop"],
  feature: ["features", "feature"],
  tone: ["tone"],
  segment: ["segment"],
  persona: ["persona"],
  conceptCode: ["concept"],
  hook: ["hook"],
  cv1: ["conceptvariable1"],
  cv2: ["conceptvariable2"],
  cv3: ["conceptvariable3"],
  adName: ["adname", "name"],
};

function mapHeader(header: string[]): Record<string, number> {
  const indexes: Record<string, number> = {};
  header.forEach((cell, i) => {
    const n = norm(cell);
    for (const [key, aliases] of Object.entries(COLUMNS)) {
      if (indexes[key] === undefined && aliases.includes(n)) indexes[key] = i;
    }
  });
  return indexes;
}

const isChecked = (cell: string | undefined) =>
  ["true", "vrai", "yes", "x", "✓", "1", "oui"].includes((cell ?? "").trim().toLowerCase());

/** Cells like "t.static" / "al.problem-aware" — strip any prefix, keep value. */
const cellValue = (cell: string | undefined) => {
  const v = (cell ?? "").trim().toLowerCase();
  const m = v.match(/^[a-z]{1,3}[.:](.+)$/);
  return m ? m[1] : v;
};

function titleFrom(code: string | undefined, name: string): string {
  if (code) return code.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return name;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const yearArg = args.find((a) => a.startsWith("--year="));
  const year = yearArg ? Number(yearArg.split("=")[1]) : new Date().getUTCFullYear();
  const csvPath = args.find((a) => !a.startsWith("--"));
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/migrate-sheet.ts <export.csv> [--apply] [--year=2026]");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const headerIdx = rows.findIndex((row) => row.some((cell) => norm(cell) === "adname"));
  if (headerIdx === -1) {
    console.error('Could not find the header row (no "Ad Name" column). Is this the Content tracker tab?');
    process.exit(1);
  }
  const cols = mapHeader(rows[headerIdx]);
  const dataRows = rows.slice(headerIdx + 1);

  const glossary = await prisma.nomenclatureTerm.findMany({
    select: { dimension: true, value: true },
  });

  let created = 0;
  let skippedExisting = 0;
  let needsReview = 0;
  const seen = new Set<string>();
  const report: string[] = [];

  for (const [i, row] of dataRows.entries()) {
    const at = (key: string) => (cols[key] !== undefined ? row[cols[key]]?.trim() : undefined);
    const rowNo = headerIdx + i + 2; // 1-based sheet row

    let name = at("adName") ?? "";
    if (!name) {
      // Rebuild from the dimension columns (each cell carries its prefix).
      const parts = [
        at("batch")?.toUpperCase(),
        ...["format", "awareness", "angle", "valueProp", "feature", "tone", "segment", "persona", "conceptCode", "hook", "cv1", "cv2", "cv3"]
          .map((key) => at(key))
          .filter(Boolean),
      ].filter(Boolean);
      name = parts.join("_");
    }
    if (!name) continue; // fully empty row

    if (seen.has(name)) {
      report.push(`row ${rowNo}: DUPLICATE in sheet, skipped — ${name}`);
      continue;
    }
    seen.add(name);

    const { fields, issues } = parseAdName(name);
    issues.push(...validateAgainstGlossary(fields, glossary));
    // Backfill dimensions present as columns but absent from the name.
    fields.format ||= cellValue(at("format"));
    fields.conceptCode ||= cellValue(at("conceptCode"));

    const canonical = buildAdName(fields); // new ft. convention
    const status: NameStatus = issues.length === 0 ? "CONFORMING" : "NEEDS_REVIEW";
    if (status === "NEEDS_REVIEW") needsReview++;

    const existing = await prisma.concept.findFirst({
      where: { name: { in: [name, canonical] } },
    });
    if (existing) {
      skippedExisting++;
      report.push(`row ${rowNo}: already in Library, skipped — ${name}`);
      continue;
    }

    const distribution = {
      meta: isChecked(at("meta")),
      google: isChecked(at("google")),
      linkedin: isChecked(at("linkedin")),
    };
    const type = (
      FORMAT_VALUES.includes((fields.format ?? "") as (typeof FORMAT_VALUES)[number])
        ? fields.format!.toUpperCase()
        : "STATIC"
    ) as AdType;
    const monthIndex = MONTHS.indexOf(fields.batch ?? "");
    const createdAt =
      monthIndex >= 0 ? new Date(Date.UTC(year, monthIndex, 15)) : new Date();
    const link = at("link");
    const sourceUrl = link && /^https?:\/\//.test(link) ? link : null;

    report.push(
      `row ${rowNo}: ${apply ? "import" : "would import"} [${status}${
        issues.length ? `: ${issues.join("; ")}` : ""
      }] ${canonical}` +
        (Object.values(distribution).some(Boolean)
          ? ` — live on ${Object.entries(distribution)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", ")}`
          : ""),
    );

    if (!apply) {
      created++;
      continue;
    }

    const stampBool = (on: boolean) => (on ? { at: createdAt, by: "sheet-migration" } : null);
    await prisma.concept.create({
      data: {
        title: titleFrom(fields.conceptCode, canonical),
        name: canonical,
        nameStatus: status,
        nameIssues: issues,
        batch: fields.batch ?? "JAN",
        type,
        source: "SHEET_IMPORT",
        sourceUrl,
        awareness: fields.awareness ?? null,
        angle: fields.angle ?? null,
        valueProp: fields.valueProp ?? null,
        feature: fields.feature ?? null,
        tone: fields.tone ?? null,
        segment: fields.segment ?? null,
        persona: fields.persona ?? null,
        conceptCode: fields.conceptCode ?? null,
        hook: fields.hook ?? null,
        conceptVars: fields.conceptVars,
        createdAt,
        createdBy: "sheet-migration",
        distribution: {
          create: {
            meta: distribution.meta,
            metaAt: stampBool(distribution.meta)?.at ?? null,
            metaBy: stampBool(distribution.meta)?.by ?? null,
            google: distribution.google,
            googleAt: stampBool(distribution.google)?.at ?? null,
            googleBy: stampBool(distribution.google)?.by ?? null,
            linkedin: distribution.linkedin,
            linkedinAt: stampBool(distribution.linkedin)?.at ?? null,
            linkedinBy: stampBool(distribution.linkedin)?.by ?? null,
          },
        },
      },
    });
    created++;
  }

  console.log(report.join("\n"));
  console.log("─".repeat(60));
  console.log(
    `${apply ? "Imported" : "Dry-run — would import"} ${created} concepts ` +
      `(${needsReview} flagged NEEDS_REVIEW), ${skippedExisting} already present.`,
  );
  if (!apply) console.log("Re-run with --apply to write to the database.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
