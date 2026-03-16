import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const STATUSES = ["saved", "applied", "interview", "rejected", "offered"];
const inputStyle = { width: "100%", padding: "0.6rem 0.8rem", border: "2px solid #e8e0ff", borderRadius: "8px", fontSize: "0.9rem", boxSizing: "border-box" };

export default function JobTracker({ user, onBack, onShowDocuments }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ company: "", title: "", job_url: "", job_description: "", status: "saved" });
  const [saveError, setSaveError] = useState("");
  const [generating, setGenerating] = useState(null);
  const [genError, setGenError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null);
  const [attemptsByJobId, setAttemptsByJobId] = useState({});

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase.from("jobs").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      setJobs(Array.isArray(data) ? data : []);
    })();
    setLoading(false);
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase.from("interview_sessions").select("job_id, score, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      const byJob = {};
      (data || []).forEach((s) => {
        if (!s.job_id) return; // only group sessions that are linked to a job
        if (!byJob[s.job_id]) byJob[s.job_id] = [];
        byJob[s.job_id].push({ score: s.score, created_at: s.created_at });
      });
      setAttemptsByJobId(byJob);
    })();
  }, [user?.id, isDemo]);

  const loadJobs = async () => {
    if (!user || isDemo) return;
    const { data } = await supabase.from("jobs").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setJobs(Array.isArray(data) ? data : []);
  };

  const handleSave = async () => {
    if (isDemo) return;
    if (!form.title?.trim()) { setSaveError("Job title is required."); return; }
    setSaveError("");
    const row = { user_id: user.id, company: form.company || "", title: form.title.trim(), job_url: form.job_url || "", job_description: form.job_description || "", status: form.status || "saved", updated_at: new Date().toISOString() };
    if (editingId) {
      const { error } = await supabase.from("jobs").update(row).eq("id", editingId).eq("user_id", user.id);
      if (error) { setSaveError(error.message); return; }
      setEditingId(null);
    } else {
      const { error } = await supabase.from("jobs").insert([row]);
      if (error) { setSaveError(error.message); return; }
    }
    setForm({ company: "", title: "", job_url: "", job_description: "", status: "saved" });
    setShowForm(false);
    loadJobs();
  };

  const handleStatusChange = async (jobId, newStatus) => {
    if (isDemo) return;
    await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", jobId).eq("user_id", user.id);
    loadJobs();
  };

  const startEdit = (job) => {
    setForm({ company: job.company || "", title: job.title || "", job_url: job.job_url || "", job_description: job.job_description || "", status: job.status || "saved" });
    setEditingId(job.id);
    setShowForm(true);
  };

  const generateDoc = async (job, type) => {
    if (isDemo) return;
    setGenerating({ jobId: job.id, type });
    setGenError("");
    setLastGenerated(null);
    try {
      const { data: profile } = await supabase.from("user_profiles").select("resume_text").eq("user_id", user.id).single();
      const cvText = profile?.resume_text || "";
      if (!cvText.trim()) { setGenError("Save your CV in Profile first."); setGenerating(null); return; }
      const endpoint = type === "cover_letter" ? "/api/generate-cover-letter" : "/api/generate-cover-note";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: cvText,
          job_title: job.title,
          company: job.company || "",
          job_description: job.job_description || ""
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setGenError(data?.error || "Request failed"); setGenerating(null); return; }
      const content = type === "cover_letter" ? (data.cover_letter || "") : (data.cover_note || "");
      const { error: insertErr } = await supabase.from("documents").insert([{ user_id: user.id, job_id: job.id, doc_type: type, content }]);
      if (insertErr) { setGenError(insertErr.message); setGenerating(null); return; }
      setLastGenerated({ jobId: job.id, content, type, jobTitle: job.title });
    } catch (e) {
      setGenError(e?.message || "Something went wrong");
    }
    setGenerating(null);
  };

  if (isDemo) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 100%)", fontFamily: "sans-serif", padding: "2rem" }}>
        <p style={{ color: "#666", marginBottom: "1rem" }}>Job tracker is only available when you sign in.</p>
        <button onClick={onBack} style={{ padding: "0.5rem 1rem", background: "#6c63ff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif" }}>
      <nav style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "750px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🎯</span>
          <span style={{ fontWeight: "800", fontSize: "1.1rem", color: "#1e3a5f" }}>InterviewAI</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {onShowDocuments && <button onClick={onShowDocuments} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>📄 Documents</button>}
          <button onClick={onBack} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>← Back</button>
        </div>
      </nav>

      <div style={{ maxWidth: "750px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "#1e3a5f", margin: 0 }}>Job Tracker</h1>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ company: "", title: "", job_url: "", job_description: "", status: "saved" }); setSaveError(""); }} style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", padding: "0.5rem 1rem", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem" }}>+ Add job</button>
        </div>

        {showForm && (
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.08)" }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#1e3a5f" }}>{editingId ? "Edit job" : "New job"}</h2>
            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
              <input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} style={inputStyle} />
              <input placeholder="Job title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
              <input placeholder="Job URL (optional)" value={form.job_url} onChange={e => setForm(f => ({ ...f, job_url: e.target.value }))} style={inputStyle} />
              <textarea placeholder="Job description (paste here)" value={form.job_description} onChange={e => setForm(f => ({ ...f, job_description: e.target.value }))} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} />
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {saveError && <p style={{ color: "#b82e2e", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{saveError}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleSave} style={{ padding: "0.5rem 1rem", background: "#6c63ff", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Save</button>
              <button onClick={() => { setShowForm(false); setEditingId(null); setSaveError(""); }} style={{ padding: "0.5rem 1rem", background: "#eee", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {loading ? <p style={{ color: "#888" }}>Loading...</p> : jobs.length === 0 && !showForm ? (
          <div style={{ background: "white", borderRadius: "16px", padding: "2rem", textAlign: "center", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <p style={{ color: "#888", marginBottom: "1rem" }}>No jobs yet. Add one to track applications and reuse them for prep.</p>
            <button onClick={() => setShowForm(true)} style={{ background: "#6c63ff", color: "white", border: "none", borderRadius: "12px", padding: "0.6rem 1.2rem", fontWeight: "700", cursor: "pointer" }}>+ Add job</button>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(jobs || []).map(job => (
              <li key={job.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "1rem" }}>{job.title || "Untitled"}</div>
                    {job.company && <div style={{ color: "#666", fontSize: "0.9rem" }}>{job.company}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <select value={job.status || "saved"} onChange={e => handleStatusChange(job.id, e.target.value)} style={{ ...inputStyle, width: "auto", padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => startEdit(job)} style={{ background: "#ede9ff", color: "#6c63ff", border: "none", borderRadius: "8px", padding: "0.35rem 0.7rem", fontSize: "0.8rem", cursor: "pointer" }}>Edit</button>
                    <button disabled={!!generating} onClick={() => generateDoc(job, "cover_letter")} style={{ background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: "8px", padding: "0.35rem 0.7rem", fontSize: "0.8rem", cursor: generating ? "not-allowed" : "pointer" }}>{generating?.jobId === job.id && generating?.type === "cover_letter" ? "…" : "Cover letter"}</button>
                    <button disabled={!!generating} onClick={() => generateDoc(job, "cover_note")} style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: "8px", padding: "0.35rem 0.7rem", fontSize: "0.8rem", cursor: generating ? "not-allowed" : "pointer" }}>{generating?.jobId === job.id && generating?.type === "cover_note" ? "…" : "Cover note"}</button>
                  </div>
                </div>
                {genError && generating?.jobId === job.id && <p style={{ color: "#b82e2e", fontSize: "0.8rem", marginTop: "0.5rem" }}>{genError}</p>}
                {lastGenerated && lastGenerated.jobId === job.id && (
                  <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#f5f5f5", borderRadius: "8px", fontSize: "0.85rem" }}>
                    <p style={{ margin: "0 0 0.5rem", fontWeight: "700" }}>Saved to Documents. Copy below:</p>
                    <textarea readOnly value={lastGenerated.content} style={{ width: "100%", minHeight: "80px", fontSize: "0.8rem", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "6px" }} />
                    <button onClick={() => { navigator.clipboard.writeText(lastGenerated.content); }} style={{ marginTop: "0.5rem", padding: "0.35rem 0.75rem", background: "#6c63ff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>Copy</button>
                  </div>
                )}
                {job.job_url && <a href={job.job_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", color: "#6c63ff" }}>Open job link</a>}
                {(attemptsByJobId[job.id] || []).length > 0 && (
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #eee" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.35rem" }}>Interview attempts</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {(attemptsByJobId[job.id] || []).slice(0, 5).map((a, i) => (
                        <span key={i} style={{ background: "#ede9ff", color: "#6c63ff", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.8rem" }}>{a.score}% · {a.created_at ? new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
                      ))}
                      {(attemptsByJobId[job.id] || []).length > 5 && <span style={{ color: "#888", fontSize: "0.8rem" }}>+{(attemptsByJobId[job.id].length - 5)} more</span>}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
