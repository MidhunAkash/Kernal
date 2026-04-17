import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Card from "@/components/humex/Card";
import Button from "@/components/humex/Button";
import ChatUI from "@/components/humex/ChatUI";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function ReviewSolution() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { userName, marketplace, approveSolution, rejectSolution, sendMessage } = useApp();
  const [backendJob, setBackendJob] = useState(null);
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState(null);

  const market = marketplace[jobId];

  useEffect(() => {
    let alive = true;
    api.getJob(jobId)
      .then((d) => { if (alive) setBackendJob(d?.job || null); })
      .catch((e) => { if (alive) setErr(e?.response?.data?.detail || "Could not load job"); });
    return () => { alive = false; };
  }, [jobId]);

  if (!market) {
    return (
      <AppLayout>
        <div className="k-breadcrumb">
          <Link to="/dashboard/poster/jobs">My Jobs</Link>
          <span className="sep">/</span>
          <span>Review</span>
        </div>
        <Card testId="review-not-found">
          <p style={{ margin: 0, color: "var(--k-text-secondary)" }}>
            This job is not in your local marketplace. You might have posted it from a different browser.
          </p>
        </Card>
      </AppLayout>
    );
  }

  const status = market.marketStatus || "open";

  const onApprove = async () => {
    approveSolution(jobId);
    // Also close the job on the backend (best-effort)
    try { await api.closeJob(jobId, market.apiKey); } catch { /* non-blocking */ }
    sendMessage(jobId, "poster", userName || "Poster", `Solution approved. +${market.rewardPoints || 0} pts credited.`);
    setBanner({ type: "success", text: `Job Approved! ${market.rewardPoints || 0} pts credited.` });
  };
  const onReject = () => {
    rejectSolution(jobId);
    sendMessage(jobId, "poster", userName || "Poster", "Solution rejected — please iterate.");
    setBanner({ type: "error", text: "Job Rejected." });
  };
  const onSendChat = (text) => {
    sendMessage(jobId, "poster", userName || "Poster", text);
  };

  return (
    <AppLayout>
      <div className="k-breadcrumb" data-testid="review-breadcrumb">
        <Link to="/dashboard/poster/jobs">My Jobs</Link>
        <span className="sep">/</span>
        <span>#{jobId.slice(0, 8)}</span>
      </div>

      <h1 className="k-page-title" data-testid="review-title">Review Solution</h1>

      {err && <div className="k-banner error" data-testid="review-error">{err}</div>}

      <Card testId="review-job-card" style={{ marginBottom: 20 }}>
        <div className="k-row">
          <span className="k-job-id">#{jobId.slice(0, 8)}</span>
          <h2 className="k-card-title" style={{ margin: 0, flex: 1 }}>{market.title || backendJob?.title}</h2>
          <span className="k-reward">★ {market.rewardPoints || 0} pts</span>
          <span className={`k-status ${status}`} data-testid="review-status">{status}</span>
        </div>
        {market.acceptedBy && (
          <p style={{ margin: "10px 0 0", color: "var(--k-text-secondary)", fontSize: 13 }}>
            Solver: <strong>{market.acceptedBy.name}</strong>
          </p>
        )}
      </Card>

      {banner && (
        <div className={`k-banner ${banner.type}`} data-testid={`review-banner-${banner.type}`}>
          {banner.text}
        </div>
      )}

      <h3 className="k-section-label" style={{ marginTop: 28 }}>Problem Statement</h3>
      <div className="k-blockquote" data-testid="review-problem">
        {market.context || backendJob?.context || "(no context provided)"}
      </div>

      <h3 className="k-section-label" style={{ marginTop: 28 }}>Submitted Solution</h3>
      {market.solution ? (
        <div className="k-blockquote" data-testid="review-solution-text">{market.solution}</div>
      ) : (
        <div className="k-banner warn" data-testid="review-no-solution">
          No solution submitted yet.
          {status === "accepted" && (
            <>
              <span>&nbsp;Solver is still working.</span>
              <span className="k-pulse-dots"><span /><span /><span /></span>
            </>
          )}
        </div>
      )}

      <h3 className="k-section-label" style={{ marginTop: 28 }}>Chat History</h3>
      <ChatUI
        messages={market.chat || []}
        onSend={onSendChat}
        selfRole="poster"
        testId="review-chat"
      />

      {status === "submitted" && (
        <div className="k-row" style={{ justifyContent: "flex-end", marginTop: 28 }}>
          <Button variant="danger" onClick={onReject} testId="review-reject-btn">
            ❌ Reject
          </Button>
          <Button variant="success" onClick={onApprove} testId="review-approve-btn">
            ✅ Approve &amp; Credit {market.rewardPoints || 0} pts
          </Button>
        </div>
      )}

      {(status === "approved" || status === "rejected") && (
        <div className="k-row" style={{ justifyContent: "flex-end", marginTop: 28 }}>
          <Button variant="secondary" onClick={() => navigate("/dashboard/poster/jobs")} testId="review-back-btn">
            ← Back to My Jobs
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
