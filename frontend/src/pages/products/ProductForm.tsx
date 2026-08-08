import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";

const empty = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStock: "0",
  location: "",
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`).then((res) => {
        const p = res.data;
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category || "",
          unitPrice: String(p.unitPrice),
          currentStock: String(p.currentStock),
          minStock: String(p.minStock),
          location: p.location || "",
        });
      });
    }
  }, [id, isEdit]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category || undefined,
        unitPrice: parseFloat(form.unitPrice),
        currentStock: parseInt(form.currentStock, 10),
        minStock: parseInt(form.minStock, 10),
        location: form.location || undefined,
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        navigate(`/products/${id}`);
      } else {
        const res = await api.post("/products", payload);
        navigate(`/products/${res.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800 mb-4">{isEdit ? "Edit Product" : "New Product"}</h1>
      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product Name *">
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
          </Field>
          <Field label="SKU / Code *">
            <input
              required
              disabled={isEdit}
              value={form.sku}
              onChange={(e) => update("sku", e.target.value)}
              className="input disabled:bg-slate-100"
            />
          </Field>
          <Field label="Category">
            <input value={form.category} onChange={(e) => update("category", e.target.value)} className="input" />
          </Field>
          <Field label="Unit Price *">
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.unitPrice}
              onChange={(e) => update("unitPrice", e.target.value)}
              className="input"
            />
          </Field>
          <Field label={isEdit ? "Current Stock (view only)" : "Opening Stock"}>
            <input
              type="number"
              min="0"
              disabled={isEdit}
              value={form.currentStock}
              onChange={(e) => update("currentStock", e.target.value)}
              className="input disabled:bg-slate-100"
            />
          </Field>
          <Field label="Minimum Stock Alert Qty">
            <input
              type="number"
              min="0"
              value={form.minStock}
              onChange={(e) => update("minStock", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Warehouse / Location">
            <input value={form.location} onChange={(e) => update("location", e.target.value)} className="input" />
          </Field>
        </div>

        {isEdit && (
          <p className="text-xs text-slate-400">
            Stock quantity can only be changed via a stock movement (see product detail page), to keep the
            movement log accurate.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Product"}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-md text-sm font-medium border">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
