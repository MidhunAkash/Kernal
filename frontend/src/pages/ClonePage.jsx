import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "@/App.css";
import { api, createApiClient } from "@/lib/api";
import {
  copyText,
  formatDate,
  buildSimpleConfig,
  buildConfigUrl,
  buildClonePrompt,
  buildVscodeMcpConfig,
  buildMcpServersConfig,
  buildWorkspaceClonePrompt,
} from "@/lib/mcpHandoff";

const LOCAL_BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

function inferPublicBackendUrl() {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "";
  // Dev tunnels: swap the frontend port prefix for the backend port prefix
  const origin = window.location.origin;
  if (origin.includes("-3000")) {
    return origin.replace("-3000", "-8001");
  }
  return "";
}

export default function ClonePage() {
  // ── URLs ──
  const [publicBackendUrl, setPublicBackendUrl] = useState(() => inferPublicBackendUrl() || "");
  const [previewUrl, setPreviewUrl] = useState(() => {
    if (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      return window.location.origin;
    }
    return "";
  });

  // ── data ──
  const [jobs, setJobs] = useState([]);
  const [targets, setTargets] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [fullMcpConfig, setFullMcpConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // ── copy state ──
  const [copiedSimple, setCopiedSimple] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedVscode, setCopiedVscode] = useState(false);
  const [copiedMcpServers, setCopiedMcpServers] = useState(false);
  const [copiedWsPrompt, setCopiedWsPrompt] = useState(false);

  // ── job peer status ──
  const [jobStatus, setJobStatus] = useState(null);
  const statusPollRef = useRef(null);

  // ── derived API client ──
  const remoteApi = useMemo(() => {
    if (publicBackendUrl) return createApiClient(publicBackendUrl);
    return null;
  }, [publicBackendUrl]);

  const effectiveApi = remoteApi || api;

  // ── load ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, jobsRes] = await Promise.all([
        effectiveApi.mcpConnections().catch(() => ({ clients: [] })),
        effectiveApi.listJobs().catch(() => ({ jobs: [] })),
      ]);
      const nextTargets = (connRes.clients || []).filter((c) => c.role === "target");
      setTargets(nextTargets);
      setJobs(jobsRes.jobs || []);
    } finally {
      setLoading(false);
    }
  }, [effectiveApi]);

  useEffect(() => { load(); }, [load]);

  // ── select job ──
  useEffect(() => {
    if (!selectedJobId && jobs[0]) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  // ── fetch full job + MCP config when selection changes ──
  useEffect(() => {
    if (!selectedJobId) {
      setSelectedJob(null);
      setFullMcpConfig(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const jobRes = await effectiveApi.getJob(selectedJobId);
        if (cancelled) return;
        const job = jobRes.job || jobRes;
        setSelectedJob(job);

        // Fetch full MCP config for the target client
        const targetId = job.target_client_id;
        if (targetId) {
          const override = publicBackendUrl || undefined;
          const configRes = await effectiveApi.mcpConfig(targetId, override);
          if (!cancelled) setFullMcpConfig(configRes.config || null);
        }
      } catch (err) {
        if (!cancelled) {
          setMessage(err.response?.data?.detail || "Failed to load job details.");
          setSelectedJob(null);
          setFullMcpConfig(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedJobId, effectiveApi, publicBackendUrl]);

  // ── poll job peer status ──
  useEffect(() => {
    if (!selectedJobId) {
      setJobStatus(null);
      return;
    }
    let active = true;
    const fetchStatus = async () => {
      try {
        const s = await effectiveApi.getJobStatus(selectedJobId);
        if (active) setJobStatus(s);
      } catch {
        if (active) setJobStatus(null);
      }
    };
    fetchStatus();
    const poll = setInterval(fetchStatus, 5000);
    statusPollRef.current = poll;
    return () => {
      active = false;
      clearInterval(poll);
      statusPollRef.current = null;
    };
  }, [selectedJobId, effectiveApi]);

  // ── derived values ──
  const selectedTarget = useMemo(
    () => targets.find((t) => t.id === selectedJob?.target_client_id) || null,
    [targets, selectedJob],
  );

  const simpleConfig = useMemo(() => {
    if (!selectedJob || !selectedTarget) return null;
    return buildSimpleConfig({
      mainServerUrl: publicBackendUrl || LOCAL_BACKEND,
      apiKey: selectedTarget.api_key || selectedJob.console_config?.apiKey || "",
      jobId: selectedJob.id,
    });
  }, [selectedJob, selectedTarget, publicBackendUrl]);

  const configUrl = useMemo(() => {
    if (!selectedJob?.target_client_id) return "";
    return buildConfigUrl({
      publicBackendUrl: publicBackendUrl || LOCAL_BACKEND,
      targetClientId: selectedJob.target_client_id,
    });
  }, [selectedJob, publicBackendUrl]);

  const clonePrompt = useMemo(() => {
    if (!selectedJob || !simpleConfig) return "";
    return buildClonePrompt({
      job: selectedJob,
      simpleConfig,
      fullMcpConfig,
      configUrl,
      previewUrl,
    });
  }, [selectedJob, simpleConfig, fullMcpConfig, configUrl, previewUrl]);

  const vscodeMcpConfig = useMemo(() => {
    if (!publicBackendUrl) return null;
    return buildVscodeMcpConfig(publicBackendUrl);
  }, [publicBackendUrl]);

  const mcpServersConfig = useMemo(() => {
    if (!publicBackendUrl) return null;
    return buildMcpServersConfig(publicBackendUrl);
  }, [publicBackendUrl]);

  const workspaceClonePrompt = useMemo(() => {
    if (!publicBackendUrl) return "";
    return buildWorkspaceClonePrompt({ publicBackendUrl, previewUrl });
  }, [publicBackendUrl, previewUrl]);

  // ── actions ──
  const handleCopy = (text, setter) => {
    copyText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 1800);
    });
  };

  const handleRefresh = () => {
    setMessage("");
    load();
  };

  // ── render ──
  return (
    <div className="shell wide" data-testid="clone-page">
      <header className="hdr">
        <div>
          <h1 className="mono">/clone</h1>
          <p className="helper-text dim">Package a saved job into an Emergent-ready MCP handoff with public tunnel URLs.</p>
        </div>
        <span className="tag">clone + handoff</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: ".5rem" }}>
          <Link to="/console" className="btn-sm nav-link">← console</Link>
          <Link to="/ops" className="btn-sm nav-link">ops →</Link>
        </div>
      </header>

      {/* Trust warning */}
      {publicBackendUrl && (
        <section className="card clone-warning">
          <strong className="mono" style={{ fontSize: ".82rem" }}>Dev tunnel trust step</strong>
          <p className="helper-text dim">
            Both tunnel URLs must be opened manually once in a browser to clear the Microsoft Dev Tunnels trust interstitial.
            Open each link below, click <strong>Continue</strong>, then return here.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a href={publicBackendUrl} target="_blank" rel="noreferrer" className="page-link mono" style={{ fontSize: ".78rem" }}>
              {publicBackendUrl} (backend)
            </a>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="page-link mono" style={{ fontSize: ".78rem" }}>
                {previewUrl} (preview)
              </a>
            )}
          </div>
        </section>
      )}

      <div className="hero-grid">
        {/* Left column — settings + job selection */}
        <div className="stack">
          <section className="card">
            <h2 className="mono sm">1. Public tunnel URLs</h2>
            <p className="helper-text dim">Set the public URLs that a remote agent (Emergent) will use to reach this backend and preview the app.</p>

            <div>
              <label className="field-label mono dim">Public backend URL</label>
              <input
                className="inp"
                value={publicBackendUrl}
                onChange={(e) => setPublicBackendUrl(e.target.value)}
                placeholder="https://xxxxx-8001.inc1.devtunnels.ms"
              />
            </div>
            <div>
              <label className="field-label mono dim">Preview URL (frontend)</label>
              <input
                className="inp"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://xxxxx-3000.inc1.devtunnels.ms"
              />
            </div>
          </section>

          <section className="card">
            <h2 className="mono sm">2. Select a job</h2>
            <p className="helper-text dim">Pick a saved job from the console, or paste a job ID directly.</p>

            <select className="inp" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
              <option value="">-- choose a job --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.status}) — {formatDate(j.created_at)}
                </option>
              ))}
            </select>

            <div className="form-row">
              <input
                className="inp"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                placeholder="Or paste a job ID"
              />
              <button className="btn-sm" onClick={handleRefresh} disabled={loading}>
                {loading ? "loading..." : "refresh"}
              </button>
            </div>

            {jobs.length === 0 && !loading && (
              <p className="helper-text dim">
                No jobs found. <Link to="/console" className="page-link">Create one in the console</Link> first.
              </p>
            )}
          </section>

          {/* Job + target summary */}
          {selectedJob && (
            <section className="card">
              <h2 className="mono sm">Job summary</h2>
              <div className="notice">
                <p className="helper-text"><strong className="mono">Title:</strong> {selectedJob.title}</p>
                {selectedJob.context && <p className="helper-text dim">{selectedJob.context}</p>}
                <p className="helper-text dim">Tunnel: <code>{selectedJob.tunnel_url}</code></p>
                <p className="helper-text dim">Job ID: <code>{selectedJob.id}</code></p>
                <p className="helper-text dim">Status: <span className="pill">{selectedJob.status}</span></p>
                <p className="helper-text dim">Created: {formatDate(selectedJob.created_at)}</p>
              </div>
              {selectedTarget && (
                <div className="notice" style={{ marginTop: ".5rem" }}>
                  <p className="helper-text"><strong className="mono">Target:</strong> {selectedTarget.name}</p>
                  <p className="helper-text dim">Session: <code>{selectedTarget.session_id}</code></p>
                  <p className="helper-text dim">API key: <code>{selectedTarget.api_key}</code></p>
                </div>
              )}

              {/* Peer status */}
              <div className="notice" style={{ marginTop: ".5rem", borderLeft: "3px solid var(--accent, #6366f1)", paddingLeft: ".75rem" }}>
                <p className="helper-text"><strong className="mono">Peer status</strong></p>
                {jobStatus ? (
                  <>
                    <p className="helper-text dim">
                      Target: <strong>{jobStatus.target_online ? "online" : "offline"}</strong>
                      {" · "}
                      Executor: <strong>{jobStatus.executor_online ? "online" : "offline"}</strong>
                      {" · "}
                      Matched: <strong>{jobStatus.peer_matched ? "yes" : "no"}</strong>
                    </p>
                    {jobStatus.peers?.length > 0 && jobStatus.peers.map((p) => (
                      <p key={p.client_id} className="helper-text dim" style={{ fontSize: ".76rem" }}>
                        <code>{p.client_id.slice(0, 12)}…</code> · {p.role} · {p.stale ? "stale" : "active"}
                      </p>
                    ))}
                    {jobStatus.peers?.length === 0 && (
                      <p className="helper-text dim">No peers have announced this job yet.</p>
                    )}
                  </>
                ) : (
                  <p className="helper-text dim">Fetching...</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right column — outputs */}
        <div className="stack">

          {/* ── Direct Workspace MCP (kernal-workspace) ── */}
          <section className="card" style={{ borderLeft: "3px solid #6366f1" }}>
            <h2 className="mono sm">Kernal Workspace MCP <span className="pill" style={{ fontSize: ".7rem", verticalAlign: "middle" }}>direct</span></h2>
            <p className="helper-text dim">
              Give this config to the remote client/agent. It connects directly to this workspace via MCP Streamable HTTP.
              The agent should call <code>workspace_status_check</code> first — it will get instructions on how to trust the tunnel if needed.
            </p>

            {publicBackendUrl ? (
              <>
                <div style={{ marginBottom: ".5rem" }}>
                  <label className="field-label mono dim">MCP endpoint</label>
                  <code className="config-json" style={{ display: "block", wordBreak: "break-all", fontSize: ".78rem", padding: ".4rem .6rem" }}>
                    {publicBackendUrl.replace(/\/+$/, "")}/mcp
                  </code>
                </div>

                <div style={{ marginBottom: ".75rem" }}>
                  <label className="field-label mono dim">VS Code (.vscode/mcp.json)</label>
                  <pre className="config-json" style={{ fontSize: ".78rem" }}>
                    {JSON.stringify(vscodeMcpConfig, null, 2)}
                  </pre>
                  <button
                    className="btn-sm"
                    onClick={() => handleCopy(JSON.stringify(vscodeMcpConfig, null, 2), setCopiedVscode)}
                  >
                    {copiedVscode ? "copied!" : "copy VS Code config"}
                  </button>
                </div>

                <div style={{ marginBottom: ".75rem" }}>
                  <label className="field-label mono dim">Other clients — mcpServers format (Cursor, Windsurf, Claude Desktop)</label>
                  <pre className="config-json" style={{ fontSize: ".78rem" }}>
                    {JSON.stringify(mcpServersConfig, null, 2)}
                  </pre>
                  <button
                    className="btn-sm"
                    onClick={() => handleCopy(JSON.stringify(mcpServersConfig, null, 2), setCopiedMcpServers)}
                  >
                    {copiedMcpServers ? "copied!" : "copy mcpServers config"}
                  </button>
                </div>

                <div>
                  <label className="field-label mono dim">Agent prompt (connection setup + tools)</label>
                  <pre className="config-json" style={{ maxHeight: "320px", whiteSpace: "pre-wrap", fontSize: ".76rem" }}>
                    {workspaceClonePrompt}
                  </pre>
                  <button
                    className="btn"
                    onClick={() => handleCopy(workspaceClonePrompt, setCopiedWsPrompt)}
                  >
                    {copiedWsPrompt ? "copied!" : "copy agent prompt"}
                  </button>
                </div>
              </>
            ) : (
              <p className="helper-text dim">
                Set the <strong>Public backend URL</strong> above (e.g. <code>https://r8zcdngb-8001.inc1.devtunnels.ms</code>) to generate the config.
              </p>
            )}
          </section>

          {/* Simple config */}
          <section className="card">
            <h2 className="mono sm">3a. Simple config</h2>
            <p className="helper-text dim">Three fields: <code>mainServerUrl</code>, <code>apiKey</code>, <code>jobId</code>.</p>
            <pre className="config-json">{simpleConfig ? JSON.stringify(simpleConfig, null, 2) : "Select a job first."}</pre>
            <button
              className="btn"
              disabled={!simpleConfig}
              onClick={() => handleCopy(JSON.stringify(simpleConfig, null, 2), setCopiedSimple)}
            >
              {copiedSimple ? "copied!" : "copy simple config"}
            </button>
          </section>

          {/* Full MCP config */}
          <section className="card">
            <h2 className="mono sm">3b. Full MCP server config</h2>
            <p className="helper-text dim">The complete <code>mcpServers</code> JSON — URLs point at the public backend when set.</p>
            <pre className="config-json" style={{ maxHeight: "280px" }}>
              {fullMcpConfig ? JSON.stringify(fullMcpConfig, null, 2) : "Select a job to fetch the full config."}
            </pre>
            <button
              className="btn"
              disabled={!fullMcpConfig}
              onClick={() => handleCopy(JSON.stringify(fullMcpConfig, null, 2), setCopiedFull)}
            >
              {copiedFull ? "copied!" : "copy full config"}
            </button>
          </section>

          {/* Config URL */}
          {configUrl && (
            <section className="card">
              <h2 className="mono sm">3c. Config URL</h2>
              <p className="helper-text dim">A remote consumer can fetch the live config from this URL.</p>
              <code className="config-json" style={{ display: "block", wordBreak: "break-all", fontSize: ".78rem" }}>
                {configUrl}
              </code>
              <button
                className="btn-sm"
                onClick={() => handleCopy(configUrl, setCopiedUrl)}
              >
                {copiedUrl ? "copied!" : "copy URL"}
              </button>
            </section>
          )}

          {/* Clone prompt */}
          <section className="card">
            <h2 className="mono sm">4. Emergent clone prompt</h2>
            <p className="helper-text dim">Paste this into Emergent (or any MCP-capable agent) to clone the project.</p>
            <pre className="config-json" style={{ maxHeight: "360px", whiteSpace: "pre-wrap" }}>
              {clonePrompt || "Select a job to generate the clone prompt."}
            </pre>
            <button
              className="btn"
              disabled={!clonePrompt}
              onClick={() => handleCopy(clonePrompt, setCopiedPrompt)}
            >
              {copiedPrompt ? "copied!" : "copy clone prompt"}
            </button>
          </section>
        </div>
      </div>

      {message && (
        <section className="card">
          <p className="helper-text dim">{message}</p>
        </section>
      )}
    </div>
  );
}
