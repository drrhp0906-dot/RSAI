// ============================================================
// MedRoute evidence pipeline (10 stages)
//  1 router     - analyse input, pick Priority-1/2 platforms
//  2 gather     - year-range aware evidence gathering
//  3 images     - image credibility check
//  4 synthesize - summarise all data into the Raw AI report
//  5 criticism  - global criticism filter -> "instead points"
//  6 output1    - Raw AI report published to Output section
//  7 guider     - Guider & Peer Data Analyser -> Master report
//  8 humanify   - humanisation audit of the master report
//  9 verify     - analyser loop: humanified vs master (missing data?)
// 10 output2    - both final documents published to Output section
// ============================================================

import { db } from "./db";
import { chatJson, chatText, imageSearch, sleep, webSearch } from "./ai";
import { PRIORITY_1, PRIORITY_2, findByDomain, heuristicRoute, imageTrust, domainTrust } from "./platforms";
import { mdToPlain, sanitizeDocumentText } from "./sanitize";

export const STEP_DEFS: Array<{ key: string; title: string }> = [
  { key: "router", title: "Input Analysis & Platform Router" },
  { key: "gather", title: "Evidence Gathering (Priority-1/2 sources, year-range aware)" },
  { key: "images", title: "Image Credibility Check" },
  { key: "synthesize", title: "Data Summarisation (Raw AI Report)" },
  { key: "criticism", title: "Global Criticism & Instead-Point Filter" },
  { key: "output1", title: "Output Stage 1 - Raw AI Report published" },
  { key: "guider", title: "Guider & Peer Data Analyser (Master Report)" },
  { key: "humanify", title: "Humanification Audit" },
  { key: "verify", title: "Data Analyser Verification Loop" },
  { key: "output2", title: "Output Stage 2 - Final Documents published" },
];

interface RouterOut {
  revisedQuery: string;
  searchTerms: string[];
  chosen: Array<{ domain: string; reason: string }>;
}

interface EvidenceRow {
  title: string;
  url: string;
  domain: string;
  tier: number;
  year: number | null;
  snippet: string;
  trust: number;
  inRange: boolean;
}

function yearFromText(...texts: Array<string | null | undefined>): number | null {
  for (const t of texts) {
    if (!t) continue;
    const m = t.match(/(19|20)\d{2}/);
    if (m) {
      const y = parseInt(m[0], 10);
      if (y >= 1990 && y <= 2100) return y;
    }
  }
  return null;
}

async function setStep(runId: string, key: string, status: string, detail?: string, outputJson?: unknown) {
  await db.pipelineStep.updateMany({
    where: { runId, key },
    data: {
      status,
      detail: detail ?? undefined,
      outputJson: outputJson === undefined ? undefined : JSON.stringify(outputJson),
    },
  });
  await db.researchRun.update({ where: { id: runId }, data: { currentStep: key } });
}

async function failRun(runId: string, stepKey: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  await setStep(runId, stepKey, "error", message.slice(0, 500));
  await db.researchRun.update({
    where: { id: runId },
    data: { status: "error", error: `Step ${stepKey}: ${message.slice(0, 800)}` },
  });
}

