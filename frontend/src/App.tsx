import React from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./layouts/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import CustomerList from "./pages/customers/CustomerList";
import CustomerDetail from "./pages/customers/CustomerDetail";
import CustomerForm from "./pages/customers/CustomerForm";

import ProductList from "./pages/products/ProductList";
import ProductDetail from "./pages/products/ProductDetail";
import ProductForm from "./pages/products/ProductForm";

import ChallanList from "./pages/challans/ChallanList";
import ChallanDetail from "./pages/challans/ChallanDetail";
import ChallanForm from "./pages/challans/ChallanForm";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/customers"
          element={
            <ProtectedRoute roles={["ADMIN", "SALES"]}>
              <CustomerList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute roles={["ADMIN", "SALES"]}>
              <CustomerForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute roles={["ADMIN", "SALES"]}>
              <CustomerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id/edit"
          element={
            <ProtectedRoute roles={["ADMIN", "SALES"]}>
              <CustomerForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}>
              <ProductList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/new"
          element={
            <ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}>
              <ProductDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}>
              <ProductForm />
            </ProtectedRoute>
          }
        />

        <Route path="/challans" element={<ChallanList />} />
        <Route
          path="/challans/new"
          element={
            <ProtectedRoute roles={["ADMIN", "SALES"]}>
              <ChallanForm />
            </ProtectedRoute>
          }
        />
        <Route path="/challans/:id" element={<ChallanDetail />} />
      </Route>
    </Routes>
  );
}
