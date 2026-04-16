import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultRole = params.get("role") === "expert" ? "expert" : "target";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await signUp(email, password, role);
      if (err) {
        setError(err.message);
        return;
      }
      // Supabase may require email confirmation depending on project settings.
      // If session is available immediately, redirect; otherwise show confirmation message.
      if (data?.session) {
        navigate(role === "expert" ? "/onboard" : "/post-job", { replace: true });
      } else {
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="shell" style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", justifyContent: "center" }}>
        <div className="hdr">
          <Link to="/" style={{ fontWeight: 700, textDecoration: "none", color: "var(--text)" }}>
            Kernal
          </Link>
        </div>
        <div className="card" style={{ textAlign: "center", gap: "1rem" }}>
          <span style={{ fontSize: "1.75rem" }}>📬</span>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Check your email</h2>
          <p className="dim" style={{ fontSize: ".9rem", lineHeight: 1.6 }}>
            We sent a confirmation link to <strong style={{ color: "var(--text)" }}>{email}</strong>.
            Click it to activate your account, then sign in.
          </p>
          <Link to="/login" className="btn" style={{ justifyContent: "center" }}>
            Go to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="shell"
      style={{ maxWidth: "420px", margin: "0 auto", minHeight: "100vh", justifyContent: "center" }}
    >
      <div className="hdr">
        <Link to="/" style={{ fontWeight: 700, textDecoration: "none", color: "var(--text)" }}>
          Kernal
        </Link>
      </div>

      <div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: ".3rem" }}>Create account</h1>
        <p className="dim" style={{ fontSize: ".88rem" }}>
          Join Kernal — it's free.
        </p>
      </div>

      <form className="card" onSubmit={submit} style={{ gap: "1rem" }}>
        {/* Role picker */}
        <div>
          <span className="sm dim" style={{ display: "block", marginBottom: ".5rem" }}>
            I am a…
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
            {[
              { value: "target", label: "Target", sub: "I need help" },
              { value: "expert", label: "Expert", sub: "I can fix it" },
            ].map(({ value, label, sub }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                style={{
                  background: role === value ? "rgba(59,240,138,.08)" : "var(--bg)",
                  border: `1px solid ${role === value ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  color: "var(--text)",
                  padding: ".6rem .75rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color .15s, background .15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{label}</div>
                <div className="dim" style={{ fontSize: ".78rem" }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>

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
            placeholder="min. 6 characters"
            style={inputStyle}
            required
            autoComplete="new-password"
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
          {loading ? "Creating account…" : "Create account →"}
        </button>
      </form>

      <p className="dim" style={{ fontSize: ".88rem", textAlign: "center" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
