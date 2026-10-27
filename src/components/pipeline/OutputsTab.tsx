"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportView } from "./ReportView";
import { findByDomain } from "@/lib/platforms";
import { trustBadgeClass, type RunSummaryT, type RunT } from "./types";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  History,
  ImageIcon,
  Loader2,
  RefreshCw,
  ScrollText,
} from "lucide-react";

function TrustBadge({ score }: { score: number }) {
  return <Badge variant="outline" className={`text-[11px] ${trustBadgeClass(score)}`}>trust {score}</Badge>;
}

function ImageTile({ url, caption, source, score, kept, reason }: { url: string; caption: string | null; source: string | null; score: number; kept: boolean; reason: string | null }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`overflow-hidden rounded-lg border ${kept ? "border-emerald-200" : "border-red-200 opacity-60"}`}>
      {broken ? (
        <div className="flex h-32 items-center justify-center bg-zinc-50 text-xs text-zinc-400">preview unavailable</div>
      ) : (
        <img src={url} alt={caption ?? "figure"} referrerPolicy="no-referrer" loading="lazy" className="h-32 w-full bg-white object-contain" onError={() => setBroken(true)} />
      )}
      <div className="space-y-1 p-2">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`text-[10px] ${kept ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-red-100 text-red-700 border-red-300"}`}>
            {kept ? "KEPT" : "REMOVED"}
          </Badge>
          <TrustBadge score={score} />
        </div>
        <p className="line-clamp-2 text-[11px] text-zinc-600">{caption ?? "figure"}</p>
        <p className="truncate text-[10px] text-zinc-400">{source ?? "unknown source"} · {reason ?? ""}</p>
      </div>
    </div>
  );
}

