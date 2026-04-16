import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state && location.state.from) || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    localStorage.setItem('kernel_auth', 'true');
    localStorage.setItem('kernel_user', email);
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="auth-wrap">
      <div className="auth-gradient" />
      <div className="auth-inner">
        <div className="auth-brand">KERNEL</div>
        <h1 className="auth-title">Access the<br/>Work-OS.</h1>
        <p className="auth-sub">Enter your credentials to continue to your workspace.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="email">EMAIL ADDRESS</label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="name@kernel.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="auth-label-row">
            <label className="auth-label" htmlFor="password">PASSWORD</label>
            <span className="auth-forgot">FORGOT?</span>
          </div>
          <input
            id="password"
            type="password"
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="auth-error">{error}</div>}

          <Button variant="primary" type="submit" className="auth-submit">LOGIN</Button>
        </form>

        <div className="auth-bottom">
          Don&apos;t have an account? <Link to="/register" className="auth-link">Create Account</Link>
        </div>
      </div>
      <div className="auth-corner" />
    </div>
  );
};

export default Login;
