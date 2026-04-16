import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import "@/App.css";

const inputStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  padding: ".5rem .75rem",
  fontFamily: "inherit",
  fontSize: ".9rem",
  outline: "none",
  width: "100%",
  transition: "border-color .15s",
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: err } = await signIn(email, password);
      if (err) {
        setError(err.message);
        return;
      }
      const userRole = data?.user?.user_metadata?.role;
      navigate(userRole === "expert" ? "/jobs" : "/post-job", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="shell"
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        justifyContent: "center",
      }}
    >
      <div className="hdr">
        <Link
          to="/"
          style={{ fontWeight: 700, textDecoration: "none", color: "var(--text)", fontSize: "1rem" }}
        >
          Kernal
        </Link>
      </div>

      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: ".3rem" }}>Sign in</h1>
        <p className="dim" style={{ fontSize: ".88rem" }}>
          Welcome back — pick up where you left off.
        </p>
      </div>

      <form className="card" onSubmit={submit} style={{ gap: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <span className="sm dim">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
            required
            autoComplete="email"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
          <span className="sm dim">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
            required
            autoComplete="current-password"
          />
        </label>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: ".85rem", lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn"
          style={{ width: "100%", justifyContent: "center", marginTop: ".25rem" }}
        >
          {loading ? "Signing in…" : "Sign in →"}
        </button>
      </form>

      <p className="dim" style={{ fontSize: ".88rem", textAlign: "center" }}>
        No account?{" "}
        <Link to="/signup" style={{ color: "var(--accent)", textDecoration: "none" }}>
          Create one free
        </Link>
      </p>
    </div>
  );
}
