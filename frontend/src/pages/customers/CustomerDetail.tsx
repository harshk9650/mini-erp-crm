import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get(`/customers/${id}`);
    setCustomer(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/customers/${id}/notes`, { note });
      setNote("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!customer) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{customer.name}</h1>
          <p className="text-slate-500 text-sm">{customer.businessName}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={customer.status} />
          <Link to={`/customers/${id}/edit`} className="text-sm px-3 py-1.5 border rounded-md hover:bg-slate-50">
            Edit
          </Link>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <Info label="Mobile" value={customer.mobile} />
        <Info label="Email" value={customer.email || "—"} />
        <Info label="GST Number" value={customer.gstNumber || "—"} />
        <Info label="Customer Type" value={customer.customerType} />
        <Info label="Address" value={customer.address || "—"} />
        <Info
          label="Follow-up Date"
          value={customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "—"}
        />
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Related Challans</h2>
        {customer.challans?.length ? (
          <div className="space-y-2">
            {customer.challans.map((c: any) => (
              <Link
                key={c.id}
                to={`/challans/${c.id}`}
                className="flex items-center justify-between text-sm border rounded-md px-3 py-2 hover:bg-slate-50"
              >
                <span className="font-medium text-brand-600">{c.challanNumber}</span>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No challans yet.</p>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Follow-up Notes</h2>
        <form onSubmit={addNote} className="flex gap-2 mb-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a follow-up note..."
            className="input flex-1"
          />
          <button
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            Add
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="space-y-3">
          {customer.notes?.length ? (
            customer.notes.map((n: any) => (
              <div key={n.id} className="border-l-2 border-brand-200 pl-3">
                <p className="text-sm text-slate-700">{n.note}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {n.author?.name} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">No notes yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}
