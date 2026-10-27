import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/lib/db";
import { STEP_DEFS } from "@/lib/evidence-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = String(body?.query ?? "").trim();
    if (query.length < 4) {
      return NextResponse.json({ error: "Please describe what you want to research (at least 4 characters)." }, { status: 400 });
    }
    const yearFrom = body?.yearFrom ? parseInt(String(body.yearFrom), 10) : null;
    const yearTo = body?.yearTo ? parseInt(String(body.yearTo), 10) : null;
    const includeDatasheets = body?.includeDatasheets !== false;

    const run = await db.researchRun.create({
      data: {
        query: query.slice(0, 600),
        yearFrom: yearFrom && yearFrom >= 1990 && yearFrom <= 2100 ? yearFrom : null,
        yearTo: yearTo && yearTo >= 1990 && yearTo <= 2100 ? yearTo : null,
        includeDatasheets,
        status: "running",
        steps: {
          create: STEP_DEFS.map((s, idx) => ({ key: s.key, title: s.title, order: idx, status: "pending" })),
        },
      },
      include: { steps: true },
    });

    // The pipeline runs in a detached bun worker process: the SDK runtime
    // hard-crashes the next-dev node process when used in-process, but works
    // perfectly under plain bun (verified standalone).
    const workerPath = path.join(process.cwd(), "scripts", "pipeline-worker.ts");
    const child = spawn("bun", [workerPath, run.id], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "production" },
    });
    child.unref();

    return NextResponse.json({ runId: run.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to start run" }, { status: 500 });
  }
}

export async function GET() {
  const runs = await db.researchRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, query: true, status: true, yearFrom: true, yearTo: true,
      currentStep: true, createdAt: true,
      _count: { select: { evidences: true, images: true, flags: true, reports: true } },
    },
  });
  return NextResponse.json({ runs });
}
