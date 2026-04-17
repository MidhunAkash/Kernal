import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/lib/auth";
import Button from "@/components/humex/Button";
import "@/humex.css";

export default function RoleSelect() {
  const { setRole, role: existingRole } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const defaultName = user?.user_metadata?.name || user?.email?.split("@")[0] || "";
  const [name, setName] = useState(defaultName);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    // If a role was already chosen, jump straight to dashboard
    if (existingRole === "CLIENT_1") navigate("/dashboard/poster", { replace: true });
    else if (existingRole === "CLIENT_2") navigate("/dashboard/solver", { replace: true });
  }, [existingRole, navigate]);

  const submit = (e) => {
    e.preventDefault();
    if (!picked || !name.trim()) return;
    setRole(picked, name.trim());
    if (picked === "CLIENT_1") navigate("/dashboard/poster", { replace: true });
    else navigate("/dashboard/solver", { replace: true });
  };

  return (
    <div className="humex-root" data-testid="role-select-root">
      <div className="k-role-wrap">
        <form className="k-role-card" onSubmit={submit}>
          <h1 className="k-page-title" data-testid="role-select-title">Welcome to HumEx</h1>
          <p className="k-page-sub">
            Pick how you want to use the MCP job marketplace.
          </p>

          <div className="k-form-group">
            <label className="k-form-label" htmlFor="role-name-input">Display name</label>
            <input
              id="role-name-input"
              type="text"
              className="k-form-input"
              placeholder="e.g. Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="role-name-input"
              required
            />
          </div>

          <div className="k-role-cards" data-testid="role-picker">
            <button
              type="button"
              className={`k-role-pick ${picked === "CLIENT_1" ? "selected" : ""}`}
              onClick={() => setPicked("CLIENT_1")}
              data-testid="role-pick-client1"
            >
              <span className="icon">📋</span>
              <div className="head">Client 1 — Job Poster</div>
              <div className="sub">Post problems, host a HumEx MCP target, review solutions and pay reward points.</div>
            </button>

            <button
              type="button"
              className={`k-role-pick ${picked === "CLIENT_2" ? "selected" : ""}`}
              onClick={() => setPicked("CLIENT_2")}
              data-testid="role-pick-client2"
            >
              <span className="icon">🔧</span>
              <div className="head">Client 2 — Job Solver</div>
              <div className="sub">Browse open jobs, accept one, attach your AI agent to the MCP, and submit the fix.</div>
            </button>
          </div>

          <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="submit"
              variant="primary"
              disabled={!picked || !name.trim()}
              testId="role-select-submit-btn"
            >
              Enter HumEx →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
