import React from "react";
import { Link } from "react-router-dom";
import "@/App.css";

export default function HomePage() {
  return (
    <div className="shell">
      <div className="hdr">
        <h1>HumEx</h1>
        <span className="tag mono">mcp tunnel</span>
      </div>

      <p className="dim" style={{ lineHeight: 1.5 }}>
        Collaborate on code with an expert agent through MCP. The target user
        shares a job; the expert connects via the HumEx MCP and reads / edits
        files directly on the target's machine, while watching the live preview
        through a Cloudflare tunnel.
      </p>

      <div className="grid" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <Link to="/target" className="card nav-link" style={{ color: "var(--text)" }}>
          <div className="sm dim">I have a problem</div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Target → create a job</h2>
          <p className="dim" style={{ fontSize: ".9rem", lineHeight: 1.5 }}>
            Describe the bug or task, get a one-line CLI command to run on your
            machine, and share the generated link with an expert.
          </p>
          <span className="pill" style={{ alignSelf: "flex-start" }}>Client 1 →</span>
        </Link>

        <Link to="/console" className="card nav-link" style={{ color: "var(--text)" }}>
          <div className="sm dim">Host dashboard</div>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Console</h2>
          <p className="dim" style={{ fontSize: ".9rem", lineHeight: 1.5 }}>
            Manage raw clients / sessions / tunnel / events. Advanced.
          </p>
          <span className="pill" style={{ alignSelf: "flex-start" }}>admin →</span>
        </Link>
      </div>

      <div className="card">
        <div className="sm dim">Expert / executor</div>
        <p style={{ fontSize: ".9rem", lineHeight: 1.5 }}>
          If the target shared a link with you, open it directly — it looks like{" "}
          <span className="mono" style={{ color: "var(--accent)" }}>/executor?job=…&amp;key=…</span>
        </p>
      </div>

      <div className="dim mono" style={{ fontSize: ".75rem" }}>
        MCP endpoint: <code>{(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "") + "/api/mcp"}</code>
      </div>
    </div>
  );
}
