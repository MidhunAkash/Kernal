import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isAuthed =
    typeof window !== 'undefined' && localStorage.getItem('kernel_auth') === 'true';
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('kernel_user') : '';
  const userName = typeof window !== 'undefined' ? localStorage.getItem('kernel_name') : '';
  const initial = (userName || userEmail || '?').charAt(0).toUpperCase();

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('kernel_auth');
    localStorage.removeItem('kernel_user');
    localStorage.removeItem('kernel_name');
    setMenuOpen(false);
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
            <div className="profile-wrap" ref={menuRef}>
              <button
                type="button"
                className={`profile-trigger ${menuOpen ? 'profile-trigger-open' : ''}`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="avatar">{initial}</span>
                <span className="profile-caret" aria-hidden="true">▾</span>
              </button>
              {menuOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-header">
                    <div className="avatar avatar-lg">{initial}</div>
                    <div className="profile-meta">
                      {userName && <div className="profile-name">{userName}</div>}
                      <div className="profile-email">{userEmail || 'Signed in'}</div>
                    </div>
                  </div>
                  <div className="profile-menu-divider" />
                  <button
                    className="profile-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/');
                    }}
                    role="menuitem"
                  >
                    Find an Expert
                  </button>
                  <button
                    className="profile-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/jobs');
                    }}
                    role="menuitem"
                  >
                    Browse Jobs
                  </button>
                  <div className="profile-menu-divider" />
                  <button
                    className="profile-menu-item profile-menu-danger"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
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
