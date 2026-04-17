import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import Card from "@/components/humex/Card";
import Button from "@/components/humex/Button";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const DEFAULT_MCP_CONFIG = `{
  "mcpServers": {
    "humanMCP": {
      "command": "npx",
      "args": ["-y", "@anthropic/human-mcp"],
      "env": {
        "TUNNEL_URL": "\${TUNNEL_URL}",
        "SESSION_ID": "\${SESSION_ID}"
      }
    }
  },
  "tools": {
    "allowed": ["read", "write", "update"],
    "restricted": ["delete", "execute"]
  }
}`;

const DEFAULT_PROMPT = `Given job id: {jobId}, fetch the problem context and solve it without changing existing code.
Use only Human MCP tools: read, write, update.
When user asks any question, only use Human MCP.`;

export default function PostJob() {
  const { userName, registerPostedJob } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [reward, setReward] = useState(500);
  const [mcpConfigText, setMcpConfigText] = useState(DEFAULT_MCP_CONFIG);
  const [promptTpl, setPromptTpl] = useState(DEFAULT_PROMPT);
  const [localPort, setLocalPort] = useState(3000);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const displayName = useMemo(
    () => userName || user?.user_metadata?.name || user?.email?.split("@")[0] || "Poster",
    [userName, user]
  );

  const jsonError = useMemo(() => {
    try {
      JSON.parse(mcpConfigText);
      return "";
    } catch (e) {
      return e.message;
    }
  }, [mcpConfigText]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!title.trim()) { setErr("Title is required"); return; }
    if (!problem.trim()) { setErr("Problem statement is required"); return; }
    if (jsonError) { setErr("MCP config is not valid JSON: " + jsonError); return; }

    setSubmitting(true);
    try {
      // Real backend call: creates session + target client + job, returns api_key + executor_link
      const result = await api.createSimpleJob({
        title: title.trim(),
        context: problem.trim(),
        local_port: Number(localPort) || 0,
        target_name: displayName,
      });

      // Build the concrete prompt with the real job id
      const prompt = promptTpl.replace(/\{jobId\}/g, result.job_id);

      registerPostedJob(result, {
        prompt,
        postedByName: displayName,
        rewardPoints: Number(reward) || 0,
      });

      navigate("/dashboard/poster/jobs", { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <h1 className="k-page-title" data-testid="post-job-title">Post a New Job</h1>
      <p className="k-page-sub">
        This creates a real HumEx MCP target in Supabase — you'll receive the agent command and the executor link on the next screen.
      </p>

      <Card style={{ maxWidth: 680 }} testId="post-job-card">
        <form onSubmit={submit} data-testid="post-job-form">
          <div className="k-form-group">
            <label className="k-form-label" htmlFor="pj-title">Job Title</label>
            <input
              id="pj-title"
              className="k-form-input"
              placeholder="e.g. Fix Authentication Bug"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="post-job-title-input"
              required
            />
          </div>

          <div className="k-form-group">
            <label className="k-form-label" htmlFor="pj-problem">Problem Statement</label>
            <textarea
              id="pj-problem"
              className="k-form-textarea"
              rows={5}
              placeholder="Describe the issue, repro steps, any hypothesis…"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              data-testid="post-job-problem-input"
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="k-form-group">
              <label className="k-form-label" htmlFor="pj-reward">Reward Points</label>
              <input
                id="pj-reward"
                type="number"
                min="0"
                className="k-form-input"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                data-testid="post-job-reward-input"
              />
            </div>
            <div className="k-form-group">
              <label className="k-form-label" htmlFor="pj-port">Local Dev Port</label>
              <input
                id="pj-port"
                type="number"
                min="0"
                className="k-form-input"
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value)}
                data-testid="post-job-port-input"
              />
            </div>
          </div>

          <div className="k-form-group">
            <label className="k-form-label" htmlFor="pj-mcp">MCP Config (JSON)</label>
            <textarea
              id="pj-mcp"
              className="k-code-textarea"
              rows={14}
              value={mcpConfigText}
              onChange={(e) => setMcpConfigText(e.target.value)}
              data-testid="post-job-mcp-config-input"
              spellCheck={false}
            />
            {jsonError && <div className="k-form-error" data-testid="post-job-mcp-error">Invalid JSON: {jsonError}</div>}
          </div>

          <div className="k-form-group">
            <label className="k-form-label" htmlFor="pj-prompt">Prompt Template</label>
            <textarea
              id="pj-prompt"
              className="k-code-textarea"
              rows={6}
              value={promptTpl}
              onChange={(e) => setPromptTpl(e.target.value)}
              data-testid="post-job-prompt-input"
              spellCheck={false}
            />
          </div>

          {err && <div className="k-banner error" data-testid="post-job-error">{err}</div>}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
            <Button
              variant="secondary"
              onClick={() => navigate("/dashboard/poster")}
              testId="post-job-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !!jsonError}
              testId="post-job-submit-btn"
            >
              {submitting ? "Posting…" : "Post Job"}
            </Button>
          </div>
        </form>
      </Card>
    </AppLayout>
  );
}
