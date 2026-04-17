import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Card from "@/components/humex/Card";
import Button from "@/components/humex/Button";
import RoleBadge from "@/components/humex/RoleBadge";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function DashboardClient2() {
  const { userName, marketplace } = useApp();
  const navigate = useNavigate();
  const [backendJobs, setBackendJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.listJobs();
      setBackendJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch { setBackendJobs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const openJobs = useMemo(
    () => backendJobs.filter((j) => {
      const m = marketplace[j.id];
      return !m || (m.marketStatus || "open") === "open";
    }),
    [backendJobs, marketplace]
  );

  // Jobs this solver has accepted or is working on
  const myName = userName || "";
  const myActive = useMemo(() => {
    const items = [];
    Object.values(marketplace).forEach((m) => {
      if (m.acceptedBy?.name === myName && (m.marketStatus === "accepted" || m.marketStatus === "submitted")) {
        items.push(m);
      }
    });
    return items;
  }, [marketplace, myName]);

  const earned = useMemo(() => {
    let pts = 0;
    Object.values(marketplace).forEach((m) => {
      if (m.acceptedBy?.name === myName && m.marketStatus === "approved") {
        pts += Number(m.rewardPoints) || 0;
      }
    });
    return pts;
  }, [marketplace, myName]);

  return (
    <AppLayout>
      <div className="k-row" style={{ marginBottom: 6 }}>
        <h1 className="k-page-title" data-testid="solver-welcome-heading">Welcome, {userName || "Solver"}</h1>
        <RoleBadge role="CLIENT_2" testId="solver-role-badge" />
      </div>
      <p className="k-page-sub">Accept a job, attach your AI agent to the HumEx MCP endpoint, submit the fix.</p>

      <div className="k-stat-grid" data-testid="solver-stats">
        <div className="k-stat-card" data-testid="stat-available">
          <p className="k-stat-label">Available Jobs</p>
          <div className="k-stat-value">{openJobs.length}</div>
        </div>
        <div className="k-stat-card" data-testid="stat-accepted">
          <p className="k-stat-label">Jobs Accepted</p>
          <div className="k-stat-value">{myActive.length}</div>
        </div>
        <div className="k-stat-card" data-testid="stat-earned">
          <p className="k-stat-label">Earned Points</p>
          <div className="k-stat-value">{earned}</div>
        </div>
      </div>

      <div className="k-row" style={{ marginBottom: 24 }}>
        <Button variant="primary" onClick={() => navigate("/dashboard/solver/jobs")} testId="quick-browse-jobs-btn">
          Browse Open Jobs →
        </Button>
      </div>

      <h2 className="k-section-label" style={{ marginTop: 32 }}>Active Job</h2>
      {loading && myActive.length === 0 ? (
        <p style={{ color: "var(--k-text-muted)" }}>Loading…</p>
      ) : myActive.length === 0 ? (
        <Card testId="no-active-job">
          <p style={{ margin: 0, color: "var(--k-text-secondary)" }}>
            You're not working on anything yet.{" "}
            <Link to="/dashboard/solver/jobs" style={{ fontWeight: 600, textDecoration: "underline" }}>
              Browse open jobs →
            </Link>
          </p>
        </Card>
      ) : (
        <div className="k-job-list" data-testid="active-jobs">
          {myActive.map((m) => (
            <Card key={m.jobId} testId={`active-job-${m.jobId.slice(0, 8)}`}>
              <div className="k-row">
                <span className="k-job-id">#{m.jobId.slice(0, 8)}</span>
                <h3 className="k-card-title" style={{ margin: 0, flex: 1 }}>{m.title}</h3>
                <span className="k-reward">★ {m.rewardPoints || 0} pts</span>
                <span className={`k-status ${m.marketStatus}`}>{m.marketStatus}</span>
              </div>
              <div className="k-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/dashboard/solver/workspace/${m.jobId}`)}
                  testId={`continue-work-btn-${m.jobId.slice(0, 8)}`}
                >
                  Continue Working →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
