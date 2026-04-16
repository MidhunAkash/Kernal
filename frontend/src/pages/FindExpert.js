import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { sampleConfig } from "../data/mockData";

const FindExpert = () => {
  const navigate = useNavigate();

  return (
    <div className="find-expert-page" data-testid="find-expert-page">
      <Card className="find-expert-card">
        <span className="pill-badge" data-testid="expert-solver-badge">
          EXPERT SOLVER
        </span>
        <h1 className="hero-heading" data-testid="hero-heading">
          Find an Expert
        </h1>
        <p className="hero-subtitle">
          Connect with vetted engineers who solve real problems through a
          lightweight Human-MCP protocol. Share the context, keep your codebase,
          ship the fix.
        </p>
        <pre className="code-block" data-testid="sample-config-block">
          <code>{JSON.stringify(sampleConfig, null, 2)}</code>
        </pre>
      </Card>
      <Button
        variant="primary"
        className="cta-btn"
        onClick={() => navigate("/jobs")}
      >
        <span data-testid="solve-problems-btn-label">
          Solve the Problems &rarr;
        </span>
      </Button>
    </div>
  );
};

export default FindExpert;
