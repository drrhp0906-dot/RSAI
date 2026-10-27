# MedRoute Evidence Pipeline

A multi-stage medical research pipeline web app for MBBS research (India context). Given a research query, it routes the request to verified guideline bodies and daily-use platforms, gathers year-range-aware evidence, checks image credibility, synthesises reports, filters global criticism into "instead points", humanises the output, and verifies that no data was lost along the way — all published to an Output section with DOCX export.

Built with **Next.js 16 (App Router) + TypeScript, Tailwind CSS v4 + shadcn/ui, Prisma + SQLite, Zustand/React Query**, and the **lm-sdk** LLM package for LLM chat, web search, and image search.

## The 10-Stage Pipeline

Defined in `src/lib/evidence-pipeline.ts` (`STEP_DEFS`):

| # | Stage key | What it does |
|---|-----------|--------------|
| 1 | `router` | Analyses the input and picks Priority-1/Priority-2 platforms from the verified domain catalog |
| 2 | `gather` | Year-range-aware evidence gathering from the chosen platforms |
| 3 | `images` | Image search + credibility check (real origin resolution, domain trust, resolution floor) |
| 4 | `synthesize` | Summarises all data into the Raw AI report |
| 5 | `criticism` | Global criticism filter → "instead points" (where standard sources disagree) |
| 6 | `output1` | Raw AI report published to the Output section |
| 7 | `guider` | Guider & Peer Data Analyser merges user datasheets → Master report |
| 8 | `humanify` | Humanisation audit of the master report (removes AI-cliché phrasing) |
| 9 | `verify` | Analyser loop: humanified vs master — deterministic preservation audit (images, `[En]` citations, instead points may never shrink) plus LLM verdict |
| 10 | `output2` | Both final documents published to the Output section |

Credibility guarantees enforced deterministically:
- **Approved-image guard** (`enforceApprovedImages`): every embedded image URL must be an approved kept URL; LLM URL typos are repaired by basename match, non-approved refs are stripped. Applied at synthesize, guider, and humanify stages.
- **Preservation audit** (`preservationDefects`, wired into `verify`): image lines, citation tags, and INSTEAD POINT labels may never shrink master → humanized.
- **SmartArt sanitisation**: DOCX export emits plain-flow content only (no SmartArt parts).

## Project Structure

```
src/
  app/                    # Next.js App Router
    page.tsx              # Main UI (tabs: Run Pipeline / Datasheets / Output Section)
    api/runs/             # POST start a run, GET list runs, [id] poll status/results
    api/datasheets/       # CRUD for user's own researched data entries
  components/
    pipeline/             # RunTab, DatasheetsTab, OutputsTab, ReportView
    ui/                   # shadcn/ui primitives
  lib/
    ai.ts                 # lm-sdk wrappers (chatJson, chatText, webSearch, imageSearch)
    evidence-pipeline.ts  # The 10-stage pipeline orchestration
    platforms.ts          # ~95 verified guideline/platform domains with tiered trust scoring
    docx-export.ts        # DOCX exporter (image type sniffing, real aspect ratios via sharp)
    sanitize.ts           # Markdown → plain flow, SmartArt stripping
    db.ts                 # Prisma client singleton
prisma/schema.prisma      # ResearchRun, PipelineStep, EvidenceItem, ImageItem, Report, FlagItem, DatasheetEntry
scripts/
  pipeline-worker.ts      # Detached bun worker that runs the pipeline (see note below)
  test-preservation.ts    # Unit tests for the preservation audit
  check_domains.py / check_platforms.py  # Re-verify the domain catalogs live
  test-*.mjs              # SDK/runtime smoke tests
download/                 # Deliverables: guideline & platform lists, sample DOCX exports
db/custom.db              # SQLite database (DATABASE_URL)
examples/websocket        # Reference examples
mini-services/            # Optional sidecar services build target
.zscripts/                # Platform build/dev/start scripts (Caddy front-proxy on :81 → :3000)
worklog.md                # Task-by-task project history
```

## Getting Started

Requirements: [Bun](https://bun.sh) (or Node 18+), and an LLM provider API key configured for the lm-sdk package.

```bash
# 1. Install dependencies
bun install

# 2. Configure the database path (.env already points at file:./db/custom.db style path — adjust as needed)
#    DATABASE_URL=file:/abs/path/to/db/custom.db

# 3. Push the Prisma schema and generate the client
bun run db:push        # prisma db push
bun run db:generate    # prisma generate

# 4. Dev server (port 3000, logs to dev.log)
bun run dev
```

Production:

```bash
bun run build   # next build + copy static/public into .next/standalone
bun run start   # NODE_ENV=production bun .next/standalone/server.js (logs to server.log)
```

Other scripts: `lint`, `db:migrate`, `db:reset`.

## Usage

1. **Run Pipeline** tab — enter a research topic and optional year range; the run executes the 10 stages in a detached worker and the UI polls `/api/runs/[id]` for per-step progress.
2. **Datasheets** tab — add your own researched data (field, value, unit, year, source); these are merged into the Master report at the `guider` stage.
3. **Output Section** tab — view/publish the Raw AI report, Master report, and humanified report; export any report to DOCX.

## Architecture Notes

- **Detached worker process**: the lm-sdk runtime crashes the Next.js server process when its calls run inside it, so pipeline runs are spawned as `bun scripts/pipeline-worker.ts <runId>`, which writes progress to the shared SQLite database.
- **Domain catalog**: `src/lib/platforms.ts` embeds the verified guideline-body (Priority-1) and platform (Priority-2) domains compiled in Tasks 1–2 (see `download/*.txt` and `worklog.md`). Lists can be re-verified any time with `scripts/check_domains.py` and `scripts/check_platforms.py`.
- **DOCX export limitation by design**: SmartArt is impossible to emit; the sanitizer strips markers and the exporter produces plain-flow content only, embedding kept images with credibility captions.

## Testing

```bash
bun scripts/test-preservation.ts        # preservation-audit unit tests (7/7)
node scripts/test-prisma.mjs            # DB connectivity
node scripts/test-sdk.mjs               # lm-sdk smoke test
node scripts/test-search.mjs            # web/image search
```

Three full end-to-end runs (hypertension, diabetes, dengue) completed with status `done`, zero errors, and PASS verification — details in `worklog.md`.