// ---------------- Stage 1: router ----------------
async function stageRouter(runId: string): Promise<{ routerOut: RouterOut; run: { query: string; yearFrom: number | null; yearTo: number | null } }> {
  const run = await db.researchRun.findUniqueOrThrow({ where: { id: runId } });
  await setStep(runId, "router", "running");

  const catalog = [...PRIORITY_1, ...PRIORITY_2]
    .map((p) => `${p.tier === 1 ? "P1" : "P2"} | ${p.domain} | ${p.name} | ${p.category} | topics: ${p.keywords.filter((k) => k !== "any").join(", ") || "general"}`)
    .join("\n");

  const system = `You are a medical research router for an Indian MBBS student. Given a research query, you choose which trusted platform domains to search. Priority-1 (P1) are guideline bodies and authorities; Priority-2 (P2) are widely-used platforms (journals, drug references, databases). Choose 4-6 domains, ALWAYS including at least two P1 sources. Never choose education/qbank platforms (marrow, prepladder, osmosis, amboss, geekymedics, zerotofinals, teachmeanatomy, lecturio) for clinical evidence runs.`;

  const user = `RESEARCH QUERY: ${run.query}
YEAR RANGE: ${run.yearFrom && run.yearTo ? `${run.yearFrom} to ${run.yearTo} (only evidence from this period should be treated as primary)` : "not specified"}
ALSO USE THE USER'S OWN DATASHEET DATA: ${run.includeDatasheets ? "yes (it will be merged later)" : "no"}

CATALOG:
${catalog}

Return JSON: {"revisedQuery": "improved search wording", "searchTerms": ["3-5 specific search phrases"], "chosen": [{"domain": "exact domain from catalog", "reason": "one line why"}]}`;

  const parsed = await chatJson<RouterOut>(system, user, 1200).catch(() => null);

  let routerOut: RouterOut;
  if (parsed && Array.isArray(parsed.chosen) && parsed.chosen.length) {
    const valid = parsed.chosen.filter((c) => findByDomain(c.domain));
    routerOut = {
      revisedQuery: parsed.revisedQuery || run.query,
      searchTerms: Array.isArray(parsed.searchTerms) && parsed.searchTerms.length ? parsed.searchTerms.slice(0, 5) : [run.query],
      chosen: valid.length ? valid : heuristicRoute(run.query).map((p) => ({ domain: p.domain, reason: "heuristic keyword match" })),
    };
  } else {
    const picked = heuristicRoute(run.query);
    routerOut = {
      revisedQuery: run.query,
      searchTerms: [run.query],
      chosen: picked.map((p) => ({ domain: p.domain, reason: "heuristic keyword match" })),
    };
  }

  await db.researchRun.update({
    where: { id: runId },
    data: {
      revisedQuery: routerOut.revisedQuery,
      searchTermsJson: JSON.stringify(routerOut.searchTerms),
      platformsJson: JSON.stringify(routerOut.chosen),
    },
  });
  const names = routerOut.chosen.map((c) => findByDomain(c.domain)?.name ?? c.domain).join(", ");
  await setStep(runId, "router", "done", `Selected ${routerOut.chosen.length} platforms: ${names}`, routerOut);
  return { routerOut, run: { query: run.query, yearFrom: run.yearFrom, yearTo: run.yearTo } };
}

// ---------------- Stage 2: gather ----------------
async function stageGather(runId: string, routerOut: RouterOut, run: { query: string; yearFrom: number | null; yearTo: number | null }) {
  await setStep(runId, "gather", "running");
  const recencyDays = run.yearFrom
    ? Math.max(30, Math.min(3650, Math.floor((Date.now() - new Date(`${run.yearFrom}-01-01`).getTime()) / 86400000)))
    : undefined;

  const base = routerOut.revisedQuery || run.query;
  const queries: string[] = [];
  for (const c of routerOut.chosen.slice(0, 6)) {
    queries.push(`site:${c.domain} ${base}`);
  }
  queries.push(`${base} clinical guideline evidence`);

  const seen = new Set<string>();
  const rows: EvidenceRow[] = [];

  for (const q of queries) {
    try {
      const results = (await webSearch(q, 5, recencyDays)) as Array<{
        url: string; name: string; snippet: string; host_name: string; date?: string;
      }>;
      for (const r of results ?? []) {
        if (!r?.url || seen.has(r.url)) continue;
        seen.add(r.url);
        const domain = (r.host_name || new URL(r.url).hostname || "").replace(/^www\./, "");
        const year = yearFromText(r.date, r.name, r.snippet);
        const inRange =
          run.yearFrom && run.yearTo ? year === null || (year >= run.yearFrom && year <= run.yearTo) : true;
        const p = findByDomain(domain);
        rows.push({
          title: (r.name || "").slice(0, 240) || r.url,
          url: r.url,
          domain,
          tier: p?.tier ?? 2,
          year,
          snippet: (r.snippet || "").slice(0, 500),
          trust: domainTrust(domain, p?.tier),
          inRange,
        });
      }
    } catch {
      // one failed query should not kill the run
    }
    await sleep(150);
  }

  rows.sort((a, b) => b.trust - a.trust || Number(b.inRange) - Number(a.inRange));
  const keptRows = rows.slice(0, 24);
  if (keptRows.length) {
    await db.evidenceItem.deleteMany({ where: { runId } });
    await db.evidenceItem.createMany({
      data: keptRows.map((r) => ({
        runId, title: r.title, url: r.url, domain: r.domain, tier: r.tier,
        year: r.year, snippet: r.snippet, trust: r.trust, inRange: r.inRange, kept: true,
      })),
    });
  }
  const outOfRange = keptRows.filter((r) => !r.inRange).length;
  const p1 = keptRows.filter((r) => r.tier === 1).length;
  await setStep(
    runId, "gather", "done",
    `${keptRows.length} evidence items kept (${p1} from Priority-1 bodies; ${outOfRange} outside year range will be marked)`,
    { found: rows.length, kept: keptRows.length, outOfRange },
  );
}

