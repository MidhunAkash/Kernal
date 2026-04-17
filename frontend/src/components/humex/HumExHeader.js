import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import {
  getMcpServerInfo,
  getUserPoints,
  listApiKeys,
  buildPersonalizedMcpConfig,
} from "../../lib/humexApi";

function ConnectModal({ uid, onClose }) {
  const [info, setInfo] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [i, keys] = await Promise.all([
          getMcpServerInfo(),
          uid ? listApiKeys(uid) : Promise.resolve([]),
        ]);
        if (dead) return;
        setInfo(i);
        if (keys.length > 0) setApiKey(keys[0]);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, [uid]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cfg = info && apiKey
    ? buildPersonalizedMcpConfig(info.mcpUrl, apiKey.api_key)
    : info
    ? { mcpServers: { "humex-workspace": { url: info.mcpUrl } } }
    : null;
  const configStr = cfg ? JSON.stringify(cfg, null, 2) : "Loading…";

  const copy = async () => {
    if (!cfg) return;
    try {
      await navigator.clipboard.writeText(configStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="connect-modal-backdrop"
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="connect-modal"
      >
        <div className="modal-head">
          <div>
            <div className="section-label" style={{ margin: 0 }}>
              CONNECT
            </div>
            <h2 id="connect-modal-title" className="modal-title">
              Add HumEx to your agent
            </h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            data-testid="connect-modal-close"
          >
            ×
          </button>
        </div>

        <p className="modal-sub">
          Paste this MCP config into Cursor, Claude Desktop, or VS Code to bridge
          your workspace to a HumEx expert.
          {apiKey ? (
            <>
              <br />
              <span className="mono-label dim" style={{ fontSize: ".78rem" }}>
                Personalized with your <strong>{apiKey.name}</strong> key — the
                backend will recognise you on every call.
              </span>
            </>
          ) : (
            <>
              <br />
              <span className="mono-label dim" style={{ fontSize: ".78rem" }}>
                A default key will be kept ready for you in <strong>Profile → API Keys</strong>
                so every job stays linked to your account.
              </span>
            </>
          )}
        </p>

        <div className="server-status-row" style={{ margin: "0 0 .9rem" }}>
          <span
            className={`status-dot ${
              info?.connected ? "status-dot-green" : "status-dot-amber"
            }`}
          />
          <span className="mono-label">
            {loading
              ? "checking server…"
              : info?.connected
              ? "HumEx Workspace MCP · live"
              : "HumEx Workspace MCP · unreachable"}
          </span>
          {info && (
            <span className="mono-label dim">
              · {info.toolNames.length} workspace tools
            </span>
          )}
        </div>

        <div className="code-block" data-testid="connect-config-block">
          <pre>{configStr}</pre>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={copy}
            disabled={!info}
            data-testid="connect-copy-btn"
          >
            {copied ? "✓ Copied" : "📋 Copy config"}
          </button>
          {info && (
            <span className="mono-label dim" style={{ fontSize: ".76rem" }}>
              <code>{info.mcpUrl}</code>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HumExHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [showConnect, setShowConnect] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [points, setPoints] = useState(null);

  // Live-refresh the user's points balance
  useEffect(() => {
    if (!user?.id) return undefined;
    let dead = false;
    const load = async () => {
      const p = await getUserPoints(user.id);
      if (!dead) setPoints(p);
    };
    load();
    const t = setInterval(load, 10000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [user]);

  const onExpert =
    location.pathname === "/expert" || location.pathname === "/expert/";
  const onJobs =
    location.pathname === "/expert/jobs" ||
    (location.pathname.startsWith("/expert/jobs/") &&
      !location.pathname.startsWith("/expert/jobs/mine"));
  const onMyJobs = location.pathname.startsWith("/expert/my-jobs");
  const onAcceptedJobs = location.pathname.startsWith("/expert/accepted-jobs");
  const onProfile = location.pathname.startsWith("/expert/profile");

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <>
      <header className="k-header" data-testid="humex-header">
        <div
          className="k-logo"
          onClick={() => navigate("/expert")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/expert")}
          data-testid="humex-logo"
        >
          <span className="k-logo-text">HumEx</span>
          <span className="k-logo-dot" />
        </div>

        <nav className="k-nav">
          <Link
            to="/expert"
            className={`k-nav-link ${onExpert ? "active" : ""}`}
            data-testid="nav-dashboard"
          >
            Dashboard
          </Link>
          <Link
            to="/expert/jobs"
            className={`k-nav-link ${onJobs ? "active" : ""}`}
            data-testid="nav-jobs"
          >
            Jobs
          </Link>
          <Link
            to="/expert/my-jobs"
            className={`k-nav-link ${onMyJobs ? "active" : ""}`}
            data-testid="nav-my-jobs"
          >
            Posted Jobs
          </Link>
          <Link
            to="/expert/accepted-jobs"
            className={`k-nav-link ${onAcceptedJobs ? "active" : ""}`}
            data-testid="nav-accepted-jobs"
          >
            Accepted Jobs
          </Link>
          <Link
            to="/expert/profile"
            className={`k-nav-link ${onProfile ? "active" : ""}`}
            data-testid="nav-profile"
          >
            Profile
          </Link>

          {points !== null && (
            <span className="k-nav-points" data-testid="nav-points" title="Reward points">
              ⭐ {points.toLocaleString()}
            </span>
          )}

          <button
            type="button"
            className="k-nav-btn k-nav-btn-primary"
            onClick={() => setShowConnect(true)}
            data-testid="nav-connect"
          >
            Connect
          </button>

          <button
            type="button"
            className="k-nav-btn k-nav-btn-ghost"
            onClick={handleLogout}
            disabled={loggingOut}
            data-testid="nav-logout"
          >
            {loggingOut ? "…" : "Logout"}
          </button>
        </nav>
      </header>

      {showConnect && <ConnectModal uid={user?.id} onClose={() => setShowConnect(false)} />}
    </>
  );
}

export default HumExHeader;
