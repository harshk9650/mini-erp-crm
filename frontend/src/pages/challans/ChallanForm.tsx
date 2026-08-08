import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";

interface LineItem {
  productId: string;
  productName: string;
  sku: string;
  availableStock: number;
  unitPrice: number;
  quantity: number;
}

export default function ChallanForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productToAdd, setProductToAdd] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/customers", { params: { pageSize: 100 } }).then((res) => setCustomers(res.data.data));
    api.get("/products", { params: { pageSize: 200 } }).then((res) => setProducts(res.data.data));
  }, []);

  function addLine() {
    if (!productToAdd) return;
    if (lines.some((l) => l.productId === productToAdd)) return;
    const p = products.find((pr) => pr.id === productToAdd);
    if (!p) return;
    setLines((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        availableStock: p.currentStock,
        unitPrice: Number(p.unitPrice),
        quantity: 1,
      },
    ]);
    setProductToAdd("");
  }

  function updateQty(productId: string, qty: number) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  async function saveChallan(alsoConfirm: boolean) {
    setError("");
    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one product line item");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/challans", {
        customerId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      if (alsoConfirm) {
        await api.post(`/challans/${res.data.id}/confirm`);
      }
      navigate(`/challans/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-slate-800 mb-4">New Sales Challan</h1>

      <div className="bg-white border rounded-xl p-5 space-y-5">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Customer *</span>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ""}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1">Add Product</span>
          <div className="flex gap-2">
            <select value={productToAdd} onChange={(e) => setProductToAdd(e.target.value)} className="input flex-1">
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — stock: {p.currentStock}
                </option>
              ))}
            </select>
            <button type="button" onClick={addLine} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-slate-50">
              Add
            </button>
          </div>
        </div>

        {lines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Available</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Line Total</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.productId} className="border-t">
                    <td className="py-2 pr-4">
                      {l.productName} <span className="text-slate-400">({l.sku})</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={l.quantity > l.availableStock ? "text-red-600 font-semibold" : ""}>
                        {l.availableStock}
                      </span>
                    </td>
                    <td className="py-2 pr-4">₹{l.unitPrice.toFixed(2)}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) => updateQty(l.productId, Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="input w-20"
                      />
                    </td>
                    <td className="py-2 pr-4">₹{(l.unitPrice * l.quantity).toFixed(2)}</td>
                    <td className="py-2 pr-4">
                      <button type="button" onClick={() => removeLine(l.productId)} className="text-red-500 text-xs hover:underline">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-semibold text-slate-800 mt-2">Total: ₹{total.toFixed(2)}</div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => saveChallan(false)}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveChallan(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            Save & Confirm (reduces stock)
          </button>
        </div>
      </div>
    </div>
  );
}
