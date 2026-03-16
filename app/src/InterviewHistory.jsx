import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function InterviewHistory({ onBack, onShowDashboard }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        const { data, error } = await supabase
          .from("interview_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (!error && data) setSessions(data);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const scoreColor = (score) => {
    if (score >= 80) return { color: "#2d6a4f", bg: "#f0fff4", border: "#4ecdc4" };
    if (score >= 60) return { color: "#b8860b", bg: "#fff9e6", border: "#ffd93d" };
    if (score >= 40) return { color: "#b85c2e", bg: "#fff0e6", border: "#ff9a4d" };
    return { color: "#b82e2e", bg: "#fff0f0", border: "#ff6b6b" };
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📂</div>
        <p style={{ color: "#6c63ff", fontWeight: "700", fontSize: "1.1rem" }}>Loading your history...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "750px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ marginLeft: "auto" }}><button onClick={onShowDashboard} style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", padding: "0.5rem 1.1rem", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" }}>📊 Dashboard</button></div>
          <button onClick={onBack} style={{ background: "white", border: "2px solid #e0e0e0", borderRadius: "12px", padding: "0.5rem 1.1rem", cursor: "pointer", fontWeight: "700", color: "#666", fontSize: "0.9rem" }}>← Back</button>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: "#1e3a5f", margin: 0 }}>📋 Interview History</h1>
            <p style={{ color: "#888", margin: "0.2rem 0 0", fontSize: "0.85rem" }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded</p>
          </div>
        </div>
        {sessions.length === 0 && (
          <div style={{ background: "white", borderRadius: "24px", padding: "3rem 2rem", textAlign: "center", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎤</div>
            <h2 style={{ color: "#1e3a5f", fontWeight: "800", marginBottom: "0.5rem" }}>No interviews yet</h2>
            <p style={{ color: "#888", marginBottom: "1.5rem" }}>Complete your first interview to see your history here.</p>
            <button onClick={onBack} style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", padding: "0.85rem 2rem", fontWeight: "800", cursor: "pointer", fontSize: "1rem" }}>🚀 Start an Interview</button>
          </div>
        )}
        {sessions.map((s, i) => {
          const colors = scoreColor(s.score || 0);
          const isOpen = activeSession === i;
          const answers = Array.isArray(s.answers) ? s.answers : [];
          return (
            <div key={s.id} style={{ background: "white", borderRadius: "20px", marginBottom: "1rem", overflow: "hidden", boxShadow: "0 4px 20px rgba(108,99,255,0.06)", border: `2px solid ${isOpen ? "#e0d9ff" : "transparent"}`, transition: "border 0.2s" }}>
              <div onClick={() => setActiveSession(isOpen ? null : i)} style={{ padding: "1.25rem 1.5rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ background: colors.bg, color: colors.color, border: `2px solid ${colors.border}`, borderRadius: "14px", padding: "0.35rem 0.85rem", fontWeight: "900", fontSize: "1.2rem", minWidth: "58px", textAlign: "center" }}>{s.score ?? "—"}</div>
                  <div>
                    <div style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "0.95rem" }}>{s.job_title || "Interview Session"}</div>
                    <div style={{ color: "#aaa", fontSize: "0.78rem", marginTop: "0.2rem" }}>{formatDate(s.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div>{[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: "1rem", filter: n <= (s.stars || 0) ? "none" : "grayscale(1) opacity(0.25)" }}>⭐</span>)}</div>
                  <span style={{ color: "#bbb", fontSize: "0.85rem" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ borderTop: "1px solid #f0ebff", padding: "1.5rem" }}>
                  {answers.length === 0 ? (
                    <p style={{ color: "#aaa", textAlign: "center", fontSize: "0.9rem" }}>No answer details saved for this session.</p>
                  ) : (
                    answers.map((a, j) => (
                      <div key={j} style={{ background: "#f8f9fa", borderRadius: "12px", padding: "1rem", marginBottom: "0.75rem" }}>
                        <div style={{ fontWeight: "700", color: "#1e3a5f", fontSize: "0.88rem", marginBottom: "0.4rem" }}>Q{j + 1}: {a.question || "—"}</div>
                        <div style={{ color: "#555", fontSize: "0.84rem", lineHeight: "1.5" }}>
                          {a.skipped ? <span style={{ color: "#ff6b6b", fontWeight: "700" }}>⚠️ Skipped</span> : (a.answer || "No answer recorded")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
