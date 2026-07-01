import { getDb } from "./db";
import type { Customer } from "./types";

type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  address: string;
  created_at: string;
};

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at,
  };
}

export function listCustomers(search?: string): Customer[] {
  const db = getDb();
  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    const rows = db
      .prepare(
        `SELECT * FROM customers
         WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?
         ORDER BY name COLLATE NOCASE ASC`
      )
      .all(like, like, like) as unknown as CustomerRow[];
    return rows.map(mapCustomer);
  }
  const rows = db
    .prepare(`SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC`)
    .all() as unknown as CustomerRow[];
  return rows.map(mapCustomer);
}

export function getCustomer(id: number): Customer | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM customers WHERE id = ?`)
    .get(id) as CustomerRow | undefined;
  return row ? mapCustomer(row) : null;
}

export function createCustomer(input: {
  name: string;
  phone: string;
  address: string;
}): Customer {
  const db = getDb();
  const info = db
    .prepare(`INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`)
    .run(input.name.trim(), input.phone.trim(), input.address.trim());
  return getCustomer(Number(info.lastInsertRowid))!;
}

export function updateCustomer(
  id: number,
  input: { name: string; phone: string; address: string }
): Customer | null {
  const db = getDb();
  db.prepare(
    `UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?`
  ).run(input.name.trim(), input.phone.trim(), input.address.trim(), id);
  return getCustomer(id);
}

export function deleteCustomer(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
}

export function countJobsForCustomer(id: number): number {
  const db = getDb();
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM jobs WHERE customer_id = ?`)
    .get(id) as { count: number };
  return row.count;
}
