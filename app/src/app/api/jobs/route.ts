import { NextRequest, NextResponse } from "next/server";
import { createJob, listJobsInRange } from "@/lib/jobs";
import { getCustomer } from "@/lib/customers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toNonNegativeNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json(
      { error: "start and end query params (YYYY-MM-DD) are required." },
      { status: 400 }
    );
  }

  const jobs = listJobsInRange(start, end);
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const customerId = Number(body.customerId);
  if (!customerId || !getCustomer(customerId)) {
    return NextResponse.json({ error: "A valid customer is required." }, {
      status: 400,
    });
  }

  const jobDate = String(body.jobDate ?? "");
  if (!DATE_RE.test(jobDate)) {
    return NextResponse.json(
      { error: "jobDate (YYYY-MM-DD) is required." },
      { status: 400 }
    );
  }

  const partCost = toNonNegativeNumber(body.partCost ?? 0);
  const laborCost = toNonNegativeNumber(body.laborCost ?? 0);
  const discount = toNonNegativeNumber(body.discount ?? 0);

  if (partCost === null || laborCost === null || discount === null) {
    return NextResponse.json(
      { error: "Part cost, labor cost, and discount must be non-negative numbers." },
      { status: 400 }
    );
  }

  const jobTime = body.jobTime ? String(body.jobTime) : null;
  const description = String(body.description ?? "");

  const job = createJob({
    customerId,
    jobDate,
    jobTime,
    description,
    partCost,
    laborCost,
    discount,
  });

  return NextResponse.json({ job }, { status: 201 });
}
