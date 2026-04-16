import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { copyText } from "@/lib/mcpHandoff";
import "@/App.css";

const inputStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  padding: ".5rem .75rem",
  fontFamily: "inherit",
  fontSize: ".9rem",
  outline: "none",
  width: "100%",
  transition: "border-color .15s",
};

const monoBlock = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: ".6rem .75rem",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: ".75rem",
  color: "var(--accent)",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  lineHeight: 1.5,
};

function CopyButton({ text, label = "copy" }) {
  const [done, setDone] = useState(false);
  const click = async () => {
    await copyText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button
      onClick={click}
      style={{
        background: done ? "rgba(59,240,138,.12)" : "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        color: done ? "var(--accent)" : "var(--dim)",
        fontSize: ".75rem",
        padding: ".2rem .6rem",
        cursor: "pointer",
        fontFamily: "'JetBrains Mono', monospace",
        transition: "all .15s",
      }}
    >
      {done ? "copied ✓" : label}
    </button>
  );
}

function JobReadyView({ job, onReset }) {
  const navigate = useNavigate();
  const executorUrl = job.executor_link || "";
  const cliCmd = job.agent_command || "";

  return (
    <div className="shell" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="hdr">
        <Link to="/jobs" className="nav-link dim" style={{ fontSize: ".8rem" }}>
          ← jobs
        </Link>
        <h1>Job created</h1>
        <span className="tag mono" style={{ color: "var(--accent)" }}>open</span>
      </div>

      <div className="card" style={{ gap: ".75rem" }}>
        <span className="sm dim">Job title</span>
        <strong style={{ fontSize: "1rem" }}>{job.title}</strong>
        {job.context && (
          <p className="dim" style={{ fontSize: ".85rem", lineHeight: 1.6 }}>{job.context}</p>
        )}
        <div className="dim mono" style={{ fontSize: ".72rem" }}>id: {job.job_id}</div>
      </div>

      {/* Step 1 — run CLI */}
      <div className="card" style={{ gap: ".75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="sm dim">Step 1 — run in your terminal</span>
          <CopyButton text={cliCmd} label="copy command" />
        </div>
        <div style={monoBlock}>{cliCmd}</div>
        <p className="dim" style={{ fontSize: ".78rem", lineHeight: 1.55 }}>
          This downloads and starts the Kernal agent on your machine. Keep it running while the expert works.
        </p>
      </div>

      {/* Step 2 — share link */}
      <div className="card" style={{ gap: ".75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="sm dim">Step 2 — share with an expert</span>
          <CopyButton text={executorUrl} label="copy link" />
        </div>
        <div style={monoBlock}>{executorUrl}</div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={() => window.open(executorUrl, "_blank")}
            style={{ fontSize: ".82rem", padding: ".35rem .9rem" }}
          >
            Open as expert →
          </button>
          <Link
            to="/jobs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: ".35rem .9rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--dim)",
              textDecoration: "none",
              fontSize: ".82rem",
            }}
          >
            View jobs board
          </Link>
        </div>
      </div>

      <button
        onClick={onReset}
        className="dim"
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".82rem" }}
      >
        ← Post another job
      </button>
    </div>
  );
}

export default function PostJobPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    context: "",
    local_port: 3000,
    target_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Give the problem a short title");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.createSimpleJob({
        title: form.title.trim(),
        context: form.context.trim(),
        local_port: Number(form.local_port) || 0,
        target_name: form.target_name.trim() || user?.email?.split("@")[0] || "",
      });
      setJob(result);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="shell">
        <p className="dim mono">Loading…</p>
      </div>
    );
  }

  if (job) {
    return <JobReadyView job={job} onReset={() => setJob(null)} />;
  }

  return (
    <div className="shell" style={{ maxWidth: "600px", margin: "0 auto" }}>
      {/* Header */}
      <div className="hdr" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
          <Link to="/" style={{ fontWeight: 700, textDecoration: "none", color: "var(--text)" }}>
            Kernal
          </Link>
          <span className="tag mono">post a job</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link to="/jobs" className="nav-link dim" style={{ fontSize: ".82rem" }}>
            Jobs board
          </Link>
          <button
            onClick={signOut}
            className="dim"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".82rem" }}
          >
            Sign out
          </button>
        </div>
      </div>

      <p className="dim" style={{ lineHeight: 1.6, fontSize: ".9rem" }}>
        Describe what you need help with. You'll get a one-line command to run on your machine
        and a shareable link for an expert.
      </p>

      <form className="card" onSubmit={submit} style={{ gap: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <span className="sm dim">Title *</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Login redirect loops after password reset"
            style={inputStyle}
            required
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <span className="sm dim">Context (optional)</span>
          <textarea
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
            placeholder="Stack, repro steps, any hypothesis…"
            rows={4}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
            <span className="sm dim">Local dev port</span>
            <input
              type="number"
              value={form.local_port}
              onChange={(e) => setForm({ ...form, local_port: e.target.value })}
              placeholder="3000"
              style={inputStyle}
            />
            <span className="dim" style={{ fontSize: ".72rem", lineHeight: 1.4 }}>
              Used to spawn a Cloudflare tunnel. 0 to skip.
            </span>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
            <span className="sm dim">Label (optional)</span>
            <input
              value={form.target_name}
              onChange={(e) => setForm({ ...form, target_name: e.target.value })}
              placeholder={user?.email?.split("@")[0] || "my-laptop"}
              style={inputStyle}
            />
          </label>
        </div>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: ".85rem" }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn"
          style={{ justifyContent: "center" }}
        >
          {submitting ? "Creating…" : "Create job →"}
        </button>
      </form>
    </div>
  );
}
