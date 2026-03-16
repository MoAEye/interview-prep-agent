import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const inputStyle = {
  width: "100%",
  padding: "0.9rem 1rem",
  border: "2px solid #e8e0ff",
  borderRadius: "12px",
  fontSize: "0.95rem",
  fontFamily: "sans-serif",
  outline: "none",
  boxSizing: "border-box",
  background: "white",
  color: "#333",
};

export default function Profile({ user, onBack }) {
  const [resumeText, setResumeText] = useState("");
  const [targetJobRole, setTargetJobRole] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [jobsInDemand, setJobsInDemand] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("resume_text, target_job_role, target_location")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setResumeText(data.resume_text || "");
        setTargetJobRole(data.target_job_role || "");
        setTargetLocation(data.target_location || "");
      }
    })();
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (!targetLocation.trim()) {
      setJobsInDemand(null);
      return;
    }
    setJobsLoading(true);
    fetch(
      `/api/jobs-in-demand?location=${encodeURIComponent(targetLocation)}&job=${encodeURIComponent(targetJobRole)}`
    )
      .then((r) => r.json())
      .then((data) => {
        setJobsInDemand(data);
        setJobsLoading(false);
      })
      .catch(() => setJobsLoading(false));
  }, [targetLocation, targetJobRole]);

  const handleSave = async () => {
    if (isDemo) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const { error } = await supabase.from("user_profiles").upsert(
        {
          user_id: user.id,
          resume_text: resumeText,
          target_job_role: targetJobRole,
          target_location: targetLocation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) {
        setSaveError(error.message || "Could not save. Check Supabase: is the user_profiles table created and RLS set up?");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      setSaveError(e?.message || "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isDemo) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 100%)", fontFamily: "sans-serif", padding: "2rem" }}>
        <p style={{ color: "#666", marginBottom: "1rem" }}>Save a profile is only available when you sign in.</p>
        <button onClick={onBack} style={{ padding: "0.5rem 1rem", background: "#6c63ff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif" }}>
      <nav style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🎯</span>
          <span style={{ fontWeight: "800", fontSize: "1.1rem", color: "#1e3a5f" }}>InterviewAI</span>
        </div>
        <button onClick={onBack} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p style={{ marginBottom: "0.5rem", fontSize: "0.8rem", color: "#6c63ff", fontWeight: "700" }}>UK job seekers</p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem" }}>My Profile</h1>
          <p style={{ color: "#666", fontSize: "0.95rem" }}>Save your CV and preferences so you don’t have to re-enter them each time.</p>
        </div>

        <div style={{ background: "white", borderRadius: "24px", padding: "2rem", boxShadow: "0 8px 40px rgba(108,99,255,0.08)", marginBottom: "1.5rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>What job are you looking for?</label>
            <input
              type="text"
              value={targetJobRole}
              onChange={(e) => setTargetJobRole(e.target.value)}
              placeholder="e.g. Software Engineer, Data Analyst, Project Manager"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Where in the UK? (city or area)</label>
            <input
              type="text"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              placeholder="e.g. London, Manchester, Birmingham, Leeds, Remote"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Your CV (saved to profile)</label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your full CV here. We’ll use it to pre-fill the interview form."
              style={{ ...inputStyle, minHeight: "140px", resize: "vertical" }}
            />
          </div>
          {saveError && (
            <p style={{ color: "#b82e2e", fontSize: "0.9rem", marginBottom: "1rem", background: "#fff0f0", padding: "0.75rem", borderRadius: "8px" }}>{saveError}</p>
          )}
          <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "0.9rem", background: saving ? "#ccc" : "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "800", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save profile"}
          </button>
        </div>

        {targetLocation.trim() && (
          <div style={{ background: "white", borderRadius: "24px", padding: "2rem", boxShadow: "0 8px 40px rgba(108,99,255,0.08)" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "1rem" }}>📊 Jobs in demand in the UK — {targetLocation}</h2>
            {jobsLoading ? (
              <p style={{ color: "#888" }}>Loading…</p>
            ) : jobsInDemand?.source === "adzuna" && Array.isArray(jobsInDemand?.jobs) && jobsInDemand.jobs.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {(jobsInDemand.jobs || []).map((j, i) => (
                  <li key={i} style={{ padding: "0.6rem 0", borderBottom: "1px solid #eee" }}>
                    <a href={j.url} target="_blank" rel="noopener noreferrer" style={{ color: "#6c63ff", fontWeight: "600", textDecoration: "none" }}>{j.title}</a>
                    {j.company && <span style={{ color: "#666", marginLeft: "0.5rem" }}>{" — "}{j.company}</span>}
                  </li>
                ))}
                <p style={{ marginTop: "0.75rem", color: "#666", fontSize: "0.9rem" }}>About {jobsInDemand.total_count} roles in this area.</p>
              </ul>
            ) : Array.isArray(jobsInDemand?.in_demand_roles) && jobsInDemand.in_demand_roles.length > 0 ? (
              <>
                <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>Roles often in demand across the UK (add Adzuna API keys for real listings in your area):</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {(jobsInDemand.in_demand_roles || []).map((r, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #eee", fontSize: "0.95rem" }}>
                      <span style={{ fontWeight: "600", color: "#1e3a5f" }}>{r.title}</span>
                      <span style={{ color: "#6c63ff" }}>{r.demand}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
