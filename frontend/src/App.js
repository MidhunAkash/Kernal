import React from "react";
import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
} from "react-router-dom";

import FindExpert from "./pages/FindExpert";
import JobsListing from "./pages/JobsListing";
import JobDetails from "./pages/JobDetails";

const Header = () => {
  return (
    <header className="site-header" data-testid="site-header">
      <div className="header-inner">
        <Link to="/" className="logo" data-testid="logo-link">
          <span className="logo-text">VibeCon</span>
          <span className="logo-dot" aria-hidden="true" />
        </Link>
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
      </div>
    </header>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Header />
        <main className="site-main">
          <Routes>
            <Route path="/" element={<FindExpert />} />
            <Route path="/jobs" element={<JobsListing />} />
            <Route path="/jobs/:jobId" element={<JobDetails />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;
