import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";

const empty = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
};

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`).then((res) => {
        const c = res.data;
        setForm({
          name: c.name || "",
          mobile: c.mobile || "",
          email: c.email || "",
          businessName: c.businessName || "",
          gstNumber: c.gstNumber || "",
          customerType: c.customerType || "RETAIL",
          address: c.address || "",
          status: c.status || "LEAD",
          followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
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
        ...form,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
      };
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post("/customers", payload);
        navigate(`/customers/${res.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800 mb-4">{isEdit ? "Edit Customer" : "New Customer"}</h1>
      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name *">
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
          </Field>
          <Field label="Mobile *">
            <input required value={form.mobile} onChange={(e) => update("mobile", e.target.value)} className="input" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input" />
          </Field>
          <Field label="Business Name">
            <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="input" />
          </Field>
          <Field label="GST Number">
            <input value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} className="input" />
          </Field>
          <Field label="Customer Type">
            <select value={form.customerType} onChange={(e) => update("customerType", e.target.value)} className="input">
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => update("status", e.target.value)} className="input">
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Follow-up Date">
            <input type="date" value={form.followUpDate} onChange={(e) => update("followUpDate", e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Address">
          <textarea value={form.address} onChange={(e) => update("address", e.target.value)} className="input" rows={2} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Customer"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md text-sm font-medium border"
          >
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
