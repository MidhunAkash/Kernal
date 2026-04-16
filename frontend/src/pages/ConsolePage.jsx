import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "@/App.css";
import { api } from "@/lib/api";
import { copyText, formatDate, buildExecutorPrompt } from "@/lib/mcpHandoff";

const DEFAULT_SERVER_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

function JobCard({ job, onUseJob, onCopyId }) {
  return (
    <article className="job-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", alignItems: "flex-start" }}>
        <div>
          <div className="pill">{job.status || "open"}</div>
          <h3 className="mono" style={{ marginTop: ".55rem", fontSize: ".92rem" }}>{job.title}</h3>
        </div>
        <button className="btn-sm" onClick={() => onCopyId(job.id)}>
          copy id
        </button>
      </div>
      <p className="helper-text dim">Target: <span className="accent">{job.target_name || "Unknown target"}</span></p>
      <p className="helper-text dim">Tunnel: <code>{job.tunnel_url}</code></p>
      {job.context && <p className="helper-text dim">{job.context}</p>}
      <p className="helper-text dim">Created: {formatDate(job.created_at)}</p>
      <button className="btn-sm" onClick={() => onUseJob(job)}>
        load this job
      </button>
    </article>
  );
}

export default function ConsolePage() {
  const [mainServerUrl, setMainServerUrl] = useState(DEFAULT_SERVER_URL);
  const [hostName, setHostName] = useState("Workspace host");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [problem, setProblem] = useState("");
  const [context, setContext] = useState("");
  const [tunnelUrl, setTunnelUrl] = useState("");
  const [targets, setTargets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [createdJob, setCreatedJob] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingTarget, setCreatingTarget] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Tunnel state
  const [tunnel, setTunnel] = useState({ status: "stopped", installed: false, public_url: "", local_url: "", error: "" });
  const [tunnelLocal, setTunnelLocal] = useState("http://localhost:8001");
  const [tunnelLogs, setTunnelLogs] = useState([]);
  const [tunnelBusy, setTunnelBusy] = useState(false);
  const [showTunnelLogs, setShowTunnelLogs] = useState(false);
  const tunnelPollRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connectionsResult, jobsResult, tunnelResult] = await Promise.all([
        api.mcpConnections().catch(() => ({ clients: [] })),
        api.listJobs().catch(() => ({ jobs: [] })),
        api.tunnelStatus().catch(() => null),
      ]);
      const nextTargets = (connectionsResult.clients || []).filter((client) => client.role === "target");
      setTargets(nextTargets);
      setJobs(jobsResult.jobs || []);
      if (jobsResult.message) {
        setMessage(jobsResult.message);
      }
      if (tunnelResult) {
        setTunnel(tunnelResult);
        if (tunnelResult.public_url && !tunnelUrl) {
          setTunnelUrl(tunnelResult.public_url);
        }
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedTargetId && targets[0]) {
      setSelectedTargetId(targets[0].id);
    }
  }, [targets, selectedTargetId]);

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) || null,
    [targets, selectedTargetId],
  );

  useEffect(() => {
    if (selectedTarget?.api_key) {
      setApiKey(selectedTarget.api_key);
    }
  }, [selectedTarget]);

  const configPreview = useMemo(
    () => ({
      mainServerUrl: mainServerUrl.trim() || DEFAULT_SERVER_URL,
      apiKey: apiKey.trim(),
      jobId: createdJob?.id || "",
    }),
    [mainServerUrl, apiKey, createdJob],
  );

  const executorPrompt = useMemo(() => {
    if (!createdJob) return "";
    return buildExecutorPrompt({ job: createdJob, config: configPreview });
  }, [createdJob, configPreview]);

  const refreshJobsOnly = async () => {
    const jobsResult = await api.listJobs().catch(() => ({ jobs: [] }));
    setJobs(jobsResult.jobs || []);
  };

  // Poll tunnel status while it's starting or running
  useEffect(() => {
    if (tunnel.status === "starting" || tunnel.status === "running") {
      const poll = setInterval(async () => {
        try {
          const s = await api.tunnelStatus();
          setTunnel(s);
          if (s.public_url && !tunnelUrl) {
            setTunnelUrl(s.public_url);
          }
        } catch {}
      }, 2000);
      tunnelPollRef.current = poll;
      return () => clearInterval(poll);
    }
    if (tunnelPollRef.current) {
      clearInterval(tunnelPollRef.current);
      tunnelPollRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tunnel.status]);

  const handleTunnelStart = async () => {
    setTunnelBusy(true);
    setMessage("");
    try {
      const result = await api.tunnelStart(tunnelLocal.trim() || "http://localhost:8001");
      setTunnel(result);
      if (result.public_url) {
        setTunnelUrl(result.public_url);
        setMessage("Tunnel running. Public URL copied to the Tunnel URL field.");
      } else if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Tunnel starting... URL will appear shortly.");
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || "Failed to start tunnel.");
    } finally {
      setTunnelBusy(false);
    }
  };

  const handleTunnelStop = async () => {
    setTunnelBusy(true);
    try {
      const result = await api.tunnelStop();
      setTunnel(result);
      setMessage("Tunnel stopped.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Failed to stop tunnel.");
    } finally {
      setTunnelBusy(false);
    }
  };

  const handleFetchTunnelLogs = async () => {
    try {
      const result = await api.tunnelLogs(100);
      setTunnelLogs(result.logs || []);
      setShowTunnelLogs(true);
    } catch {}
  };

  const handleCreateTarget = async () => {
    if (!hostName.trim()) {
      setMessage("Give the host connection a name before creating it.");
      return;
    }

    setCreatingTarget(true);
    try {
      const target = await api.mcpAdd(hostName.trim(), "target");
      const nextTarget = {
        ...target,
        realtime_active: true,
      };
      setTargets((prev) => [nextTarget, ...prev.filter((item) => item.id !== nextTarget.id)]);
      setSelectedTargetId(nextTarget.id);
      setApiKey(nextTarget.api_key);
      setMessage("Host access created. You can create a job now.");
    } catch (error) {
      setMessage(error.response?.data?.detail || "Failed to create host access.");
    } finally {
      setCreatingTarget(false);
    }
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();

    if (!selectedTargetId) {
      setMessage("Create or select a host access entry first.");
      return;
    }
    if (!problem.trim()) {
      setMessage("Problem title is required.");
      return;
    }
    if (!tunnelUrl.trim()) {
      setMessage("Tunnel URL is required so the expert knows where to connect.");
      return;
    }
    if (!apiKey.trim()) {
      setMessage("API key is required in the MCP config.");
      return;
    }

    setCreatingJob(true);
    try {
      const result = await api.createJob({
        title: problem.trim(),
        context: context.trim(),
        tunnel_url: tunnelUrl.trim(),
        target_client_id: selectedTargetId,
      });
      const nextJob = result.job;
      setCreatedJob(nextJob);
      setJobs((prev) => [nextJob, ...prev.filter((job) => job.id !== nextJob.id)]);
      setMessage("Job created. Copy the MCP config and handoff prompt for Client B.");
      if (nextJob.console_config?.apiKey) {
        setApiKey(nextJob.console_config.apiKey);
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || "Failed to create job.");
    } finally {
      setCreatingJob(false);
    }
  };

  const handleUseJob = (job) => {
    setCreatedJob(job);
    setSelectedTargetId(job.target_client_id || "");
    setProblem(job.title || "");
    setContext(job.context || "");
    setTunnelUrl(job.tunnel_url || "");
    setMessage(`Loaded job ${job.id}.`);
  };

  const handleCopyConfig = () => {
    copyText(JSON.stringify(configPreview, null, 2)).then(() => {
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 1800);
    });
  };

  const handleCopyPrompt = () => {
    if (!executorPrompt) return;
    copyText(executorPrompt).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    });
  };

  const handleCopyJobId = (jobId) => {
    copyText(jobId).then(() => {
      setMessage(`Copied job ID ${jobId}.`);
    });
  };

  return (
    <div className="shell wide" data-testid="console-page">
      <header className="hdr">
        <div>
          <h1 className="mono">/console</h1>
          <p className="helper-text dim">Build the handoff package that lets an expert attach to a looping workspace without interpretive dance.</p>
        </div>
        <span className="tag">job + tunnel + config</span>
        <Link to="/ops" className="btn-sm nav-link" style={{ marginLeft: "auto" }}>
          ops dashboard →
        </Link>
        <Link to="/clone" className="btn-sm nav-link" style={{ marginLeft: ".5rem" }}>
          clone handoff →
        </Link>
      </header>

      <section className="card">
        <h2 className="mono sm">How this should work</h2>
        <div className="step-list">
          <div className="step-row">
            <span className="step-num mono">1</span>
            <div>
              <p className="mono">Run the local MCP host</p>
              <p className="helper-text dim">Client A starts the local server, joins Supabase realtime, and exposes a dev tunnel so an expert can reach the workspace safely.</p>
            </div>
          </div>
          <div className="step-row">
            <span className="step-num mono">2</span>
            <div>
              <p className="mono">Capture the job details</p>
              <p className="helper-text dim">The host describes the looping problem, adds any extra context, and pastes the tunnel preview URL.</p>
            </div>
          </div>
          <div className="step-row">
            <span className="step-num mono">3</span>
            <div>
              <p className="mono">Create a shareable job ID</p>
              <p className="helper-text dim">The backend stores the job against the target session. The generated MCP config stays intentionally simple: main server URL, API key, and job ID.</p>
            </div>
          </div>
          <div className="step-row">
            <span className="step-num mono">4</span>
            <div>
              <p className="mono">Hand off to Client B</p>
              <p className="helper-text dim">The expert pastes the config into the executor client, resolves the job ID, connects to the tunnel, and keeps iterating until the loop is broken. Hopefully not emotionally.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <strong className="mono">Host connection</strong>
          <p className="helper-text dim">Create or reuse a Client A target so the workspace has an API key and session bound to it.</p>
        </article>
        <article className="summary-card">
          <strong className="mono">Expert job</strong>
          <p className="helper-text dim">A job packages the problem title, context, and tunnel URL into a durable handoff record with its own job ID.</p>
        </article>
        <article className="summary-card">
          <strong className="mono">Executor handoff</strong>
          <p className="helper-text dim">Client B should only need three fields to start: <code>mainServerUrl</code>, <code>apiKey</code>, and <code>jobId</code>.</p>
        </article>
      </section>

      <div className="hero-grid">
        <div className="stack">
          <section className="card">
            <h2 className="mono sm">1. Create or reuse host access</h2>
            <p className="helper-text dim">Pick an existing target connection, or mint a fresh host access key for the machine running the tunnel.</p>

            <label className="field-label mono dim">Existing target client</label>
            <select
              className="inp"
              value={selectedTargetId}
              onChange={(event) => setSelectedTargetId(event.target.value)}
            >
              <option value="">-- choose a host target --</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name} ({target.realtime_active ? "connected" : "offline"})
                </option>
              ))}
            </select>

            <div className="form-row">
              <input
                className="inp"
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                placeholder="Host name (e.g. VS Code on Mac mini)"
              />
              <button className="btn add-a-btn" onClick={handleCreateTarget} disabled={creatingTarget}>
                {creatingTarget ? "creating..." : "create host access"}
              </button>
            </div>

            {selectedTarget ? (
              <div className="notice">
                <p className="helper-text"><strong className="mono">Selected host:</strong> {selectedTarget.name}</p>
                <p className="helper-text dim">Session: <code>{selectedTarget.session_id}</code></p>
                <p className="helper-text dim">API key: <code>{selectedTarget.api_key}</code></p>
              </div>
            ) : (
              <p className="helper-text dim">No target selected yet. Create one first so this console can bind a job to a real workspace session.</p>
            )}
          </section>

          <section className="card">
            <h2 className="mono sm">1b. Dev tunnel</h2>
            <p className="helper-text dim">Launch a Cloudflare tunnel from the app, or paste a URL manually below.</p>

            <div className="form-row">
              <input
                className="inp"
                value={tunnelLocal}
                onChange={(event) => setTunnelLocal(event.target.value)}
                placeholder="http://localhost:8001"
                disabled={tunnel.status === "running" || tunnel.status === "starting"}
              />
              {tunnel.status !== "running" && tunnel.status !== "starting" ? (
                <button className="btn add-a-btn" onClick={handleTunnelStart} disabled={tunnelBusy}>
                  {tunnelBusy ? "starting..." : "start tunnel"}
                </button>
              ) : (
                <button className="btn danger-btn" onClick={handleTunnelStop} disabled={tunnelBusy}>
                  {tunnelBusy ? "stopping..." : "stop tunnel"}
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
              <span className={`dot ${tunnel.status === "running" ? "green" : tunnel.status === "starting" ? "green" : "red"}`} />
              <span className="mono" style={{ fontSize: ".78rem" }}>{tunnel.status}</span>
              {tunnel.public_url && (
                <code className="accent" style={{ fontSize: ".75rem" }}>{tunnel.public_url}</code>
              )}
              {!tunnel.installed && tunnel.status !== "running" && (
                <span className="helper-text dim" style={{ fontSize: ".72rem" }}>
                  cloudflared not found — <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" target="_blank" rel="noreferrer" className="page-link">install it</a> or paste the URL manually
                </span>
              )}
            </div>

            {tunnel.error && <p className="helper-text" style={{ color: "var(--danger)", fontSize: ".78rem" }}>{tunnel.error}</p>}

            <div className="btn-group">
              <button className="btn-sm" onClick={handleFetchTunnelLogs}>
                {showTunnelLogs ? "refresh logs" : "show logs"}
              </button>
              {tunnel.public_url && (
                <button className="btn-sm" onClick={() => { setTunnelUrl(tunnel.public_url); setMessage("Tunnel URL applied."); }}>
                  use this URL →
                </button>
              )}
            </div>

            {showTunnelLogs && (
              <pre className="config-json" style={{ maxHeight: "180px" }}>
                {tunnelLogs.length > 0 ? tunnelLogs.join("\n") : "No logs yet."}
              </pre>
            )}
          </section>

          <section className="card">
            <h2 className="mono sm">2. Create expert job</h2>
            <form className="stack" onSubmit={handleCreateJob}>
              <div>
                <label className="field-label mono dim">Problem (title)</label>
                <input
                  className="inp"
                  value={problem}
                  onChange={(event) => setProblem(event.target.value)}
                  placeholder="Cursor keeps re-opening the same failing file-edit loop"
                />
              </div>

              <div>
                <label className="field-label mono dim">Context</label>
                <textarea
                  className="inp textarea-lg"
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="What already failed? What should the expert avoid? Which branch or repo matters?"
                />
              </div>

              <div>
                <label className="field-label mono dim">Tunnel URL</label>
                <input
                  className="inp"
                  value={tunnelUrl}
                  onChange={(event) => setTunnelUrl(event.target.value)}
                  placeholder="https://your-cloudflare-or-dev-tunnel.example.com"
                />
              </div>

              <button className="btn" type="submit" disabled={creatingJob}>
                {creatingJob ? "creating job..." : "create expert job"}
              </button>
            </form>

            {message && <p className="helper-text dim">{message}</p>}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <h2 className="mono sm">3. MCP config preview</h2>
            <p className="helper-text dim">This is the simple config your executor client should consume.</p>

            <div>
              <label className="field-label mono dim">Main server URL</label>
              <input
                className="inp"
                value={mainServerUrl}
                onChange={(event) => setMainServerUrl(event.target.value)}
                placeholder={DEFAULT_SERVER_URL}
              />
            </div>

            <div>
              <label className="field-label mono dim">API key</label>
              <input
                className="inp"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="mcp_xxxxx"
              />
            </div>

            <div>
              <label className="field-label mono dim">Job ID</label>
              <input
                className="inp"
                value={createdJob?.id || ""}
                readOnly
                placeholder="Create a job to generate the ID"
              />
            </div>

            <pre className="config-json">{JSON.stringify(configPreview, null, 2)}</pre>

            <div className="btn-group">
              <button className="btn" onClick={handleCopyConfig} disabled={!configPreview.jobId}>
                {copiedConfig ? "copied!" : "copy config"}
              </button>
              <button className="btn-sm" onClick={handleCopyPrompt} disabled={!executorPrompt}>
                {copiedPrompt ? "copied!" : "copy handoff prompt"}
              </button>
            </div>
          </section>

          <section className="card">
            <h2 className="mono sm">4. Executor handoff</h2>
            <p className="helper-text dim">Use this as the payload or prompt for Client B. The job ID maps back to the target session and tunnel details.</p>
            <pre className="config-json">{executorPrompt || "Create a job to generate the handoff prompt."}</pre>
            <p className="helper-text dim">
              Need the raw operations screen too? Jump back to <Link to="/ops" className="page-link">the ops dashboard</Link>.
            </p>
          </section>
        </div>
      </div>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 className="mono sm">Saved jobs</h2>
            <p className="helper-text dim">These jobs are persisted in the backend so another client can resolve the job ID later.</p>
          </div>
          <button className="btn-sm" onClick={refreshJobsOnly}>
            refresh jobs
          </button>
        </div>

        {loading ? (
          <p className="helper-text dim">loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="helper-text dim">No jobs yet. Create one above and it will show up here.</p>
        ) : (
          <div className="job-grid">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onUseJob={handleUseJob}
                onCopyId={handleCopyJobId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
