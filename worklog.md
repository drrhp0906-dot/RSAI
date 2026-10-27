# Project Worklog

---
Task ID: 1
Agent: main
Task: Create a .txt file of first-priority, currently-active guideline website domains for MBBS research (India context), covering WHO, ESC, AHA, ICMR and other authoritative bodies.

Work Log:
- Classified task as Type 4 (data processing) with plain .txt deliverable explicitly requested by user.
- Compiled 65 candidate domains across global authorities, evidence repositories, Indian national bodies, Indian specialty societies, and 14 specialty sections.
- Wrote verification script to /home/z/my-project/scripts/check_domains.py (curl GET over HTTPS, IPv4 retry, bot-block-aware classification).
- Ran verification: 59 UP (200), 13 UP-BOT (403 bot-protected but live: cdc.gov, nice.org.uk, heart.org, etc.), csi.org.in confirmed 200 after IPv4 retry, nih.gov confirmed live via WebFetch (sandbox egress restriction), 5 excluded as dead/legacy: icmr.nic.in, ncdc.gov.in, tbcindia.gov.in, dghs.gov.in (DNS NXDOMAIN), www.csi.org.in (use apex domain).
- Wrote final deliverable to /home/z/my-project/download/mbbs_priority_guideline_websites.txt: 18 sections, ~60 active domains with org names, use-cases, free/account access notes, India-specific priority section, access tips, and excluded-legacy-domain notes.

Stage Summary:
- Deliverable: /home/z/my-project/download/mbbs_priority_guideline_websites.txt (verified 27 Oct 2026)
- Key decisions: interpreted "IMRC" as ICMR (icmr.gov.in) and "European Heart Organisation" as ESC (escardio.org); excluded all non-resolving legacy domains per user's "currently active" requirement.
- Reusable artifact: scripts/check_domains.py can be re-run to re-verify the list in future.

---
Task ID: 2
Agent: main
Task: Follow-up request - create a second .txt list of the other largely-used platforms for MBBS research (PubMed, CDC-style daily-use platforms: databases, journals, clinical reference, drug resources, education platforms, research tools).

Work Log:
- Compiled 70 candidate platform domains across 12 planned categories.
- Wrote /home/z/my-project/scripts/check_platforms.py (IPv4 curl check + page-title identity confirmation for uncertain domains). Fixed a UnicodeDecodeError by decoding with errors=replace.
- Verification results: 41 UP (200), 23 UP-BOT (403 bot-protected but live: marrow.com, medscape.com, nejm.org, etc.), fda.gov root returned 404/401 to curl (Akamai bot protection) but confirmed live via WebFetch, cdsco.gov.in unreachable from sandbox DNS but confirmed live via WebFetch, ipc.gov.in returned 500 (NIC server flaky to bots, live), ctri.gov.in globally reachable but under maintenance at compile time, dams.co.in not resolving (excluded), ctri.nic.in legacy (excluded).
- Identity confirmed via page titles: ijmr.org.in = Indian Journal of Medical Research, japi.org = JAPI, litfl.com = LITFL, medindia.net, whocc.no = ATC/DDD, msdmanuals.com = MSD Manuals.
- Wrote deliverable /home/z/my-project/download/mbbs_research_platforms.txt: 12 sections, ~60 domains with org name + use-case + access notes, plus access tips and honest exclusion notes (dams.co.in, ctri.nic.in).

Stage Summary:
- Deliverable: /home/z/my-project/download/mbbs_research_platforms.txt (verified 27 Oct 2026), companion to Task 1 guideline list.
- Key decisions: CTRI (ctri.gov.in) included despite maintenance (it is the official Indian registry, with explicit note); DAMS excluded as unreachable; IJMR hosted at ijmr.org.in (confirmed).
- Reusable artifact: scripts/check_platforms.py.

---
Task ID: 3
Agent: main
Task: Continue verifying the MedRoute Evidence Pipeline web app (multi-stage research pipeline for MBBS research): code review, bug fixes, live end-to-end verification of all 10 stages, credibility guarantees, and document exports.

Work Log:
- Loaded LLM/docx/xlsx skills; read worklog; discovered the pipeline Next.js app already scaffolded (schema with 10 PipelineSteps, EvidenceItem, ImageItem, Report kinds raw/master/humanized, FlagItem "instead points", DatasheetEntry; platforms.ts embeds the 95 verified domains from Tasks 1-2 with tiered trust scoring).
- Fixed TS error in docx-export.ts: docx v9 ImageRun now requires `type` - added magic-byte sniffing (png/jpg/gif/bmp) + sharp metadata for real aspect ratios (was hardcoded 550x340); unknown formats degrade to caption notes.
- Excluded examples/ and skills/ from tsconfig; `npx tsc --noEmit` now clean.
- Fixed Stage 3 image credibility: image search returns CDN-proxied original_url; credibility now resolves the real origin via the `source` field (domain form, catalog-name match, or non-CDN URL host) + resolution floor 200px. Result: kept images now come from acc.org, nature.com, pmc.ncbi.nlm.nih.gov; .com blogs correctly rejected.
- New deterministic guard enforceApprovedImages(): every embedded image URL must be an approved kept URL; LLM URL typos repaired by basename match (caught live: mcp->mpt corruption in run 1), non-approved refs stripped. Applied at synthesize, guider, and humanify stages.
- New deterministic preservationDefects() audit wired into verifyOnce: image lines, [En] citation tags, and INSTEAD POINT labels may never shrink master->humanized; LLM verdict + defects must both pass. 7/7 unit tests pass (scripts/test-preservation.ts).
- Fixed image loss at guider stage (run 2 audit): guider prompt now requires retaining every figure verbatim + deterministic carry-over re-inserts dropped approved figures into the ledger section.
- Fixed docx exporter image regex to accept bulleted/numbered image lines with trailing credibility captions.
- Verified SDK runtime: chat + web_search + image search work under bun (worker process); test scripts in scripts/test-*.mjs.
- API smoke tests: /api, datasheets GET/POST/DELETE, runs GET all pass; homepage renders all 3 tabs.
- THREE full E2E runs all completed status=done with 0 errors: (1) hypertension 2018-2026 -> ACC/ESC/NHLBI/MoHFW/NICE/Cochrane, 24 evidence (18 P1), 6 instead points incl. the real ACC/AHA 130 vs ESC 140 threshold dispute; (2) diabetes 2020-2026 -> ADA/IDF/NICE/Cochrane/PubMed/ICMR, 5 instead points, user datasheet (HbA1c 7.8%) merged into reports; (3) dengue 2019-2026 -> WHO/NCDC/ICMR/MoHFW/PubMed/IJMR, 6 instead points, image chain 3/3 preserved raw->master->humanized. Humanify/verify loop: all runs PASS (verified humanified reports have zero AI-cliche phrases, all citation tags, all instead points).
- docx exports validated: valid OOXML, zero SmartArt parts, credibility ledger footer, media embedded (3-4 figures/run), graceful "source unreachable" degradation for the one corrupted URL in run 1.
- Sample exports copied to download/pipeline-sample-exports/ (3 files).

Stage Summary:
- Deliverable: verified MedRoute Evidence Pipeline (Next.js 16 + Prisma/SQLite + lm-sdk via detached bun worker; UI tabs Run Pipeline / Datasheets / Output Section).
- All 8 user-spec steps + 4 credibility requirements (text/citation management, image credibility check, SmartArt sanitisation + plain-flow-only export, datasheets addition page) verified live end-to-end x3.
- Remaining known-good limitation: docx export of SmartArt is impossible by design (sanitizer strips markers; exporter emits plain flow content only).
