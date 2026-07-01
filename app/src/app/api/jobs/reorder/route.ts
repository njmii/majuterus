import { NextRequest, NextResponse } from "next/server";
import { reorderColumn } from "@/lib/jobs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Column = { date: string; orderedIds: number[] };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const columns: Column[] = Array.isArray(body.columns) ? body.columns : [];

  for (const column of columns) {
    if (!DATE_RE.test(column.date) || !Array.isArray(column.orderedIds)) {
      return NextResponse.json(
        { error: "Each column needs a date (YYYY-MM-DD) and orderedIds array." },
        { status: 400 }
      );
    }
  }

  for (const column of columns) {
    reorderColumn(
      column.date,
      column.orderedIds.map((n) => Number(n))
    );
  }

  return NextResponse.json({ ok: true });
}
