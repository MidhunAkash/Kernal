import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import "@/App.css";

const SKILL_SUGGESTIONS = [
  "React", "Node.js", "Python", "TypeScript", "Next.js", "FastAPI",
  "PostgreSQL", "Docker", "AWS", "Supabase", "Rust", "Go", "Vue",
  "Django", "Rails", "Kubernetes", "GraphQL", "Redis",
];

const inputStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  padding: ".5rem .75rem",
  fontFamily: "inherit",
  fontSize: ".9rem",
  outline: "none",
  width: "100%",
  transition: "border-color .15s",
};

export default function OnboardPage() {
  const { user, updateProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || ""
  );
  const [bio, setBio] = useState(user?.user_metadata?.bio || "");
  const [githubUrl, setGithubUrl] = useState(user?.user_metadata?.github_url || "");
  const [skills, setSkills] = useState(user?.user_metadata?.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <div className="shell">
        <p className="dim mono">Loading…</p>
      </div>
    );
  }

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const addSkill = (skill) => {
    const s = skill.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (s) => setSkills(skills.filter((x) => x !== s));

  const onSkillKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === "Backspace" && !skillInput && skills.length > 0) {
      setSkills(skills.slice(0, -1));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        github_url: githubUrl.trim(),
        skills,
        available,
        onboarded: true,
      });
      if (err) {
        setError(err.message);
        return;
      }
      navigate("/jobs", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="shell" style={{ maxWidth: "560px", margin: "0 auto" }}>
      <div className="hdr">
        <Link to="/" className="nav-link dim" style={{ fontSize: ".8rem" }}>
          ← home
        </Link>
        <h1>Expert profile</h1>
        <span className="tag mono">onboarding</span>
      </div>

      <p className="dim" style={{ lineHeight: 1.6, fontSize: ".9rem" }}>
        Tell targets a bit about yourself so they know who's connecting to their machine.
      </p>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Display name */}
        <div className="card" style={{ gap: ".75rem" }}>
          <span className="sm dim">Identity</span>
          <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
            <span style={{ fontSize: ".82rem", color: "var(--dim)" }}>Display name *</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Chen"
              style={inputStyle}
              required
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
            <span style={{ fontSize: ".82rem", color: "var(--dim)" }}>GitHub URL (optional)</span>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/yourhandle"
              style={inputStyle}
              type="url"
            />
          </label>
        </div>

        {/* Bio */}
        <div className="card" style={{ gap: ".75rem" }}>
          <span className="sm dim">Bio</span>
          <label style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
            <span style={{ fontSize: ".82rem", color: "var(--dim)" }}>Short bio (optional)</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What do you specialise in? What types of problems do you enjoy solving?"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </label>
        </div>

        {/* Skills */}
        <div className="card" style={{ gap: ".75rem" }}>
          <span className="sm dim">Skills</span>
          {/* Tag input */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: ".4rem",
              padding: ".4rem .5rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              minHeight: "2.5rem",
              alignItems: "center",
              cursor: "text",
            }}
            onClick={() => document.getElementById("skill-input")?.focus()}
          >
            {skills.map((s) => (
              <span
                key={s}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: ".3rem",
                  background: "rgba(59,240,138,.1)",
                  border: "1px solid rgba(59,240,138,.25)",
                  borderRadius: "4px",
                  padding: ".15rem .5rem",
                  fontSize: ".78rem",
                  color: "var(--accent)",
                }}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--dim)",
                    fontSize: ".8rem",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="skill-input"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={onSkillKeyDown}
              onBlur={() => skillInput.trim() && addSkill(skillInput)}
              placeholder={skills.length === 0 ? "Type a skill, press Enter" : ""}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text)",
                fontSize: ".88rem",
                minWidth: "120px",
                flex: 1,
              }}
            />
          </div>
          {/* Suggestions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem" }}>
            {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).slice(0, 10).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  color: "var(--dim)",
                  fontSize: ".75rem",
                  padding: ".15rem .45rem",
                  cursor: "pointer",
                }}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div
          className="card"
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: ".9rem" }}>Available for jobs</div>
            <div className="dim" style={{ fontSize: ".8rem" }}>
              Show up in listings when targets are looking for experts
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAvailable(!available)}
            style={{
              width: "44px",
              height: "24px",
              borderRadius: "12px",
              background: available ? "var(--accent)" : "var(--border)",
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background .2s",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "2px",
                left: available ? "22px" : "2px",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#fff",
                transition: "left .2s",
              }}
            />
          </button>
        </div>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: ".85rem" }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="btn"
          style={{ justifyContent: "center" }}
        >
          {saving ? "Saving…" : "Save profile & browse jobs →"}
        </button>

        <button
          type="button"
          className="dim"
          onClick={() => navigate("/jobs")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: ".85rem" }}
        >
          Skip for now →
        </button>
      </form>
    </div>
  );
}
