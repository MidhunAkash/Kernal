import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

const FILTERS = [
  { key: "all",       label: "All" },
  { key: "open",      label: "Open" },
  { key: "accepted",  label: "Accepted" },
  { key: "submitted", label: "Submitted" },
  { key: "approved",  label: "Approved" },
];

function fmt(dt) {
  if (!dt) return "";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function MyJobsClient1() {
  const { marketplace } = useApp();
  const navigate = useNavigate();
  const [backendJobs, setBackendJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

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

  const myJobs = useMemo(() => {
    return backendJobs
      .filter((j) => marketplace[j.id])
      .map((j) => ({ backend: j, market: marketplace[j.id] }));
  }, [backendJobs, marketplace]);

  const filtered = useMemo(() => {
    if (filter === "all") return myJobs;
    return myJobs.filter((x) => (x.market.marketStatus || "open") === filter);
  }, [myJobs, filter]);

  return (
    <AppLayout>
      <h1 className="k-page-title" data-testid="my-jobs-title">My Jobs</h1>
      <p className="k-page-sub">Jobs you've posted to HumEx MCP.</p>

      <div className="k-tabs" data-testid="my-jobs-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`k-tab ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
            data-testid={`my-jobs-tab-${f.key}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && myJobs.length === 0 ? (
        <p style={{ color: "var(--k-text-muted)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="k-card" data-testid="my-jobs-empty">
          <p style={{ margin: 0, color: "var(--k-text-secondary)" }}>
            No jobs in this view. Post one from the nav.
          </p>
        </div>
      ) : (
        <div className="k-job-list" data-testid="my-jobs-list">
          {filtered.map(({ backend, market }) => {
            const status = market.marketStatus || "open";
            const clickable = status === "submitted";
            return (
              <div
                key={backend.id}
                className={`k-job-row ${clickable ? "" : "non-clickable"}`}
                onClick={clickable ? () => navigate(`/dashboard/poster/review/${backend.id}`) : undefined}
                data-testid={`my-job-${backend.id.slice(0, 8)}`}
              >
                <span className="k-job-id">#{backend.id.slice(0, 8)}</span>
                <span className="k-job-title">{backend.title || "(untitled)"}</span>
                <span className="k-reward">★ {market.rewardPoints || 0} pts</span>
                <span className={`k-status ${status}`} data-testid={`my-job-status-${backend.id.slice(0, 8)}`}>{status}</span>
                <span style={{ fontSize: 11, color: "var(--k-text-muted)", marginLeft: 8 }}>
                  {fmt(backend.created_at || market.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
