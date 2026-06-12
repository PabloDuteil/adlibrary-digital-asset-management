# Ad Library

Internal Digital Asset Management app for Alan's Ad Creative Lab. Single source of
truth for paid ad assets — replaces the Google Sheet tracker and the Drive folder.
The guiding principle: **every feature must remove manual work**. Figma pours
itself in, already named and split into formats.

## Data model

The 3-level hierarchy at the core of everything:

```
Concept            one unique creative idea (the "ad")
  └─ Variation     a format declination (1:1, 4:5, 9:16, 1.91:1)
       └─ Localization   the variation adapted to a market (fr, es, be, ca…)
            └─ AssetFile  the actual media file (PNG/JPG/MP4) — the leaf
```

Plus: `DistributionStatus` (per concept: Meta / LinkedIn / Google, with who+when),
`NomenclatureTerm` (the glossary that powers the naming generator), `Target`
(quarterly goals for the dashboard).

## Naming convention

```
BATCH_ft.format_al.awareness_a.angle_vp.value-prop_f.feature_t.tone_s.segment_p.persona_c.concept_h.hook_m.market_cv.var…
```

**Convention change (decided with the team):** Format moved from `t.` to `ft.`
because `t.` collided with Tone. The parser (`src/lib/nomenclature.ts`) still
reads legacy names — a `t.` value that is a known format token (static, video,
carrousel, ugc, motion) is the Format, anything else is the Tone — and tolerates
legacy `:` separators (`c:ai-marmot`). Non-conforming names are imported and
flagged `NEEDS_REVIEW`, never rejected.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind** — dense, scannable internal UI
- **Postgres via Prisma** — Supabase-compatible; point `DATABASE_URL` at Supabase in prod
- **Storage adapter** (`src/lib/storage.ts`) — local disk in dev, Supabase Storage in prod (`STORAGE_DRIVER=supabase`)
- **NextAuth** — Google SSO restricted to `@alan.eu`, `AUTH_DEV_BYPASS=true` for local dev
- **Figma REST API** (`src/lib/figma.ts`) — frame discovery + PNG export
- **Claude API** (`src/lib/ai-naming.ts`) — optional AI field proposal for statics

## Setup

```bash
npm install
cp .env.example .env           # fill in values (see comments in the file)
npx prisma migrate dev          # create schema
npx prisma db seed              # seed the 175-term nomenclature glossary
npx tsx scripts/seed-demo.ts    # optional: demo concepts with generated images
npm run dev
```

Required for full functionality:

| Env var | Enables |
|---|---|
| `DATABASE_URL` | everything (Postgres) |
| `FIGMA_TOKEN` | Figma import (personal access token with file read scope) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google SSO (or set `AUTH_DEV_BYPASS=true`) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | production file storage |
| `ANTHROPIC_API_KEY` | AI auto-naming proposals (optional) |
| `META_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID` | distribution auto-detect from Meta (optional) |

Tests: `npm test` (name parser, Figma URL parsing, format detection).

## What's built (phases from the brief)

- **Phase 0 — Foundation** ✅ schema, glossary seed with definitions, auth, 3-tab shell
- **Phase 1 — Library + Figma automation** ✅
  - Figma import: paste a frame/section URL → frames discovered, formats mapped by
    aspect ratio + frame name, layer name parsed into nomenclature, AI fallback for
    missing fields, PNGs exported at 2× and stored, whole hierarchy created in one action
  - Native upload with format detection, naming review, AI proposal
  - Library grid grouped by concept; combinable filters on type, search, batch,
    market, channel, and every nomenclature dimension
  - Inline Meta/LinkedIn/Google checkboxes (who + when recorded)
  - PNG export per asset; asset detail view with editable fields
- **Phase 2 — Dashboard** ✅
  - Quarter filter (or all-time); concepts / variations / assets-delivered counters
  - Static-video-motion split, assets per market, format × market cross-tab
  - Quarterly targets with inline editing and progress bars
- **Phase 3 — Distribution** ✅
  - Distribution tab: dense concept × channel matrix with optimistic toggles,
    who+when audit, filters (status, missing-on-channel, batch, type, search)
  - Bulk actions: select any number of concepts, mark/unmark a channel at once
  - Auto-detect from Meta: pulls live ad names via the Marketing API and matches
    them to concepts by nomenclature (exact → prefix → parsed-field tiers;
    ambiguity is reported, never guessed); set `META_ACCESS_TOKEN` +
    `META_AD_ACCOUNT_ID` to enable. Sync only ever marks, never un-marks; each
    run is logged (`SyncRun`) with unmatched ad-name samples. LinkedIn/Google
    share the same adapter interface, pending API credentials.
- **Phase 4 — Video auto-naming** (keyframes + transcript pipeline) — later
- **Migration** ✅ one-off import of the legacy "Ad Creative Lab - monitoring"
  Google Sheet (Content tracker tab):
  ```bash
  # In the Sheet: File → Download → CSV (Content tracker tab open), then:
  npx tsx scripts/migrate-sheet.ts content-tracker.csv            # dry-run report
  npx tsx scripts/migrate-sheet.ts content-tracker.csv --apply    # write
  ```
  Legacy `t.`-format names are converted to the canonical `ft.` convention;
  off-convention rows are imported and flagged `NEEDS_REVIEW` (never dropped);
  Meta/Google/LinkedIn checkboxes become distribution state stamped
  `sheet-migration`; concepts are backdated to their batch month; re-running
  skips everything already in the Library (idempotent, cross-convention).
  Drive asset files can be attached afterwards from each concept's detail page.

## Deploying

Vercel + Supabase: create a Supabase project, run `npx prisma migrate deploy` and
`npx prisma db seed` against it, create a storage bucket (`ad-assets`), set the
env vars on Vercel, add the Google OAuth client (Workspace-internal) redirect URI
`https://<app>/api/auth/callback/google`.
