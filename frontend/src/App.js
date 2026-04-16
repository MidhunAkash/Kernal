import React, { useEffect, useState } from "react";
import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
} from "react-router-dom";
import { Sun, Moon } from "lucide-react";

import FindExpert from "./pages/FindExpert";
import JobsListing from "./pages/JobsListing";
import JobDetails from "./pages/JobDetails";

const THEME_KEY = "vibecon-theme";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
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

const Header = ({ theme, onToggleTheme }) => {
  return (
    <header className="site-header" data-testid="site-header">
      <div className="header-inner">
        <Link to="/" className="logo" data-testid="logo-link">
          <span className="logo-text">VibeCon</span>
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
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <main
      key={location.pathname}
      className="site-main page-fade"
      data-testid="site-main"
    >
      <Routes location={location}>
        <Route path="/" element={<FindExpert />} />
        <Route path="/jobs" element={<JobsListing />} />
        <Route path="/jobs/:jobId" element={<JobDetails />} />
      </Routes>
    </main>
  );
};

function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // ignore storage errors (e.g. private mode)
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <div className="App">
      <BrowserRouter>
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <AnimatedRoutes />
      </BrowserRouter>
    </div>
  );
}

export default App;
