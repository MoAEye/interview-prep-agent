import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function DocumentsLibrary({ user, onBack }) {
  const [docs, setDocs] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data: jobs } = await supabase.from("jobs").select("id, title, company").eq("user_id", user.id);
      const map = {};
      (jobs || []).forEach((j) => { map[j.id] = j; });
      setJobsById(map);
      const { data: list } = await supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setDocs(Array.isArray(list) ? list : []);
    })();
    setLoading(false);
  }, [user?.id, isDemo]);

  const jobLabel = (doc) => {
    const j = jobsById[doc.job_id];
    if (!j) return "Unknown job";
    return j.company ? `${j.title} @ ${j.company}` : j.title;
  };

  if (isDemo) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 100%)", fontFamily: "sans-serif", padding: "2rem" }}>
        <p style={{ color: "#666", marginBottom: "1rem" }}>Documents are only available when you sign in.</p>
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
        <button onClick={onBack} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "750px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem" }}>Documents</h1>
        <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: "1.5rem" }}>Cover letters and notes you generated, saved by job.</p>

        {loading ? <p style={{ color: "#888" }}>Loading...</p> : docs.length === 0 ? (
          <div style={{ background: "white", borderRadius: "16px", padding: "2rem", textAlign: "center", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <p style={{ color: "#888", marginBottom: "1rem" }}>No documents yet. Go to Jobs and use &quot;Cover letter&quot; or &quot;Cover note&quot; on a job to generate and save one.</p>
            <button onClick={onBack} style={{ background: "#6c63ff", color: "white", border: "none", borderRadius: "12px", padding: "0.6rem 1.2rem", fontWeight: "700", cursor: "pointer" }}>Go to Jobs</button>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(docs || []).map((doc) => (
              <li key={doc.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "1rem" }}>{doc.doc_type === "cover_letter" ? "Cover letter" : "Cover note"}</div>
                    <div style={{ color: "#666", fontSize: "0.9rem" }}>{jobLabel(doc)}</div>
                    <div style={{ color: "#999", fontSize: "0.8rem", marginTop: "0.25rem" }}>{doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)} style={{ background: "#ede9ff", color: "#6c63ff", border: "none", borderRadius: "8px", padding: "0.35rem 0.7rem", fontSize: "0.85rem", cursor: "pointer" }}>{expandedId === doc.id ? "Hide" : "Show"}</button>
                    <button onClick={() => navigator.clipboard.writeText(doc.content || "")} style={{ background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: "8px", padding: "0.35rem 0.7rem", fontSize: "0.85rem", cursor: "pointer" }}>Copy</button>
                  </div>
                </div>
                {expandedId === doc.id && (
                  <div style={{ marginTop: "1rem", padding: "1rem", background: "#f9f9f9", borderRadius: "8px", fontSize: "0.9rem", whiteSpace: "pre-wrap", maxHeight: "300px", overflowY: "auto" }}>{doc.content || ""}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
