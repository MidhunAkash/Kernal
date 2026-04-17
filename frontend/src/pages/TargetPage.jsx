import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "@/App.css";
import { api } from "@/lib/api";
import { copyText } from "@/lib/mcpHandoff";

/**
 * Target (Client 1) flow:
 * 1. Fill form → POST /api/jobs/simple
 * 2. Show CLI command + executor link + live status
 * 3. Poll /api/jobs/{id}/runtime every 3s to show "waiting / expert online"
 */
export default function TargetPage() {
  const [form, setForm] = useState({ title: "", context: "", local_port: 3000, target_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [copied, setCopied] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Give the problem a short title");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        context: form.context.trim(),
        local_port: Number(form.local_port) || 0,
        target_name: form.target_name.trim(),
      };
      const result = await api.createSimpleJob(payload);
      setJob(result);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  // Poll runtime status once job is created
  useEffect(() => {
    if (!job) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await api.getJobRuntime(job.job_id, job.api_key);
        if (!cancelled) setRuntime(r);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [job]);

  const onCopy = useCallback(async (key, text) => {
    await copyText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }, []);

  if (job) {
    return <JobReadyView job={job} runtime={runtime} onCopy={onCopy} copied={copied} onReset={() => { setJob(null); setRuntime(null); }} />;
  }

  return (
    <div className="shell">
      <div className="hdr">
        <Link to="/" className="nav-link dim" style={{ fontSize: ".8rem" }}>← home</Link>
        <h1>Create a job</h1>
        <span className="tag mono">target / client 1</span>
      </div>

      <p className="dim" style={{ lineHeight: 1.5 }}>
        Describe what you need help with. You'll get a one-line command to run
        on your machine and a link you can share with an expert.
      </p>

      <form className="card" onSubmit={submit} style={{ gap: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <span className="sm dim">Title *</span>
          <input
            className="mono"
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
              className="mono"
              value={form.local_port}
              onChange={(e) => setForm({ ...form, local_port: e.target.value })}
              placeholder="3000"
              style={inputStyle}
            />
            <span className="dim" style={{ fontSize: ".72rem" }}>
              Used by the CLI to spawn a Cloudflare tunnel. Leave 0 to skip.
            </span>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
            <span className="sm dim">Label (optional)</span>
            <input
              className="mono"
              value={form.target_name}
              onChange={(e) => setForm({ ...form, target_name: e.target.value })}
              placeholder="my-laptop"
              style={inputStyle}
            />
          </label>
        </div>

        {error && <div style={{ color: "var(--danger)", fontSize: ".85rem" }}>{error}</div>}

        <button type="submit" disabled={submitting} className="btn" style={primaryBtn}>
          {submitting ? "Creating…" : "Create job →"}
        </button>
      </form>
    </div>
  );
}

function JobReadyView({ job, runtime, onCopy, copied, onReset }) {
  const targetOnline = !!runtime?.target_online;
  const executorOnline = !!runtime?.executor_online;
  const matched = targetOnline && executorOnline;

  const statusLabel = !targetOnline
    ? "Waiting for you to start the CLI agent"
    : !executorOnline
      ? "Target connected — waiting for expert"
      : "Expert connected — collaboration live";
  const statusColor = matched ? "#22c55e" : targetOnline ? "#f59e0b" : "var(--dim)";

  return (
    <div className="shell wide">
      <div className="hdr">
        <Link to="/" className="nav-link dim" style={{ fontSize: ".8rem" }}>← home</Link>
        <h1>{job.title}</h1>
        <span className="tag mono">{job.job_id.slice(0, 8)}</span>
        <span className="pill" style={{ background: statusColor, color: "#fff" }}>{statusLabel}</span>
      </div>

      {job.context && <p className="dim" style={{ lineHeight: 1.5 }}>{job.context}</p>}

      <div className="grid" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sm dim">1 — Run on YOUR machine</div>
            <CopyBtn label={copied === "cmd" ? "copied" : "copy"} onClick={() => onCopy("cmd", job.agent_command)} />
          </div>
          <pre className="mono" style={preStyle}>{job.agent_command}</pre>
          <p className="dim" style={{ fontSize: ".78rem", lineHeight: 1.5 }}>
            Requires Python 3.9+ and{" "}
            <a style={{ color: "var(--accent)" }} href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" target="_blank" rel="noreferrer">cloudflared</a>
            {" "}(only if you want a live preview). The script runs in the current directory — cd into your project first.
          </p>
        </section>

        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sm dim">2 — Send THIS to your expert</div>
            <CopyBtn label={copied === "link" ? "copied" : "copy link"} onClick={() => onCopy("link", job.executor_link)} />
          </div>
          <pre className="mono" style={preStyle}>{job.executor_link}</pre>
          <a href={job.executor_link} target="_blank" rel="noreferrer" className="pill" style={{ alignSelf: "flex-start", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            preview executor page →
          </a>
        </section>
      </div>

      <section className="card">
        <div className="sm dim">Live status</div>
        <div style={{ display: "grid", gap: ".75rem", gridTemplateColumns: "repeat(3, 1fr)" }}>
          <StatusPill label="Target agent" ok={targetOnline} tone="accent" />
          <StatusPill label="Expert" ok={executorOnline} tone="info" />
          <StatusPill label="Tunnel" ok={!!runtime?.tunnel_url} tone="tunnel">
            {runtime?.tunnel_url && (
              <a href={runtime.tunnel_url} target="_blank" rel="noreferrer" className="mono" style={{ color: "var(--accent)", fontSize: ".72rem", wordBreak: "break-all" }}>
                {runtime.tunnel_url}
              </a>
            )}
          </StatusPill>
        </div>
      </section>

      <details className="card">
        <summary className="sm dim" style={{ cursor: "pointer" }}>Credentials (share only with the expert)</summary>
        <div style={{ display: "grid", gap: ".5rem", marginTop: ".75rem" }}>
          <KVRow k="job_id" v={job.job_id} onCopy={() => onCopy("jid", job.job_id)} copied={copied === "jid"} />
          <KVRow k="api_key" v={job.api_key} onCopy={() => onCopy("key", job.api_key)} copied={copied === "key"} />
          <KVRow k="mcp_endpoint" v={job.mcp_endpoint} onCopy={() => onCopy("mcp", job.mcp_endpoint)} copied={copied === "mcp"} />
        </div>
      </details>

      <div style={{ display: "flex", gap: ".5rem" }}>
        <button className="btn" style={ghostBtn} onClick={onReset}>Create another job</button>
      </div>
    </div>
  );
}

function StatusPill({ label, ok, children }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", padding: ".65rem .75rem", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", gap: ".3rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ok ? "#22c55e" : "var(--dim)" }} />
        <span className="sm dim">{label}</span>
      </div>
      <div style={{ fontSize: ".78rem" }} className="mono">{ok ? "online" : "offline"}</div>
      {children}
    </div>
  );
}

function KVRow({ k, v, onCopy, copied }) {
  return (
    <div style={{ display: "flex", gap: ".5rem", alignItems: "center", justifyContent: "space-between" }}>
      <div className="sm dim" style={{ minWidth: 90 }}>{k}</div>
      <code className="mono" style={{ flex: 1, fontSize: ".75rem", background: "var(--bg)", padding: ".35rem .5rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</code>
      <CopyBtn label={copied ? "copied" : "copy"} onClick={onCopy} />
    </div>
  );
}

function CopyBtn({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="btn" style={ghostBtn}>{label}</button>
  );
}

const inputStyle = {
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: ".55rem .7rem",
  borderRadius: "var(--radius)",
  fontSize: ".88rem",
  fontFamily: "inherit",
};

const primaryBtn = {
  background: "var(--accent)",
  color: "#0a0a0b",
  border: "none",
  padding: ".6rem 1rem",
  borderRadius: "var(--radius)",
  fontWeight: 600,
  cursor: "pointer",
};

const ghostBtn = {
  background: "transparent",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: ".3rem .65rem",
  borderRadius: "var(--radius)",
  fontSize: ".72rem",
  cursor: "pointer",
};

const preStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: ".65rem .75rem",
  fontSize: ".72rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  lineHeight: 1.5,
};
