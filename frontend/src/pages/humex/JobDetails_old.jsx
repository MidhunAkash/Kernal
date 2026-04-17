import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Card from "@/components/humex/Card";
import Button from "@/components/humex/Button";
import JsonViewer from "@/components/humex/JsonViewer";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { userName, marketplace, acceptJob } = useApp();

  const [backendJob, setBackendJob] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.getJob(jobId)
      .then((d) => { if (alive) { setBackendJob(d?.job || null); setLoading(false); } })
      .catch((e) => { if (alive) { setErr(e?.response?.data?.detail || "Failed to load job"); setLoading(false); } });
    return () => { alive = false; };
  }, [jobId]);

  const market = marketplace[jobId];
  const status = market?.marketStatus || backendJob?.status || "open";
  const isOpen = status === "open";

  const onAccept = () => {
    if (!market) {
      setErr("This job's MCP credentials weren't shared to this browser. Ask the poster to share the executor link or post from this tab.");
      return;
    }
    acceptJob(jobId, { name: userName || "Solver" });
    navigate(`/dashboard/solver/workspace/${jobId}`);
  };

  return (
    <AppLayout>
      <div className="k-breadcrumb">
        <Link to="/dashboard/solver/jobs">Jobs</Link>
        <span className="sep">/</span>
        <span>#{jobId.slice(0, 8)}</span>
      </div>

      {loading ? (
        <p style={{ color: "var(--k-text-muted)" }}>Loading…</p>
      ) : err ? (
        <div className="k-banner error" data-testid="job-details-error">{err}</div>
      ) : !backendJob ? (
        <Card testId="job-details-missing"><p style={{ margin: 0 }}>Job not found.</p></Card>
      ) : (
        <>
          <Card testId="job-details-header">
            <div className="k-row">
              <span className="k-job-id">#{jobId.slice(0, 8)}</span>
              <span className="k-reward">★ {market?.rewardPoints || 0} pts</span>
              <span className={`k-status ${status}`} style={{ marginLeft: "auto" }} data-testid="job-details-status">
                {status}
              </span>
            </div>
            <h2 className="k-card-title" style={{ marginTop: 16, fontSize: 22 }}>{backendJob.title}</h2>
            <p className="k-card-meta">
              Posted by <strong>{market?.postedByName || backendJob.target_name || "HumEx user"}</strong>
            </p>
          </Card>

          {!isOpen && (
            <div className="k-banner warn" data-testid="job-details-closed-banner">
              This job is no longer available.
            </div>
          )}

          <hr className="k-divider" />

          <h3 className="k-section-label">Problem Statement</h3>
          <div className="k-blockquote" data-testid="job-details-problem">
            {backendJob.context || market?.context || "(no context provided)"}
          </div>

          <h3 className="k-section-label" style={{ marginTop: 28 }}>MCP Config Preview</h3>
          {market?.mcpConfig ? (
            <JsonViewer value={market.mcpConfig} label="config" testId="job-details-mcp-config" />
          ) : (
            <div className="k-banner info" data-testid="job-details-mcp-missing">
              MCP config and credentials live on the poster's machine. Ask them to share the executor link
              (or accept the job if you have access).
            </div>
          )}

          <h3 className="k-section-label" style={{ marginTop: 28 }}>Prompt Preview</h3>
          {market?.prompt ? (
            <JsonViewer value={market.prompt} label="prompt" testId="job-details-prompt" />
          ) : (
            <JsonViewer
              value={`Given job id: ${jobId}, fetch the problem context and solve it without changing existing code.\nUse the HumEx MCP endpoint to read / write files on the target workspace.`}
              label="prompt"
              testId="job-details-prompt-fallback"
            />
          )}

          <div className="k-row" style={{ justifyContent: "flex-end", marginTop: 32 }}>
            <Button
              variant="secondary"
              onClick={() => navigate("/dashboard/solver/jobs")}
              testId="job-details-back-btn"
            >
              ← Back
            </Button>
            {isOpen && (
              <Button
                variant="primary"
                onClick={onAccept}
                testId="job-details-accept-btn"
              >
                ✅ Accept Job
              </Button>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
