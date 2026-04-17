import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HumExHeader from "../../components/humex/HumExHeader";
import Card from "../../components/humex/Card";
import Button from "../../components/humex/Button";
import ChatUI from "../../components/humex/ChatUI";
import { useAuth } from "../../lib/auth";
import {
  getJob,
  getRuntime,
  heartbeatExecutor,
  acceptJob,
  submitJob,
} from "../../lib/humexApi";
import "../../humex-spa.css";

/* ─────── Submit Solution Modal ─────── */

function SubmitModal({ job, userId, onClose, onDone }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await submitJob(job.id, userId, body.trim());
      onDone();
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => !busy && onClose()}
      data-testid="submit-modal-backdrop"
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        data-testid="submit-modal"
      >
        <div className="modal-head">
          <div>
            <div className="section-label" style={{ margin: 0 }}>
              SUBMIT SOLUTION
            </div>
            <h2 className="modal-title">Describe your fix</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <p className="modal-sub">
          Write a short note explaining what you changed, paste a diff, or link a
          commit. The poster will review this before approving.
        </p>

        <form onSubmit={submit}>
          <label className="form-label">Submission notes</label>
          <textarea
            className="form-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Root cause was X; I patched Y in file Z. Verified with Safari 17."
            rows={6}
            autoFocus
            data-testid="submit-body"
          />

          {error && (
            <p style={{ color: "#b91c1c", fontSize: ".85rem", marginTop: ".5rem" }}>
              {error}
            </p>
          )}

          <div className="modal-actions">
            <Button
              variant="primary"
              type="submit"
              disabled={busy}
              data-testid="submit-confirm-btn"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </Button>
            <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────── Job details page ─────── */

