import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import "@/App.css";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/* ── clipboard helper with fallback ── */
function copyText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text) {
  return new Promise((resolve) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
    resolve();
  });
}

/* ================================================================
   Tabs: Dashboard | Connections | Console | Events
   ================================================================ */

function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="shell" data-testid="app-root">
      <header className="hdr" data-testid="app-header">
        <h1 className="mono">MCP Tunnel</h1>
        <span className="tag">supabase&nbsp;realtime</span>
        <Link to="/" className="btn-sm nav-link" style={{ marginLeft: "auto" }}>
          ← console
        </Link>
      </header>

      <nav className="tab-bar" data-testid="tab-bar">
        {["dashboard", "connections", "console", "events"].map((t) => (
          <button
            key={t}
            data-testid={`tab-${t}`}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "connections" && <ConnectionsTab />}
      {tab === "console" && <ConsoleTab />}
      {tab === "events" && <EventsTab />}

      <footer className="ft mono dim" data-testid="app-footer">
        <p>MCP Supabase Tunnel — Client A target + Client B console</p>
      </footer>
    </div>
  );
}

/* ───────────────── DASHBOARD TAB ───────────────── */

function DashboardTab() {
  const [health, setHealth] = useState(null);
  const [connections, setConnections] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [h, c] = await Promise.all([
        api.health().catch(() => null),
        api.mcpConnections().catch(() => null),
      ]);
      setHealth(h);
      setConnections(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="mono dim">loading...</p>;

  const clients = connections?.clients || [];
  const targets = clients.filter((c) => c.role === "target");
  const executors = clients.filter((c) => c.role === "executor");

  return (
    <>
      <section className="card" data-testid="health-section">
        <h2 className="mono sm">Connection Status</h2>
        <div className="grid3">
          <StatusRow label="Backend" ok={!!health} />
          <StatusRow label="Supabase" ok={health?.supabase_connected} />
          <StatusRow label="Tables" ok={health?.table_ready} />
        </div>
        {connections && (
          <p className="mono dim mt">
            Server ID: <span className="accent">{connections.server_client_id}</span>
          </p>
        )}
      </section>

      {clients.length > 0 && (
        <section className="card">
          <h2 className="mono sm">Active Tunnel Pairs</h2>
          {targets.map((t) => {
            const linked = executors.filter((e) => e.session_id === t.session_id);
            return (
              <div key={t.id} className="tunnel-pair" data-testid={`pair-${t.id}`}>
                <div className="pair-client">
                  <span className={`dot ${t.realtime_active ? "green" : "red"}`} />
                  <span className="mono">{t.name}</span>
                  <span className="badge target-badge">CLIENT A</span>
                  <span className={`badge ${t.realtime_active ? "res" : ""}`}>
                    {t.realtime_active ? "CONNECTED" : "OFFLINE"}
                  </span>
                </div>
                <div className="pair-arrow">⇄</div>
                {linked.length > 0 ? linked.map((e) => (
                  <div key={e.id} className="pair-client">
                    <span className={`dot ${e.realtime_active ? "green" : "red"}`} />
                    <span className="mono">{e.name}</span>
                    <span className="badge exec-badge">CLIENT B</span>
                    <span className={`badge ${e.realtime_active ? "res" : ""}`}>
                      {e.realtime_active ? "CONNECTED" : "OFFLINE"}
                    </span>
                  </div>
                )) : (
                  <div className="pair-client dim">
                    <span className="dot red" />
                    <span className="mono">No executor connected</span>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {clients.length === 0 && (
        <section className="card">
          <p className="mono dim">No MCP clients registered yet. Go to the <strong>Connections</strong> tab to add clients.</p>
        </section>
      )}
    </>
  );
}

/* ───────────────── CONNECTIONS TAB ───────────────── */

function ConnectionsTab() {
  const [connections, setConnections] = useState(null);
  const [showAddA, setShowAddA] = useState(false);
  const [showAddB, setShowAddB] = useState(false);
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [targetId, setTargetId] = useState("");
  const [msg, setMsg] = useState("");
  const [newConfig, setNewConfig] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await api.mcpConnections();
      setConnections(c);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const clients = connections?.clients || [];
  const targets = clients.filter((c) => c.role === "target");

  const addClientA = async (e) => {
    e.preventDefault();
    if (!nameA.trim()) return;
    try {
      const res = await api.mcpAdd(nameA, "target");
      setNewConfig(res);
      setNameA("");
      setShowAddA(false);
      setMsg("Client A created! Copy the MCP configuration below.");
      load();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Failed to create Client A");
    }
  };

  const addClientB = async (e) => {
    e.preventDefault();
    if (!nameB.trim() || !targetId) return;
    try {
      const res = await api.mcpAdd(nameB, "executor", targetId);
      setNewConfig(res);
      setNameB("");
      setTargetId("");
      setShowAddB(false);
      setMsg("Client B created! Copy the MCP configuration below.");
      load();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Failed to create Client B");
    }
  };

  const remove = async (id) => {
    try {
      await api.mcpDelete(id);
      setMsg("Client removed");
      if (newConfig?.id === id) setNewConfig(null);
      load();
    } catch {
      setMsg("Delete failed");
    }
  };

  const copyConfig = (config) => {
    copyText(JSON.stringify(config, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Action Buttons */}
      <section className="card">
        <h2 className="mono sm">Register MCP Clients</h2>
        <div className="btn-group" style={{ marginBottom: ".6rem" }}>
          <button
            className="btn add-a-btn"
            onClick={() => { setShowAddA(!showAddA); setShowAddB(false); setNewConfig(null); }}
            data-testid="btn-add-client-a"
          >
            + Add Client A (Target)
          </button>
          <button
            className="btn add-b-btn"
            onClick={() => { setShowAddB(!showAddB); setShowAddA(false); setNewConfig(null); }}
            data-testid="btn-add-client-b"
            disabled={targets.length === 0}
            title={targets.length === 0 ? "Create a Client A first" : ""}
          >
            + Add Client B (Executor)
          </button>
        </div>

        {/* Add Client A Form */}
        {showAddA && (
          <form onSubmit={addClientA} className="add-form" data-testid="form-add-a">
            <p className="mono dim" style={{ fontSize: ".78rem", marginBottom: ".4rem" }}>
              Client A is the <strong>target</strong> — it hosts the workspace and executes file tools.
            </p>
            <div className="form-row">
              <input
                className="inp"
                placeholder="Client A name (e.g., My Dev Server)"
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                data-testid="input-name-a"
                autoFocus
              />
              <button className="btn" type="submit" data-testid="btn-create-a">create</button>
            </div>
          </form>
        )}

        {/* Add Client B Form */}
        {showAddB && (
          <form onSubmit={addClientB} className="add-form" data-testid="form-add-b">
            <p className="mono dim" style={{ fontSize: ".78rem", marginBottom: ".4rem" }}>
              Client B is the <strong>executor</strong> — it sends tool requests to a target Client A.
            </p>
            <div className="form-row">
              <input
                className="inp"
                placeholder="Client B name (e.g., AI Agent)"
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                data-testid="input-name-b"
                autoFocus
              />
              <select
                className="inp"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                data-testid="select-target"
              >
                <option value="">-- select target Client A --</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.realtime_active ? "connected" : "offline"})
                  </option>
                ))}
              </select>
              <button className="btn" type="submit" data-testid="btn-create-b">create</button>
            </div>
          </form>
        )}

        {msg && <p className="mono dim mt">{msg}</p>}
      </section>

      {/* Newly Created Config */}
      {newConfig && (
        <section className="card config-card" data-testid="new-config">
          <h2 className="mono sm">
            MCP Configuration — {newConfig.name}
            <span className={`badge ${newConfig.role === "target" ? "target-badge" : "exec-badge"}`} style={{ marginLeft: ".5rem" }}>
              {newConfig.role === "target" ? "CLIENT A" : "CLIENT B"}
            </span>
          </h2>
          <div className="config-meta">
            <p className="mono dim">
              <strong>API Key:</strong> <code className="accent">{newConfig.api_key}</code>
            </p>
            <p className="mono dim">
              <strong>Session ID:</strong> <code>{newConfig.session_id}</code>
            </p>
            <p className="mono dim">
              <strong>Channel:</strong> <code>{newConfig.channel_name}</code>
            </p>
          </div>
          <pre className="config-json" data-testid="config-json">
            {JSON.stringify(newConfig.config, null, 2)}
          </pre>
          <button className="btn" onClick={() => copyConfig(newConfig.config)} data-testid="btn-copy-config">
            {copied ? "copied!" : "copy config"}
          </button>
        </section>
      )}

      {/* Registered Clients */}
      <section className="card">
        <h2 className="mono sm">
          Registered Clients <span className="dim">({clients.length})</span>
        </h2>
        {clients.length === 0 ? (
          <p className="mono dim">No clients registered yet</p>
        ) : (
          <ul className="client-list">
            {clients.map((c) => (
              <ClientCard key={c.id} client={c} onDelete={remove} onCopy={copyConfig} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ClientCard({ client, onDelete, onCopy }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    copyText(JSON.stringify(client.config, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <li className="client-row" data-testid={`client-${client.id}`}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".4rem", flexWrap: "wrap" }}>
          <span className={`dot ${client.realtime_active ? "green" : "red"}`} />
          <span className="mono">{client.name}</span>
          <span className={`badge ${client.role === "target" ? "target-badge" : "exec-badge"}`}>
            {client.role === "target" ? "CLIENT A" : "CLIENT B"}
          </span>
          <span className={`badge ${client.realtime_active ? "res" : ""}`}>
            {client.realtime_active ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
        <div className="mono dim" style={{ fontSize: ".68rem", marginTop: ".2rem" }}>
          API Key: <code className="accent">{client.api_key.slice(0, 20)}...</code>
          {" · "}Session: <code>{client.session_id.slice(0, 8)}...</code>
        </div>
      </div>
      <div className="btn-group">
        <button className="btn-sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? "hide" : "config"}
        </button>
        <button className="btn-sm" onClick={copy}>
          {copied ? "copied!" : "copy"}
        </button>
        <button className="btn-sm danger" onClick={() => onDelete(client.id)}>
          delete
        </button>
      </div>
      {expanded && (
        <pre className="config-json" style={{ marginTop: ".5rem", width: "100%" }}>
          {JSON.stringify(client.config, null, 2)}
        </pre>
      )}
    </li>
  );
}

/* ───────────────── CONSOLE TAB (Client B) ───────────────── */

function ConsoleTab() {
  const [sessionId, setSessionId] = useState("");
  const [connected, setConnected] = useState(false);
  const [tools, setTools] = useState({});
  const [selectedTool, setSelectedTool] = useState("");
  const [args, setArgs] = useState({});
  const [responses, setResponses] = useState([]);
  const [sending, setSending] = useState(false);
  const [connections, setConnections] = useState([]);
  const channelRef = useRef(null);
  const clientId = useRef(`client-b-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    api.listTools().then((d) => setTools(d.tools || {})).catch(() => {});
    api.mcpConnections().then((d) => setConnections(d.clients || [])).catch(() => {});
  }, []);

  const executors = connections.filter((c) => c.role === "executor");

  const connect = useCallback(() => {
    if (!sessionId.trim()) return;
    const channelName = `mcp-session-${sessionId}`;
    const ch = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });

    ch.on("broadcast", { event: "tool-response" }, ({ payload }) => {
      setResponses((prev) => [{ ...payload, _ts: Date.now() }, ...prev].slice(0, 100));
    });

    ch.on("broadcast", { event: "client-joined" }, ({ payload }) => {
      setResponses((prev) => [
        { _type: "system", message: `Client joined: ${payload.client_id} (${payload.role})`, _ts: Date.now() },
        ...prev,
      ]);
    });

    ch.on("broadcast", { event: "client-left" }, ({ payload }) => {
      setResponses((prev) => [
        { _type: "system", message: `Client left: ${payload.client_id}`, _ts: Date.now() },
        ...prev,
      ]);
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        ch.send({
          type: "broadcast",
          event: "client-joined",
          payload: { client_id: clientId.current, role: "executor", ts: new Date().toISOString() },
        });
      }
    });

    channelRef.current = ch;
  }, [sessionId]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "client-left",
        payload: { client_id: clientId.current, ts: new Date().toISOString() },
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setConnected(false);
  }, []);

  const sendToolRequest = async () => {
    if (!channelRef.current || !selectedTool) return;
    setSending(true);
    const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const payload = {
      session_id: sessionId,
      request_id: requestId,
      tool: selectedTool,
      arguments: args,
      from_client: clientId.current,
      ts: new Date().toISOString(),
    };
    try {
      await channelRef.current.send({
        type: "broadcast",
        event: "tool-request",
        payload,
      });
      setResponses((prev) => [
        { _type: "request", ...payload, _ts: Date.now() },
        ...prev,
      ]);
    } catch (err) {
      setResponses((prev) => [
        { _type: "error", message: `Send failed: ${err.message}`, _ts: Date.now() },
        ...prev,
      ]);
    }
    setSending(false);
  };

  const toolSchema = tools[selectedTool];

  return (
    <>
      {/* Quick-connect from registered executors */}
      {!connected && executors.length > 0 && (
        <section className="card">
          <h2 className="mono sm">Quick Connect</h2>
          <p className="mono dim" style={{ fontSize: ".78rem" }}>Select a registered Client B to connect with its session:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginTop: ".4rem" }}>
            {executors.map((e) => (
              <button
                key={e.id}
                className="btn-sm"
                onClick={() => { setSessionId(e.session_id); }}
              >
                {e.name} → {e.session_id.slice(0, 8)}...
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Connection */}
      <section className="card">
        <h2 className="mono sm">Client B Console</h2>
        <div className="form-row">
          <input
            data-testid="input-console-session"
            className="inp"
            placeholder="session id"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={connected}
          />
          {!connected ? (
            <button className="btn" onClick={connect} data-testid="btn-connect">
              connect
            </button>
          ) : (
            <button className="btn danger-btn" onClick={disconnect} data-testid="btn-disconnect">
              disconnect
            </button>
          )}
        </div>
        {connected && (
          <p className="mono dim mt">
            Connected as <span className="accent">{clientId.current}</span> on{" "}
            <span className="accent">mcp-session-{sessionId}</span>
          </p>
        )}
      </section>

      {/* Tool Form */}
      {connected && (
        <section className="card">
          <h2 className="mono sm">Send Tool Request</h2>
          <select
            className="inp"
            value={selectedTool}
            onChange={(e) => {
              setSelectedTool(e.target.value);
              setArgs({});
            }}
            data-testid="select-tool"
          >
            <option value="">-- select tool --</option>
            {Object.entries(tools).map(([name, schema]) => (
              <option key={name} value={name}>
                {name} — {schema.description}
              </option>
            ))}
          </select>

          {toolSchema && (
            <div className="tool-args">
              {toolSchema.args.map((arg) => (
                <div key={arg} className="form-row" style={{ marginTop: ".4rem" }}>
                  <label className="mono dim" style={{ minWidth: 90, fontSize: ".78rem" }}>{arg}</label>
                  {arg === "content" ? (
                    <textarea
                      className="inp"
                      rows={4}
                      placeholder={arg}
                      value={args[arg] || ""}
                      onChange={(e) => setArgs((prev) => ({ ...prev, [arg]: e.target.value }))}
                      data-testid={`arg-${arg}`}
                    />
                  ) : (
                    <input
                      className="inp"
                      placeholder={arg}
                      value={args[arg] || ""}
                      onChange={(e) => setArgs((prev) => ({ ...prev, [arg]: e.target.value }))}
                      data-testid={`arg-${arg}`}
                    />
                  )}
                </div>
              ))}
              <button
                className="btn"
                onClick={sendToolRequest}
                disabled={sending}
                style={{ marginTop: ".6rem" }}
                data-testid="btn-send-tool"
              >
                {sending ? "sending..." : "send request"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Response Log */}
      <section className="card">
        <h2 className="mono sm">Response Log <span className="dim">({responses.length})</span></h2>
        {responses.length === 0 ? (
          <p className="mono dim">No events yet</p>
        ) : (
          <div className="event-log" data-testid="response-log">
            {responses.map((r, i) => (
              <EventRow key={r._ts + "-" + i} event={r} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ───────────────── EVENTS TAB ───────────────── */

function EventsTab() {
  const [events, setEvents] = useState([]);
  const [sessionFilter, setSessionFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.listEvents(sessionFilter || undefined, 100);
      setEvents(d.events || []);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, [sessionFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="card">
      <h2 className="mono sm">Persisted Events</h2>
      <div className="form-row">
        <input
          className="inp"
          placeholder="filter by session id (optional)"
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
        />
        <button className="btn" onClick={load}>
          {loading ? "loading..." : "refresh"}
        </button>
      </div>
      {events.length === 0 ? (
        <p className="mono dim mt">No events found</p>
      ) : (
        <div className="event-log">
          {events.map((e, i) => (
            <div key={e.id || i} className="event-item">
              <div className="event-hdr">
                <span className={`badge ${e.event_type === "tool-request" ? "req" : "res"}`}>
                  {e.event_type}
                </span>
                <span className="mono">{e.tool_name}</span>
                <span className="dim" style={{ fontSize: ".68rem", marginLeft: "auto" }}>
                  {e.created_at?.slice(0, 19)}
                </span>
              </div>
              <pre className="event-json">{JSON.stringify(e.result || e.arguments, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────────────── Shared Components ───────────────── */

function StatusRow({ label, ok }) {
  return (
    <div className="status-row">
      <span className={`dot ${ok ? "green" : "red"}`} />
      <span className="mono">{label}</span>
    </div>
  );
}

function EventRow({ event }) {
  if (event._type === "system") {
    return (
      <div className="event-item system">
        <span className="mono dim">{event.message}</span>
      </div>
    );
  }
  if (event._type === "request") {
    return (
      <div className="event-item outgoing">
        <div className="event-hdr">
          <span className="badge req">REQUEST</span>
          <span className="mono">{event.tool}</span>
        </div>
        <pre className="event-json">{JSON.stringify(event.arguments, null, 2)}</pre>
      </div>
    );
  }
  if (event._type === "error") {
    return (
      <div className="event-item error-ev">
        <span className="mono" style={{ color: "var(--danger)" }}>{event.message}</span>
      </div>
    );
  }
  return (
    <div className="event-item incoming">
      <div className="event-hdr">
        <span className={`badge ${event.status === "success" ? "res" : "err"}`}>
          {event.status === "success" ? "RESPONSE" : "ERROR"}
        </span>
        <span className="mono">{event.tool}</span>
        <span className="dim" style={{ fontSize: ".68rem", marginLeft: "auto" }}>
          from {event.from_client}
        </span>
      </div>
      <pre className="event-json">{JSON.stringify(event.result, null, 2)}</pre>
    </div>
  );
}

export default App;
