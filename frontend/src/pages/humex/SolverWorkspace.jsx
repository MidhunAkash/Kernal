import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Card from "@/components/humex/Card";
import Button from "@/components/humex/Button";
import JsonViewer from "@/components/humex/JsonViewer";
import ChatUI from "@/components/humex/ChatUI";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function SolverWorkspace() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { userName, marketplace, submitSolution, sendMessage } = useApp();

  const [runtime, setRuntime] = useState(null);
  const [solution, setSolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  const market = marketplace[jobId];
  const status = market?.marketStatus || "open";
  const isApproved = status === "approved";

  // Poll runtime status from real backend (target_online, executor_online, tunnel_url)
  useEffect(() => {
    if (!market?.apiKey) return undefined;
    let alive = true;
    const tick = async () => {
      try {
        const r = await api.getJobRuntime(jobId, market.apiKey);
        if (alive) setRuntime(r);
      } catch { /* ignore */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(t); };
  }, [jobId, market?.apiKey]);

  const previewUrl = market?.tunnelUrl || runtime?.tunnel_url || "";
  const mcpEndpoint = market?.mcpEndpoint || `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "")}/api/mcp`;

  const effectiveMcpConfig = useMemo(() => {
    // Backend-compatible MCP config always points at the real /api/mcp endpoint
    // plus embeds the job_id/api_key so the solver can connect straight away.
    return {
      mcpServers: {
        "humex-workspace": {
          url: mcpEndpoint,
          description: "HumEx MCP tunnel — call connect_to_job with the job_id and api_key below.",
        },
      },
      connect: {
        job_id: jobId,
        api_key: market?.apiKey || "(ask poster to share)",
      },
      // Also preserve the original poster-authored config preview:
      _posterConfig: market?.mcpConfig,
    };
  }, [mcpEndpoint, jobId, market?.apiKey, market?.mcpConfig]);

  const onSend = (text) => sendMessage(jobId, "solver", userName || "Solver", text);

  const onSubmit = async () => {
    if (!solution.trim()) { setErr("Describe your solution before submitting."); return; }
    setSubmitting(true);
    setErr("");
    try {
      submitSolution(jobId, solution.trim());
      sendMessage(jobId, "solver", userName || "Solver", "Solution submitted for review ✅");
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!market) {
    return (
      <AppLayout>
        <Card testId="workspace-not-found">
          <h3 className="k-card-title">Workspace unavailable</h3>
          <p style={{ color: "var(--k-text-secondary)" }}>
            This job isn't in your local HumEx cache. Go back and accept a job from the listing.
          </p>
          <div style={{ marginTop: 16 }}>
            <Button
              variant="primary"
              onClick={() => navigate("/dashboard/solver/jobs")}
              testId="workspace-browse-btn"
            >
              Browse Open Jobs
            </Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  /* ── APPROVED VIEW ── */
  if (isApproved) {
    return (
      <AppLayout>
        <div className="k-approved-hero" data-testid="workspace-approved-hero">
          <div className="big-check">✅</div>
          <h2>Job Approved!</h2>
          <div className="pts-row">🎉 Reward points credited to your balance</div>
          <span className="pts-val">+{market.rewardPoints || 0} pts</span>
          <div>
            <Button
              variant="primary"
              onClick={() => navigate("/dashboard/solver/jobs")}
              testId="workspace-browse-more-btn"
            >
              Browse More Jobs →
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="k-breadcrumb">
        <Link to="/dashboard/solver/jobs">Jobs</Link>
        <span className="sep">/</span>
        <span>Workspace</span>
      </div>

      <div className="k-row" style={{ marginBottom: 4 }}>
        <h1 className="k-page-title" data-testid="workspace-title">Workspace</h1>
        <span className="k-job-id">#{jobId.slice(0, 8)}</span>
        <span className={`k-status ${status}`} data-testid="workspace-status-pill">{status}</span>
      </div>
      <p className="k-page-sub">{market.title}</p>

      {runtime && (
        <div
          className={`k-banner ${runtime.target_online ? "success" : "warn"}`}
          data-testid="workspace-runtime-banner"
          style={{ marginBottom: 20 }}
        >
          <strong>
            Target agent: {runtime.target_online ? "online ✅" : "offline ⚠️"}
          </strong>
          &nbsp;·&nbsp;
          You (executor): {runtime.executor_online ? "online" : "offline"}
          {previewUrl && (
            <>
              &nbsp;·&nbsp;
              <a href={previewUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                Open tunnel ↗
              </a>
            </>
          )}
        </div>
      )}

      {/* MCP config + prompt */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} data-testid="workspace-config-grid">
        <Card testId="workspace-mcp-card">
          <h3 className="k-section-label" style={{ marginBottom: 12 }}>MCP Config</h3>
          <JsonViewer value={effectiveMcpConfig} label="config" testId="workspace-mcp-config" />
          <p style={{ fontSize: 12, color: "var(--k-text-muted)", marginTop: 10 }}>
            Paste this into Cursor / Claude Desktop / Windsurf <code>mcpServers</code>.
            In the MCP session, call <code>connect_to_job</code> with the <code>job_id</code> and <code>api_key</code> shown above.
          </p>
        </Card>

        <Card testId="workspace-prompt-card">
          <h3 className="k-section-label" style={{ marginBottom: 12 }}>Prompt</h3>
          <JsonViewer
            value={market.prompt || `Given job id: ${jobId}, investigate the issue with HumEx MCP tools and fix it without breaking anything.`}
            label="prompt"
            testId="workspace-prompt"
          />
        </Card>
      </div>

      {/* Tunnel + Preview links */}
      <div className="k-links-row" data-testid="workspace-links">
        <div className="k-link-box" data-testid="workspace-tunnel-link">
          <span>🔗</span>
          <span className="label">Tunnel:</span>
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="val">{previewUrl}</a>
          ) : (
            <span className="val" style={{ color: "var(--k-text-muted)" }}>waiting for target…</span>
          )}
        </div>
        <div className="k-link-box" data-testid="workspace-mcp-endpoint">
          <span>🌐</span>
          <span className="label">MCP endpoint:</span>
          <a href={mcpEndpoint} target="_blank" rel="noreferrer" className="val">{mcpEndpoint}</a>
        </div>
      </div>

      {/* Chat */}
      <h3 className="k-section-label" style={{ marginTop: 28 }}>Chat with Poster</h3>
      <ChatUI
        messages={market.chat || []}
        onSend={onSend}
        selfRole="solver"
        testId="workspace-chat"
      />

      {/* Submit section */}
      <h3 className="k-section-label" style={{ marginTop: 32 }}>Submit Your Solution</h3>
      <Card testId="workspace-submit-card">
        {status === "submitted" || submitted ? (
          <div className="k-banner info" data-testid="workspace-submit-banner">
            Solution submitted! Waiting for approval
            <span className="k-pulse-dots"><span /><span /><span /></span>
          </div>
        ) : (
          <>
            <textarea
              className="k-form-textarea"
              rows={6}
              placeholder="Describe what you changed, why it fixes the issue, and any follow-ups…"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              data-testid="workspace-solution-textarea"
            />
            {err && <div className="k-form-error" data-testid="workspace-submit-error">{err}</div>}
            <div className="k-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={submitting || !solution.trim()}
                testId="workspace-submit-btn"
              >
                {submitting ? "Submitting…" : "Submit Solution →"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </AppLayout>
  );
}
