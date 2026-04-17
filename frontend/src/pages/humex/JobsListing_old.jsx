import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Card from "@/components/humex/Card";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function JobsListing() {
  const { marketplace } = useApp();
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

  return (
    <AppLayout>
      <div className="k-row">
        <h1 className="k-page-title" data-testid="jobs-listing-title">Available Jobs</h1>
        <span className="k-role-badge client1" data-testid="jobs-listing-count">{openJobs.length}</span>
      </div>
      <p className="k-page-sub">Live from the HumEx backend. Pick one to see the MCP handoff.</p>

      {loading && openJobs.length === 0 ? (
        <p style={{ color: "var(--k-text-muted)" }}>Loading…</p>
      ) : openJobs.length === 0 ? (
        <Card testId="jobs-listing-empty">
          <p style={{ margin: 0, color: "var(--k-text-secondary)" }}>
            No open jobs right now. Check back in a bit — posters publish new ones all the time.
          </p>
        </Card>
      ) : (
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}
          data-testid="jobs-listing-grid"
        >
          {openJobs.map((j) => {
            const m = marketplace[j.id];
            return (
              <Card
                key={j.id}
                hoverable
                onClick={() => navigate(`/dashboard/solver/jobs/${j.id}`)}
                testId={`job-card-${j.id.slice(0, 8)}`}
              >
                <div className="k-row" style={{ marginBottom: 10 }}>
                  <span className="k-job-id">#{j.id.slice(0, 8)}</span>
                  <span className="k-status open" style={{ marginLeft: "auto" }}>open</span>
                </div>
                <h3 className="k-card-title">{j.title || "(untitled)"}</h3>
                <p className="k-card-meta">
                  Posted by <strong>{m?.postedByName || j.target_name || "HumEx user"}</strong>
                </p>
                {j.context && (
                  <p style={{
                    color: "var(--k-text-secondary)",
                    fontSize: 13,
                    margin: "8px 0 12px",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {j.context}
                  </p>
                )}
                <div className="k-row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                  <span className="k-reward">★ {m?.rewardPoints || 0} pts</span>
                  <span style={{ fontSize: 12, color: "var(--k-text-muted)" }}>
                    view details →
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
