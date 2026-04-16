import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "@/App.css";
import { api } from "@/lib/api";
import { copyText } from "@/lib/mcpHandoff";

/**
 * Executor (Client 2) handoff page.
 * URL: /executor?job=<id>&key=<apiKey>
 * Shows job details + MCP config + live tunnel preview + copy-paste prompt.
 */
export default function ExecutorPage() {
  const [params] = useSearchParams();
  const jobId = params.get("job") || "";
  const apiKey = params.get("key") || "";

  const [pub, setPub] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const loadOnce = useCallback(async () => {
    try {
      const p = await api.getJobPublic(jobId, apiKey);
      setPub(p);
      setRuntime(p.runtime);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to load job");
    }
  }, [jobId, apiKey]);

  useEffect(() => {
    if (!jobId || !apiKey) {
      setError("Missing job or key in URL");
      return undefined;
    }
    loadOnce();
    const id = setInterval(async () => {
      try {
        const r = await api.getJobRuntime(jobId, apiKey);
        setRuntime(r);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [jobId, apiKey, loadOnce]);

  const mcpConfig = useMemo(() => ({
    mcpServers: {
      "kernal-workspace": {
        url: pub?.mcp_endpoint || `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "")}/api/mcp`,
      },
    },
  }), [pub]);

  const executorPrompt = useMemo(() => buildPrompt(pub, jobId, apiKey), [pub, jobId, apiKey]);

  const onCopy = useCallback(async (key, text) => {
    await copyText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  }, []);

  if (error) {
    return (
      <div className="shell">
        <div className="hdr">
          <Link to="/" className="nav-link dim" style={{ fontSize: ".8rem" }}>← home</Link>
          <h1>Executor handoff</h1>
        </div>
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <strong style={{ color: "var(--danger)" }}>Cannot load job</strong>
          <p className="dim" style={{ fontSize: ".88rem" }}>{error}</p>
          <p className="dim" style={{ fontSize: ".8rem" }}>
            Make sure the link the target shared with you is intact (job id + key).
          </p>
        </div>
      </div>
    );
  }

  if (!pub) {
    return (
      <div className="shell">
        <div className="hdr">
          <h1>Loading…</h1>
        </div>
      </div>
    );
  }

  const targetOnline = !!runtime?.target_online;
  const executorOnline = !!runtime?.executor_online;
  const matched = targetOnline && executorOnline;

  return (
    <div className="shell wide">
      <div className="hdr">
        <Link to="/" className="nav-link dim" style={{ fontSize: ".8rem" }}>← home</Link>
        <h1>{pub.title}</h1>
        <span className="tag mono">{jobId.slice(0, 8)}</span>
        <span className="pill" style={{ background: matched ? "#22c55e" : targetOnline ? "#f59e0b" : "var(--dim)", color: "#fff" }}>
          {matched ? "peer matched" : targetOnline ? "target online — connect your agent" : "target offline — ask them to run the CLI"}
        </span>
      </div>

      {pub.context && <p className="dim" style={{ lineHeight: 1.5 }}>{pub.context}</p>}

      {!targetOnline && (
        <div className="card" style={{ borderColor: "#f59e0b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
            <strong style={{ fontSize: ".9rem" }}>Target is offline</strong>
          </div>
          <p className="dim" style={{ fontSize: ".82rem", lineHeight: 1.55 }}>
            The host has not received a heartbeat from the target's CLI agent.
            Ask the target to:
          </p>
          <ol className="dim" style={{ fontSize: ".82rem", lineHeight: 1.7, paddingLeft: "1.1rem" }}>
            <li>Confirm the <code>python3 kernal_agent.py …</code> process is actually running (terminal should show <code>✓ CONNECTED — job …</code>).</li>
            <li>If the terminal shows <code>✗ heartbeat rejected</code> or <code>✗ cannot reach host</code>, fix the cause printed there.</li>
            <li>Re-copy the command from the target page — a broken paste is the #1 cause.</li>
          </ol>
        </div>
      )}

      <div className="grid" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sm dim">1 — MCP config</div>
            <CopyBtn label={copied === "mcp" ? "copied" : "copy"} onClick={() => onCopy("mcp", JSON.stringify(mcpConfig, null, 2))} />
          </div>
          <pre className="mono" style={preStyle}>{JSON.stringify(mcpConfig, null, 2)}</pre>
          <p className="dim" style={{ fontSize: ".78rem", lineHeight: 1.5 }}>
            Paste into Cursor / Claude Desktop / Windsurf <code>mcpServers</code> config. For VS Code,
            use <code>.vscode/mcp.json</code> with <code>{"\"type\": \"http\""}</code>.
          </p>
        </section>

        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sm dim">2 — Prompt for your agent</div>
            <CopyBtn label={copied === "prompt" ? "copied" : "copy"} onClick={() => onCopy("prompt", executorPrompt)} />
          </div>
          <pre className="mono" style={{ ...preStyle, maxHeight: 300, overflow: "auto" }}>{executorPrompt}</pre>
        </section>
      </div>

      <section className="card">
        <div className="sm dim">Live peer status</div>
        <div style={{ display: "grid", gap: ".75rem", gridTemplateColumns: "repeat(3, 1fr)" }}>
          <StatusPill label="Target agent" ok={targetOnline} />
          <StatusPill label="You (executor)" ok={executorOnline} />
          <StatusPill label="Tunnel URL" ok={!!runtime?.tunnel_url}>
            {runtime?.tunnel_url
              ? <a href={runtime.tunnel_url} target="_blank" rel="noreferrer" className="mono" style={{ color: "var(--accent)", fontSize: ".72rem", wordBreak: "break-all" }}>{runtime.tunnel_url}</a>
              : <span className="dim" style={{ fontSize: ".72rem" }}>not yet advertised</span>}
          </StatusPill>
        </div>
      </section>

      {runtime?.tunnel_url && (
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="sm dim">Live preview (target's app via Cloudflare tunnel)</div>
            <a className="pill" href={runtime.tunnel_url} target="_blank" rel="noreferrer" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>open in new tab ↗</a>
          </div>
          <iframe
            title="target-preview"
            src={runtime.tunnel_url}
            style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", height: 520, width: "100%", background: "#fff" }}
          />
          <p className="dim" style={{ fontSize: ".72rem", lineHeight: 1.5 }}>
            The first time you open a trycloudflare URL, you may need to click
            through Cloudflare's "You are about to visit…" interstitial.
          </p>
        </section>
      )}

      <details className="card">
        <summary className="sm dim" style={{ cursor: "pointer" }}>Raw credentials (you already have these from the URL)</summary>
        <div style={{ display: "grid", gap: ".5rem", marginTop: ".75rem" }}>
          <KVRow k="job_id" v={jobId} onCopy={() => onCopy("jid", jobId)} copied={copied === "jid"} />
          <KVRow k="api_key" v={apiKey} onCopy={() => onCopy("key", apiKey)} copied={copied === "key"} />
          <KVRow k="mcp_endpoint" v={pub.mcp_endpoint} onCopy={() => onCopy("ep", pub.mcp_endpoint)} copied={copied === "ep"} />
        </div>
      </details>
    </div>
  );
}

function buildPrompt(pub, jobId, apiKey) {
  if (!pub) return "";
  const lines = [
    "You are a senior engineer connected to a remote workspace via the Kernal MCP.",
    "",
    `Problem: ${pub.title}`,
  ];
  if (pub.context) lines.push(`Context: ${pub.context}`);
  lines.push(
    "",
    "Instructions:",
    `1. Call \`connect_to_job\` with job_id="${jobId}" and api_key="${apiKey}" to attach.`,
    "2. If target_online is false, wait and call `job_status` again in ~5 s.",
    "3. Use `job_list_directory`, `job_read_file`, `job_write_file`, `job_edit_file`, `job_search_files` to investigate and fix the issue on the target's machine.",
    pub.tunnel_url || pub.runtime?.tunnel_url
      ? `4. Validate your fix against the live preview: ${pub.tunnel_url || pub.runtime?.tunnel_url}`
      : "4. If the target set up a Cloudflare tunnel, `job_info` will return the tunnel URL so you can validate in a browser.",
    "5. Keep edits minimal and explain each change.",
    "",
    "All tools accept (job_id, api_key) as their first two arguments.",
  );
  return lines.join("\n");
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
  return <button type="button" onClick={onClick} className="btn" style={ghostBtn}>{label}</button>;
}

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
