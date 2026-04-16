import { useEffect, useState, useCallback } from "react";
import "@/App.css";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function App() {
  const [health, setHealth] = useState(null);
  const [clients, setClients] = useState([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/health`);
      setHealth(data);
    } catch {
      setHealth({ status: "error", message: "Backend unreachable", supabase_connected: false });
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/mcp/clients`);
      setClients(data);
    } catch {
      /* ignore when DB not ready */
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchHealth(), fetchClients()]).finally(() => setLoading(false));
  }, [fetchHealth, fetchClients]);

  const register = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await axios.post(`${API}/mcp/clients`, { name, description: desc });
      setName("");
      setDesc("");
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to register");
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/mcp/clients/${id}`);
      fetchClients();
    } catch (err) {
      alert("Failed to remove client");
    }
  };

  if (loading) {
    return (
      <div className="shell" data-testid="loading-screen">
        <p className="mono dim">loading...</p>
      </div>
    );
  }

  return (
    <div className="shell" data-testid="app-root">
      {/* Header */}
      <header className="hdr" data-testid="app-header">
        <h1 className="mono">MCP Tunnel</h1>
        <span className="tag">supabase&nbsp;realtime&nbsp;poc</span>
      </header>

      {/* Health */}
      <section className="card" data-testid="health-section">
        <h2 className="mono sm">Connection Status</h2>
        <div className="grid2">
          <StatusRow label="Backend" ok={!!health} testId="status-backend" />
          <StatusRow label="Supabase PG" ok={health?.supabase_connected} testId="status-supabase" />
          <StatusRow label="DATABASE_URL" ok={health?.database_url_set} testId="status-db-url" />
          <StatusRow label="SUPABASE_URL" ok={health?.supabase_url_set} testId="status-supa-url" />
          <StatusRow label="ANON_KEY" ok={health?.supabase_anon_key_set} testId="status-anon-key" />
        </div>
        {health?.message && <p className="mono dim mt" data-testid="health-message">{health.message}</p>}
      </section>

      {/* Register */}
      <section className="card" data-testid="register-section">
        <h2 className="mono sm">Register MCP Client</h2>
        <form onSubmit={register} className="form-row">
          <input
            data-testid="input-client-name"
            className="inp"
            placeholder="client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            data-testid="input-client-desc"
            className="inp"
            placeholder="description (optional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button data-testid="btn-register" className="btn" type="submit">register</button>
        </form>
      </section>

      {/* Clients */}
      <section className="card" data-testid="clients-section">
        <h2 className="mono sm">Registered Clients <span className="dim">({clients.length})</span></h2>
        {clients.length === 0 ? (
          <p className="mono dim" data-testid="no-clients">No clients registered yet</p>
        ) : (
          <ul className="client-list" data-testid="client-list">
            {clients.map((c) => (
              <li key={c.id} className="client-row" data-testid={`client-${c.id}`}>
                <div>
                  <span className="mono">{c.name}</span>
                  {c.description && <span className="dim"> — {c.description}</span>}
                  <span className={`badge ${c.status}`}>{c.status}</span>
                </div>
                <button
                  data-testid={`btn-remove-${c.id}`}
                  className="btn-sm danger"
                  onClick={() => remove(c.id)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="ft mono dim" data-testid="app-footer">
        <p>MCP Supabase Tunnel POC — Realtime channel ready when credentials are set</p>
      </footer>
    </div>
  );
}

function StatusRow({ label, ok, testId }) {
  return (
    <div className="status-row" data-testid={testId}>
      <span className={`dot ${ok ? "green" : "red"}`} />
      <span className="mono">{label}</span>
    </div>
  );
}

export default App;
