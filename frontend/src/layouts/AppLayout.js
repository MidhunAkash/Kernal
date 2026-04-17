import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/lib/auth";
import RoleBadge from "@/components/humex/RoleBadge";
import "@/humex.css";

const POSTER_NAV = [
  { to: "/dashboard/poster", label: "Dashboard", end: true },
  { to: "/dashboard/poster/post", label: "Post a Job" },
  { to: "/dashboard/poster/jobs", label: "My Jobs" },
];

const SOLVER_NAV = [
  { to: "/dashboard/solver", label: "Dashboard", end: true },
  { to: "/dashboard/solver/jobs", label: "Browse Jobs" },
];

export default function AppLayout({ children }) {
  const { role, userName, clearRole } = useApp();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nav = role === "CLIENT_1" ? POSTER_NAV : SOLVER_NAV;
  const displayName = userName || user?.user_metadata?.name || user?.email?.split("@")[0] || "Guest";

  const onLogout = async () => {
    clearRole();
    try { await logout(); } catch { /* noop */ }
    navigate("/login", { replace: true });
  };

  return (
    <div className="humex-root" data-testid="humex-app-root">
      <header className="k-header" data-testid="humex-header">
        <Link to={role === "CLIENT_1" ? "/dashboard/poster" : "/dashboard/solver"} className="k-logo" data-testid="humex-logo">
          <span>HumEx</span>
          <span className="k-logo-dot" aria-hidden="true" />
        </Link>

        <nav className="k-nav" data-testid="humex-nav">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `k-nav-item ${isActive ? "active" : ""}`}
              data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="k-header-right">
          <RoleBadge role={role} light />
          <span className="k-user-name" data-testid="header-user-name">{displayName}</span>
          <button type="button" className="k-logout-btn" onClick={onLogout} data-testid="header-logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="k-main">{children}</main>
    </div>
  );
}
