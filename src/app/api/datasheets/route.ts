import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await db.datasheetEntry.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fieldName = String(body?.fieldName ?? "").trim();
    const value = String(body?.value ?? "").trim();
    if (!fieldName || !value) {
      return NextResponse.json({ error: "Field name and value are required." }, { status: 400 });
    }
    const year = body?.year ? parseInt(String(body.year), 10) : null;
    const entry = await db.datasheetEntry.create({
      data: {
        fieldName: fieldName.slice(0, 200),
        value: value.slice(0, 400),
        unit: body?.unit ? String(body.unit).slice(0, 60) : null,
        year: year && year >= 1900 && year <= 2100 ? year : null,
        source: body?.source ? String(body.source).slice(0, 300) : null,
        note: body?.note ? String(body.note).slice(0, 600) : null,
      },
    });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to save entry" }, { status: 500 });
  }
}