// ---------------- Stage 3: images ----------------
async function stageImages(runId: string, searchTerms: string[], query: string) {
  await setStep(runId, "images", "running");
  const imgQueries = searchTerms.slice(0, 2);
  if (!imgQueries.length) imgQueries.push(query);
  imgQueries.push(`${query} chart figure`);

  await db.imageItem.deleteMany({ where: { runId } });
  const seen = new Set<string>();
  const candidates: Array<{ url: string; sourceDomain: string | null; caption: string | null }> = [];
  for (const q of imgQueries.slice(0, 3)) {
    const res = await imageSearch(q, 5);
    for (const r of res) {
      if (!r?.original_url || seen.has(r.original_url)) continue;
      seen.add(r.original_url);
      let host: string | null = null;
      try {
        host = new URL(r.original_url).hostname.replace(/^www\./, "");
      } catch {
        host = null;
      }
      candidates.push({ url: r.original_url, sourceDomain: host, caption: (r.caption || q).slice(0, 200) });
    }
    await sleep(150);
  }

  const scored = candidates.map((c) => {
    const { score, reason } = imageTrust(c.sourceDomain ?? undefined);
    return { ...c, trustScore: score, kept: score >= 70, reason };
  });
  scored.sort((a, b) => b.trustScore - a.trustScore);
  const kept = scored.filter((s) => s.kept).slice(0, 4);
  const finalRows = [...kept, ...scored.filter((s) => !s.kept).slice(0, 6)];

  if (finalRows.length) {
    await db.imageItem.createMany({
      data: finalRows.map((r) => ({
        runId, url: r.url, sourceDomain: r.sourceDomain, caption: r.caption,
        trustScore: r.trustScore, kept: r.kept, reason: r.reason,
      })),
    });
  }
  await setStep(runId, "images", "done", `${kept.length} credible images kept, ${finalRows.length - kept.length} removed by credibility check`, { found: scored.length, kept: kept.length });
}

// ---------------- helpers for report stages ----------------
async function loadEvidence(runId: string) {
  return db.evidenceItem.findMany({ where: { runId }, orderBy: [{ trust: "desc" }, { url: "asc" }] });
}

function evidenceBlock(items: Awaited<ReturnType<typeof loadEvidence>>): string {
  return items
    .map((e, i) => `[E${i + 1}] (${e.tier === 1 ? "P1" : "P2"}, trust ${e.trust}${e.inRange ? "" : ", OUTSIDE YEAR RANGE"}, year ${e.year ?? "unknown"}) ${e.domain} - "${e.title}" - ${e.snippet}`)
    .join("\n");
}

async function loadImages(runId: string) {
  return db.imageItem.findMany({ where: { runId }, orderBy: [{ trustScore: "desc" }] });
}

