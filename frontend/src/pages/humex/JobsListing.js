import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HumExHeader from "../../components/humex/HumExHeader";
import Card from "../../components/humex/Card";
import Button from "../../components/humex/Button";
import { listJobs } from "../../lib/humexApi";
import "../../humex-spa.css";

function JobsListing() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await listJobs();
      // Only show open jobs to experts
      setJobs(data.filter((j) => j.status === "open"));
    } catch (e) {
      console.error(e);
      setError("Could not load jobs. Is the backend reachable?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="humex-spa">
      <HumExHeader />
      <main className="k-main" data-testid="jobs-listing-page">
        <div className="page-head">
          <h1 className="page-title">
            Available Jobs
            <span className="count-badge" data-testid="jobs-count-badge">
              {jobs.length}
            </span>
          </h1>
          <p className="page-sub">
            Live from the HumEx MCP tunnel. Pick a problem, connect via Human MCP,
            and earn reward points when your fix is approved.
          </p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <Button variant="secondary" onClick={load} data-testid="refresh-btn">
              ↻ Refresh
            </Button>
          </div>
        </div>

        {loading && jobs.length === 0 && (
          <p className="page-sub" data-testid="jobs-loading">Loading jobs…</p>
        )}

        {error && (
          <Card className="" data-testid="jobs-error">
            <p style={{ color: "#b91c1c" }}>{error}</p>
          </Card>
        )}

        {!loading && !error && jobs.length === 0 && (
          <Card className="" data-testid="jobs-empty">
            <h3 className="job-name" style={{ marginBottom: ".5rem" }}>
              No open jobs yet
            </h3>
            <p className="page-sub" style={{ marginTop: 0 }}>
              A job will appear here the moment a Client 1 user calls{" "}
              <code>create_job</code> from their AI assistant (or{" "}
              <code>POST /api/jobs/simple</code>).
            </p>
          </Card>
        )}

        {jobs.length > 0 && (
          <div className="jobs-grid" data-testid="jobs-grid">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="job-card"
                onClick={() => navigate(`/expert/jobs/${job.id}`)}
              >
                <div data-testid={`job-card-${job.id}`} className="job-card-inner">
                  <span className="job-id-badge">{job.displayId}</span>
                  <h3 className="job-name">{job.jobName}</h3>
                  <p className="job-poster">Posted by {job.clientName}</p>
                  <div className="job-reward-row">
                    <span className="job-reward-label">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                    <span className="status-pill status-pill-sm">
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default JobsListing;
