"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, Trash2 } from "lucide-react";
import type { DatasheetT } from "./types";

const EMPTY = { fieldName: "", value: "", unit: "", year: "", source: "", note: "" };

export function DatasheetsTab() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<DatasheetT[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/datasheets", { cache: "no-store" });
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!form.fieldName.trim() || !form.value.trim()) {
      toast({ title: "Missing fields", description: "Field name and value are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/datasheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to save");
      }
      setForm(EMPTY);
      await load();
      toast({ title: "Datasheet entry saved", description: "It will be merged into your next pipeline run." });
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "unknown", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/datasheets/${id}`, { method: "DELETE" });
    await load();
    toast({ title: "Entry removed" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2 border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-emerald-700" />
            Add your researched data
          </CardTitle>
          <CardDescription>
            Anything you add here becomes a &quot;Datasheet Additions&quot; page inside the generated reports and is merged
            into the analyser stages when &quot;Merge my datasheets&quot; is on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fn">Field name *</Label>
              <Input id="fn" placeholder="e.g. HbA1c cohort mean" value={form.fieldName} onChange={(e) => setForm({ ...form, fieldName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="val">Value *</Label>
              <Input id="val" placeholder="e.g. 7.8" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" placeholder="%" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="yr">Year</Label>
              <Input id="yr" inputMode="numeric" placeholder="2024" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src">Source</Label>
            <Input id="src" placeholder="e.g. my hospital OPD records" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" rows={2} placeholder="context for the analyser…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <Button onClick={add} disabled={saving} className="w-full bg-emerald-700 text-white hover:bg-emerald-800">
            <Plus className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Add to datasheet"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Your datasheet ({entries.length})</CardTitle>
          <CardDescription>Stored in the project database and reused across runs.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400">
              No entries yet — add your first one on the left.
            </div>
          ) : (
            <ScrollArea className="max-h-[460px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        {e.fieldName}
                        {e.note && <p className="text-xs font-normal text-zinc-500">{e.note}</p>}
                      </TableCell>
                      <TableCell>
                        {e.value} {e.unit ?? ""}
                      </TableCell>
                      <TableCell>{e.year ?? "—"}</TableCell>
                      <TableCell className="max-w-40 truncate text-zinc-500">{e.source ?? "user"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => remove(e.id)} aria-label={`Delete ${e.fieldName}`}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
