import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";

interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: string;
  currentStock: number;
  minStock: number;
  location?: string;
}

export default function ProductList() {
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(params.get("lowStock") === "true");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, lowStock]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/products", { params: { search, page, pageSize: 10, lowStock } });
      setProducts(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-slate-800">Products & Stock</h1>
        <div className="flex gap-2 flex-wrap">
          <input
            placeholder="Search name, SKU, category..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="border rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <label className="flex items-center gap-1.5 text-sm text-slate-600 border rounded-md px-3">
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => {
                setPage(1);
                setLowStock(e.target.checked);
              }}
            />
            Low stock only
          </label>
          <Link
            to="/products/new"
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
          >
            + New Product
          </Link>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No products found.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/products/${p.id}`} className="text-brand-600 font-medium hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                <td className="px-4 py-3">{p.category || "—"}</td>
                <td className="px-4 py-3">₹{Number(p.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={p.currentStock <= p.minStock ? "text-amber-600 font-semibold" : ""}>
                    {p.currentStock}
                  </span>
                  {p.currentStock <= p.minStock && (
                    <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      Low
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{p.location || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 border rounded-md disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-slate-500">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 border rounded-md disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
