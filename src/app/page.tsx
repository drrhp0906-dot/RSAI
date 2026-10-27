"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunTab } from "@/components/pipeline/RunTab";
import { DatasheetsTab } from "@/components/pipeline/DatasheetsTab";
import { OutputsTab } from "@/components/pipeline/OutputsTab";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Database, FileOutput, FlaskConical } from "lucide-react";

export default function Home() {
  const [tab, setTab] = useState("run");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [focusRunId, setFocusRunId] = useState<string | null>(null);

  const handleRunCreated = useCallback((id: string) => {
    setActiveRunId(id);
  }, []);

  const openOutputs = useCallback((id: string) => {
    setFocusRunId(id);
    setTab("outputs");
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900">MedRoute Evidence Pipeline</h1>
              <p className="text-xs text-zinc-500">
                Research routing · credibility checks · humanified reporting — built for MBBS research in India
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
              P1 · 55 guideline bodies
            </Badge>
            <Badge variant="outline" className="border-zinc-300 bg-zinc-50 text-zinc-700">
              P2 · 40 platforms
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="run" className="gap-1.5">
              <GitBranch className="h-4 w-4" /> 1 · Run Pipeline
            </TabsTrigger>
            <TabsTrigger value="datasheets" className="gap-1.5">
              <Database className="h-4 w-4" /> 2 · Datasheets
            </TabsTrigger>
            <TabsTrigger value="outputs" className="gap-1.5">
              <FileOutput className="h-4 w-4" /> 3 · Output Section
            </TabsTrigger>
          </TabsList>
          <TabsContent value="run">
            <RunTab activeRunId={activeRunId} onRunCreated={handleRunCreated} onOpenOutputs={openOutputs} />
          </TabsContent>
          <TabsContent value="datasheets">
            <DatasheetsTab />
          </TabsContent>
          <TabsContent value="outputs">
            <OutputsTab focusRunId={focusRunId} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-7xl px-4 py-3 text-center text-xs text-zinc-400 sm:px-6">
          MedRoute Evidence Pipeline · Domain catalog verified 27 Oct 2026 · Every document is sanitised: no SmartArt objects,
          no template placeholders, image credibility scored by source domain.
        </div>
      </footer>
    </div>
  );
}
