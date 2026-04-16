import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const LoginPage = ({ onAuth }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    const name = trimmedEmail.split("@")[0];
    onAuth({ email: trimmedEmail, name });
    navigate("/");
  };

  return (
    <div className="auth-page" data-testid="login-page">
      <div className="auth-gradient" aria-hidden="true" />
      <div className="auth-decor" aria-hidden="true" />

      <div className="auth-container">
        <div className="auth-brand" data-testid="auth-brand">
          KERNEL
        </div>

        <h1 className="auth-heading">
          Access the
          <br />
          Work-OS.
        </h1>
        <p className="auth-subtitle">
          Enter your credentials to continue to your workspace.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">
              EMAIL ADDRESS
            </label>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              placeholder="name@kernel.io"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              autoComplete="email"
              data-testid="login-email-input"
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="login-password">
                PASSWORD
              </label>
              <button
                type="button"
                className="auth-label auth-link-btn"
                data-testid="login-forgot"
                onClick={() =>
                  alert("Password reset is not available in this demo.")
                }
              >
                FORGOT?
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              autoComplete="current-password"
              data-testid="login-password-input"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert" data-testid="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            data-testid="login-submit"
          >
            LOGIN
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="auth-switch-link" data-testid="go-register">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
