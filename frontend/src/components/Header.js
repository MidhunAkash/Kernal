import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const isAuthed = typeof window !== 'undefined' && localStorage.getItem('kernel_auth') === 'true';

  const handleLogout = () => {
    localStorage.removeItem('kernel_auth');
    localStorage.removeItem('kernel_user');
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="logo" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <span className="logo-text">Kernel</span>
          <span className="logo-dot" />
        </div>
        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            Expert
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            Jobs
          </NavLink>
          {isAuthed ? (
            <button onClick={handleLogout} className="nav-link nav-link-btn">Logout</button>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