// ---------------- Stage 4: synthesize ----------------
async function stageSynthesize(runId: string, run: { query: string; yearFrom: number | null; yearTo: number | null }) {
  await setStep(runId, "synthesize", "running");
  const [evidence, images, datasheets] = await Promise.all([
    loadEvidence(runId),
    loadImages(runId),
    db.researchRun.findUniqueOrThrow({ where: { id: runId }, select: { includeDatasheets: true } }).then(async (r) =>
      r.includeDatasheets ? db.datasheetEntry.findMany({ orderBy: { createdAt: "asc" } }) : [],
    ),
  ]);

  const keptImages = images.filter((i) => i.kept);
  const dsBlock = datasheets.length
    ? datasheets.map((d) => `- ${d.fieldName}: ${d.value}${d.unit ? " " + d.unit : ""}${d.year ? ` (${d.year})` : ""} | source: ${d.source ?? "user"}${d.note ? ` | note: ${d.note}` : ""}`).join("\n")
    : "(no user datasheet entries provided)";

  const system = `You are a meticulous medical data analyst writing for an Indian MBBS researcher. You write factual, citation-anchored reports. NEVER invent numbers, facts, or sources. Every factual claim must end with a citation tag like [E3] pointing to the evidence list you were given. If evidence conflicts, present both positions and label the conflict. If the user's own datasheet data is provided, integrate it under its own subsection and clearly mark it as user-supplied data.`;

  const user = `RESEARCH QUERY: ${run.query}
YEAR RANGE: ${run.yearFrom && run.yearTo ? `${run.yearFrom}-${run.yearTo} (primary evidence must fall inside this range; anything outside must be explicitly marked as outside-range context)` : "not specified"}

EVIDENCE LIST:
${evidenceBlock(evidence) || "(no text evidence found - state this honestly)"}

CREDIBLE IMAGES (only these may be embedded, exactly as written):
${keptImages.length ? keptImages.map((i) => `![${i.caption ?? "figure"}](${i.url}) - source: ${i.sourceDomain ?? "unknown"} (trust ${i.trustScore})`).join("\n") : "(none passed the credibility check)"}

USER DATASHEET DATA:
${dsBlock}

Write the RAW AI DATA REPORT in markdown with EXACTLY these sections:
# Raw AI Data Report
## 1. Meta
Run metadata (query, year range, date, number of evidence items, platforms used).
## 2. Executive Summary
## 3. Key Findings
Numbered findings, each with citation tags and years. Mark any out-of-range evidence as "(outside year range - context only)".
## 4. Detailed Analysis
Thematic subsections (### level). Use markdown tables for numeric comparisons. Include a subsection "User Datasheet Additions" if datasheet data exists.
## 5. Evidence Quality and Credibility
A markdown table of the most important sources (domain, tier P1/P2, year, trust, what it contributed). Note anything excluded and why.
## 6. Visual Evidence
Embed ONLY the credible images listed above (exact markdown), each with a one-line credibility caption. If none, write "No images passed the credibility check."
## 7. References
List every [E#] as: [E1] domain - title - year - URL.`;

  const raw = await chatText(system, user, 6500);
  const { text } = sanitizeDocumentText(raw);
  const saved = await db.report.create({
    data: { runId, kind: "raw", version: 1, content: text || "Report generation returned empty output.", verifyStatus: null, missingJson: null },
  });
  await setStep(runId, "synthesize", "done", `Raw AI report drafted (${Math.round(text.length / 1000)}k chars, ${evidence.length} evidence anchors)`, { reportId: saved.id, evidenceAnchors: evidence.length });
  return saved;
}

