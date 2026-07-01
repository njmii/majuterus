import { NextRequest, NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/customers";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q") ?? undefined;
  const customers = listCustomers(search);
  return NextResponse.json({ customers });
}

export async function POST(request: NextRequest) {
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

  const customer = createCustomer({ name, phone, address });
  return NextResponse.json({ customer }, { status: 201 });
}
