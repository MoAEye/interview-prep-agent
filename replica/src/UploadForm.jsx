import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function UploadForm({ user, onQuestionsGenerated, onShowHistory }) {
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!resumeText || !jobTitle || !jobDescription) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      await supabase.from("resumes").insert([{ user_id: user.id, resume_text: resumeText }]);
      await supabase.from("job_descriptions").insert([{ user_id: user.id, job_title: jobTitle, job_description: jobDescription }]);
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription, job_title: jobTitle })
      });
      const data = await res.json();
      onQuestionsGenerated(data, jobTitle);
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
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={onShowHistory} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>📋 History</button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>Sign Out</button>
        </div>
      </nav>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-block", background: "#ede9ff", color: "#6c63ff", borderRadius: "25px", padding: "0.4rem 1rem", fontSize: "0.85rem", fontWeight: "700", marginBottom: "1rem" }}>✨ AI-Powered</div>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem" }}>Prepare for Your Interview</h1>
          <p style={{ color: "#888", fontSize: "1rem" }}>Paste your resume and job description — Aria will do the rest</p>
        </div>
        <div style={{ background: "white", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 8px 40px rgba(108,99,255,0.08)" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>📄 Your Resume</label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your full resume here..." style={{ ...inputStyle, minHeight: "150px", resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>💼 Job Title</label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Frontend Engineer" style={inputStyle} />
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
