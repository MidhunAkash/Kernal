import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const RegisterPage = ({ onAuth }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setError("Please fill in name, email and password.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    onAuth({ email: trimmedEmail, name: trimmedName });
    navigate("/");
  };

  return (
    <div className="auth-page" data-testid="register-page">
      <div className="auth-gradient" aria-hidden="true" />
      <div className="auth-decor" aria-hidden="true" />

      <div className="auth-container">
        <div className="auth-brand" data-testid="auth-brand">
          KERNEL
        </div>

        <h1 className="auth-heading">
          Create your
          <br />
          account.
        </h1>
        <p className="auth-subtitle">
          Spin up your Kernel workspace and start solving in seconds.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-name">
              FULL NAME
            </label>
            <input
              id="reg-name"
              type="text"
              className="auth-input"
              placeholder="Ada Lovelace"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              autoComplete="name"
              data-testid="register-name-input"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">
              EMAIL ADDRESS
            </label>
            <input
              id="reg-email"
              type="email"
              className="auth-input"
              placeholder="name@kernel.io"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              autoComplete="email"
              data-testid="register-email-input"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">
              PASSWORD
            </label>
            <input
              id="reg-password"
              type="password"
              className="auth-input"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              autoComplete="new-password"
              data-testid="register-password-input"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-confirm">
              CONFIRM PASSWORD
            </label>
            <input
              id="reg-confirm"
              type="password"
              className="auth-input"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (error) setError("");
              }}
              autoComplete="new-password"
              data-testid="register-confirm-input"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert" data-testid="register-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            data-testid="register-submit"
          >
            CREATE ACCOUNT
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-switch-link" data-testid="go-login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
