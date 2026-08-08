import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";

export default function ChallanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [challan, setChallan] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get(`/challans/${id}`);
    setChallan(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canAct = user?.role === "ADMIN" || user?.role === "SALES" || user?.role === "WAREHOUSE";

  async function confirm() {
    setError("");
    setBusy(true);
    try {
      await api.post(`/challans/${id}/confirm`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setError("");
    setBusy(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!challan) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{challan.challanNumber}</h1>
          <p className="text-slate-500 text-sm">
            <Link to={`/customers/${challan.customer?.id}`} className="text-brand-600 hover:underline">
              {challan.customer?.name}
            </Link>
          </p>
        </div>
        <StatusBadge status={challan.status} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {canAct && challan.status === "DRAFT" && (
        <div className="flex gap-3">
          <button
            onClick={confirm}
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            Confirm Challan (reduces stock)
          </button>
          <button
            onClick={cancel}
            disabled={busy}
            className="border px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel Draft
          </button>
        </div>
      )}
      {canAct && challan.status === "CONFIRMED" && (
        <button
          onClick={cancel}
          disabled={busy}
          className="border border-red-300 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-60"
        >
          Cancel Challan (restores stock)
        </button>
      )}

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Line Items (snapshot at time of creation)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="py-2 pr-4">{it.productNameSnapshot}</td>
                  <td className="py-2 pr-4 text-slate-500">{it.skuSnapshot}</td>
                  <td className="py-2 pr-4">₹{Number(it.priceSnapshot).toFixed(2)}</td>
                  <td className="py-2 pr-4">{it.quantity}</td>
                  <td className="py-2 pr-4">₹{Number(it.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-right font-semibold text-slate-800 mt-3">
          Total Qty: {challan.totalQuantity} · Total: ₹
          {challan.items.reduce((s: number, it: any) => s + Number(it.lineTotal), 0).toFixed(2)}
        </div>
      </div>

      <div className="text-sm text-slate-500">
        Created by {challan.createdBy?.name} on {new Date(challan.createdAt).toLocaleString()}
        {challan.confirmedAt && <> · Confirmed {new Date(challan.confirmedAt).toLocaleString()}</>}
        {challan.cancelledAt && <> · Cancelled {new Date(challan.cancelledAt).toLocaleString()}</>}
      </div>
    </div>
  );
}
