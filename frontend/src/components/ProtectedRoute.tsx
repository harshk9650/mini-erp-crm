import React from "react";
import { Navigate } from "react-router-dom";
import { Role, useAuth } from "../context/AuthContext";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-8">
        <h2 className="text-lg font-semibold text-red-600">Access denied</h2>
        <p className="text-slate-500 mt-1">Your role ({user.role}) doesn't have access to this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
