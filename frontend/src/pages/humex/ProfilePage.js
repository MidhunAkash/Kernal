import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HumExHeader from "../../components/humex/HumExHeader";
import Card from "../../components/humex/Card";
import Button from "../../components/humex/Button";
import { useAuth } from "../../lib/auth";
import { getUserPoints, listApiKeys } from "../../lib/humexApi";
import "../../humex-spa.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [keys, setKeys] = useState([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [apiKeys, rewardPoints] = await Promise.all([
          listApiKeys(user.id),
          getUserPoints(user.id),
        ]);

        if (!active) return;
        setKeys(apiKeys || []);
        setPoints(rewardPoints || 0);
      } catch (error) {
        console.error("Failed to load profile summary:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="humex-spa">
      <HumExHeader />
      <main className="k-main" data-testid="profile-page">
        <div className="page-head">
          <span className="pill-badge">PROFILE</span>
          <h1 className="page-title" style={{ marginTop: ".4rem" }}>
            Account & access
          </h1>
          <p className="page-sub">
            Manage the personal settings tied to your HumEx workspace. API key
            management now lives here.
          </p>
        </div>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Card className="apikey-row" data-testid="profile-summary-card">
            <div className="section-label" style={{ margin: 0 }}>SUMMARY</div>
            <h2 className="job-name" style={{ marginTop: ".4rem", marginBottom: ".75rem" }}>
              {user?.user_metadata?.name || user?.email?.split("@")[0] || "Your profile"}
            </h2>

            <div style={{ display: "grid", gap: ".75rem" }}>
              <div>
                <div className="mono-label dim">EMAIL</div>
                <div data-testid="profile-user-email">{user?.email || "—"}</div>
              </div>
              <div>
                <div className="mono-label dim">POINTS</div>
                <div data-testid="profile-user-points">⭐ {Number(points || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="mono-label dim">ACTIVE API KEYS</div>
                <div data-testid="profile-key-count">{loading ? "Loading…" : keys.length}</div>
              </div>
            </div>
          </Card>

          <Card className="apikey-row" data-testid="profile-api-keys-card">
            <div className="section-label" style={{ margin: 0 }}>API KEYS</div>
            <h2 className="job-name" style={{ marginTop: ".4rem", marginBottom: ".5rem" }}>
              Manage your connection keys
            </h2>
            <p className="page-sub" style={{ marginTop: 0 }}>
              Every user keeps one mandatory default key, and you can add extra
              keys for each device or MCP client.
            </p>

            <div style={{ marginTop: "1rem", display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => navigate("/expert/profile/api-keys")} data-testid="profile-api-keys-entry-button">
                Open API keys
              </Button>
              <Button variant="secondary" onClick={() => navigate("/onboarding")} data-testid="profile-edit-details-button">
                Edit profile details
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}