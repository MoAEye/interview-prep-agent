import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  pageOuter,
  pageInner,
  h1,
  sub,
  card,
  btnPrimary,
  btnPrimaryHover,
  C,
  StarDots,
} from "./candidateUi.jsx";

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
    if (score >= 80) return { color: "#15803d", bg: "#f0fdf4", border: "#86efac" };
    if (score >= 60) return { color: "#a16207", bg: "#fffbeb", border: "#fde047" };
    if (score >= 40) return { color: "#c2410c", bg: "#fff7ed", border: "#fdba74" };
    return { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" };
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div style={{ ...pageOuter, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={pageInner}>
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <div className="candidate-spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ ...sub, fontWeight: 600, color: C.purple }}>Loading your history…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageOuter}>
      <div style={pageInner}>
        <div style={{ maxWidth: "750px", margin: "0 auto", padding: "24px 16px 48px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "32px" }}>
            <div>
              <h1 style={h1}>Interview history</h1>
              <p style={{ ...sub, margin: "8px 0 0", fontSize: "14px" }}>
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
              </p>
            </div>
            <button type="button" onClick={onShowDashboard} style={btnPrimary} {...btnPrimaryHover}>
              Open dashboard
            </button>
          </div>
          {sessions.length === 0 && (
            <div style={{ ...card, padding: "48px 24px", textAlign: "center" }}>
              <h2 style={{ color: "#111827", fontWeight: 800, fontSize: "20px", marginBottom: "8px", letterSpacing: "-0.02em" }}>No interviews yet</h2>
              <p style={{ ...sub, marginBottom: "24px" }}>Complete your first interview to see your history here.</p>
              <button type="button" onClick={onBack} style={btnPrimary} {...btnPrimaryHover}>
                Start an interview
              </button>
            </div>
          )}
          {(Array.isArray(sessions) ? sessions : []).map((s, i) => {
            const colors = scoreColor(s.score || 0);
            const isOpen = activeSession === i;
            const answers = Array.isArray(s.answers) ? s.answers : [];
            return (
              <div
                key={s.id}
                style={{
                  ...card,
                  marginBottom: "16px",
                  padding: 0,
                  overflow: "hidden",
                  border: isOpen ? `2px solid ${C.purple}` : card.border,
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveSession(isOpen ? null : i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveSession(isOpen ? null : i); } }}
                  style={{ padding: "20px 24px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                      style={{
                        background: colors.bg,
                        color: colors.color,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "10px",
                        padding: "8px 14px",
                        fontWeight: 800,
                        fontSize: "18px",
                        minWidth: "56px",
                        textAlign: "center",
                      }}
                    >
                      {s.score ?? "—"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#111827", fontSize: "15px" }}>{s.job_title || "Interview session"}</div>
                      <div style={{ color: C.muted, fontSize: "13px", marginTop: "4px" }}>{formatDate(s.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <StarDots count={s.stars || 0} size={7} />
                    <span style={{ color: C.muted, fontSize: "12px", fontWeight: 600 }}>{isOpen ? "Hide" : "Show"}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ borderTop: "1px solid #f0f0f0", padding: "24px" }}>
                    {answers.length === 0 ? (
                      <p style={{ ...sub, textAlign: "center" }}>No answer details saved for this session.</p>
                    ) : (
                      answers.map((a, j) => (
                        <div key={j} style={{ background: "#fafafa", borderRadius: "10px", padding: "16px", marginBottom: "12px", border: "1px solid #f0f0f0" }}>
                          <div style={{ fontWeight: 700, color: "#111827", fontSize: "14px", marginBottom: "8px" }}>Q{j + 1}: {a.question || "—"}</div>
                          <div style={{ color: C.body, fontSize: "14px", lineHeight: 1.5 }}>
                            {a.skipped ? <span style={{ color: "#dc2626", fontWeight: 600 }}>Skipped</span> : (a.answer || "No answer recorded")}
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
    </div>
  );
}
