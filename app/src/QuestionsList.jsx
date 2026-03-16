export default function QuestionsList({ questions, onStartOver, onStartInterview }) {
  const data = Array.isArray(questions) ? null : questions;
  const qs = data?.interview_questions || questions;

  const typeColor = (type) => {
    const colors = {
      technical: { bg: "#e8f0fe", color: "#2e5cbf" },
      behavioral: { bg: "#fff0e8", color: "#bf5c2e" },
      experience: { bg: "#e8fff0", color: "#2ebf5c" },
      situational: { bg: "#f0e8ff", color: "#7c2ebf" },
      "gap-probing": { bg: "#fff0f0", color: "#bf2e2e" },
    };
    return colors[type] || { bg: "#ede9ff", color: "#6c63ff" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif", paddingBottom: "100px" }}>
      <nav style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🎯</span>
          <span style={{ fontWeight: "800", fontSize: "1.1rem", color: "#1e3a5f" }}>InterviewAI</span>
        </div>
        <button onClick={onStartOver} style={{ background: "none", border: "2px solid #e8e0ff", borderRadius: "20px", padding: "0.4rem 1rem", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}>
          🔄 Start Over
        </button>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem" }}>Your Interview Prep Pack</h1>
          <p style={{ color: "#888" }}>{qs?.length} tailored questions ready for you</p>
        </div>

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.08)" }}>
              <h3 style={{ color: "#1e3a5f", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>👤 Candidate Summary</h3>
              <p style={{ color: "#555", fontSize: "0.9rem", lineHeight: "1.6", margin: 0 }}>{data.candidate_summary}</p>
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.08)" }}>
              <h3 style={{ color: "#1e3a5f", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>🏢 Job Summary</h3>
              <p style={{ color: "#555", fontSize: "0.9rem", lineHeight: "1.6", margin: 0 }}>{data.job_summary}</p>
            </div>
          </div>
        )}

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.08)" }}>
              <h3 style={{ color: "#2e7d32", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>💪 Resume Strengths</h3>
              {(Array.isArray(data.top_resume_signals) ? data.top_resume_signals : []).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#4ecdc4", fontWeight: "700", fontSize: "0.8rem" }}>✓</span>
                  <span style={{ color: "#555", fontSize: "0.82rem", lineHeight: "1.4" }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.08)" }}>
              <h3 style={{ color: "#1e3a5f", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>🎯 Job Priorities</h3>
              {(Array.isArray(data.top_job_priorities) ? data.top_job_priorities : []).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#6c63ff", fontWeight: "700", fontSize: "0.8rem" }}>{i + 1}.</span>
                  <span style={{ color: "#555", fontSize: "0.82rem", lineHeight: "1.4" }}>{p}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.08)" }}>
              <h3 style={{ color: "#bf2e2e", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>⚠️ Likely Gaps</h3>
              {(Array.isArray(data.likely_weaknesses) ? data.likely_weaknesses : []).map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ color: "#ff6b6b", fontWeight: "700", fontSize: "0.8rem" }}>!</span>
                  <span style={{ color: "#555", fontSize: "0.82rem", lineHeight: "1.4" }}>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(Array.isArray(qs) ? qs : []).map((q, i) => (
          <div key={i} style={{ background: "white", borderRadius: "16px", padding: "1.5rem", marginBottom: "1rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: "800", color: "#6c63ff", fontSize: "0.9rem" }}>Q{i + 1}</span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {q.relevance_score && (
                  <span style={{ fontSize: "0.75rem", background: "#fff8e1", color: "#f57f17", padding: "0.2rem 0.6rem", borderRadius: "20px", fontWeight: "700" }}>⭐ {q.relevance_score}/10</span>
                )}
                <span style={{ fontSize: "0.75rem", background: typeColor(q.type).bg, color: typeColor(q.type).color, padding: "0.2rem 0.6rem", borderRadius: "20px", fontWeight: "600" }}>
                  {q.type || q.category}
                </span>
              </div>
            </div>
            <p style={{ color: "#1e3a5f", fontSize: "1rem", lineHeight: "1.6", margin: "0 0 0.75rem", fontWeight: "500" }}>{q.question}</p>
            {q.reason && <p style={{ color: "#999", fontSize: "0.82rem", lineHeight: "1.5", margin: "0 0 0.4rem", fontStyle: "italic" }}>💡 {q.reason}</p>}
            {q.targets && <p style={{ color: "#bbb", fontSize: "0.78rem", margin: 0 }}>🎯 Tests: {q.targets}</p>}
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "1rem 2rem", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #f0ebff", zIndex: 100 }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <button onClick={onStartInterview} style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "800", cursor: "pointer", boxShadow: "0 8px 30px rgba(108,99,255,0.3)" }}>
            🎤 Start Mock Interview with Aria →
          </button>
        </div>
      </div>
    </div>
  );
}
