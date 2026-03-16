import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function UploadForm({ user, onQuestionsGenerated, onShowHistory, onShowProfile, onShowJobs, onShowDocuments }) {
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedProfile, setSavedProfile] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase.from("user_profiles").select("resume_text, target_job_role").eq("user_id", user.id).single();
      if (data && (data.resume_text || data.target_job_role)) setSavedProfile(data);
    })();
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase.from("jobs").select("id, title, company, job_description").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20);
      setSavedJobs(Array.isArray(data) ? data : []);
    })();
  }, [user?.id, isDemo]);

  const handleSubmit = async () => {
    if (!resumeText || !jobTitle || !jobDescription) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      if (!isDemo) {
        await supabase.from("resumes").insert([{ user_id: user.id, resume_text: resumeText }]);
        await supabase.from("job_descriptions").insert([{ user_id: user.id, job_title: jobTitle, job_description: jobDescription }]);
        await supabase.from("user_profiles").upsert(
          { user_id: user.id, resume_text: resumeText, target_job_role: jobTitle, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      }
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription, job_title: jobTitle })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || res.statusText || "Request failed. Please try again.");
        setLoading(false);
        return;
      }
      onQuestionsGenerated(data, jobTitle, selectedJobId || null);
    } catch (e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const inputStyle = { width: "100%", padding: "0.9rem 1rem", border: "2px solid #e8e0ff", borderRadius: "12px", fontSize: "0.95rem", fontFamily: "sans-serif", outline: "none", boxSizing: "border-box", background: "white", color: "#333" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif" }}>
      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.92)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "80px", height: "80px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", marginBottom: "1.5rem", animation: "pulse 1.5s infinite" }}>🤖</div>
          <h2 style={{ color: "#1e3a5f", fontWeight: "900", fontSize: "1.5rem", marginBottom: "0.5rem" }}>Aria is analysing your profile...</h2>
          <p style={{ color: "#888", marginBottom: "2rem" }}>Generating tailored interview questions</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ width: "10px", height: "10px", background: "#6c63ff", borderRadius: "50%", animation: "bounce 1s infinite", animationDelay: `${i * 0.15}s`, opacity: 0.7 }} />)}
          </div>
          <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
        </div>
      )}
      <nav style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🎯</span>
          <span style={{ fontWeight: "800", fontSize: "1.1rem", color: "#1e3a5f" }}>InterviewAI</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {onShowJobs && <button onClick={onShowJobs} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>💼 Jobs</button>}
          {onShowDocuments && <button onClick={onShowDocuments} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>📄 Documents</button>}
          {onShowProfile && <button onClick={onShowProfile} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>👤 Profile</button>}
          <button onClick={onShowHistory} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>📋 History</button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>Sign Out</button>
        </div>
      </nav>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem" }}>Prepare for Your Interview</h1>
          <p style={{ color: "#888", fontSize: "1rem" }}>Paste your CV and job description — we’ll tailor questions for you</p>
        </div>
        <div style={{ background: "white", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 8px 40px rgba(108,99,255,0.08)" }}>
          {savedProfile && !isDemo && (
            <div style={{ marginBottom: "1.25rem" }}>
              <button type="button" onClick={() => { setResumeText(savedProfile.resume_text || ""); setJobTitle(savedProfile.target_job_role || jobTitle); }} style={{ background: "#ede9ff", color: "#6c63ff", border: "none", borderRadius: "10px", padding: "0.5rem 1rem", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem" }}>📌 Use my saved profile</button>
              <span style={{ marginLeft: "0.5rem", color: "#666", fontSize: "0.85rem" }}>Pre-fill CV and job title</span>
            </div>
          )}
          {!isDemo && (
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.4rem", fontSize: "0.9rem" }}>Pick a saved job (one-click reuse)</label>
              {savedJobs.length > 0 ? (
                <>
                  <select
                    value={selectedJobId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedJobId(id);
                      if (id) {
                        const job = savedJobs.find(j => j.id === id);
                        if (job) { setJobTitle(job.title || ""); setJobDescription(job.job_description || ""); }
                      }
                    }}
                    style={{ ...inputStyle, maxWidth: "100%" }}
                  >
                    <option value="">— New job (paste below) —</option>
                    {savedJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ""}</option>
                    ))}
                  </select>
                  <p style={{ color: "#666", fontSize: "0.8rem", margin: "0.35rem 0 0" }}>Pick a job to link this practice — you'll see attempts under that job in Job Tracker.</p>
                </>
              ) : (
                <p style={{ color: "#666", fontSize: "0.85rem", margin: 0 }}>No saved jobs yet. Go to <strong>💼 Jobs</strong> in the nav, add a job, then come back here — it will appear in this dropdown.</p>
              )}
            </div>
          )}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>📄 Your CV</label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your full CV here (or use saved profile above)..." style={{ ...inputStyle, minHeight: "150px", resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>💼 Job Title</label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer, Data Analyst" style={inputStyle} />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>📋 Job Description</label>
            <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the full job description here..." style={{ ...inputStyle, minHeight: "150px", resize: "vertical" }} />
          </div>
          {error && <div style={{ background: "#fff0f0", border: "2px solid #ff6b6b", borderRadius: "10px", padding: "0.75rem 1rem", color: "#b82e2e", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</div>}
          <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "800", cursor: "pointer", boxShadow: "0 8px 30px rgba(108,99,255,0.3)" }}>
            🚀 Generate Interview Questions
          </button>
        </div>
      </div>
    </div>
  );
}
