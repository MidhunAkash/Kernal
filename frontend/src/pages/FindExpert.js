import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { sampleConfig } from '../data/mockData';

const FindExpert = () => {
  const navigate = useNavigate();

  return (
    <div className="page-center">
      <Card className="expert-card">
        <span className="pill-badge">EXPERT SOLVER</span>
        <h1 className="hero-title">Find an Expert</h1>
        <p className="hero-subtitle">
          Describe your problem, we match you with a senior engineer who solves it end-to-end using Human MCP. No meetings, no fluff — just a reliable fix.
        </p>
        <div className="code-block">
          <pre>{JSON.stringify(sampleConfig, null, 2)}</pre>
        </div>
      </Card>

      <Button
        variant="primary"
        className="cta-solve"
        onClick={() => navigate('/jobs')}
      >
        Solve the Problems &rarr;
      </Button>
    </div>
  );
};

export default FindExpert;
