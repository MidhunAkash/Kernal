import React, { useEffect, useState, useCallback, useRef } from "react";
import "@/App.css";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/* ================================================================
   Tabs: Dashboard | Sessions | Console | Events
   ================================================================ */

function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="shell" data-testid="app-root">
      <header className="hdr" data-testid="app-header">
        <h1 className="mono">MCP Tunnel</h1>
        <span className="tag">supabase&nbsp;realtime</span>
      </header>

      <nav className="tab-bar" data-testid="tab-bar">
        {["dashboard", "sessions", "console", "events"].map((t) => (
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
      {tab === "sessions" && <SessionsTab />}
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
  const [setupSql, setSetupSql] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeInfo, setActiveInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [h, s, a] = await Promise.all([
        api.health().catch(() => null),
        api.setupSql().catch(() => null),
        api.activeSessions().catch(() => null),
      ]);
      setHealth(h);
      setSetupSql(s);
      setActiveInfo(a);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copySql = () => {
    if (setupSql?.sql) {
      navigator.clipboard.writeText(setupSql.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <p className="mono dim">loading...</p>;

  const needsTable = health?.supabase_connected && !health?.table_ready;

  return (
    <>
      <section className="card" data-testid="health-section">
        <h2 className="mono sm">Connection Status</h2>
        <div className="grid3">
          <StatusRow label="Backend" ok={!!health} />
          <StatusRow label="Supabase" ok={health?.supabase_connected} />
          <StatusRow label="Tables" ok={health?.table_ready} />
          <StatusRow label="Realtime" ok={activeInfo?.realtime_active} />
        </div>
        {health?.message && <p className="mono dim mt">{health.message}</p>}
        {activeInfo && (
          <p className="mono dim mt">
            Client A ID: <span className="accent">{activeInfo.client_id}</span>
            {" · "}Active sessions: {activeInfo.active_sessions?.length || 0}
          </p>
        )}
      </section>

      {needsTable && setupSql && (
        <section className="card warn-card" data-testid="setup-sql-section">
          <h2 className="mono sm">Setup Required</h2>
          <p className="dim" style={{ fontSize: ".82rem" }}>
            Run this SQL in Supabase Dashboard &gt; SQL Editor:
          </p>
          <pre className="sql-block">{setupSql.sql}</pre>
          <button className="btn" onClick={copySql}>
            {copied ? "copied!" : "copy sql"}
          </button>
        </section>
      )}
    </>
  );
}

/* ───────────────── SESSIONS TAB ───────────────── */

function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [name, setName] = useState("");
  const [activeSessions, setActiveSessions] = useState([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        api.listSessions().catch(() => []),
        api.activeSessions().catch(() => ({ active_sessions: [] })),
      ]);
      setSessions(Array.isArray(s) ? s : []);
      setActiveSessions(a?.active_sessions || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.createSession(name);
      setName("");
      setMsg("Session created");
      load();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Failed to create session");
    }
  };

  const activate = async (id) => {
    try {
      const res = await api.activateSession(id);
      setMsg(`Activated — Channel: ${res.channel}`);
      load();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Activation failed");
    }
  };

  const deactivate = async (id) => {
    try {
      await api.deactivateSession(id);
      setMsg("Deactivated");
      load();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Deactivation failed");
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteSession(id);
      setMsg("Session deleted");
      load();
    } catch {
      setMsg("Delete failed");
    }
  };

  return (
    <>
      <section className="card">
        <h2 className="mono sm">Create Session</h2>
        <form onSubmit={create} className="form-row">
          <input
            data-testid="input-session-name"
            className="inp"
            placeholder="session name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" type="submit" data-testid="btn-create-session">create</button>
        </form>
        {msg && <p className="mono dim mt">{msg}</p>}
      </section>

      <section className="card">
        <h2 className="mono sm">Sessions <span className="dim">({sessions.length})</span></h2>
        {sessions.length === 0 ? (
          <p className="mono dim">No sessions yet</p>
        ) : (
          <ul className="client-list">
            {sessions.map((s) => {
              const isActive = activeSessions.includes(s.id);
              return (
                <li key={s.id} className="client-row" data-testid={`session-${s.id}`}>
                  <div style={{ flex: 1 }}>
                    <span className="mono">{s.name}</span>
                    <span className={`badge ${isActive ? "registered" : ""}`}>
                      {isActive ? "ACTIVE" : s.status}
                    </span>
                    <br />
                    <span className="dim" style={{ fontSize: ".72rem" }}>
                      id: {s.id}
                    </span>
                  </div>
                  <div className="btn-group">
                    {!isActive ? (
                      <button className="btn-sm" onClick={() => activate(s.id)}>
                        activate
                      </button>
                    ) : (
                      <button className="btn-sm" onClick={() => deactivate(s.id)}>
                        deactivate
                      </button>
                    )}
                    <button className="btn-sm danger" onClick={() => remove(s.id)}>
                      delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
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
  const channelRef = useRef(null);
  const clientId = useRef(`client-b-${Math.random().toString(36).slice(2, 10)}`);

  // Load tool schemas
  useEffect(() => {
    api.listTools().then((d) => setTools(d.tools || {})).catch(() => {});
  }, []);

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
  // tool-response
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
