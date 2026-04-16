import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    localStorage.setItem('kernel_auth', 'true');
    localStorage.setItem('kernel_user', email);
    localStorage.setItem('kernel_name', name);
    navigate('/');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-gradient" />
      <div className="auth-inner">
        <div className="auth-brand">KERNEL</div>
        <h1 className="auth-title">Join the<br/>Work-OS.</h1>
        <p className="auth-sub">Create an account to start solving jobs and earn points.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="name">FULL NAME</label>
          <input
            id="name"
            type="text"
            className="auth-input"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="auth-label" htmlFor="email">EMAIL ADDRESS</label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="name@kernel.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="auth-label" htmlFor="password">PASSWORD</label>
          <input
            id="password"
            type="password"
            className="auth-input"
            placeholder="At least 4 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="auth-label" htmlFor="confirm">CONFIRM PASSWORD</label>
          <input
            id="confirm"
            type="password"
            className="auth-input"
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <div className="auth-error">{error}</div>}

          <Button variant="primary" type="submit" className="auth-submit">CREATE ACCOUNT</Button>
        </form>

        <div className="auth-bottom">
          Already have an account? <Link to="/login" className="auth-link">Login</Link>
        </div>
      </div>
      <div className="auth-corner" />
    </div>
  );
};

export default Register;
