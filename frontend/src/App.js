import React, { useEffect, useState } from "react";
import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Sun, Moon, LogOut } from "lucide-react";

import FindExpert from "./pages/FindExpert";
import JobsListing from "./pages/JobsListing";
import JobDetails from "./pages/JobDetails";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const THEME_KEY = "kernel-theme";
const AUTH_KEY = "kernel-user";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const ThemeToggle = ({ theme, onToggle }) => {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="theme-toggle"
    >
      {isDark ? <Sun strokeWidth={2} /> : <Moon strokeWidth={2} />}
    </button>
  );
};

const Header = ({ theme, onToggleTheme, user, onLogout }) => {
  return (
    <header className="site-header" data-testid="site-header">
      <div className="header-inner">
        <Link to="/" className="logo" data-testid="logo-link">
          <span className="logo-text">Kernel</span>
          <span className="logo-dot" aria-hidden="true" />
        </Link>
        <div className="header-right">
          <nav className="nav-links" data-testid="nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
              data-testid="nav-expert"
            >
              Expert
            </NavLink>
            <NavLink
              to="/jobs"
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
              data-testid="nav-jobs"
            >
              Jobs
            </NavLink>
          </nav>
          {user && (
            <span
              className="header-user"
              title={user.email}
              data-testid="header-user"
            >
              {user.name}
            </span>
          )}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {user && (
            <button
              type="button"
              className="theme-toggle logout-btn"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
              data-testid="logout-btn"
            >
              <LogOut strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

const RequireAuth = ({ user, children }) => {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
};

const AnimatedRoutes = ({ user, onAuth }) => {
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";
  return (
    <main
      key={location.pathname}
      className={`site-main page-fade ${isAuthRoute ? "site-main-auth" : ""}`}
      data-testid="site-main"
    >
      <Routes location={location}>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage onAuth={onAuth} />}
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/" replace /> : <RegisterPage onAuth={onAuth} />
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth user={user}>
              <FindExpert />
            </RequireAuth>
          }
        />
        <Route
          path="/jobs"
          element={
            <RequireAuth user={user}>
              <JobsListing />
            </RequireAuth>
          }
        />
        <Route
          path="/jobs/:jobId"
          element={
            <RequireAuth user={user}>
              <JobDetails />
            </RequireAuth>
          }
        />
      </Routes>
    </main>
  );
};

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const handleAuth = (nextUser) => {
    try {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser));
    } catch (e) {
      // ignore
    }
    setUser(nextUser);
  };

  const handleLogout = () => {
    try {
      window.localStorage.removeItem(AUTH_KEY);
    } catch (e) {
      // ignore
    }
    setUser(null);
  };

  return (
    <div className="App">
      <BrowserRouter>
        {user && (
          <Header
            theme={theme}
            onToggleTheme={toggleTheme}
            user={user}
            onLogout={handleLogout}
          />
        )}
        <AnimatedRoutes user={user} onAuth={handleAuth} />
      </BrowserRouter>
    </div>
  );
}

export default App;
