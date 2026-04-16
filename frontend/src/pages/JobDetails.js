import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import ChatUI from "../components/ChatUI";
import { mockJobs, mockMCPConfig, initialChatMessages } from "../data/mockData";

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const job = mockJobs.find((j) => j.id === jobId);

  const [isAccepted, setIsAccepted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  if (!job) {
    return (
      <div className="job-details-page" data-testid="job-not-found">
        <Card className="job-details-card">
          <h2 className="job-title">Job Not Found</h2>
          <p className="hero-subtitle">
            We couldn't find a job with id "{jobId}".
          </p>
          <Button variant="primary" onClick={() => navigate("/jobs")}>
            Back to Jobs
          </Button>
        </Card>
      </div>
    );
  }

  const promptText = `Given job id: ${job.id}, fetch the problem context and solve it
without changing existing code.
Use only Human MCP tools: read, write, update.
When user asks any question, only use Human MCP.`;

  const handleSubmit = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      setIsApproved(true);
    }, 3000);
  };

  // STATE 4 — Approved
  if (isApproved) {
    return (
      <div className="job-details-page" data-testid="job-approved-state">
        <Card className="status-card">
          <div className="status-icon" aria-hidden="true">
            ✅
          </div>
          <h2 className="status-heading">Job Approved!</h2>
          <div className="reward-inset" data-testid="reward-inset">
            <div className="reward-inset-icon" aria-hidden="true">
              🎉
            </div>
            <div className="reward-inset-label">Reward Points Credited</div>
            <div className="reward-inset-value">+{job.rewardPoints} pts</div>
          </div>
          <Button
            variant="primary"
            className="cta-btn"
            onClick={() => navigate("/jobs")}
          >
            Browse More Jobs
          </Button>
        </Card>
      </div>
    );
  }

  // STATE 3 — Submitted, not yet approved
  if (isSubmitted) {
    return (
      <div className="job-details-page" data-testid="job-submitted-state">
        <Card className="status-card">
          <div className="status-icon" aria-hidden="true">
            ⏳
          </div>
          <h2 className="status-heading">
            Thanks for submitting your solution.
          </h2>
          <p className="status-subtext">It is under review. Please wait.</p>
          <div className="loading-dots" aria-hidden="true">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
          </div>
        </Card>
      </div>
    );
  }

  // STATE 2 — Accepted
  if (isAccepted) {
    return (
      <div className="job-details-page accepted-page" data-testid="job-accepted-state">
        <div className="accepted-header">
          <div className="accepted-header-top">
            <h2 className="accepted-heading">Job Accepted</h2>
            <span className="job-id-badge dark-badge">{job.id}</span>
          </div>
          <p className="accepted-subtitle">{job.jobName}</p>
        </div>

        <div className="config-section">
          <Card>
            <div className="section-label">MCP Config</div>
            <pre className="code-block">
              <code>{JSON.stringify(mockMCPConfig, null, 2)}</code>
            </pre>
          </Card>
          <Card>
            <div className="section-label">Prompt</div>
            <pre className="code-block">
              <code>{promptText}</code>
            </pre>
          </Card>
        </div>

        <Card className="links-card">
          <div className="link-item">
            <span className="link-icon" aria-hidden="true">
              🔗
            </span>
            <div className="link-body">
              <div className="link-label">Tunnel Link</div>
              <div className="link-url">
                https://tunnel.vibecon.io/{job.id}
              </div>
            </div>
          </div>
          <div className="link-item">
            <span className="link-icon" aria-hidden="true">
              🌐
            </span>
            <div className="link-body">
              <div className="link-label">Preview URL</div>
              <div className="link-url">
                https://preview.vibecon.io/{job.id}
              </div>
            </div>
          </div>
        </Card>

        <ChatUI messages={initialChatMessages} />

        <div className="submit-row">
          <Button
            variant="primary"
            className="submit-btn"
            onClick={handleSubmit}
          >
            <span data-testid="submit-solution-btn">
              Submit Solution &rarr;
            </span>
          </Button>
        </div>
      </div>
    );
  }

  // STATE 1 — Default
  return (
    <div className="job-details-page" data-testid="job-default-state">
      <div className="breadcrumb">
        <Link to="/jobs" className="breadcrumb-link">
          Jobs
        </Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{job.id}</span>
      </div>

      <Card className="job-details-card">
        <div className="job-details-header">
          <span className="job-id-badge">{job.id}</span>
          <span className="reward-pill" data-testid="reward-pill">
            🏆 {job.rewardPoints} pts
          </span>
        </div>

        <h1 className="job-title">{job.jobName}</h1>
        <p className="job-poster">Posted by {job.clientName}</p>

        <hr className="divider" />

        <div className="section-label">PROBLEM STATEMENT</div>
        <p className="problem-text">{job.problemStatement}</p>

        <div className="btn-row">
          <Button
            variant="primary"
            onClick={() => setIsAccepted(true)}
            className="accept-btn"
          >
            <span data-testid="accept-job-btn">✅ Accept Job</span>
          </Button>
          <Button variant="secondary" onClick={() => navigate("/jobs")}>
            &larr; Back
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default JobDetails;
