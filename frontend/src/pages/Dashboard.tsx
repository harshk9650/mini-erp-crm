import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ customers?: number; products?: number; lowStock?: number; challans?: number }>(
    {}
  );

  useEffect(() => {
    (async () => {
      const results: typeof stats = {};
      try {
        if (user?.role === "ADMIN" || user?.role === "SALES") {
          const c = await api.get("/customers", { params: { pageSize: 1 } });
          results.customers = c.data.pagination.total;
        }
        if (user?.role === "ADMIN" || user?.role === "WAREHOUSE") {
          const p = await api.get("/products", { params: { pageSize: 1 } });
          results.products = p.data.pagination.total;
          const low = await api.get("/products", { params: { pageSize: 1, lowStock: true } });
          results.lowStock = low.data.pagination.total;
        }
        const ch = await api.get("/challans", { params: { pageSize: 1 } });
        results.challans = ch.data.pagination.total;
      } catch {
        // dashboard stats are best-effort; ignore individual failures
      }
      setStats(results);
    })();
  }, [user]);

  const cards = [
    stats.customers !== undefined && { label: "Total Customers", value: stats.customers, to: "/customers" },
    stats.products !== undefined && { label: "Total Products", value: stats.products, to: "/products" },
    stats.lowStock !== undefined && { label: "Low Stock Alerts", value: stats.lowStock, to: "/products?lowStock=true", warn: true },
    stats.challans !== undefined && { label: "Total Challans", value: stats.challans, to: "/challans" },
  ].filter(Boolean) as { label: string; value: number; to: string; warn?: boolean }[];

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800">Welcome, {user?.name}</h1>
      <p className="text-slate-500 text-sm mt-1">Role: {user?.role}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition ${
              c.warn && c.value > 0 ? "border-amber-300" : ""
            }`}
          >
            <p className="text-slate-500 text-sm">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.warn && c.value > 0 ? "text-amber-600" : "text-slate-800"}`}>
              {c.value}
            </p>
          </Link>
        ))}
        {cards.length === 0 && <p className="text-slate-400 text-sm">No data available for your role yet.</p>}
      </div>
    </div>
  );
}
