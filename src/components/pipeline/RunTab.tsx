"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CircleDashed, FlaskConical, Loader2, Play, XCircle } from "lucide-react";
import type { RunT } from "./types";

const EXAMPLES = [
  "Asthma stepwise management updates, India relevance",
  "Dengue NS1 testing and management guidelines India",
  "Direct oral anticoagulants vs warfarin in AF",
];

function statusIcon(status: string) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  if (status === "running") return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal-600" />;
  if (status === "error") return <XCircle className="h-5 w-5 shrink-0 text-red-600" />;
  return <CircleDashed className="h-5 w-5 shrink-0 text-zinc-300" />;
}

export function RunTab({
  activeRunId,
  onRunCreated,
  onOpenOutputs,
}: {
  activeRunId: string | null;
  onRunCreated: (id: string) => void;
  onOpenOutputs: (id: string) => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [includeDatasheets, setIncludeDatasheets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [run, setRun] = useState<RunT | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRun = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/runs/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRun(data.run);
      if (data.run.status === "done" || data.run.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        if (data.run.status === "done") {
          toast({ title: "Pipeline finished", description: "Both reports are ready in the Output section." });
        }
      }
    } catch {
      /* transient */
    }
  }, [toast]);

  useEffect(() => {
    if (activeRunId) {
      loadRun(activeRunId);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadRun(activeRunId), 2500);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [activeRunId, loadRun]);

  const submit = async () => {
    if (query.trim().length < 4) {
      toast({ title: "Query too short", description: "Describe what you want to research.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, yearFrom: yearFrom || null, yearTo: yearTo || null, includeDatasheets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start");
      onRunCreated(data.runId);
      toast({ title: "Pipeline started", description: "Watch the stages below live." });
    } catch (e) {
      toast({ title: "Could not start", description: e instanceof Error ? e.message : "unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const running = run && (run.status === "running" || run.status === "queued");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-emerald-700" />
            What do you want to research?
          </CardTitle>
          <CardDescription>
            The router will analyse your input and pick the right mix of Priority-1 guideline bodies and Priority-2 platforms.
            Add a year range to restrict the evidence window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Research question</Label>
            <Textarea
              id="query"
              placeholder="e.g. Latest evidence on metformin vs SGLT2 inhibitors as first-line therapy in type 2 diabetes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setQuery(ex)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="yf">Year from (optional)</Label>
              <Input id="yf" inputMode="numeric" placeholder="2019" value={yearFrom} onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yt">Year to (optional)</Label>
              <Input id="yt" inputMode="numeric" placeholder="2024" value={yearTo} onChange={(e) => setYearTo(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
            <div>
              <p className="text-sm font-medium">Merge my datasheets</p>
              <p className="text-xs text-zinc-500">Include the data you added on the Datasheets page.</p>
            </div>
            <Switch checked={includeDatasheets} onCheckedChange={setIncludeDatasheets} />
          </div>
          <Button onClick={submit} disabled={submitting || !!running} className="w-full bg-emerald-700 text-white hover:bg-emerald-800">
            {submitting || running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pipeline running…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Run evidence pipeline
              </>
            )}
          </Button>
          <p className="text-xs text-zinc-500">
            A full run performs 10 stages (router, gathering, image credibility, synthesis, criticism filter, two output stages,
            guider analyser, humanification and a verification loop) and usually takes a few minutes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline stages</CardTitle>
          <CardDescription>{run ? `Run ${run.id.slice(0, 8)} — ${run.status}` : "Submit a query to see the live stage timeline."}</CardDescription>
        </CardHeader>
        <CardContent>
          {!run ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400">
              <CircleDashed className="h-8 w-8" />
              Waiting for a run…
            </div>
          ) : (
            <ScrollArea className="max-h-[480px] pr-3">
              <ol className="space-y-3">
                {run.steps.map((s) => (
                  <li key={s.id} className="flex gap-3">
                    {statusIcon(s.status)}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-medium ${s.status === "pending" ? "text-zinc-400" : "text-zinc-900"}`}>{s.title}</span>
                        {(s.key === "output1" || s.key === "output2") && s.status === "done" && (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">OUTPUT</Badge>
                        )}
                      </div>
                      {s.detail && <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500">{s.detail}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              {run.status === "done" && (
                <Button onClick={() => onOpenOutputs(run.id)} className="mt-4 w-full bg-amber-600 text-white hover:bg-amber-700">
                  Open in Output section
                </Button>
              )}
              {run.status === "error" && (
                <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{run.error ?? "The run failed."}</p>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
