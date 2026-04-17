import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import "@/App.css";

const BACKEND = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusPill({ status }) {
  const colour =
    status === "open" ? "var(--accent)" : status === "closed" ? "var(--danger)" : "var(--dim)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: ".15rem .5rem",
        borderRadius: "20px",
        fontSize: ".7rem",
        border: `1px solid ${colour}`,
        color: colour,
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: "lowercase",
      }}
    >
      {status}
    </span>
  );
}

function JobCard({ job, onClaim, claiming }) {
  return (
    <div
      className="card"
      style={{
        gap: ".75rem",
        borderLeft: job.status === "open" ? "3px solid var(--accent)" : "3px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <h3 style={{ fontSize: ".95rem", fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
          {job.title}
        </h3>
        <StatusPill status={job.status} />
      </div>

      {job.context && (
        <p
          className="dim"
          style={{
            fontSize: ".83rem",
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {job.context}
        </p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: ".5rem",
        }}
      >
        <div className="dim" style={{ fontSize: ".75rem", fontFamily: "'JetBrains Mono', monospace" }}>
          {job.target_name && (
            <span style={{ marginRight: ".75rem" }}>posted by {job.target_name}</span>
          )}
          <span>{timeAgo(job.created_at)}</span>
        </div>

        {job.status === "open" && (
          <button
            className="btn"
            onClick={() => onClaim(job)}
            disabled={claiming === job.id}
            style={{ fontSize: ".82rem", padding: ".35rem .9rem" }}
          >
            {claiming === job.id ? "Connecting…" : "Take this job →"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [claiming, setClaiming] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.listJobs();
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      load();
    }
  }, [authLoading, user, navigate, load]);

  const claimJob = async (job) => {
    setClaiming(job.id);
    try {
      // GET /api/jobs/{id} returns console_config.apiKey
      const data = await api.getJob(job.id);
      const apiKey = data?.job?.console_config?.apiKey;
      if (!apiKey) {
        alert("Could not retrieve job credentials. The job may no longer be active.");
        return;
      }
      navigate(`/executor?job=${job.id}&key=${encodeURIComponent(apiKey)}`);
    } catch (err) {
      alert(err?.response?.data?.detail || err.message || "Failed to claim job");
    } finally {
      setClaiming(null);
    }
  };

  const filtered = jobs.filter((j) => filter === "all" || j.status === filter);

  if (authLoading) {
    return (
      <div className="shell">
        <p className="dim mono">Loading…</p>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: "700px", margin: "0 auto" }}>
      {/* Header */}
      <div className="hdr" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
          <Link to="/" style={{ fontWeight: 700, textDecoration: "none", color: "var(--text)" }}>
            HumEx
          </Link>
          <span className="tag mono">jobs board</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={signOut}
            className="dim"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".82rem" }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* User pill */}
      {user && (
        <div className="dim mono" style={{ fontSize: ".75rem" }}>
          Signed in as {user.email}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: ".5rem" }}>
        {["open", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "var(--surface)" : "transparent",
              border: `1px solid ${filter === f ? "var(--border)" : "transparent"}`,
              borderRadius: "var(--radius)",
              color: filter === f ? "var(--text)" : "var(--dim)",
              padding: ".3rem .75rem",
              fontSize: ".82rem",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {f}
          </button>
        ))}
        <button
          onClick={load}
          className="dim"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: ".78rem",
            marginLeft: "auto",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ↻ refresh
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <p className="dim mono" style={{ fontSize: ".85rem" }}>Loading jobs…</p>
      ) : error ? (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <strong style={{ color: "var(--danger)" }}>Error</strong>
          <p className="dim" style={{ fontSize: ".85rem" }}>{error}</p>
          <button className="btn" onClick={load} style={{ alignSelf: "flex-start" }}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", gap: "1rem", padding: "2.5rem 1.5rem" }}>
          <p className="dim" style={{ fontSize: ".9rem" }}>
            {filter === "open" ? "No open jobs right now." : "No jobs found."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onClaim={claimJob} claiming={claiming} />
          ))}
        </div>
      )}

      <div className="dim mono" style={{ fontSize: ".72rem" }}>
        {filtered.length} job{filtered.length !== 1 ? "s" : ""} · MCP endpoint:{" "}
        <code>{BACKEND}/api/mcp</code>
      </div>
    </div>
  );
}
