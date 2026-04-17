import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Card from "@/components/humex/Card";
import Button from "@/components/humex/Button";
import RoleBadge from "@/components/humex/RoleBadge";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

function StatPill({ status, testId }) {
  const cls = `k-status ${status || "open"}`;
  return <span className={cls} data-testid={testId}>{status}</span>;
}

export default function DashboardClient1() {
  const { userName, marketplace } = useApp();
  const navigate = useNavigate();
  const [backendJobs, setBackendJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      const data = await api.listJobs();
      setBackendJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch {
      setBackendJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    const t = setInterval(loadJobs, 6000);
    return () => clearInterval(t);
  }, [loadJobs]);

  // Only show jobs the current poster has posted (we know those — we hold their api_key locally)
  const myJobIds = useMemo(() => new Set(Object.keys(marketplace)), [marketplace]);
  const myJobs = useMemo(
    () => backendJobs.filter((j) => myJobIds.has(j.id)),
    [backendJobs, myJobIds]
  );

  const stats = useMemo(() => {
    let active = 0, approved = 0;
    myJobs.forEach((j) => {
      const m = marketplace[j.id];
      const st = m?.marketStatus || "open";
      if (st === "accepted" || st === "submitted") active += 1;
      if (st === "approved") approved += 1;
    });
    return { total: myJobs.length, active, approved };
  }, [myJobs, marketplace]);

  const recent = myJobs.slice(0, 3);

  return (
    <AppLayout>
      <div className="k-row" style={{ marginBottom: 6 }}>
        <h1 className="k-page-title" data-testid="poster-welcome-heading">Welcome, {userName || "Poster"}</h1>
        <RoleBadge role="CLIENT_1" testId="poster-role-badge" />
      </div>
      <p className="k-page-sub">Host a HumEx MCP target, share it with a solver, then review the fix.</p>

      <div className="k-stat-grid" data-testid="poster-stats">
        <div className="k-stat-card" data-testid="stat-total">
          <p className="k-stat-label">Total Posted</p>
          <div className="k-stat-value">{stats.total}</div>
        </div>
        <div className="k-stat-card" data-testid="stat-active">
          <p className="k-stat-label">Active Jobs</p>
          <div className="k-stat-value">{stats.active}</div>
        </div>
        <div className="k-stat-card" data-testid="stat-approved">
          <p className="k-stat-label">Approved</p>
          <div className="k-stat-value">{stats.approved}</div>
        </div>
      </div>

      <div className="k-row" style={{ marginBottom: 24 }}>
        <Button variant="primary" onClick={() => navigate("/dashboard/poster/post")} testId="quick-post-job-btn">
          Post a New Job
        </Button>
        <Button variant="secondary" onClick={() => navigate("/dashboard/poster/jobs")} testId="quick-view-jobs-btn">
          View My Jobs
        </Button>
      </div>

      <h2 className="k-section-label" style={{ marginTop: 32 }}>Recent Jobs</h2>
      {loading && recent.length === 0 ? (
        <p style={{ color: "var(--k-text-muted)" }}>Loading…</p>
      ) : recent.length === 0 ? (
        <Card testId="recent-empty">
          <p style={{ color: "var(--k-text-secondary)", margin: 0 }}>
            No jobs yet.{" "}
            <Link to="/dashboard/poster/post" style={{ fontWeight: 600, textDecoration: "underline" }}>
              Post your first job →
            </Link>
          </p>
        </Card>
      ) : (
        <div className="k-job-list" data-testid="recent-jobs">
          {recent.map((j) => {
            const m = marketplace[j.id] || {};
            const status = m.marketStatus || "open";
            return (
              <div
                key={j.id}
                className={`k-job-row ${status !== "submitted" ? "non-clickable" : ""}`}
                onClick={status === "submitted"
                  ? () => navigate(`/dashboard/poster/review/${j.id}`)
                  : undefined}
                data-testid={`recent-job-${j.id.slice(0, 8)}`}
              >
                <span className="k-job-id">#{j.id.slice(0, 8)}</span>
                <span className="k-job-title">{j.title || "(untitled)"}</span>
                <StatPill status={status} testId={`recent-job-status-${j.id.slice(0, 8)}`} />
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
