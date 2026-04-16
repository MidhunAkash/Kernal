import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import ChatUI from '../components/ChatUI';
import { mockJobs, mockMCPConfig, initialChatMessages } from '../data/mockData';

const APPROVAL_DELAY_MS = 3000;
const storageKey = (jobId) => `kernel_job_state_${jobId}`;

const readJobState = (jobId) => {
  try {
    const raw = localStorage.getItem(storageKey(jobId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJobState = (jobId, state) => {
  try {
    localStorage.setItem(storageKey(jobId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

const clearJobState = (jobId) => {
  try {
    localStorage.removeItem(storageKey(jobId));
  } catch {
    /* ignore */
  }
};

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const job = useMemo(() => mockJobs.find((j) => j.id === jobId), [jobId]);

  // Hydrate initial state from localStorage so refresh preserves progress.
  const persisted = useMemo(() => readJobState(jobId) || {}, [jobId]);
  const [isAccepted, setIsAccepted] = useState(!!persisted.isAccepted);
  const [isSubmitted, setIsSubmitted] = useState(!!persisted.isSubmitted);
  const [isApproved, setIsApproved] = useState(!!persisted.isApproved);
  const [submittedAt, setSubmittedAt] = useState(persisted.submittedAt || null);

  // Persist state to localStorage on every change.
  useEffect(() => {
    if (!jobId) return;
    // If nothing happened yet, don't write empty state.
    if (!isAccepted && !isSubmitted && !isApproved) return;
    writeJobState(jobId, { isAccepted, isSubmitted, isApproved, submittedAt });
  }, [jobId, isAccepted, isSubmitted, isApproved, submittedAt]);

  // Handle the pending-approval timer in a refresh-safe way.
  // If submittedAt was set before the page reloaded, resume the timer using
  // the remaining time; if the 3s has already elapsed, approve immediately.
  useEffect(() => {
    if (!isSubmitted || isApproved) return;
    const startedAt = submittedAt || Date.now();
    if (!submittedAt) setSubmittedAt(startedAt);
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, APPROVAL_DELAY_MS - elapsed);
    if (remaining === 0) {
      setIsApproved(true);
      return;
    }
    const t = setTimeout(() => setIsApproved(true), remaining);
    return () => clearTimeout(t);
  }, [isSubmitted, isApproved, submittedAt]);

  const handleAccept = () => setIsAccepted(true);
  const handleSubmit = () => {
    setIsSubmitted(true);
    setSubmittedAt(Date.now());
  };
  const handleStartOver = () => {
    clearJobState(jobId);
    setIsAccepted(false);
    setIsSubmitted(false);
    setIsApproved(false);
    setSubmittedAt(null);
  };
  const handleBrowseMore = () => {
    // Keep approved jobs in storage so they show as approved if revisited.
    navigate('/jobs');
  };

  if (!job) {
    return (
      <div className="page-container">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/jobs')}>Jobs</span>
          <span className="breadcrumb-sep"> / </span>
          <span className="breadcrumb-current">Not Found</span>
        </div>
        <Card className="centered-card">
          <h2 className="state-heading">Job not found</h2>
          <p className="state-sub">The job you are looking for does not exist.</p>
          <Button variant="primary" onClick={() => navigate('/jobs')}>Browse Jobs</Button>
        </Card>
      </div>
    );
  }

  const prompt = `Given job id: ${job.id}, fetch the problem context and solve it
without changing existing code.
Use only Human MCP tools: read, write, update.
When user asks any question, only use Human MCP.`;

  // STATE 4 — Approved
  if (isApproved) {
    return (
      <div className="page-container">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/jobs')}>Jobs</span>
          <span className="breadcrumb-sep"> / </span>
          <span className="breadcrumb-current">{job.id}</span>
        </div>
        <Card className="centered-card">
          <div className="big-icon">✅</div>
          <h2 className="state-heading">Job Approved!</h2>
          <p className="state-sub">Great work. Your solution has been accepted.</p>
          <div className="reward-inset">
            <div className="reward-inset-icon">🎉</div>
            <div className="reward-inset-label">Reward Points Credited</div>
            <div className="reward-inset-value">+{job.rewardPoints} pts</div>
          </div>
          <Button variant="primary" className="wide-btn" onClick={handleBrowseMore}>
            Browse More Jobs
          </Button>
          <button type="button" className="link-btn" onClick={handleStartOver}>
            Reset this job
          </button>
        </Card>
      </div>
    );
  }

  // STATE 3 — Submitted (awaiting review)
  if (isSubmitted) {
    return (
      <div className="page-container">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/jobs')}>Jobs</span>
          <span className="breadcrumb-sep"> / </span>
          <span className="breadcrumb-current">{job.id}</span>
        </div>
        <Card className="centered-card">
          <div className="big-icon">⏳</div>
          <h2 className="state-heading">Thanks for submitting your solution.</h2>
          <p className="state-sub">It is under review. Please wait.</p>
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </Card>
      </div>
    );
  }

  // STATE 2 — Accepted
  if (isAccepted) {
    return (
      <div className="page-container accepted-container">
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/jobs')}>Jobs</span>
          <span className="breadcrumb-sep"> / </span>
          <span className="breadcrumb-current">{job.id}</span>
        </div>

        <div className="accepted-header accepted-header-row">
          <div>
            <h2 className="accepted-title">
              Job Accepted
              <span className="job-id-badge inline-badge">{job.id}</span>
            </h2>
            <p className="accepted-sub">{job.jobName}</p>
          </div>
          <button type="button" className="link-btn" onClick={handleStartOver}>
            Reset this job
          </button>
        </div>

        <div className="config-section">
          <Card>
            <div className="section-label">MCP Config</div>
            <div className="code-block">
              <pre>{JSON.stringify(mockMCPConfig, null, 2)}</pre>
            </div>
          </Card>
          <Card>
            <div className="section-label">Prompt</div>
            <div className="code-block">
              <pre>{prompt}</pre>
            </div>
          </Card>
        </div>

        <Card className="links-card">
          <div className="link-item">
            <div className="link-icon">🔗</div>
            <div className="link-inset">
              <div className="link-label">Tunnel Link</div>
              <div className="link-url">https://tunnel.kernel.dev/{job.id}</div>
            </div>
          </div>
          <div className="link-item">
            <div className="link-icon">🌐</div>
            <div className="link-inset">
              <div className="link-label">Preview URL</div>
              <div className="link-url">https://preview.kernel.dev/{job.id}</div>
            </div>
          </div>
        </Card>

        <ChatUI messages={initialChatMessages} />

        <div className="submit-row">
          <Button variant="primary" className="wide-btn" onClick={handleSubmit}>
            Submit Solution &rarr;
          </Button>
        </div>
      </div>
    );
  }

  // STATE 1 — Default
  return (
    <div className="page-container">
      <div className="breadcrumb">
        <span className="breadcrumb-link" onClick={() => navigate('/jobs')}>Jobs</span>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">{job.id}</span>
      </div>

      <Card className="detail-card">
        <div className="detail-header-row">
          <span className="job-id-badge">{job.id}</span>
          <span className="reward-pill">🏆 {job.rewardPoints} pts</span>
        </div>
        <h2 className="detail-title">{job.jobName}</h2>
        <p className="detail-poster">Posted by {job.clientName}</p>
        <div className="divider" />
        <div className="section-label">PROBLEM STATEMENT</div>
        <p className="problem-text">{job.problemStatement}</p>

        <div className="action-row">
          <Button variant="primary" onClick={handleAccept}>
            ✅ Accept Job
          </Button>
          <Button variant="secondary" onClick={() => navigate('/jobs')}>
            &larr; Back
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default JobDetails;