function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);

  const clientIdRef = useRef(
    `expert-${Math.random().toString(36).slice(2, 10)}`
  );

  const refresh = useCallback(async () => {
    try {
      const j = await getJob(jobId);
      setJob(j);
    } catch (e) {
      console.error(e);
      setLoadError("Could not load this job.");
    }
  }, [jobId]);

  useEffect(() => {
    let dead = false;
    (async () => {
      await refresh();
      if (!dead) setLoading(false);
    })();
    return () => {
      dead = true;
    };
  }, [refresh]);

  /* poll runtime while the solver is accepted/working */
  const pollRuntime = useCallback(async () => {
    if (!job?.api_key) return;
    try {
      const rt = await getRuntime(job.id, job.api_key);
      setRuntime(rt);
      heartbeatExecutor(job.id, job.session_id, job.api_key, clientIdRef.current).catch(
        () => {}
      );
    } catch {
      /* transient */
    }
  }, [job]);

  useEffect(() => {
    if (!job) return undefined;
    // Poll runtime when solver is actively in the job
    if (job.status === "accepted" && job.solver_uid === user?.id) {
      pollRuntime();
      const t = setInterval(pollRuntime, 4000);
      return () => clearInterval(t);
    }
    // Also refresh job row every 10s so status flips propagate
    const t2 = setInterval(refresh, 10000);
    return () => clearInterval(t2);
  }, [job, user, pollRuntime, refresh]);

  const doAccept = async () => {
    if (!user?.id) return;
    setActionBusy("accept");
    setActionError("");
    try {
      await acceptJob(job.id, user.id);
      await refresh();
    } catch (e) {
      setActionError(e?.response?.data?.detail || e.message || "Accept failed");
    } finally {
      setActionBusy("");
    }
  };

  /* ─── early states ─── */

  if (loading) {
    return (
      <div className="humex-spa">
        <HumExHeader />
        <main className="k-main k-main-centered">
          <p className="page-sub">Loading job…</p>
        </main>
      </div>
    );
  }

  if (loadError || !job) {
    return (
      <div className="humex-spa">
        <HumExHeader />
        <main className="k-main k-main-centered">
          <Card className="notfound-card">
            <h2 className="hero-heading">Job not found</h2>
            <p className="hero-sub">
              {loadError || <>We couldn&apos;t find a job with id <strong>{jobId}</strong>.</>}
            </p>
            <Button variant="primary" onClick={() => navigate("/expert/jobs")}>
              ← Back to Jobs
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const me = user?.id;
  const iAmPoster = me && job.poster_uid === me;
  const iAmSolver = me && job.solver_uid === me;
  const jobTaken = !!job.solver_uid && !iAmSolver;
  const tunnelUrl = runtime?.tunnel_url || job.tunnel_url || "";
  const targetOnline = runtime?.target_online || false;

  const mcpConfig = {
    mcpServers: {
      "humex-workspace": { url: job.mcp_endpoint },
    },
    _credentials: { job_id: job.id, api_key: job.api_key },
  };

  const prompt = `# HumEx job — ${job.displayId}

## Task
${job.jobName}

## Problem context
${job.problemStatement}

## How to act on the target's workspace
job_id: ${job.id}
api_key: ${job.api_key || "<not-available>"}

Step 1 — Call connect_to_job(job_id, api_key). The response echoes this
problem context so you're double-sure of the goal.

Step 2 — Use the job_* tools (job_read_file, job_write_file, job_edit_file,
job_list_directory, job_search_files, …) to act on the target's workspace
without changing unrelated code.

Step 3 — When the user asks a question, only use Human MCP tools.`;

  /* ─── render ─── */

  return (
    <div className="humex-spa">
      <HumExHeader />
      <main className="k-main" data-testid="job-details-page">
        <div className="breadcrumb" data-testid="breadcrumb">
          <span
            className="crumb-link"
            onClick={() => navigate("/expert/jobs")}
            role="button"
            tabIndex={0}
          >
            Jobs
          </span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{job.displayId}</span>
        </div>

        {/* ───── STATE: APPROVED (terminal, celebratory) ───── */}
        {job.status === "approved" && (
          <div className="k-main-centered" data-testid="state-approved">
            <Card className="status-card">
              <div className="status-icon">✅</div>
              <h2 className="status-heading">Solution Approved</h2>
              <div className="reward-inset">
                <div className="reward-celebrate">🎉</div>
                <div className="reward-caption">
                  Reward {iAmSolver ? "credited" : "paid to solver"}
                </div>
                <div className="reward-amount">+{job.reward_points} pts</div>
                <div className="reward-subcaption">
                  {job.displayId} · {job.jobName}
                </div>
              </div>
              <Button
                variant="primary"
                className="cta-wide"
                onClick={() => navigate("/expert/jobs")}
              >
                Browse More Jobs
              </Button>
            </Card>
          </div>
        )}

        {/* ───── STATE: OPEN (not yet accepted) ───── */}
        {job.status === "open" && (
          <Card className="job-detail-card">
            <div className="detail-head">
              <span className="job-id-badge">{job.displayId}</span>
              <span className="reward-pill">🏆 {job.reward_points} pts</span>
            </div>
            <h1 className="detail-title">{job.jobName}</h1>
            <p className="detail-poster">
              Posted by {job.clientName}
              {job.created_at && (
                <>
                  {" · "}
                  <span className="detail-meta">
                    {new Date(job.created_at).toLocaleString()}
                  </span>
                </>
              )}
            </p>
            <hr className="divider" />
            <div className="section-label">PROBLEM STATEMENT</div>
            <p className="detail-problem">{job.problemStatement}</p>

            {iAmPoster && (
              <div className="info-banner">
                You posted this job. Waiting for a solver to accept it.
              </div>
            )}
            {actionError && (
              <p style={{ color: "#b91c1c", fontSize: ".85rem" }}>{actionError}</p>
            )}

            <div className="detail-actions">
              {!iAmPoster && (
                <Button
                  variant="primary"
                  onClick={doAccept}
                  disabled={actionBusy === "accept"}
                  data-testid="accept-job-btn"
                >
                  {actionBusy === "accept" ? "Accepting…" : "✅ Accept Job"}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => navigate("/expert/jobs")}
                data-testid="back-btn"
              >
                ← Back
              </Button>
            </div>
          </Card>
        )}

        {/* ───── STATE: ACCEPTED ───── */}
        {job.status === "accepted" && (
          <>
            {iAmSolver && (
              <div className="accepted-layout" data-testid="state-accepted">
                <div className="accepted-header">
                  <div className="accepted-header-top">
                    <h2 className="accepted-title">Job Accepted</h2>
                    <span className="job-id-badge">{job.displayId}</span>
                    <span
                      className={`status-dot ${
                        targetOnline ? "status-dot-green" : "status-dot-amber"
                      }`}
                    />
                    <span className="accepted-sub" style={{ marginTop: 0 }}>
                      {targetOnline ? "Target online" : "Waiting for target…"}
                    </span>
                  </div>
                  <p className="accepted-sub">{job.jobName}</p>
                </div>

                <div className="config-section">
                  <Card className="">
                    <div className="section-label">MCP Config</div>
                    <div className="code-block">
                      <pre>{JSON.stringify(mcpConfig, null, 2)}</pre>
                    </div>
                  </Card>
                  <Card className="">
                    <div className="section-label">Prompt</div>
                    <div className="code-block">
                      <pre>{prompt}</pre>
                    </div>
                  </Card>
                </div>

                <Card className="links-card">
                  <div className="link-item" data-testid="tunnel-link">
                    <span className="link-icon">🔗</span>
                    <div className="link-body">
                      <span className="link-label">Tunnel URL</span>
                      {tunnelUrl ? (
                        <a href={tunnelUrl} target="_blank" rel="noreferrer" className="link-url">
                          {tunnelUrl}
                        </a>
                      ) : (
                        <span className="link-url" style={{ opacity: 0.6 }}>
                          — waiting for target agent —
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="link-item" data-testid="preview-link">
                    <span className="link-icon">🌐</span>
                    <div className="link-body">
                      <span className="link-label">Preview URL</span>
                      {tunnelUrl ? (
                        <a href={tunnelUrl} target="_blank" rel="noreferrer" className="link-url">
                          {tunnelUrl}
                        </a>
                      ) : (
                        <span className="link-url" style={{ opacity: 0.6 }}>
                          — same as tunnel URL —
                        </span>
                      )}
                    </div>
                  </div>
                </Card>

                <ChatUI
                  sessionId={job.session_id}
                  senderName="Expert"
                  senderRole="solver"
                />

                <div className="submit-row">
                  <Button
                    variant="primary"
                    className="cta-wide"
                    onClick={() => setShowSubmit(true)}
                    data-testid="submit-solution-btn"
                  >
                    Submit Solution →
                  </Button>
                </div>
              </div>
            )}

            {iAmPoster && (
              <Card className="job-detail-card">
                <div className="detail-head">
                  <span className="job-id-badge">{job.displayId}</span>
                  <span className="reward-pill">🏆 {job.reward_points} pts</span>
                </div>
                <h1 className="detail-title">{job.jobName}</h1>
                <p className="detail-poster">
                  🔧 A solver is working on this. You&apos;ll get a review
                  notification on your <strong>Posted Jobs</strong> page when
                  they submit.
                </p>
                <hr className="divider" />
                <div className="section-label">PROBLEM STATEMENT</div>
                <p className="detail-problem">{job.problemStatement}</p>
              </Card>
            )}

            {jobTaken && !iAmPoster && (
              <Card className="job-detail-card">
                <div className="detail-head">
                  <span className="job-id-badge">{job.displayId}</span>
                  <span className="status-pill">ACCEPTED BY ANOTHER EXPERT</span>
                </div>
                <h1 className="detail-title">{job.jobName}</h1>
                <p className="detail-poster">
                  This job has already been picked up. Browse other open jobs.
                </p>
                <div className="detail-actions">
                  <Button variant="primary" onClick={() => navigate("/expert/jobs")}>
                    ← Back to Jobs
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ───── STATE: SUBMITTED ───── */}
        {job.status === "submitted" && (
          <>
            {iAmSolver && (
              <div className="k-main-centered" data-testid="state-submitted">
                <Card className="status-card">
                  <div className="status-icon">⏳</div>
                  <h2 className="status-heading">
                    Thanks for submitting your solution.
                  </h2>
                  <p className="status-sub">
                    It is under review by the poster. You&apos;ll get{" "}
                    <strong>+{job.reward_points} pts</strong> if approved.
                  </p>
                  <div className="loading-dots" aria-label="loading">
                    <span />
                    <span />
                    <span />
                  </div>
                </Card>
              </div>
            )}

            {iAmPoster && (
              <Card className="job-detail-card" data-testid="poster-review-card">
                <div className="detail-head">
                  <span className="job-id-badge">{job.displayId}</span>
                  <span className="reward-pill">🏆 {job.reward_points} pts</span>
                </div>
                <h1 className="detail-title">{job.jobName}</h1>
                <p className="detail-poster">
                  📥 Solver has submitted a solution — review it on your{" "}
                  <strong>Posted Jobs</strong> page, or click below.
                </p>
                <div className="detail-actions">
                  <Button
                    variant="primary"
                    onClick={() => navigate("/expert/my-jobs")}
                    data-testid="go-to-review-btn"
                  >
                    Review on Posted Jobs →
                  </Button>
                </div>
              </Card>
            )}

            {!iAmSolver && !iAmPoster && (
              <Card className="job-detail-card">
                <h1 className="detail-title">{job.jobName}</h1>
                <p className="detail-poster">
                  This solution is under review.
                </p>
              </Card>
            )}
          </>
        )}

        {/* ───── STATE: closed ───── */}
        {job.status === "closed" && (
          <Card className="job-detail-card">
            <div className="detail-head">
              <span className="job-id-badge">{job.displayId}</span>
              <span className="status-pill" style={{ background: "#6b7280" }}>
                CLOSED
              </span>
            </div>
            <h1 className="detail-title">{job.jobName}</h1>
            <p className="detail-poster">This job was closed.</p>
          </Card>
        )}
      </main>

      {showSubmit && (
        <SubmitModal
          job={job}
          userId={user?.id}
          onClose={() => setShowSubmit(false)}
          onDone={() => {
            setShowSubmit(false);
            setTimeout(refresh, 300);
          }}
        />
      )}
    </div>
  );
}

export default JobDetails;
