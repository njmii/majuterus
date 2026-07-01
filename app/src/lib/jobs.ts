import { getDb } from "./db";
import type { Job, JobStatus } from "./types";

type JobRow = {
  id: number;
  customer_id: number;
  job_date: string;
  job_time: string | null;
  position: number;
  description: string;
  part_cost: number;
  labor_cost: number;
  discount: number;
  status: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_created_at: string;
};

const SELECT_JOB = `
  SELECT
    j.id as id,
    j.customer_id as customer_id,
    j.job_date as job_date,
    j.job_time as job_time,
    j.position as position,
    j.description as description,
    j.part_cost as part_cost,
    j.labor_cost as labor_cost,
    j.discount as discount,
    j.status as status,
    j.created_at as created_at,
    j.updated_at as updated_at,
    c.name as customer_name,
    c.phone as customer_phone,
    c.address as customer_address,
    c.created_at as customer_created_at
  FROM jobs j
  JOIN customers c ON c.id = j.customer_id
`;

function mapJob(row: JobRow): Job {
  const subtotal = row.part_cost + row.labor_cost;
  const total = subtotal - row.discount;
  return {
    id: row.id,
    customerId: row.customer_id,
    jobDate: row.job_date,
    jobTime: row.job_time,
    position: row.position,
    description: row.description,
    partCost: row.part_cost,
    laborCost: row.labor_cost,
    discount: row.discount,
    subtotal,
    total,
    status: row.status as JobStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      phone: row.customer_phone,
      address: row.customer_address,
      createdAt: row.customer_created_at,
    },
  };
}

export function listJobsInRange(startDate: string, endDate: string): Job[] {
  const db = getDb();
  const rows = db
    .prepare(
      `${SELECT_JOB} WHERE j.job_date BETWEEN ? AND ? ORDER BY j.job_date ASC, j.position ASC`
    )
    .all(startDate, endDate) as unknown as JobRow[];
  return rows.map(mapJob);
}

export function getJob(id: number): Job | null {
  const db = getDb();
  const row = db.prepare(`${SELECT_JOB} WHERE j.id = ?`).get(id) as
    | JobRow
    | undefined;
  return row ? mapJob(row) : null;
}

function nextPosition(jobDate: string): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(position), -1) + 1 as next FROM jobs WHERE job_date = ?`
    )
    .get(jobDate) as { next: number };
  return row.next;
}

export function createJob(input: {
  customerId: number;
  jobDate: string;
  jobTime: string | null;
  description: string;
  partCost: number;
  laborCost: number;
  discount: number;
}): Job {
  const db = getDb();
  const position = nextPosition(input.jobDate);
  const info = db
    .prepare(
      `INSERT INTO jobs
        (customer_id, job_date, job_time, position, description, part_cost, labor_cost, discount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.customerId,
      input.jobDate,
      input.jobTime,
      position,
      input.description.trim(),
      input.partCost,
      input.laborCost,
      input.discount
    );
  return getJob(Number(info.lastInsertRowid))!;
}

export function updateJob(
  id: number,
  input: {
    customerId: number;
    jobDate: string;
    jobTime: string | null;
    description: string;
    partCost: number;
    laborCost: number;
    discount: number;
    status: JobStatus;
  }
): Job | null {
  const db = getDb();
  const existing = getJob(id);
  if (!existing) return null;

  let position = existing.position;
  if (input.jobDate !== existing.jobDate) {
    position = nextPosition(input.jobDate);
  }

  db.prepare(
    `UPDATE jobs SET
      customer_id = ?, job_date = ?, job_time = ?, position = ?,
      description = ?, part_cost = ?, labor_cost = ?, discount = ?, status = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.customerId,
    input.jobDate,
    input.jobTime,
    position,
    input.description.trim(),
    input.partCost,
    input.laborCost,
    input.discount,
    input.status,
    id
  );
  return getJob(id);
}

export function deleteJob(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM jobs WHERE id = ?`).run(id);
}

/**
 * Reassigns date + sequential position for a full column of job ids, in one
 * transaction. Used after a drag-and-drop move (same-day reorder, or moved
 * to a different day) so ordering always stays gap-free and consistent.
 */
export function reorderColumn(jobDate: string, orderedIds: number[]): void {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const stmt = db.prepare(
      `UPDATE jobs SET job_date = ?, position = ?, updated_at = datetime('now') WHERE id = ?`
    );
    orderedIds.forEach((id, index) => {
      stmt.run(jobDate, index, id);
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
