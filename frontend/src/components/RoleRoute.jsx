import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/context/AppContext";

/**
 * RoleRoute
 * - requires an authenticated Supabase user (else → /login)
 * - requires a HumEx role to be picked (else → /role-select)
 * - if a specific role is required and the user has the opposite one, redirect to their own dashboard.
 */
export default function RoleRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const { role } = useApp();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40,
            border: "3px solid #e4e4e7",
            borderTopColor: "#09090b",
            borderRadius: "50%",
            margin: "0 auto 12px",
            animation: "k-spin 1s linear infinite",
          }} />
          <p style={{ color: "#52525b", fontFamily: "Inter, sans-serif" }}>Loading…</p>
        </div>
        <style>{`@keyframes k-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/role-select" replace />;

  if (requiredRole && role !== requiredRole) {
    const target = role === "CLIENT_1" ? "/dashboard/poster" : "/dashboard/solver";
    return <Navigate to={target} replace />;
  }

  return children;
}