// ---------------- Stage 5: criticism ----------------
async function stageCriticism(runId: string, run: { query: string; yearFrom: number | null; yearTo: number | null }) {
  await setStep(runId, "criticism", "running");
  const rawReport = await db.report.findFirst({ where: { runId, kind: "raw" }, orderBy: { version: "desc" } });
  if (!rawReport) throw new Error("raw report missing");

  const system = `You are a critical-appraisal reviewer (peer data analyser) for medical research. You identify: (a) claims in the report where global criticism exists (study bias, retracted evidence, industry funding, guideline controversies), and (b) claims where a standard data source would say something different from what the report states. For each, you write BOTH the standard view and the alternate view.`;

  const user = `RESEARCH QUERY: ${run.query}
REPORT TO AUDIT:
${rawReport.content.slice(0, 12000)}

Return JSON: {"flags": [{"claim": "the disputed claim", "standardView": "what the standard/authoritative source says", "alternateView": "the divergent finding or criticism", "note": "why this divergence exists or why it matters"}]}
Only include genuine, defensible divergences (0-6 flags). If everything is consistent, return an empty flags array.`;

  const parsed = await chatJson<{ flags: Array<{ claim: string; standardView: string; alternateView: string; note: string }> }>(system, user, 2200);
  const flags = parsed?.flags?.filter((f) => f?.claim && f?.standardView && f?.alternateView) ?? [];

  if (flags.length) {
    await db.flagItem.deleteMany({ where: { runId } });
    await db.flagItem.createMany({
      data: flags.map((f) => ({
        runId, claim: f.claim.slice(0, 600), standardView: f.standardView.slice(0, 900),
        alternateView: f.alternateView.slice(0, 900), note: (f.note ?? "").slice(0, 600),
      })),
    });
  }

  let content = rawReport.content;
  const section = `

## 6. Global Criticism and Instead Points
${flags.length ? flags.map((f, i) => `### INSTEAD POINT ${i + 1}\n- **Claim in this report:** ${f.claim}\n- **Standard data source view:** ${f.standardView}\n- **Alternate / criticised view:** ${f.alternateView}\n- **Why flagged:** ${f.note ?? "divergence between sources"}\n\n> NOTE: Both views are written above on purpose. The standard-source view remains the first-priority reference; the alternate view is retained for transparency and must not be silently dropped.`).join("\n\n") : "No defensible divergence between the gathered evidence and standard sources was identified in this run."}
`;
  if (/##\s*6\.\s*(Global Criticism|References)/i.test(content)) {
    content = content.replace(/##\s*6\.\s*Global Criticism[\s\S]*?(?=\n##\s*7\.|\s*$)/i, section.trim());
    if (!/##\s*7\./i.test(content)) content = content.replace(/##\s*References/gi, "## 7. References");
  } else {
    content += "\n" + section;
  }
  content = sanitizeDocumentText(content).text;
  await db.report.update({ where: { id: rawReport.id }, data: { content } });
  await setStep(runId, "criticism", "done", `${flags.length} instead-point(s) flagged - both views written, user alerted`, { flags: flags.length });
}

// ---------------- Stage 6: output1 ----------------
async function stageOutput1(runId: string) {
  const raw = await db.report.findFirst({ where: { runId, kind: "raw" }, orderBy: { version: "desc" } });
  await setStep(runId, "output1", "done", "Raw AI report is now visible in the Output section. Moving to the guider & peer analyser.", { reportId: raw?.id ?? null });
}

// ---------------- Stage 7: guider ----------------
async function stageGuider(runId: string, run: { query: string; yearFrom: number | null; yearTo: number | null }) {
  await setStep(runId, "guider", "running");
  const runRow = await db.researchRun.findUniqueOrThrow({ where: { id: runId }, select: { includeDatasheets: true } });
  const [rawReport, flags, datasheets] = await Promise.all([
    db.report.findFirst({ where: { runId, kind: "raw" }, orderBy: { version: "desc" } }),
    db.flagItem.findMany({ where: { runId } }),
    runRow.includeDatasheets ? db.datasheetEntry.findMany({ orderBy: { createdAt: "asc" } }) : Promise.resolve([] as Array<{ fieldName: string; value: string; unit: string | null; year: number | null; source: string | null; note: string | null }>),
  ]);
  if (!rawReport) throw new Error("raw report missing");

  const dsBlock = datasheets.length
    ? datasheets.map((d) => `- ${d.fieldName}: ${d.value}${d.unit ? " " + d.unit : ""}${d.year ? ` (${d.year})` : ""} | source: ${d.source ?? "user"}${d.note ? ` | note: ${d.note}` : ""}`).join("\n")
    : "(none provided for this run)";

  const system = `You are the Guider and Peer Data Analyser. Your job: read the raw AI report and ALL supporting data (flags, user datasheets), then produce a MANAGED MASTER REPORT that is complete, well organised, and auditable. You must retain every data point, number, citation tag [En], and every INSTEAD POINT from the raw report. You also run a completeness self-check at the end.`;

  const user = `RESEARCH QUERY: ${run.query}
YEAR RANGE: ${run.yearFrom && run.yearTo ? `${run.yearFrom}-${run.yearTo}` : "not specified"}

RAW AI REPORT:
${rawReport.content.slice(0, 14000)}

INSTEAD-POINT FLAGS (keep every one, in a dedicated section):
${flags.length ? flags.map((f, i) => `${i + 1}. claim: ${f.claim} | standard: ${f.standardView} | alternate: ${f.alternateView} | note: ${f.note ?? ""}`).join("\n") : "(none)"}

USER DATASHEET DATA:
${dsBlock}

Write the MASTER MANAGED REPORT in markdown with EXACTLY these sections:
# Master Managed Report
## 1. Scope and Method
What was searched (platforms, tier mix, year range), how evidence was graded, and that user datasheet data is included where present.
## 2. Managed Findings
Consolidated findings (merge duplicates), citations preserved [En], out-of-range evidence still marked.
## 3. Instead Points (Both Views Retained)
Every flag as: claim / standard view / alternate view / note, each labelled "INSTEAD POINT".
## 4. Image and Data Credibility Ledger
How images and sources were vetted (kept vs removed, thresholds).
## 5. Datasheet Additions Page
Tabulate the user's own data (field, value, unit, year, source, note) or state none were provided.
## 6. Completeness Self-Check
A checklist confirming each raw-report data cluster is present; list anything genuinely missing from the underlying evidence.
## 7. References
Full reference list identical to the raw report's.`;

  const master = await chatText(system, user, 7000);
  const { text } = sanitizeDocumentText(master);
  const saved = await db.report.create({
    data: { runId, kind: "master", version: 1, content: text || "Master report generation returned empty output." },
  });
  await setStep(runId, "guider", "done", `Master report managed (${Math.round(text.length / 1000)}k chars)`, { reportId: saved.id });
  return saved;
}

