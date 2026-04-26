const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

function typeStripColor(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("technical")) return "#3b82f6";
  if (t.includes("behavioral")) return "#f97316";
  if (t.includes("experience")) return "#22c55e";
  if (t.includes("situational")) return "#a855f7";
  if (t.includes("gap")) return "#ef4444";
  return "#8b5cf6";
}

function difficultyLabel(q) {
  const r = q?.relevance_score;
  if (r == null || Number.isNaN(Number(r))) return "Medium";
  const n = Number(r);
  if (n >= 8) return "High";
  if (n >= 5) return "Medium";
  return "Foundational";
}

const glassCard = {
  borderRadius: "16px",
  background: "rgba(16, 12, 32, 0.58)",
  border: "1px solid rgba(139, 92, 246, 0.22)",
  padding: "20px",
  boxSizing: "border-box",
  backdropFilter: "blur(14px)",
};

const sectionLabel = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#9ca3af",
  marginBottom: "12px",
};

const primaryGlowHover = {
  onMouseEnter: (e) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.filter = "brightness(1.05)";
    e.currentTarget.style.boxShadow = "0 10px 36px rgba(124, 58, 237, 0.45)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.filter = "brightness(1)";
    e.currentTarget.style.boxShadow = "0 8px 28px rgba(124, 58, 237, 0.35)";
  },
};

const ghostHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
    e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.4)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.28)";
  },
};

