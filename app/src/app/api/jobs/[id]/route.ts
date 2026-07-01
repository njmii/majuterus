import { NextRequest, NextResponse } from "next/server";
import { deleteJob, getJob, updateJob } from "@/lib/jobs";
import { getCustomer } from "@/lib/customers";
import type { JobStatus } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: JobStatus[] = ["scheduled", "in_progress", "done", "cancelled"];

function toNonNegativeNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/jobs/[id]">
) {
  const { id } = await ctx.params;
  const jobId = Number(id);
  const existing = getJob(jobId);
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const body = await request.json();

  const customerId = Number(body.customerId ?? existing.customerId);
  if (!getCustomer(customerId)) {
    return NextResponse.json({ error: "A valid customer is required." }, {
      status: 400,
    });
  }

  const jobDate = String(body.jobDate ?? existing.jobDate);
  if (!DATE_RE.test(jobDate)) {
    return NextResponse.json(
      { error: "jobDate (YYYY-MM-DD) is required." },
      { status: 400 }
    );
  }

  const partCost = toNonNegativeNumber(body.partCost ?? existing.partCost);
  const laborCost = toNonNegativeNumber(body.laborCost ?? existing.laborCost);
  const discount = toNonNegativeNumber(body.discount ?? existing.discount);

  if (partCost === null || laborCost === null || discount === null) {
    return NextResponse.json(
      { error: "Part cost, labor cost, and discount must be non-negative numbers." },
      { status: 400 }
    );
  }

  const status = STATUSES.includes(body.status) ? (body.status as JobStatus) : existing.status;
  const jobTime = body.jobTime === undefined ? existing.jobTime : body.jobTime ? String(body.jobTime) : null;
  const description = body.description === undefined ? existing.description : String(body.description);

  const job = updateJob(jobId, {
    customerId,
    jobDate,
    jobTime,
    description,
    partCost,
    laborCost,
    discount,
    status,
  });

  return NextResponse.json({ job });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/jobs/[id]">
) {
  const { id } = await ctx.params;
  const jobId = Number(id);
  const existing = getJob(jobId);
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  deleteJob(jobId);
  return NextResponse.json({ ok: true });
}
