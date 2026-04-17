import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HumExHeader from "../../components/humex/HumExHeader";
import Card from "../../components/humex/Card";
import Button from "../../components/humex/Button";
import { useAuth } from "../../lib/auth";
import {
  buildPersonalizedMcpConfig,
  getMcpServerInfo,
  getUserPoints,
  listApiKeys,
} from "../../lib/humexApi";
import "../../humex-spa.css";

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [keys, setKeys] = useState([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [serverInfo, apiKeys, rewardPoints] = await Promise.all([
          getMcpServerInfo(),
          listApiKeys(user.id),
          getUserPoints(user.id),
        ]);
        if (!active) return;
        setInfo(serverInfo);
        setKeys(apiKeys || []);
        setPoints(rewardPoints || 0);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError("Could not load your dashboard right now.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user]);

  const primaryKey = keys[0] || null;
  const configText = useMemo(() => {
    if (info?.mcpUrl && primaryKey?.api_key) {
      return JSON.stringify(buildPersonalizedMcpConfig(info.mcpUrl, primaryKey.api_key), null, 2);
    }
    if (info?.mcpUrl) {
      return JSON.stringify({ mcpServers: { "humex-workspace": { url: info.mcpUrl } } }, null, 2);
    }
    return "Loading your MCP configuration…";
  }, [info, primaryKey]);

  const handleCopy = async () => {
    try {
      await copyText(configText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("Failed to copy MCP config:", err);
    }
  };

  return (
    <div className="humex-spa">
      <HumExHeader />
      <main className="k-main" data-testid="expert-dashboard-page">
        <div className="page-head" style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 className="page-title" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
            Welcome, {user?.user_metadata?.name || user?.email?.split("@")[0] || "Expert"}
          </h1>
          <p className="page-sub" style={{ fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto" }}>
            This is your HumEx connection hub. Attach your AI agent to the workspace and start solving jobs.
          </p>
        </div>

        {error && (
          <Card data-testid="dashboard-error-card" style={{ marginBottom: "2rem", borderColor: "#fca5a5", backgroundColor: "#fef2f2" }}>
            <p style={{ color: "#b91c1c", margin: 0, fontWeight: 500 }}>{error}</p>
          </Card>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "2rem",
            alignItems: "stretch",
          }}
        >
          {/* MCP Config Card */}
          <Card data-testid="dashboard-connection-section" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 className="job-name" style={{ margin: 0, fontSize: "1.25rem" }}>Agent Connection</h2>
              <span className={`status-pill ${info?.connected ? "status-pill-gold" : ""}`} style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}>
                {loading ? "CHECKING..." : info?.connected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            
            <p className="page-sub" style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Add this MCP configuration to your AI agent (Cursor, Claude Desktop, etc.) to connect to the HumEx network.
            </p>

            <div className="code-block" style={{ flexGrow: 1, marginBottom: "1.5rem" }} data-testid="dashboard-config-block">
              <pre>{configText}</pre>
            </div>

            <Button variant="primary" onClick={handleCopy} data-testid="dashboard-copy-config-btn" style={{ width: "100%", justifyContent: "center", padding: "0.8rem" }}>
              {copied ? "✓ Copied to clipboard" : "📋 Copy Configuration"}
            </Button>
          </Card>

          {/* Account & Quick Links Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <Card data-testid="dashboard-account-summary-card">
              <h2 className="job-name" style={{ margin: "0 0 1.5rem 0", fontSize: "1.25rem" }}>Account Overview</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div style={{ padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <div className="mono-label dim" style={{ marginBottom: "0.5rem" }}>EARNINGS</div>
                  <div data-testid="dashboard-user-points" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#eab308" }}>
                    ⭐ {Number(points || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <div className="mono-label dim" style={{ marginBottom: "0.5rem" }}>API KEYS</div>
                  <div data-testid="dashboard-api-key-count" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                    {keys.length || 0} <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#6b7280" }}>active</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card data-testid="dashboard-quick-links-card">
              <h2 className="job-name" style={{ margin: "0 0 1.5rem 0", fontSize: "1.25rem" }}>Quick Actions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Button variant="secondary" onClick={() => navigate("/expert/jobs")} style={{ justifyContent: "space-between", padding: "1rem" }}>
                  <span>Browse available jobs</span>
                  <span>→</span>
                </Button>
                <Button variant="secondary" onClick={() => navigate("/expert/accepted-jobs")} style={{ justifyContent: "space-between", padding: "1rem" }} data-testid="dashboard-accepted-jobs-btn">
                  <span>My accepted jobs</span>
                  <span>→</span>
                </Button>
                <Button variant="secondary" onClick={() => navigate("/expert/profile/api-keys")} style={{ justifyContent: "space-between", padding: "1rem" }}>
                  <span>Manage API keys</span>
                  <span>→</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