export function OutputsTab({ focusRunId }: { focusRunId: string | null }) {
  const { toast } = useToast();
  const [runs, setRuns] = useState<RunSummaryT[]>([]);
  const [manualId, setManualId] = useState<string | null>(null);
  const [run, setRun] = useState<RunT | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/runs", { cache: "no-store" });
      const data = await res.json();
      setRuns(data.runs ?? []);
      return data.runs as RunSummaryT[];
    } catch {
      return [];
    }
  }, []);

  const loadRun = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/runs/${id}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      setRun(data.run);
      return data.run as RunT;
    } catch {
      return null;
    }
  }, []);

  // deferred data loads keep setState out of the synchronous effect path
  useEffect(() => {
    const t = setTimeout(() => {
      void loadRuns();
    }, 0);
    return () => clearTimeout(t);
  }, [loadRuns]);

  const firstRunId = runs.length ? runs[0].id : null;
  const selectedId = manualId ?? focusRunId ?? firstRunId;

  useEffect(() => {
    if (!selectedId) return;
    const t = setTimeout(() => {
      void loadRun(selectedId);
    }, 0);
    return () => clearTimeout(t);
  }, [selectedId, loadRun]);

  // poll while running
  useEffect(() => {
    if (!selectedId || !run || run.status !== "running") return;
    const t = setInterval(async () => {
      const r = await loadRun(selectedId);
      if (r && (r.status === "done" || r.status === "error")) loadRuns();
    }, 2500);
    return () => clearInterval(t);
  }, [selectedId, run, loadRun, loadRuns]);

  const platforms = useMemo<Array<{ domain: string; reason: string }>>(() => {
    if (!run) return [];
    try {
      return JSON.parse(run.platformsJson);
    } catch {
      return [];
    }
  }, [run]);

  const raw = run?.reports.filter((r) => r.kind === "raw").at(-1);
  const humanized = run?.reports.filter((r) => r.kind === "humanized").at(-1);
  const master = run?.reports.filter((r) => r.kind === "master").at(-1);
  const humanizedVersions = run?.reports.filter((r) => r.kind === "humanized") ?? [];

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* run list */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Runs</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => loadRuns()} aria-label="Refresh runs">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">No runs yet.</p>
          ) : (
            <ScrollArea className="max-h-[560px] pr-2">
              <ul className="space-y-2">
                {runs.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setManualId(r.id)}
                      className={`w-full rounded-lg border p-2.5 text-left transition ${
                        selectedId === r.id ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {r.status === "running" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-teal-600" />}
                        {r.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                        {r.status === "error" && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />}
                        <span className="line-clamp-1 text-xs font-medium">{r.query}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {r.yearFrom && r.yearTo ? `${r.yearFrom}–${r.yearTo} · ` : ""}
                        {r._count.evidences} sources · {r._count.flags} flags · {r.status}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* detail */}
      <div className="space-y-6 lg:col-span-3">
        {!run ? (
          <Card>
            <CardContent className="flex h-72 items-center justify-center text-sm text-zinc-400">
              Run a pipeline first — its documents, evidence, images and flags will appear here.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* meta */}
            <Card className="border-emerald-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{run.query}</CardTitle>
                <CardDescription>
                  {run.revisedQuery && run.revisedQuery !== run.query ? <>Refined query: “{run.revisedQuery}” · </> : null}
                  Year range: {run.yearFrom && run.yearTo ? `${run.yearFrom}–${run.yearTo}` : "not specified"} · Status: {run.status}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Platforms the router selected</p>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => {
                    const meta = findByDomain(p.domain);
                    return (
                      <Badge key={p.domain} variant="outline" className={meta?.tier === 1 ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-300 bg-zinc-50 text-zinc-700"}>
                        {meta?.tier === 1 ? "P1" : "P2"} · {meta?.name ?? p.domain}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* evidence + images */}
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScrollText className="h-4 w-4 text-emerald-700" /> Evidence ({run.evidences.length})
                  </CardTitle>
                  <CardDescription>Trust-scored against the verified domain catalog. Out-of-range items are context only.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead className="w-20">Tier</TableHead>
                          <TableHead className="w-20">Trust</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {run.evidences.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <a href={e.url} target="_blank" rel="noreferrer" className="line-clamp-1 text-xs font-medium text-emerald-800 underline-offset-2 hover:underline">
                                {e.title}
                              </a>
                              <p className="text-[10px] text-zinc-400">
                                {e.domain} {e.year ? `· ${e.year}` : ""}
                                {!e.inRange && <span className="text-amber-600"> · outside year range</span>}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${e.tier === 1 ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-300"}`}>
                                {e.tier === 1 ? "P1" : "P2"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <TrustBadge score={e.trust} />
                            </TableCell>
                          </TableRow>
                        ))}
                        {run.evidences.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-6 text-center text-xs text-zinc-400">
                              No evidence captured for this run.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ImageIcon className="h-4 w-4 text-emerald-700" /> Image credibility check ({run.images.filter((i) => i.kept).length} kept)
                  </CardTitle>
                  <CardDescription>Removed images stay visible with the reason, but never enter the reports.</CardDescription>
                </CardHeader>
                <CardContent>
                  {run.images.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-xs text-zinc-400">
                      No images were searched for this run.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {run.images.map((i) => (
                        <ImageTile key={i.id} url={i.url} caption={i.caption} source={i.sourceDomain} score={i.trustScore} kept={i.kept} reason={i.reason} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* flags */}
            {run.flags.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                    <AlertTriangle className="h-4 w-4" /> Instead points — both views written ({run.flags.length})
                  </CardTitle>
                  <CardDescription>
                    Where global criticism or standard data sources disagree with the gathered data, both versions are kept and
                    the divergence is pointed out. The standard-source view remains the first-priority reference.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {run.flags.map((f, idx) => (
                    <div key={f.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Instead point {idx + 1}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-900">{f.claim}</p>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div className="rounded-md border border-emerald-200 bg-white p-2">
                          <p className="text-[10px] font-semibold uppercase text-emerald-700">Standard data source view</p>
                          <p className="mt-1 text-xs text-zinc-700">{f.standardView}</p>
                        </div>
                        <div className="rounded-md border border-amber-300 bg-white p-2">
                          <p className="text-[10px] font-semibold uppercase text-amber-700">Alternate / criticised view</p>
                          <p className="mt-1 text-xs text-zinc-700">{f.alternateView}</p>
                        </div>
                      </div>
                      {f.note && <p className="mt-2 text-[11px] text-zinc-500">Why flagged: {f.note}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* reports */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-emerald-700" /> Final documents
                </CardTitle>
                <CardDescription>
                  The highly-programmed AI analyser report and the humanified report are both published here. Exports are
                  SmartArt-free (plain text, tables and vetted images only).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!raw && !humanized ? (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-xs text-zinc-400">
                    {run.status === "running" ? "Reports will appear here as soon as Output Stage 1 completes." : "No reports yet."}
                  </div>
                ) : (
                  <Tabs defaultValue={humanized ? "humanized" : "raw"}>
                    <TabsList className="flex-wrap">
                      {humanized && (
                        <TabsTrigger value="humanized" className="gap-1.5">
                          Humanified report
                          <Badge variant="outline" className={`text-[10px] ${humanized.verifyStatus === "pass" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
                            v{humanized.version} {humanized.verifyStatus === "pass" ? "· verified" : humanized.verifyStatus === "fail" ? "· best-of-N" : "· auditing"}
                          </Badge>
                        </TabsTrigger>
                      )}
                      {raw && (
                        <TabsTrigger value="raw" className="gap-1.5">
                          AI analyser report
                          <Badge variant="outline" className="border-zinc-300 text-[10px] text-zinc-600">programmed</Badge>
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {humanized && (
                      <TabsContent value="humanized" className="mt-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <a href={`/api/runs/${run.id}/export?kind=humanized`}>
                            <Button size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800">
                              <Download className="mr-1.5 h-4 w-4" /> Download .docx
                            </Button>
                          </a>
                          <Button size="sm" variant="outline" onClick={() => copy(humanized.content)}>
                            <Copy className="mr-1.5 h-4 w-4" /> Copy text
                          </Button>
                          <span className="text-xs text-zinc-400">
                            {humanizedVersions.length} verification iteration(s); data analyser: {humanized.verifyStatus ?? "pending"}
                          </span>
                        </div>
                        <ReportView content={humanized.content} />
                      </TabsContent>
                    )}
                    {raw && (
                      <TabsContent value="raw" className="mt-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <a href={`/api/runs/${run.id}/export?kind=raw`}>
                            <Button size="sm" className="bg-zinc-800 text-white hover:bg-zinc-900">
                              <Download className="mr-1.5 h-4 w-4" /> Download .docx
                            </Button>
                          </a>
                          <Button size="sm" variant="outline" onClick={() => copy(raw.content)}>
                            <Copy className="mr-1.5 h-4 w-4" /> Copy text
                          </Button>
                        </div>
                        <ReportView content={raw.content} />
                      </TabsContent>
                    )}
                  </Tabs>
                )}
              </CardContent>
            </Card>

            {/* verification history */}
            {humanizedVersions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-emerald-700" /> Verification loop log
                  </CardTitle>
                  <CardDescription>
                    The data analyser compares every humanified version against the managed master report
                    {master ? " " : " "}(master v{master?.version ?? "—"}) until it finds everything in place (max 3 iterations).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {humanizedVersions.map((h) => {
                      let missing: string[] = [];
                      try {
                        missing = h.missingJson ? JSON.parse(h.missingJson) : [];
                      } catch {
                        missing = [];
                      }
                      return (
                        <li key={h.id} className="rounded-lg border border-zinc-200 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">Humanified v{h.version}</span>
                            <Badge variant="outline" className={`text-[10px] ${h.verifyStatus === "pass" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
                              {h.verifyStatus === "pass" ? "PASS — everything in place" : h.verifyStatus === "fail" ? `${missing.length} point(s) sent back` : "pending"}
                            </Badge>
                          </div>
                          {h.verifyStatus !== "pass" && missing.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-600">
                              {missing.slice(0, 6).map((m, i) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
