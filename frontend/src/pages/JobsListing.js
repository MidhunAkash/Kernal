import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { mockJobs } from "../data/mockData";

const JobsListing = () => {
  const navigate = useNavigate();

  return (
    <div className="jobs-page" data-testid="jobs-page">
      <div className="jobs-header">
        <h1 className="jobs-heading">
          Available Jobs
          <span className="count-badge" data-testid="jobs-count-badge">
            {mockJobs.length}
          </span>
        </h1>
        <p className="jobs-subtitle">
          Pick a job, accept it, and solve it with your Human-MCP setup. All
          rewards are credited instantly on approval.
        </p>
      </div>

      <div className="jobs-grid" data-testid="jobs-grid">
        {mockJobs.map((job) => (
          <Card
            key={job.id}
            className="job-card"
            onClick={() => navigate(`/jobs/${job.id}`)}
          >
            <div data-testid={`job-card-${job.id}`} className="job-card-inner">
              <span className="job-id-badge">{job.id}</span>
              <h3 className="job-name">{job.jobName}</h3>
              <p className="job-poster">Posted by {job.clientName}</p>
              <div className="job-reward-row">
                <span className="job-reward-label">Reward</span>
                <span className="job-reward-value">{job.rewardPoints} pts</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JobsListing;
