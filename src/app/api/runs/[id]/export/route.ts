import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markdownToDocx } from "@/lib/docx-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const kind = req.nextUrl.searchParams.get("kind") === "raw" ? "raw" : "humanized";

  const run = await db.researchRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const report = await db.report.findFirst({
    where: { runId: id, kind },
    orderBy: { version: "desc" },
  });
  if (!report) return NextResponse.json({ error: "Report not ready" }, { status: 404 });

  const versionLabel =
    kind === "raw"
      ? "AI Analyser Report (highly programmed output)"
      : `Humanified Report v${report.version}${report.verifyStatus ? ` - verification: ${report.verifyStatus.toUpperCase()}` : ""}`;

  const subtitle = `Query: ${run.query} | Year range: ${run.yearFrom && run.yearTo ? `${run.yearFrom}-${run.yearTo}` : "not specified"} | ${versionLabel}`;

  const buffer = await markdownToDocx({
    title: kind === "raw" ? "Raw AI Data Report" : "Humanified Final Report",
    subtitle,
    markdown: report.content,
    footerNote: `Run id: ${run.id} | Exported from MedRoute Evidence Pipeline on ${new Date().toISOString().slice(0, 10)}`,
  });

  const filename = `medroute-${kind}-report${kind === "humanized" ? `-v${report.version}` : ""}.docx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
