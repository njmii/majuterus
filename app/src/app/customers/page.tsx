"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer } from "@/lib/types";
import CustomerModal from "@/components/CustomerModal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null | "new">(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data.customers);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [customers, search]);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    const res = await fetch(`/api/customers/${deleting.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setDeleteError(data.error);
      return;
    }
    setDeleting(null);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Customers</h1>
          <p className="text-sm text-brand-navy-light">
            Name, telephone number, and address for each customer.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="self-start rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy-light"
        >
          + Add customer
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, or address..."
        className="input mt-6 w-full sm:w-80"
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-brand-cream-dark bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-brand-navy-light">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-brand-navy-light">
            No customers found.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-cream text-brand-navy">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Address</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-brand-cream-dark">
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {c.name}
                  </td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3 max-w-xs">{c.address}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(c)}
                        className="rounded-md px-3 py-1.5 text-brand-navy hover:bg-brand-cream"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleting(c);
                          setDeleteError(null);
                        }}
                        className="rounded-md px-3 py-1.5 text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== null && (
        <CustomerModal
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete customer?"
          message={
            deleteError ??
            `This will permanently remove ${deleting.name} from your customer list.`
          }
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
