import { NextRequest, NextResponse } from "next/server";
import {
  countJobsForCustomer,
  deleteCustomer,
  getCustomer,
  updateCustomer,
} from "@/lib/customers";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/customers/[id]">
) {
  const { id } = await ctx.params;
  const customerId = Number(id);
  const existing = getCustomer(customerId);
  if (!existing) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const address = String(body.address ?? "").trim();

  if (!name || !phone || !address) {
    return NextResponse.json(
      { error: "Name, phone, and address are required." },
      { status: 400 }
    );
  }

  const customer = updateCustomer(customerId, { name, phone, address });
  return NextResponse.json({ customer });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/customers/[id]">
) {
  const { id } = await ctx.params;
  const customerId = Number(id);
  const existing = getCustomer(customerId);
  if (!existing) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const jobCount = countJobsForCustomer(customerId);
  if (jobCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: this customer has ${jobCount} job(s) on the schedule. Remove those jobs first.`,
      },
      { status: 409 }
    );
  }

  deleteCustomer(customerId);
  return NextResponse.json({ ok: true });
}
