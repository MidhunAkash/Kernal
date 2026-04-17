import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HumExHeader from "../../components/humex/HumExHeader";
import Card from "../../components/humex/Card";
import Button from "../../components/humex/Button";
import { useAuth } from "../../lib/auth";
import { getAcceptedJobs } from "../../lib/humexApi";
import "../../humex-spa.css";

/* Map internal status → user-friendly label + pill color */
const STATUS_META = {
  accepted:  { label: "IN PROGRESS", bg: "#fef3c7", fg: "#92400e" },
  submitted: { label: "UNDER REVIEW", bg: "#dbeafe", fg: "#1e40af" },
  approved:  { label: "APPROVED",    bg: "#d1fae5", fg: "#065f46" },
  rejected:  { label: "REJECTED",    bg: "#fee2e2", fg: "#991b1b" },
  closed:    { label: "CLOSED",      bg: "#e5e7eb", fg: "#374151" },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status.toUpperCase(), bg: "#e5e7eb", fg: "#374151" };
  return (
    <span
      className="status-pill"
      style={{ background: meta.bg, color: meta.fg }}
      data-testid={`status-pill-${status}`}
    >
      {meta.label}
    </span>
  );
}

function JobRow({ job, onOpen }) {
  return (
    <Card
      className="accepted-row-card"
      data-testid={`accepted-job-row-${job.id}`}
      onClick={() => onOpen(job.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(job.id)}
    >
      <div className="accepted-row-head">
        <span className="job-id-badge">{job.displayId}</span>
        <StatusPill status={job.status} />
        <span className="reward-pill">🏆 {job.reward_points} pts</span>
      </div>
      <h3 className="accepted-row-title">{job.jobName}</h3>
      {job.problemStatement && (
        <p className="accepted-row-sub">
          {job.problemStatement.length > 180
            ? `${job.problemStatement.slice(0, 180)}…`
            : job.problemStatement}
        </p>
      )}
      <div className="accepted-row-meta">
        <span>
          Posted by <strong>{job.clientName}</strong>
        </span>
        {job.created_at && (
          <span className="detail-meta">
            {new Date(job.created_at).toLocaleString()}
          </span>
        )}
      </div>
      <div className="accepted-row-actions">
        <Button variant="primary" onClick={(e) => { e.stopPropagation(); onOpen(job.id); }} data-testid={`open-accepted-job-${job.id}`}>
          Open →
        </Button>
      </div>
    </Card>
  );
}

function AcceptedJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | submitted | approved

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    try {
      const mine = await getAcceptedJobs(user.id);
      setJobs(mine);
    } catch (e) {
      console.error(e);
      setError("Could not load your accepted jobs.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const counts = {
    all: jobs.length,
    active: jobs.filter((j) => j.status === "accepted").length,
    submitted: jobs.filter((j) => j.status === "submitted").length,
    approved: jobs.filter((j) => j.status === "approved").length,
  };

  const filtered = jobs.filter((j) => {
    if (filter === "all") return true;
    if (filter === "active") return j.status === "accepted";
    if (filter === "submitted") return j.status === "submitted";
    if (filter === "approved") return j.status === "approved";
    return true;
  });

  return (
    <div className="humex-spa">
      <HumExHeader />
      <main className="k-main" data-testid="accepted-jobs-page">
        <div className="page-head">
          <h1 className="page-title">
            Accepted Jobs
            <span className="count-badge" data-testid="accepted-jobs-count-badge">
              {jobs.length}
            </span>
          </h1>
          <p className="page-sub">
            Jobs you&apos;ve accepted as an expert. Track their status from
            in-progress to approved.
          </p>

          <div className="filter-row" data-testid="accepted-filter-row">
            {[
              { key: "all",       label: `All (${counts.all})` },
              { key: "active",    label: `In Progress (${counts.active})` },
              { key: "submitted", label: `Under Review (${counts.submitted})` },
              { key: "approved",  label: `Approved (${counts.approved})` },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                className={`filter-chip ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
                data-testid={`filter-${f.key}`}
              >
                {f.label}
              </button>
            ))}
            <Button variant="secondary" onClick={load} data-testid="refresh-accepted-jobs">
              ↻ Refresh
            </Button>
          </div>
        </div>

        {loading && jobs.length === 0 && (
          <p className="page-sub" data-testid="accepted-jobs-loading">
            Loading your accepted jobs…
          </p>
        )}

        {error && (
          <Card data-testid="accepted-jobs-error">
            <p style={{ color: "#b91c1c" }}>{error}</p>
            <Button variant="primary" onClick={load}>Retry</Button>
          </Card>
        )}

        {!loading && !error && jobs.length === 0 && (
          <Card className="notfound-card" data-testid="accepted-jobs-empty">
            <h2 className="hero-heading">No accepted jobs yet</h2>
            <p className="hero-sub">
              Browse open jobs and accept one to see it here.
            </p>
            <Button variant="primary" onClick={() => navigate("/expert/jobs")} data-testid="browse-jobs-cta">
              Browse Jobs →
            </Button>
          </Card>
        )}

        {!loading && filtered.length === 0 && jobs.length > 0 && (
          <p className="page-sub" data-testid="accepted-jobs-filter-empty">
            No jobs match this filter.
          </p>
        )}

        <div className="accepted-list" data-testid="accepted-jobs-list">
          {filtered.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onOpen={(id) => navigate(`/expert/jobs/${id}`)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default AcceptedJobs;
