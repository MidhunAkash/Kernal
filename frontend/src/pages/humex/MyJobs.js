import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HumExHeader from "../../components/humex/HumExHeader";
import Card from "../../components/humex/Card";
import Button from "../../components/humex/Button";
import { useAuth } from "../../lib/auth";
import {
  getMyJobIds,
  getJobsByIds,
  postJobForUser,
  approveJob,
  rejectJob,
} from "../../lib/humexApi";
import "../../humex-spa.css";

/* ─────────── Post-a-Job Modal ─────────── */

function PostJobModal({ userId, onClose, onPosted }) {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [targetName, setTargetName] = useState("");
  const [rewardPoints, setRewardPoints] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await postJobForUser(userId, {
        title: title.trim(),
        context: context.trim(),
        targetName: targetName.trim(),
        rewardPoints: Math.max(10, Math.min(10000, Number(rewardPoints) || 100)),
      });
      setResult(created);
      if (onPosted) onPosted(created);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  const copyExecLink = async () => {
    if (!result?.executor_link) return;
    try {
      await navigator.clipboard.writeText(result.executor_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => !submitting && onClose()}
      data-testid="post-job-modal-backdrop"
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        data-testid="post-job-modal"
      >
        <div className="modal-head">
          <div>
            <div className="section-label" style={{ margin: 0 }}>
              POST A JOB
            </div>
            <h2 className="modal-title">
              {result ? "Job posted" : "Describe your problem"}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            data-testid="post-job-close"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        {!result && (
          <form onSubmit={submit}>
            <p className="modal-sub">
              This creates a real HumEx job, issues a secure API key, and
              attaches it to your user profile so it shows up in{" "}
              <strong>Posted Jobs</strong>.
            </p>

            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix OAuth callback 500 error"
              required
              autoFocus
              data-testid="post-job-title"
            />

            <label className="form-label">Problem context</label>
            <textarea
              className="form-textarea"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the problem, repro steps, logs, hypothesis…"
              rows={5}
              data-testid="post-job-context"
            />

            <label className="form-label">Target name (optional)</label>
            <input
              className="form-input"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="My Dev Workspace"
              data-testid="post-job-target"
            />

            <label className="form-label">Reward points</label>
            <input
              className="form-input"
              type="number"
              min={10}
              max={10000}
              step={10}
              value={rewardPoints}
              onChange={(e) => setRewardPoints(e.target.value)}
              data-testid="post-job-reward"
            />

            {error && (
              <p
                style={{
                  color: "#b91c1c",
                  fontSize: ".85rem",
                  marginTop: ".5rem",
                }}
                data-testid="post-job-error"
              >
                {error}
              </p>
            )}

            <div className="modal-actions">
              <Button
                variant="primary"
                type="submit"
                disabled={!title.trim() || submitting}
                data-testid="post-job-submit"
              >
                {submitting ? "Posting…" : "Post Job"}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {result && (
          <div data-testid="post-job-result">
            <p className="modal-sub">
              ✅ Job <code>{result.job_id.slice(0, 8).toUpperCase()}</code> is
              live. Share the executor link with your expert, or run the agent
              one-liner on your machine.
            </p>

            <label className="form-label">Executor link</label>
            <div className="code-block" style={{ marginBottom: ".6rem" }}>
              <pre>{result.executor_link}</pre>
            </div>

            <label className="form-label">Agent one-liner (run on your machine)</label>
            <div className="code-block">
              <pre>{result.agent_command}</pre>
            </div>

            <div className="modal-actions">
              <Button
                variant="primary"
                onClick={copyExecLink}
                data-testid="post-job-copy-link"
              >
                {copied ? "✓ Copied" : "📋 Copy executor link"}
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Review Submission Modal ─────────── */

function ReviewModal({ job, userId, onClose, onDone }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const doApprove = async () => {
    setBusy("approve");
    setError("");
    try {
      await approveJob(job.id, userId);
      onDone();
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Approve failed");
    } finally {
      setBusy("");
    }
  };

  const doReject = async () => {
    setBusy("reject");
    setError("");
    try {
      await rejectJob(job.id, userId);
      onDone();
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Reject failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => !busy && onClose()}
      data-testid="review-modal-backdrop"
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        data-testid="review-modal"
      >
        <div className="modal-head">
          <div>
            <div className="section-label" style={{ margin: 0 }}>
              REVIEW SUBMISSION
            </div>
            <h2 className="modal-title">{job.jobName}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={!!busy}
          >
            ×
          </button>
        </div>

        <div className="review-meta">
          <span className="job-id-badge">{job.displayId}</span>
          <span className="reward-pill">🏆 {job.reward_points} pts</span>
          {job.submitted_at && (
            <span className="mono-label dim">
              submitted {new Date(job.submitted_at).toLocaleString()}
            </span>
          )}
        </div>

        <label className="form-label" style={{ marginTop: "1.2rem" }}>
          Problem
        </label>
        <p className="detail-problem" style={{ fontSize: ".92rem" }}>
          {job.problemStatement}
        </p>

        <label className="form-label">Solver&apos;s submission</label>
        <div className="submission-box" data-testid="review-submission-text">
          {job.submission?.trim() || "(solver submitted without notes)"}
        </div>

        {error && (
          <p style={{ color: "#b91c1c", fontSize: ".85rem", marginTop: ".6rem" }}>
            {error}
          </p>
        )}

        <div className="modal-actions">
          <Button
            variant="primary"
            onClick={doApprove}
            disabled={!!busy}
            data-testid="review-approve-btn"
          >
            {busy === "approve" ? "Approving…" : `✅ Approve & credit ${job.reward_points} pts`}
          </Button>
          <Button
            variant="secondary"
            onClick={doReject}
            disabled={!!busy}
            data-testid="review-reject-btn"
          >
            {busy === "reject" ? "…" : "✕ Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Page ─────────── */

function MyJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPost, setShowPost] = useState(false);
  const [reviewJob, setReviewJob] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError("");
    try {
      // 1) read my job IDs from users.jobs_created
      const myIds = await getMyJobIds(user.id);
      // 2) hydrate each ID → full job (title, context, tunnel_url, api_key, target_name)
      const mine = await getJobsByIds(myIds);
      // newest first
      mine.sort((a, b) =>
        (b.created_at || "").localeCompare(a.created_at || "")
      );
      setJobs(mine);
    } catch (e) {
      console.error(e);
      setError("Could not load your jobs.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const handlePosted = async () => {
    // give the backend a beat then refresh
    setTimeout(load, 400);
  };

  return (
    <div className="humex-spa">
      <HumExHeader />
      <main className="k-main" data-testid="my-jobs-page">
        <div className="page-head">
          <h1 className="page-title">
            Posted Jobs
            <span className="count-badge" data-testid="my-jobs-count-badge">
              {jobs.length}
            </span>
          </h1>
          <p className="page-sub">
            Jobs you posted through HumEx, synced to your profile
            (<code>users.jobs_created</code>).
          </p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Button
              variant="primary"
              onClick={() => setShowPost(true)}
              data-testid="post-job-btn"
            >
              + Post a Job
            </Button>
            <Button variant="secondary" onClick={load} data-testid="refresh-my-jobs">
              ↻ Refresh
            </Button>
          </div>
        </div>

        {loading && jobs.length === 0 && (
          <p className="page-sub" data-testid="my-jobs-loading">
            Loading your jobs…
          </p>
        )}

        {error && (
          <Card className="" data-testid="my-jobs-error">
            <p style={{ color: "#b91c1c" }}>{error}</p>
          </Card>
        )}

        {!loading && !error && jobs.length === 0 && (
          <Card className="" data-testid="my-jobs-empty">
            <h3 className="job-name" style={{ marginBottom: ".5rem" }}>
              You haven&apos;t posted any jobs yet
            </h3>
            <p className="page-sub" style={{ marginTop: 0 }}>
              Click <strong>+ Post a Job</strong> above to create your first one.
              It will be tracked here under your user profile.
            </p>
          </Card>
        )}

        {jobs.length > 0 && (
          <div className="jobs-grid" data-testid="my-jobs-grid">
            {jobs.map((job) => {
              const needsReview = job.status === "submitted";
              return (
                <Card
                  key={job.id}
                  className={`job-card ${needsReview ? "job-card-review" : ""}`}
                  onClick={() =>
                    needsReview
                      ? setReviewJob(job)
                      : navigate(`/expert/jobs/${job.id}`)
                  }
                >
                  <div className="job-card-inner">
                    <span className="job-id-badge">{job.displayId}</span>
                    <h3 className="job-name">{job.jobName}</h3>
                    <p className="job-poster">
                      {needsReview
                        ? "📥 New submission — click to review"
                        : job.status === "approved"
                        ? `✅ Paid ${job.reward_points} pts`
                        : job.tunnel_url
                        ? "🟢 tunnel live"
                        : "⏳ waiting for agent"}
                    </p>
                    <div className="job-reward-row">
                      <span className="job-reward-label">
                        {job.created_at
                          ? new Date(job.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                        {" · "}
                        <span style={{ fontWeight: 600 }}>
                          🏆 {job.reward_points} pts
                        </span>
                      </span>
                      <span
                        className={`status-pill status-pill-sm ${
                          job.status === "approved" ? "status-pill-gold" : ""
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {showPost && (
        <PostJobModal
          userId={user?.id}
          onClose={() => setShowPost(false)}
          onPosted={handlePosted}
        />
      )}

      {reviewJob && (
        <ReviewModal
          job={reviewJob}
          userId={user?.id}
          onClose={() => setReviewJob(null)}
          onDone={() => {
            setReviewJob(null);
            setTimeout(load, 300);
          }}
        />
      )}
    </div>
  );
}

export default MyJobs;
