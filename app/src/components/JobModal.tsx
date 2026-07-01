"use client";

import { useMemo, useState } from "react";
import type { Customer, Job } from "@/lib/types";

export default function JobModal({
  date,
  job,
  customers,
  onClose,
  onSaved,
}: {
  date: string;
  job: Job | null;
  customers: Customer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    job?.customer ?? null
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const [jobDate, setJobDate] = useState(job?.jobDate ?? date);
  const [jobTime, setJobTime] = useState(job?.jobTime ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [partCost, setPartCost] = useState(String(job?.partCost ?? 0));
  const [laborCost, setLaborCost] = useState(String(job?.laborCost ?? 0));
  const [discount, setDiscount] = useState(String(job?.discount ?? 0));
  const [status, setStatus] = useState(job?.status ?? "scheduled");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const matches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [customers, customerQuery]);

  const subtotal = (Number(partCost) || 0) + (Number(laborCost) || 0);
  const total = subtotal - (Number(discount) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const part = Number(partCost);
    const labor = Number(laborCost);
    const disc = Number(discount);
    if (
      !Number.isFinite(part) ||
      !Number.isFinite(labor) ||
      !Number.isFinite(disc) ||
      part < 0 ||
      labor < 0 ||
      disc < 0
    ) {
      setError("Part cost, labor cost, and discount must be non-negative numbers.");
      return;
    }

    setSaving(true);
    try {
      let customerId = selectedCustomer?.id;

      if (showNewCustomer) {
        if (!newCustomer.name || !newCustomer.phone || !newCustomer.address) {
          setError("New customer needs a name, phone number, and address.");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCustomer),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          setSaving(false);
          return;
        }
        customerId = data.customer.id;
      }

      if (!customerId) {
        setError("Please choose or add a customer.");
        setSaving(false);
        return;
      }

      const payload = {
        customerId,
        jobDate,
        jobTime: jobTime || null,
        description,
        partCost: part,
        laborCost: labor,
        discount: disc,
        status,
      };

      const url = job ? `/api/jobs/${job.id}` : "/api/jobs";
      const method = job ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-navy/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-brand-navy">
          {job ? "Edit job" : "Add job to schedule"}
        </h2>

        <div className="mt-4 flex flex-col gap-1">
          <label className="text-sm font-medium text-brand-navy">Customer</label>
          {selectedCustomer && !showNewCustomer ? (
            <div className="flex items-center justify-between rounded-lg border border-brand-cream-dark bg-brand-cream/60 px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-brand-navy">
                  {selectedCustomer.name}
                </p>
                <p className="text-xs text-brand-navy-light">
                  {selectedCustomer.phone} · {selectedCustomer.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-xs font-medium text-brand-blue-dark hover:underline"
              >
                Change
              </button>
            </div>
          ) : showNewCustomer ? (
            <div className="flex flex-col gap-2 rounded-lg border border-brand-cream-dark p-3">
              <input
                required
                placeholder="Customer name"
                className="input"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer((n) => ({ ...n, name: e.target.value }))
                }
              />
              <input
                required
                placeholder="Telephone number"
                className="input"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer((n) => ({ ...n, phone: e.target.value }))
                }
              />
              <textarea
                required
                placeholder="Address"
                className="input min-h-16 resize-y"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer((n) => ({ ...n, address: e.target.value }))
                }
              />
              <button
                type="button"
                onClick={() => setShowNewCustomer(false)}
                className="self-start text-xs font-medium text-brand-blue-dark hover:underline"
              >
                Choose existing customer instead
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="input w-full"
                placeholder="Search by name or phone..."
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
              {matches.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-brand-cream-dark bg-white shadow-lg">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerQuery("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-cream"
                      >
                        <span className="font-medium text-brand-navy">
                          {c.name}
                        </span>{" "}
                        <span className="text-brand-navy-light">{c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setShowNewCustomer(true)}
                className="mt-1 text-xs font-medium text-brand-blue-dark hover:underline"
              >
                + New customer
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-navy">
            Date
            <input
              type="date"
              required
              className="input"
              value={jobDate}
              onChange={(e) => setJobDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-navy">
            Time (optional)
            <input
              type="time"
              className="input"
              value={jobTime}
              onChange={(e) => setJobTime(e.target.value)}
            />
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-brand-navy">
          Job description (optional)
          <input
            className="input"
            placeholder="e.g. Split unit gas top-up"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-navy">
            Part cost (RM)
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={partCost}
              onChange={(e) => setPartCost(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-navy">
            Labor cost (RM)
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-navy">
            Discount (RM)
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-3 flex justify-between rounded-lg bg-brand-cream/60 px-3 py-2 text-sm">
          <span className="text-brand-navy-light">Subtotal: RM {subtotal.toFixed(2)}</span>
          <span className="font-bold text-brand-navy">Total: RM {total.toFixed(2)}</span>
        </div>

        {job && (
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-brand-navy">
            Status
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as Job["status"])}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-cream"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy-light disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save job"}
          </button>
        </div>
      </form>
    </div>
  );
}
