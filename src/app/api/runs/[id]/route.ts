import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const run = await db.researchRun.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" } },
      evidences: { orderBy: [{ trust: "desc" }, { url: "asc" }] },
      images: { orderBy: [{ trustScore: "desc" }] },
      flags: true,
      reports: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  return NextResponse.json({ run });
}
