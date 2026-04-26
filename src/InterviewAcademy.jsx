import { useState, useCallback } from "react";
import { messageForFailedApiResponse } from "./apiClientError.js";
import { jsonAuthHeaders } from "./jsonAuthHeaders.js";
import LockIcon from "./components/LockIcon.jsx";
import { btnPrimary, btnPrimaryHover, input } from "./candidateUi.jsx";

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const mockCard = {
  borderRadius: "16px",
  background: "rgba(22, 22, 29, 0.94)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const MODULES = [
  { id: "m1", title: "Master the STAR Method", topic: "Behavioural answers", duration: "5 min read", level: "Beginner" },
  { id: "m2", title: "Tell Me About Yourself", topic: "Opening question", duration: "3 min read", level: "Beginner" },
  { id: "m3", title: "Handling Tough Questions", topic: "Weakness, 5 years, leaving job", duration: "7 min read", level: "Intermediate" },
  { id: "m4", title: "Salary Negotiation Scripts", topic: "UK-focused negotiation", duration: "5 min read", level: "Intermediate" },
  { id: "m5", title: "Questions to Ask the Interviewer", topic: "Strong vs weak questions", duration: "4 min read", level: "Beginner" },
  { id: "m6", title: "Body Language & Confidence", topic: "Virtual and in-person", duration: "5 min read", level: "Beginner" },
  { id: "m7", title: "Research Like a Pro", topic: "20-minute company research", duration: "6 min read", level: "Intermediate" },
  {
    id: "m8",
    title: "Technical Interview Prep",
    topic: "Coding, algorithms and system design",
    duration: "10 min read",
    level: "Advanced",
    audienceNote: "For software, data & engineering interviews — skip if your role is not technical.",
  },
];

function levelPillStyle(level) {
  const map = {
    Beginner: { border: "rgba(52, 211, 153, 0.35)", color: "#86efac", bg: "rgba(16, 185, 129, 0.08)" },
    Intermediate: { border: "rgba(129, 140, 248, 0.45)", color: "#c4b5fd", bg: "rgba(99, 102, 241, 0.1)" },
    Advanced: { border: "rgba(251, 191, 36, 0.45)", color: "#fcd34d", bg: "rgba(245, 158, 11, 0.08)" },
  };
  const s = map[level] || map.Beginner;
  return {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "4px 10px",
    borderRadius: "999px",
    border: `1px solid ${s.border}`,
    color: s.color,
    background: s.bg,
  };
}

function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "#71717a",
        marginBottom: "10px",
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: "4px",
          height: "12px",
          borderRadius: "2px",
          background: "linear-gradient(180deg, #a78bfa, #6d28d9)",
          boxShadow: "0 0 10px rgba(139, 92, 246, 0.45)",
        }}
      />
      <span>{children}</span>
    </div>
  );
}

