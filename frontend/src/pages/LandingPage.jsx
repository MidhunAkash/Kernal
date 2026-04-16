import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import "@/App.css";

export default function LandingPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  function handleGetStarted() {
    if (user) {
      navigate(role === "expert" ? "/jobs" : "/post-job");
    } else {
      navigate("/signup");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-.01em" }}>Kernal</span>
          <span className="tag mono">mcp tunnel</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {user ? (
            <>
              <Link
                to={role === "expert" ? "/jobs" : "/post-job"}
                className="nav-link dim"
                style={{ fontSize: ".9rem" }}
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link dim" style={{ fontSize: ".9rem" }}>
                Sign in
              </Link>
              <Link to="/signup" className="btn" style={{ fontSize: ".9rem" }}>
                Get started →
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "5rem 2rem 3rem",
          textAlign: "center",
        }}
      >
        <div
          className="tag mono"
          style={{ display: "inline-block", marginBottom: "1.5rem", fontSize: ".7rem" }}
        >
          AI-powered remote code collaboration
        </div>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "1.5rem",
            letterSpacing: "-.02em",
          }}
        >
          Get your code fixed by an{" "}
          <span style={{ color: "var(--accent)" }}>expert agent</span>
          {" "}— remotely
        </h1>
        <p
          className="dim"
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.75,
            maxWidth: "540px",
            margin: "0 auto 2.5rem",
          }}
        >
          Post a problem. An expert AI agent connects to your machine via MCP tunnel,
          reads your files, runs your code, and fixes it — live, in your actual workspace.
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn"
            onClick={() => navigate(user ? "/post-job" : "/signup?role=target")}
            style={{ fontSize: "1rem", padding: ".75rem 1.75rem" }}
          >
            I have a problem →
          </button>
          <button
            onClick={() => navigate(user ? "/jobs" : "/signup?role=expert")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: ".75rem 1.75rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--text)",
              background: "transparent",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            I'm an expert →
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 2rem 1rem" }}>
        <p
          className="sm dim"
          style={{ textAlign: "center", marginBottom: "2rem", letterSpacing: ".08em" }}
        >
          How it works
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              step: "01",
              title: "Post a job",
              body: "Describe your bug or task. We generate a one-line CLI command to run on your machine and create a shareable link.",
            },
            {
              step: "02",
              title: "Expert connects",
              body: "An expert picks up the job, connects via MCP and gets sandboxed read/write access to your workspace files.",
            },
            {
              step: "03",
              title: "Problem solved",
              body: "Watch the expert fix your code in real time. You stay in control — close the job when done.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="card">
              <span className="mono" style={{ fontSize: ".68rem", color: "var(--accent)" }}>
                {step}
              </span>
              <h3 style={{ fontSize: ".95rem", fontWeight: 600 }}>{title}</h3>
              <p className="dim" style={{ fontSize: ".88rem", lineHeight: 1.65 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roles */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem 2rem 3rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div
            className="card"
            style={{ borderColor: "var(--border)", cursor: "pointer" }}
            onClick={() => navigate(user ? "/post-job" : "/signup?role=target")}
          >
            <span className="sm dim">Target</span>
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>I need help</h3>
            <p className="dim" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
              Describe the problem, run one command, share the link. An expert will connect
              to your machine and fix it.
            </p>
            <span className="pill" style={{ alignSelf: "flex-start" }}>Post a job →</span>
          </div>
          <div
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(user ? "/jobs" : "/signup?role=expert")}
          >
            <span className="sm dim">Expert</span>
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>I can fix it</h3>
            <p className="dim" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
              Browse open jobs, connect to a target's workspace via MCP, and solve problems
              using your AI coding tools.
            </p>
            <span className="pill" style={{ alignSelf: "flex-start" }}>Browse jobs →</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="dim mono"
        style={{ textAlign: "center", padding: "2rem 1rem", fontSize: ".72rem", borderTop: "1px solid var(--border)" }}
      >
        Kernal — MCP Supabase Tunnel &nbsp;·&nbsp;{" "}
        <Link to="/ops" className="dim nav-link" style={{ fontSize: ".72rem" }}>
          ops console
        </Link>
      </footer>
    </div>
  );
}
