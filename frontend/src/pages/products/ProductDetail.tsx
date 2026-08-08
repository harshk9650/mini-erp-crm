import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [qty, setQty] = useState("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, m] = await Promise.all([
      api.get(`/products/${id}`),
      api.get(`/products/${id}/movements`, { params: { pageSize: 20 } }),
    ]);
    setProduct(p.data);
    setMovements(m.data.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitMovement(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!qty || !reason) return;
    setSaving(true);
    try {
      await api.post(`/products/${id}/movements`, { quantity: parseInt(qty, 10), movementType: type, reason });
      setQty("");
      setReason("");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const canManage = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  if (!product) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{product.name}</h1>
          <p className="text-slate-500 text-sm">SKU: {product.sku}</p>
        </div>
        {canManage && (
          <Link to={`/products/${id}/edit`} className="text-sm px-3 py-1.5 border rounded-md hover:bg-slate-50">
            Edit
          </Link>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Info label="Category" value={product.category || "—"} />
        <Info label="Unit Price" value={`₹${Number(product.unitPrice).toFixed(2)}`} />
        <Info label="Current Stock" value={String(product.currentStock)} />
        <Info label="Min Stock" value={String(product.minStock)} />
        <Info label="Location" value={product.location || "—"} />
      </div>

      {canManage && (
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Record Stock Movement</h2>
          <form onSubmit={submitMovement} className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as "IN" | "OUT")} className="input w-24">
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">Quantity</span>
              <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="input w-28" />
            </label>
            <label className="text-sm flex-1 min-w-[180px]">
              <span className="block text-xs text-slate-500 mb-1">Reason</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder="e.g. New stock received" />
            </label>
            <button
              disabled={saving}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
            >
              Record
            </button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Stock Movement Log (append-only)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">By</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2 pr-4 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">
                    <span className={m.movementType === "IN" ? "text-emerald-600" : "text-red-600"}>
                      {m.movementType}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{m.quantity}</td>
                  <td className="py-2 pr-4">{m.reason}</td>
                  <td className="py-2 pr-4">{m.createdBy?.name}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">
                    No movements recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
