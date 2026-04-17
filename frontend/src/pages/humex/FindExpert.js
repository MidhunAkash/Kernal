import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HumExHeader from "../../components/humex/HumExHeader";
import Card from "../../components/humex/Card";
import Button from "../../components/humex/Button";
import { useAuth } from "../../lib/auth";
import {
  getMcpServerInfo,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  buildPersonalizedMcpConfig,
} from "../../lib/humexApi";
import "../../humex-spa.css";

/* ─── Create-key modal ─── */

function CreateKeyModal({ uid, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await createApiKey(uid, name.trim() || "default_key");
      onCreated(created);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        data-testid="create-key-modal"
      >
        <div className="modal-head">
          <div>
            <div className="section-label" style={{ margin: 0 }}>NEW API KEY</div>
            <h2 className="modal-title">Create a HumEx API key</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={busy}>×</button>
        </div>
        <p className="modal-sub">
          Give it a friendly name so you can recognise it later (e.g. "Cursor on my laptop",
          "CI runner", "Claude Desktop").
        </p>
        <form onSubmit={submit}>
          <label className="form-label">Name</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="default_key"
            autoFocus
            maxLength={60}
            data-testid="create-key-name"
          />
          {error && (
            <p style={{ color: "#b91c1c", fontSize: ".85rem", marginTop: ".5rem" }}>{error}</p>
          )}
          <div className="modal-actions">
            <Button variant="primary" type="submit" disabled={busy} data-testid="create-key-submit">
              {busy ? "Creating…" : "Create key"}
            </Button>
            <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Single API-key row ─── */

function ApiKeyRow({ apiKey, name, mcpUrl, onDelete, isOnlyKey }) {
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCfg, setCopiedCfg] = useState(false);

  const cfg = buildPersonalizedMcpConfig(mcpUrl, apiKey);
  const cfgStr = JSON.stringify(cfg, null, 2);

  const masked = `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`;

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "key") {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 1600);
      } else {
        setCopiedCfg(true);
        setTimeout(() => setCopiedCfg(false), 1600);
      }
    } catch { /* noop */ }
  };

  return (
    <Card className="apikey-row" data-testid={`apikey-row-${apiKey.slice(0, 8)}`}>
      <div className="apikey-head">
        <div className="apikey-name-wrap">
          <span className="section-label" style={{ margin: 0 }}>KEY NAME</span>
          <div className="apikey-name">{name || "unnamed"}</div>
        </div>
        <button
          type="button"
          className="btn btn-secondary apikey-revoke"
          onClick={() => onDelete(apiKey)}
          title="Revoke this key"
          disabled={isOnlyKey}
          data-testid={`revoke-${apiKey.slice(0, 8)}`}
        >
          {isOnlyKey ? "Required" : "Revoke"}
        </button>
      </div>

      <div className="apikey-value-row">
        <code className="apikey-value">{showKey ? apiKey : masked}</code>
        <button
          type="button"
          className="btn btn-secondary apikey-btn"
          onClick={() => setShowKey((v) => !v)}
          data-testid={`toggle-${apiKey.slice(0, 8)}`}
        >
          {showKey ? "Hide" : "Reveal"}
        </button>
        <button
          type="button"
          className="btn btn-secondary apikey-btn"
          onClick={() => copy(apiKey, "key")}
          data-testid={`copy-key-${apiKey.slice(0, 8)}`}
        >
          {copiedKey ? "✓ Copied" : "Copy key"}
        </button>
      </div>

      <div className="section-label" style={{ marginTop: "1rem" }}>MCP CONFIG · personalized</div>
      <div className="code-block">
        <pre>{cfgStr}</pre>
      </div>
      <div style={{ display: "flex", gap: ".5rem", marginTop: ".6rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => copy(cfgStr, "cfg")}
          data-testid={`copy-cfg-${apiKey.slice(0, 8)}`}
        >
          {copiedCfg ? "✓ Copied" : "📋 Copy config"}
        </button>
      </div>
    </Card>
  );
}

/* ─── Page ─── */

function FindExpert() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const [i, k] = await Promise.all([getMcpServerInfo(), listApiKeys(user.id)]);
      setInfo(i);
      setKeys(k);
    } catch (e) {
      console.error(e);
      setError("Could not load MCP server / API keys.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onCreated = (k) => {
    setKeys((prev) => [...prev, { api_key: k.api_key, name: k.name }]);
    setShowCreate(false);
  };

  const revoke = async (key) => {
    if (!user?.id) return;
    if (keys.length <= 1) {
      alert("Every profile must keep at least one active API key.");
      return;
    }
    const ok = window.confirm(
      `Revoke this API key?\n\nAny MCP client still configured with it will lose access to HumEx.`
    );
    if (!ok) return;
    try {
      await deleteApiKey(user.id, key);
      setKeys((prev) => prev.filter((r) => r.api_key !== key));
    } catch (e) {
      alert(e?.response?.data?.detail || e.message || "Revoke failed");
    }
  };

  const mcpUrl = info?.mcpUrl || "";

  return (
    <div className="humex-spa">
      <HumExHeader />
      <main className="k-main" data-testid="api-keys-page">
        <div className="page-head">
          <span className="pill-badge">PROFILE</span>
          <h1 className="page-title" style={{ marginTop: ".4rem" }}>
            API key management
          </h1>
          <p className="page-sub">
            Every profile keeps at least one required HumEx key active. Use this
            page to manage your default key and any extra keys for Cursor,
            Claude Desktop, VS Code, or CI runners.
          </p>

          <div className="server-status-row" data-testid="server-status">
            <span
              className={`status-dot ${info?.connected ? "status-dot-green" : "status-dot-amber"}`}
            />
            <span className="mono-label">
              {loading
                ? "checking server…"
                : info?.connected
                ? `HumEx Workspace MCP · live · ${info.toolNames.length} tools`
                : "MCP server unreachable"}
            </span>
            {info?.mcpUrl && (
              <span className="mono-label dim">· {info.mcpUrl}</span>
            )}
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => navigate("/expert/profile")} data-testid="back-to-profile-btn">
              ← Back to profile
            </Button>
            <Button variant="primary" onClick={() => setShowCreate(true)} data-testid="new-key-btn">
              + New API key
            </Button>
            <Button variant="secondary" onClick={() => navigate("/expert/jobs")} data-testid="apikey-page-browse-jobs-btn">
              Browse jobs →
            </Button>
          </div>
        </div>

        {error && (
          <Card className="" data-testid="apikey-error">
            <p style={{ color: "#b91c1c" }}>{error}</p>
          </Card>
        )}

        {loading && keys.length === 0 && (
          <p className="page-sub">Loading your keys…</p>
        )}

        {!loading && keys.length === 0 && (
          <Card className="" data-testid="apikey-empty">
            <h3 className="job-name" style={{ marginBottom: ".5rem" }}>
              No keys yet
            </h3>
            <p className="page-sub" style={{ marginTop: 0 }}>
              We&apos;ll always create and keep one default key for your profile.
            </p>
          </Card>
        )}

        {!loading && keys.length === 1 && (
          <Card className="" data-testid="mandatory-key-note">
            <p className="page-sub" style={{ marginTop: 0 }}>
              Your current key is the mandatory default connection for this profile.
              Add another key before revoking it.
            </p>
          </Card>
        )}

        <div className="apikeys-list" data-testid="apikeys-list">
          {keys.map((k) => (
            <ApiKeyRow
              key={k.api_key}
              apiKey={k.api_key}
              name={k.name}
              mcpUrl={mcpUrl}
              onDelete={revoke}
              isOnlyKey={keys.length === 1}
            />
          ))}
        </div>
      </main>

      {showCreate && user?.id && (
        <CreateKeyModal
          uid={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

export default FindExpert;
