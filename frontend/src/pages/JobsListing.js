import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { mockJobs } from '../data/mockData';

const readStatus = (jobId) => {
  try {
    const raw = localStorage.getItem(`kernel_job_state_${jobId}`);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.isApproved) return 'approved';
    if (s.isSubmitted) return 'submitted';
    if (s.isAccepted) return 'accepted';
    return null;
  } catch {
    return null;
  }
};

const STATUS_META = {
  accepted: { label: 'Accepted', className: 'status-accepted' },
  submitted: { label: 'Under Review', className: 'status-submitted' },
  approved: { label: 'Approved', className: 'status-approved' },
};

const JobsListing = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <h1 className="page-heading">Available Jobs</h1>
        <span className="count-badge">{mockJobs.length}</span>
      </div>
      <p className="page-subtitle">
        Pick a job, read the problem, accept it and start solving. Your tunnel and preview URL are provisioned automatically.
      </p>

      <div className="jobs-grid">
        {mockJobs.map((job) => {
          const status = readStatus(job.id);
          const meta = status ? STATUS_META[status] : null;
          return (
            <Card
              key={job.id}
              className="job-card"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              <div className="job-card-top">
                <span className="job-id-badge">{job.id}</span>
                {meta && (
                  <span className={`status-pill ${meta.className}`}>{meta.label}</span>
                )}
              </div>
              <h3 className="job-title">{job.jobName}</h3>
              <p className="job-poster">Posted by {job.clientName}</p>
              <div className="reward-row">
                <span className="reward-label">Reward</span>
                <span className="reward-value">{job.rewardPoints} pts</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default JobsListing;