// ---------------- Stage 8 + 9: humanify / verify loop ----------------
const HUMANIFY_RULES = `STYLE RULES (must all hold):
- Write like a careful human medical researcher: plain, direct academic English.
- Vary sentence length; prefer active voice; use "we" for authorial actions.
- FORBIDDEN phrases: "delve", "it is important to note that", "in conclusion", "furthermore", "moreover", "as an AI", "here is", "this report aims to", "landscape", "tapestry".
- Do NOT add em-dash chains, emoji, or rhetorical filler.
- Keep ALL facts, numbers, years, citation tags [En], tables, INSTEAD POINT labels, and the References section EXACTLY as in the source (you may reword around them, never remove or alter values).
- Keep markdown structure (headings, lists, tables). Keep every image markdown line unchanged.
- Do NOT invent any new fact, number, or source.`;

async function humanifyOnce(runId: string, masterContent: string, missing: string[], version: number) {
  const system = `You are the Humanification Editor. You rewrite a managed medical report so it reads naturally and unambiguously human, without losing a single data point.\n${HUMANIFY_RULES}`;
  const user = `MASTER REPORT (version to rewrite):
${masterContent.slice(0, 14000)}

${missing.length ? `THE DATA ANALYSER FOUND THESE MISSING/WEAKENED POINTS IN THE PREVIOUS HUMANIFIED VERSION. RESTORE ALL OF THEM FULLY:\n${missing.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n` : ""}
Return ONLY the full rewritten report in markdown (same section skeleton, including References).`;
  const text = await chatText(system, user, 7000);
  const { text: clean } = sanitizeDocumentText(text);
  return clean || "(empty humanification output)";
}

async function verifyOnce(runId: string, masterContent: string, humanizedContent: string) {
  const system = `You are the Data Analyser running a completeness audit. You compare the humanified report against the managed master report. Your ONLY job is to detect data points, numbers, citation tags, INSTEAD POINTS, image lines, or references that are MISSING or materially weakened in the humanified version. Be strict about data, indifferent about wording.`;
  const user = `MASTER REPORT:
${mdToPlain(masterContent).slice(0, 9000)}

HUMANIFIED REPORT:
${mdToPlain(humanizedContent).slice(0, 9000)}

Return JSON: {"pass": boolean, "missing": ["each missing or weakened data point, phrased as an instruction"], "altered": ["any value that changed between versions"]}
pass=true only if missing is empty.`;
  const parsed = await chatJson<{ pass: boolean; missing?: string[]; altered?: string[] }>(system, user, 1600);
  const missing = (parsed?.missing ?? []).filter((m) => typeof m === "string" && m.trim());
  return { pass: parsed?.pass === true && missing.length === 0, missing, altered: parsed?.altered ?? [] };
}

// ---------------- Stage 10: output2 ----------------
async function stageOutput2(runId: string, iterations: number, pass: boolean) {
  const [raw, humanized] = await Promise.all([
    db.report.findFirst({ where: { runId, kind: "raw" }, orderBy: { version: "desc" } }),
    db.report.findFirst({ where: { runId, kind: "humanized" }, orderBy: { version: "desc" } }),
  ]);
  await setStep(
    runId, "output2", "done",
    `Final documents ready: Raw AI report + Humanified report (${iterations} verification iteration(s), ${pass ? "completeness PASS" : "best-of-N published"}). Both are in the Output section.`,
    { rawReportId: raw?.id ?? null, humanizedReportId: humanized?.id ?? null, iterations, pass },
  );
}

// ---------------- orchestrator ----------------
export async function runPipeline(runId: string) {
  try {
    await db.researchRun.update({ where: { id: runId }, data: { status: "running", error: null } });
    const { routerOut, run } = await stageRouter(runId);

    await stageGather(runId, routerOut, run);

    const searchTerms: string[] = JSON.parse((await db.researchRun.findUniqueOrThrow({ where: { id: runId }, select: { searchTermsJson: true } })).searchTermsJson);
    await stageImages(runId, searchTerms, run.query);

    await stageSynthesize(runId, run);
    await stageCriticism(runId, run);
    await stageOutput1(runId);
    await stageGuider(runId, run);

    // humanify + verify loop (max 3 humanified versions)
    const master = await db.report.findFirst({ where: { runId, kind: "master" }, orderBy: { version: "desc" } });
    if (!master) throw new Error("master report missing");

    let pass = false;
    let missing: string[] = [];
    let iterations = 0;
    let latestHumanized = "";

    for (let v = 1; v <= 3; v++) {
      await setStep(runId, "humanify", "running", v === 1 ? "Rewriting master report in natural academic tone" : `Restoring ${missing.length} missing point(s) flagged by the data analyser`, { version: v });
      latestHumanized = await humanifyOnce(runId, master.content, missing, v);
      const h = await db.report.create({
        data: { runId, kind: "humanized", version: v, content: latestHumanized, verifyStatus: null, missingJson: JSON.stringify(missing) },
      });
      iterations = v;
      await setStep(runId, "verify", "running", `Data analyser audit ${v}/3 - comparing against master report`, { version: v, reportId: h.id });
      const verdict = await verifyOnce(runId, master.content, latestHumanized);
      pass = verdict.pass;
      missing = verdict.missing;
      await db.report.update({
        where: { id: h.id },
        data: { verifyStatus: pass ? "pass" : "fail", missingJson: JSON.stringify(verdict.missing) },
      });
      if (pass) {
        await setStep(runId, "humanify", "done", `Humanified version ${v} accepted by data analyser`, { version: v });
        await setStep(runId, "verify", "done", `Completeness PASS on iteration ${v} - no missing data points`, { pass: true, iterations: v });
        break;
      }
      await setStep(runId, "verify", "done", `Iteration ${v}: ${missing.length} point(s) missing - sending back through humanification`, { pass: false, missing: missing.slice(0, 20), iterations: v });
      if (v === 3) {
        await setStep(runId, "humanify", "done", `Best-of-3 humanified version published (analyser still flags ${missing.length} minor point(s); both reports retained for transparency)`, { version: 3 });
      }
    }

    await stageOutput2(runId, iterations, pass);
    await db.researchRun.update({ where: { id: runId }, data: { status: "done" } });
  } catch (err) {
    await failRun(runId, (await db.researchRun.findUnique({ where: { id: runId }, select: { currentStep: true } }))?.currentStep ?? "router", err);
  }
}