export default function QuestionsList({ questions, onStartOver, onStartInterview }) {
  const data = Array.isArray(questions) ? null : questions;
  const qs = data?.interview_questions || questions;
  const n = Array.isArray(qs) ? qs.length : 0;
  const prefs = data?.session_preferences;
  const perSec = prefs && Object.prototype.hasOwnProperty.call(prefs, "seconds_per_question")
    ? prefs.seconds_per_question
    : data?.seconds_per_question;
  const timerNote =
    perSec === 0 || perSec === "0" ? " · no timer" : perSec != null && perSec !== "" ? ` · ${perSec}s per answer` : "";
  const estMin = Math.max(1, Math.round(n * 0.5));

  return (
    <div
      className="flow-dark-shell"
      style={{
        minHeight: "100dvh",
        fontFamily: FH.font,
        color: FH.text,
        paddingBottom: "120px",
        boxSizing: "border-box",
        position: "relative",
        colorScheme: "dark",
        isolation: "isolate",
        background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #000000 100%)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #0d0718 100%)",
          pointerEvents: "none",
        }}
      />
      <style>{`
        @keyframes ql-gridPulse { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.58; } }
        .ql-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: ql-gridPulse 8s ease-in-out infinite;
        }
        .ql-title-grad {
          font-size: clamp(1.45rem, 3.5vw, 1.85rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0 0 8px;
          line-height: 1.15;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 40%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
      <div className="ql-page-grid" aria-hidden />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "840px",
          margin: "0 auto",
          padding: "24px 16px 0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
          <div />
          <button
            type="button"
            onClick={onStartOver}
            style={{
              background: "transparent",
              border: "1px solid rgba(139, 92, 246, 0.28)",
              color: FH.muted,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: FH.font,
            }}
            {...ghostHover}
          >
            Start over
          </button>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h1 className="ql-title-grad" style={{ margin: 0 }}>Your interview prep pack</h1>
          <p style={{ margin: "8px 0 0", fontSize: "15px", color: FH.muted, lineHeight: 1.5 }}>
            Summaries and tailored questions for this role.
          </p>
        </div>

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div className="candidate-card-hover" style={glassCard}>
              <div style={sectionLabel}>Candidate summary</div>
              <p style={{ color: "#d4d4d8", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>{data.candidate_summary}</p>
            </div>
            <div className="candidate-card-hover" style={glassCard}>
              <div style={sectionLabel}>Job summary</div>
              <p style={{ color: "#d4d4d8", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>{data.job_summary}</p>
            </div>
          </div>
        )}

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div className="candidate-card-hover" style={glassCard}>
              <div style={sectionLabel}>Resume strengths</div>
              {(Array.isArray(data.top_resume_signals) ? data.top_resume_signals : []).map((s, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: "13px" }}>✓</span>
                  <span style={{ color: "#d4d4d8", fontSize: "14px", lineHeight: 1.45 }}>{s}</span>
                </div>
              ))}
            </div>
            <div className="candidate-card-hover" style={glassCard}>
              <div style={sectionLabel}>Job priorities</div>
              {(Array.isArray(data.top_job_priorities) ? data.top_job_priorities : []).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: "13px" }}>{i + 1}.</span>
                  <span style={{ color: "#d4d4d8", fontSize: "14px", lineHeight: 1.45 }}>{p}</span>
                </div>
              ))}
            </div>
            <div className="candidate-card-hover" style={glassCard}>
              <div style={sectionLabel}>Likely gaps</div>
              {(Array.isArray(data.likely_weaknesses) ? data.likely_weaknesses : []).map((w, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ color: "#f87171", fontWeight: 700, fontSize: "13px" }}>!</span>
                  <span style={{ color: "#d4d4d8", fontSize: "14px", lineHeight: 1.45 }}>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {n > 0 && (
          <div style={{ marginBottom: "20px", marginTop: data ? "8px" : 0 }}>
            <h2 className="ql-title-grad" style={{ margin: "0 0 8px", fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}>
              Generated questions
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: FH.dim, lineHeight: 1.5 }}>
              Review each item before you continue — {n} questions · ~{estMin} min total{timerNote}
            </p>
          </div>
        )}

        {(Array.isArray(qs) ? qs : []).map((q, i) => {
          const strip = typeStripColor(q.type || q.category);
          const cat = (q.type || q.category || "question").toString();
          const diff = difficultyLabel(q);
          return (
            <div
              key={i}
              className="candidate-card-hover"
              style={{
                display: "flex",
                borderRadius: "14px",
                overflow: "hidden",
                marginBottom: "10px",
                border: "1px solid rgba(139, 92, 246, 0.2)",
                background: "rgba(10, 8, 22, 0.65)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ width: "4px", flexShrink: 0, background: strip }} aria-hidden />
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  flexWrap: "wrap",
                  gap: "16px",
                  padding: "18px 20px",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", gap: "14px", flex: "1 1 240px", minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      fontSize: "12px",
                      color: FH.dim,
                      minWidth: "36px",
                      paddingTop: "4px",
                    }}
                  >
                    Q{i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: "#f4f4f5", fontSize: "16px", lineHeight: 1.55, margin: "0 0 8px", fontWeight: 600 }}>
                      {q.question}
                    </p>
                    {q.reason && (
                      <p style={{ color: FH.muted, fontSize: "13px", lineHeight: 1.5, margin: "0 0 6px", fontStyle: "italic" }}>
                        Note: {q.reason}
                      </p>
                    )}
                    {q.targets && <p style={{ color: FH.dim, fontSize: "12px", margin: 0 }}>Tests: {q.targets}</p>}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "6px",
                    minWidth: "120px",
                    textAlign: "right",
                  }}
                >
                  <span style={{ fontSize: "13px", color: FH.muted }}>~30s</span>
                  <span style={{ fontSize: "13px", color: FH.muted }}>
                    Difficulty: <span style={{ color: FH.text, fontWeight: 600 }}>{diff}</span>
                  </span>
                  {q.relevance_score != null && q.relevance_score !== undefined && (
                    <span style={{ fontSize: "12px", color: FH.dim }}>
                      Relevance {q.relevance_score}/10
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "11px",
                      marginTop: "4px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#d4d4d8",
                      fontWeight: 600,
                      textTransform: "lowercase",
                    }}
                  >
                    {cat}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px",
          background: "rgba(6, 4, 14, 0.92)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(139, 92, 246, 0.22)",
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: "840px", margin: "0 auto" }}>
          <button
            type="button"
            onClick={onStartInterview}
            disabled={n === 0}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
              color: "#ffffff",
              fontWeight: 700,
              padding: "14px 24px",
              borderRadius: "12px",
              border: "none",
              cursor: n === 0 ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontFamily: FH.font,
              boxShadow: "0 8px 28px rgba(124, 58, 237, 0.35)",
              opacity: n === 0 ? 0.45 : 1,
            }}
            {...primaryGlowHover}
          >
            Submit & continue
          </button>
          {n === 0 && (
            <p style={{ textAlign: "center", color: FH.dim, fontSize: "13px", margin: "12px 0 0" }}>
              No questions to review. Go back to Prepare and generate your pack.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