export default function InterviewAcademy({ user, isPro, onOpenUpgrade }) {
  const [cache, setCache] = useState({});
  const [active, setActive] = useState(null);
  const [loadLesson, setLoadLesson] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loadFb, setLoadFb] = useState(false);
  const [error, setError] = useState("");
  /** Shown inside the lesson modal when the content API fails (main-page error sits under the overlay). */
  const [lessonError, setLessonError] = useState("");
  const isDemo = user?.id === "demo";

  const openModule = useCallback(
    async (mod) => {
      if (!isPro) {
        onOpenUpgrade?.();
        return;
      }
      if (isDemo) {
        setError("Sign in to use the Academy.");
        return;
      }
      setError("");
      setLessonError("");
      setFeedback(null);
      setAnswer("");
      setActive(mod);
      if (cache[mod.id]) return;
      setLoadLesson(true);
      try {
        const res = await fetch("/api/academy-content", {
          method: "POST",
          headers: await jsonAuthHeaders(),
          body: JSON.stringify({ moduleTitle: mod.title, moduleTopic: mod.topic }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLessonError(messageForFailedApiResponse(res, data));
          setLoadLesson(false);
          return;
        }
        setCache((c) => ({ ...c, [mod.id]: data }));
      } catch {
        setLessonError("Could not load module. Check that the dev API is running (npm run dev:vite).");
      }
      setLoadLesson(false);
    },
    [isDemo, isPro, onOpenUpgrade]
  );

  const submitPractice = async () => {
    if (!active || !cache[active.id]) return;
    const lesson = cache[active.id];
    if (isDemo) return;
    setLoadFb(true);
    setLessonError("");
    setFeedback(null);
    try {
      const res = await fetch("/api/academy-feedback", {
        method: "POST",
        headers: await jsonAuthHeaders(),
        body: JSON.stringify({
          lessonTitle: active.title,
          practicePrompt: lesson.practiceQuestion || "",
          userAnswer: answer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLessonError(messageForFailedApiResponse(res, data));
        setLoadFb(false);
        return;
      }
      setFeedback(data);
    } catch {
      setLessonError("Feedback failed.");
    }
    setLoadFb(false);
  };

  const lesson = active ? cache[active.id] : null;

  return (
    <div
      className="flow-dark-shell"
      style={{
        minHeight: "100vh",
        fontFamily: FH.font,
        color: FH.text,
        position: "relative",
        boxSizing: "border-box",
        background: "#070510",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 85% -10%, rgba(91, 33, 182, 0.35) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 0% 100%, rgba(30, 27, 75, 0.5) 0%, transparent 45%),
          linear-gradient(165deg, #08060f 0%, #0a0618 42%, #000000 100%)
        `,
        colorScheme: "dark",
      }}
    >
      <style>{`
        @keyframes ia-gridPulse { 0%, 100% { opacity: 0.32; } 50% { opacity: 0.48; } }
        .ia-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.034) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.034) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: ia-gridPulse 8s ease-in-out infinite;
        }
        .ia-title-grad {
          font-size: clamp(1.65rem, 4vw, 2.25rem);
          font-weight: 800;
          letter-spacing: -0.035em;
          margin: 0;
          line-height: 1.12;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 38%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
      <div className="ia-page-grid" aria-hidden />

      <div style={{ position: "relative", zIndex: 2, maxWidth: "1120px", margin: "0 auto", padding: "24px 16px 80px" }}>
        <header style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", marginBottom: "4px" }}>
            <h1 className="ia-title-grad">Interview Academy</h1>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#c4b5fd",
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(167, 139, 250, 0.35)",
                background: "rgba(124, 58, 237, 0.12)",
              }}
            >
              Pro
            </span>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "15px", color: FH.muted, lineHeight: 1.6, maxWidth: "640px" }}>
            Master the art of the interview — structured micro-lessons you can apply the same day.
          </p>
          <p style={{ margin: "10px 0 0", fontSize: "13px", color: FH.dim, lineHeight: 1.55, maxWidth: "640px" }}>
            Most lessons apply to any role. One advanced module covers technical interviews — optional if you are not going for a coding or engineering-style process.
          </p>
        </header>

        <SectionLabel>Curriculum</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {MODULES.map((m) => (
            <div
              key={m.id}
              className="candidate-card-hover"
              style={{
                ...mockCard,
                padding: "22px 20px 20px",
                border: "1px solid rgba(139, 92, 246, 0.18)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 16px 48px rgba(0,0,0,0.4), 0 0 80px rgba(124, 58, 237, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <BookIcon />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: FH.text, lineHeight: 1.35 }}>{m.title}</div>
                  <p style={{ margin: "8px 0 0", fontSize: "13px", color: FH.dim, lineHeight: 1.45 }}>{m.topic}</p>
                  {m.audienceNote ? (
                    <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#c4b5fd", lineHeight: 1.45, fontWeight: 600 }}>{m.audienceNote}</p>
                  ) : null}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: FH.dim }}>{m.duration}</span>
                <span style={levelPillStyle(m.level)}>{m.level}</span>
              </div>
              <button
                type="button"
                style={{
                  ...btnPrimary,
                  width: "100%",
                  minHeight: "44px",
                  marginTop: "auto",
                  borderRadius: "12px",
                  fontWeight: 700,
                  boxShadow: "0 0 24px rgba(124, 58, 237, 0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                {...btnPrimaryHover}
                onClick={() => openModule(m)}
              >
                {isPro ? (
                  "Start →"
                ) : (
                  <>
                    <LockIcon size={14} color="#fff" /> Unlock with Pro
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {error ? (
          <p style={{ marginTop: "20px", fontSize: "14px", color: "#fca5a5", lineHeight: 1.5 }}>{error}</p>
        ) : null}
      </div>

      {active && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(7, 5, 16, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 350,
            overflowY: "auto",
            padding: "16px",
            boxSizing: "border-box",
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              maxWidth: "720px",
              margin: "24px auto",
              ...mockCard,
              border: "1px solid rgba(139, 92, 246, 0.22)",
              padding: "26px 24px 24px",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.05) inset, 0 32px 80px rgba(0,0,0,0.55), 0 0 100px rgba(124, 58, 237, 0.12)",
              fontFamily: FH.font,
              color: FH.text,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "1.28rem", fontWeight: 800, color: FH.text, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{active.title}</h2>
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  setFeedback(null);
                  setAnswer("");
                  setLessonError("");
                }}
                style={{
                  border: "1px solid rgba(139, 92, 246, 0.28)",
                  background: "rgba(0,0,0,0.35)",
                  color: FH.muted,
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "22px",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {loadLesson && <p style={{ margin: 0, fontSize: "14px", color: FH.dim }}>Loading lesson…</p>}

            {!loadLesson && lessonError && !lesson && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#fca5a5", lineHeight: 1.55 }}>{lessonError}</p>
                <button
                  type="button"
                  style={{ ...btnPrimary, borderRadius: "12px", fontWeight: 700 }}
                  {...btnPrimaryHover}
                  onClick={() => openModule(active)}
                >
                  Try again
                </button>
              </div>
            )}

            {lesson && (
              <>
                <div
                  style={{
                    maxHeight: "50vh",
                    overflowY: "auto",
                    padding: "18px 16px",
                    background: "rgba(0,0,0,0.4)",
                    borderRadius: "14px",
                    border: "1px solid rgba(139, 92, 246, 0.15)",
                    marginBottom: "20px",
                    fontSize: "15px",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    color: "#d4d4d8",
                  }}
                >
                  {lesson.content}
                </div>

                <div
                  style={{
                    ...mockCard,
                    padding: "18px 16px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(22, 22, 29, 0.6)",
                  }}
                >
                  <p style={{ fontWeight: 800, margin: "0 0 8px", fontSize: "13px", letterSpacing: "0.04em", textTransform: "uppercase", color: "#a78bfa" }}>
                    Practice
                  </p>
                  <p style={{ margin: "0 0 14px", fontSize: "14px", color: FH.muted, lineHeight: 1.55 }}>{lesson.practiceQuestion}</p>
                  <textarea
                    className="candidate-input"
                    style={{ ...input, minHeight: "100px", resize: "vertical", fontFamily: "inherit", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Your answer…"
                  />
                  <button type="button" style={{ ...btnPrimary, borderRadius: "12px", fontWeight: 700 }} {...btnPrimaryHover} onClick={submitPractice} disabled={loadFb || answer.trim().length < 20}>
                    {loadFb ? "Grading…" : "Submit for feedback"}
                  </button>
                  {lessonError ? (
                    <p style={{ margin: "12px 0 0", fontSize: "14px", color: "#fca5a5", lineHeight: 1.55 }}>{lessonError}</p>
                  ) : null}
                </div>

                {feedback && (
                  <div
                    style={{
                      ...mockCard,
                      marginTop: "16px",
                      padding: "18px 16px",
                      border: "1px solid rgba(167, 139, 250, 0.35)",
                      background: "rgba(124, 58, 237, 0.08)",
                    }}
                  >
                    <p style={{ fontWeight: 800, margin: "0 0 8px", color: "#e9d5ff" }}>Score: {feedback.score}/10</p>
                    <p style={{ margin: "0 0 10px", fontSize: "14px", color: FH.muted, lineHeight: 1.55 }}>{feedback.feedback}</p>
                    <p style={{ margin: 0, fontSize: "14px", color: "#d4d4d8" }}>
                      <strong style={{ color: "#c4b5fd" }}>Next:</strong> {feedback.next_step}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
