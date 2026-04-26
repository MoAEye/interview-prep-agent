import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import LockIcon from "./components/LockIcon.jsx";
const FREE_RESEARCH_KEY = "interviewai_company_research_free_used";

/** Candidate Home — dark glass / futuristic shell (matches recruiter futurist vibe) */
const FH = {
  font: "'Inter', system-ui, sans-serif",
  glass: "rgba(12, 8, 30, 0.75)",
  glassHi: "rgba(18, 12, 38, 0.88)",
  border: "1px solid rgba(139, 92, 246, 0.32)",
  borderSoft: "1px solid rgba(139, 92, 246, 0.18)",
  shadow: "0 8px 36px rgba(0,0,0,0.4), 0 0 32px rgba(124, 58, 237, 0.08)",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const glassTileHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 16px 48px rgba(124, 58, 237, 0.2), 0 0 28px rgba(124, 58, 237, 0.1)";
    e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.45)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = FH.shadow;
    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.32)";
  },
};

const glassBtnHover = {
  onMouseEnter: (e) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.background = "rgba(139, 92, 246, 0.14)";
    e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.45)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.28)";
  },
};

const primaryGlowHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.filter = "brightness(1.06)";
    e.currentTarget.style.boxShadow = "0 10px 40px rgba(124, 58, 237, 0.65), 0 0 56px rgba(45, 212, 191, 0.15)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.filter = "brightness(1)";
    e.currentTarget.style.boxShadow = "0 8px 36px rgba(124, 58, 237, 0.55), 0 0 48px rgba(124, 58, 237, 0.25)";
  },
  onMouseDown: (e) => {
    e.currentTarget.style.transform = "scale(0.99)";
  },
  onMouseUp: (e) => {
    e.currentTarget.style.transform = "scale(1)";
  },
};

function hasUsedFreeResearch() {
  try {
    return localStorage.getItem(FREE_RESEARCH_KEY) === "1";
  } catch {
    return false;
  }
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function streakFromSessions(sessions) {
  const set = new Set((sessions || []).map((s) => dayKey(s.created_at)));
  let start = 0;
  const today = dayKey(Date.now());
  if (!set.has(today)) start = 1;
  let streak = 0;
  for (let i = start; i < 400; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const k = dayKey(d.getTime());
    if (set.has(k)) streak++;
    else break;
  }
  return streak;
}

function greetingName(user) {
  const meta = user?.user_metadata || {};
  const n = meta.full_name || meta.name;
  if (n && typeof n === "string") return n.trim().split(/\s+/)[0] || "there";
  if (user?.email) return user.email.split("@")[0];
  return "there";
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function displayFullName(user) {
  const meta = user?.user_metadata || {};
  const n = meta.full_name || meta.name;
  if (n && typeof n === "string" && n.trim()) return n.trim();
  return greetingName(user);
}

function msToNextMidnight() {
  const t = new Date();
  t.setHours(24, 0, 0, 0);
  return Math.max(0, t.getTime() - Date.now());
}

function formatCountdown(ms) {
  const sec = Math.floor(ms / 1000);
  const s = sec % 60;
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600) % 24;
  const d = Math.floor(sec / 86400);
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatActivityWhen(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYest =
    d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today ${timeStr}`;
  if (isYest) return `Yesterday ${timeStr}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.9 }}>
      <path d="M4 19V5M8 19V11M12 19V8M16 19v-5M20 19V9" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconHourglass() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.9 }}>
      <path
        d="M8 2h8v4l-3 4 3 4v4H8v-4l3-4-3-4V2z"
        stroke="#60a5fa"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.9 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.9 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#c4b5fd" strokeWidth="1.5" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MiniSpark({ stroke, d }) {
  return (
    <svg width="70" height="26" viewBox="0 0 70 26" aria-hidden style={{ position: "absolute", right: 10, bottom: 8, opacity: 0.75 }}>
      <path
        d={d || "M0,18 L10,14 L20,20 L30,8 L40,15 L50,6 L60,12 L70,10"}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CandidateHome({
  user,
  isPro,
  onPrepare,
  onResearch,
  onAcademy,
  onDocuments,
  onCvTailor,
  onCvEditor,
  onPricing,
  onOpenUpgrade,
  onJobTracker,
  onOpenLastReport,
  onPracticeWeakFromSession,
  onAriaLive,
  onDashboard,
}) {
  const [sessions, setSessions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user?.id || isDemo) {
      setLoading(false);
      return;
    }
    (async () => {
      let sessQ = supabase.from("interview_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (!isPro) sessQ = sessQ.limit(3);
      const [sessRes, jobsRes] = await Promise.all([
        sessQ,
        supabase.from("jobs").select("id,title,company,status").eq("user_id", user.id).order("updated_at", { ascending: false }),
      ]);
      setSessions(Array.isArray(sessRes.data) ? sessRes.data : []);
      setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
      setLoading(false);
    })();
  }, [user?.id, isDemo, isPro]);

  const stats = useMemo(() => {
    const list = sessions || [];
    const scored = list.filter((s) => Number(s.score) > 0);
    const avg = scored.length ? Math.round(scored.reduce((a, b) => a + Number(b.score), 0) / scored.length) : 0;
    const best = scored.length ? Math.max(...scored.map((s) => Number(s.score))) : 0;
    return {
      total: list.length,
      avg,
      best,
      streak: streakFromSessions(list),
    };
  }, [sessions]);

  const recent = useMemo(() => (sessions || []).slice(0, isPro ? 4 : 3), [sessions, isPro]);
  const lastSession = sessions?.[0];

  const jobCount = jobs.length;
  const nextInterviewJob = useMemo(() => (jobs || []).find((j) => j.status === "interview"), [jobs]);

  const needProForResearch = !isPro && hasUsedFreeResearch();

  const nextSessionMain = nextInterviewJob
    ? `${nextInterviewJob.title || "Role"}${nextInterviewJob.company ? ` | ${nextInterviewJob.company}` : ""}`
    : lastSession?.job_title
      ? `${lastSession.job_title} · Last session`
      : "Add roles in Job Tracker";

  const nextSessionSub = nextInterviewJob ? "Interview stage" : "Plan your next simulation";

  const run = (kind) => {
    if (isDemo) {
      onOpenUpgrade?.();
      return;
    }
    if (kind === "research") {
      if (needProForResearch) {
        onOpenUpgrade?.();
        return;
      }
      onResearch?.();
      return;
    }
    if (["cvtailor", "cveditor", "academy"].includes(kind) && !isPro) {
      onOpenUpgrade?.();
      return;
    }
    if (kind === "prepare") onPrepare?.();
    else if (kind === "documents") onDocuments?.();
    else if (kind === "cvtailor") onCvTailor?.();
    else if (kind === "cveditor") onCvEditor?.();
    else if (kind === "academy") onAcademy?.();
  };

  const tile = (title, desc, kind, { proOnly = false, showLock = false } = {}) => (
    <button
      key={kind}
      type="button"
      onClick={() => run(kind)}
      style={{
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        border: FH.border,
        borderRadius: "16px",
        background: FH.glass,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: FH.shadow,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "8px",
        padding: "20px",
        fontFamily: FH.font,
        transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
      }}
      {...glassTileHover}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
        <span style={{ fontWeight: 800, fontSize: "16px", color: FH.text, flex: 1 }}>{title}</span>
        {proOnly && !isPro && <LockIcon color="#a78bfa" />}
        {proOnly && isPro && (
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#fff",
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              padding: "3px 8px",
              borderRadius: "999px",
              boxShadow: "0 0 12px rgba(124, 58, 237, 0.4)",
            }}
          >
            Pro
          </span>
        )}
        {showLock && needProForResearch && <LockIcon color="#a78bfa" />}
      </div>
      <p style={{ margin: 0, fontSize: "14px", color: FH.muted, lineHeight: 1.55, fontWeight: 400 }}>{desc}</p>
    </button>
  );

  const secondaryBtn = (disabled) => ({
    minHeight: "48px",
    padding: "14px 28px",
    fontWeight: 600,
    fontFamily: FH.font,
    fontSize: "14px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: disabled ? FH.dim : FH.text,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
    transition: "background 0.2s ease, border-color 0.2s ease, opacity 0.2s ease",
  });

  const activityBadge = (s) => {
    const sc = s.score;
    if (sc != null && Number(sc) > 0) {
      return { t: "Completed", bg: "rgba(34,197,94,0.14)", c: "#86efac", b: "1px solid rgba(34,197,94,0.35)" };
    }
    if (sc != null && Number(sc) === 0) {
      return { t: "Feedback pending", bg: "rgba(234,179,8,0.12)", c: "#fcd34d", b: "1px solid rgba(234,179,8,0.35)" };
    }
    return { t: "Submitted", bg: "rgba(82,82,91,0.35)", c: "#d4d4d8", b: "1px solid rgba(113,113,122,0.4)" };
  };
  const actEdges = ["#a78bfa", "#14b8a6", "#eab308", "#71717a"];

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: FH.font,
        color: FH.text,
        overflowX: "hidden",
        boxSizing: "border-box",
        position: "relative",
        background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #000000 100%)",
        colorScheme: "dark",
      }}
    >
      <style>{`
        @keyframes ch-gridPulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.65; } }
        .ch-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: ch-gridPulse 8s ease-in-out infinite;
        }
        .ch-title-grad {
          font-size: clamp(1.65rem, 4.5vw, 2.15rem);
          font-weight: 900;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
          line-height: 1.12;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 38%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ch-stat-shine::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(167,139,250,0.85), rgba(94,234,212,0.55), transparent);
          border-radius: 16px 16px 0 0;
        }
        .ch-dash-panel {
          position: relative;
          border-radius: 22px;
          background: rgba(16, 12, 32, 0.55);
          border: 1px solid rgba(139, 92, 246, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 24px 64px rgba(0, 0, 0, 0.45),
            0 0 60px rgba(124, 58, 237, 0.06);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .ch-dot-deco {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
          opacity: 0.35;
        }
        .ch-dot-deco span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(167, 139, 250, 0.7);
          box-shadow: 0 0 8px rgba(124, 58, 237, 0.5);
        }
        .ch-tools-details > summary { list-style: none; }
        .ch-tools-details > summary::-webkit-details-marker { display: none; }
      `}</style>
      <div className="ch-page-grid" aria-hidden />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-12%",
          left: "-8%",
          width: "55vw",
          maxWidth: 480,
          height: "55vw",
          maxHeight: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 68%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-8%",
          right: "-10%",
          width: "50vw",
          maxWidth: 420,
          height: "50vw",
          maxHeight: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 2, maxWidth: "1040px", margin: "0 auto", padding: "16px 16px 48px", boxSizing: "border-box" }}>
        <div className="ch-dash-panel" style={{ padding: "clamp(20px, 4vw, 36px) clamp(16px, 4vw, 40px)", position: "relative" }}>
          <div className="ch-dot-deco" style={{ left: 10 }} aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="ch-dot-deco" style={{ right: 10 }} aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#8b8b9b",
              }}
            >
              Welcome back
            </p>
            <h1 className="ch-title-grad">
              {timeGreeting()}, {greetingName(user)}
            </h1>
            <p style={{ margin: "0 0 4px", fontSize: "15px", color: FH.muted, fontWeight: 400, lineHeight: 1.55 }}>
              Personalized briefing ready for today.
            </p>
            <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#9ca3af", lineHeight: 1.5 }}>
              Signed in as {displayFullName(user)}
              {isPro ? ", PRO" : ", Free"}.
            </p>

            {isDemo && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "14px 16px",
                  borderRadius: "14px",
                  border: "1px solid rgba(251,191,36,0.35)",
                  background: "rgba(66,32,6,0.55)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p style={{ margin: 0, color: "#fcd34d", fontSize: "14px", lineHeight: 1.5 }}>Sign in to save progress and use AI tools end-to-end.</p>
              </div>
            )}

            {loading ? (
              <p style={{ color: FH.muted, fontSize: "15px" }}>Loading your stats…</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "14px",
                  marginBottom: "32px",
                }}
              >
                <div
                  className="ch-stat-shine"
                  style={{
                    position: "relative",
                    padding: "16px 16px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(167, 139, 250, 0.35)",
                    background: FH.glass,
                    backdropFilter: "blur(16px)",
                    boxShadow: FH.shadow,
                    overflow: "hidden",
                    minHeight: "128px",
                  }}
                >
                  <IconChart />
                  <div style={{ fontSize: "11px", fontWeight: 700, color: FH.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "10px" }}>Avg. score</div>
                  <div style={{ fontSize: "30px", fontWeight: 800, color: FH.text, marginTop: "4px", textShadow: "0 0 24px rgba(124,58,237,0.3)" }}>
                    {stats.avg ? `${stats.avg}%` : "—"}
                  </div>
                  <MiniSpark stroke="#a78bfa" d="M0,20 L12,12 L22,18 L34,6 L46,14 L58,8 L70,14" />
                </div>
                <div
                  className="ch-stat-shine"
                  style={{
                    position: "relative",
                    padding: "16px 16px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(96, 165, 250, 0.3)",
                    background: FH.glass,
                    backdropFilter: "blur(16px)",
                    boxShadow: FH.shadow,
                    overflow: "hidden",
                    minHeight: "128px",
                  }}
                >
                  <IconHourglass />
                  <div style={{ fontSize: "11px", fontWeight: 700, color: FH.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "10px" }}>Sessions</div>
                  <div style={{ fontSize: "30px", fontWeight: 800, color: FH.text, marginTop: "4px" }}>{stats.total}</div>
                  <div style={{ fontSize: "12px", color: FH.muted, marginTop: "4px" }}>Practice completed</div>
                  <MiniSpark stroke="#60a5fa" d="M0,16 L14,22 L28,10 L42,18 L56,12 L70,8" />
                </div>
                <div
                  className="ch-stat-shine"
                  style={{
                    position: "relative",
                    padding: "16px 16px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(94, 234, 212, 0.28)",
                    background: FH.glassHi,
                    backdropFilter: "blur(16px)",
                    boxShadow: FH.shadow,
                    overflow: "hidden",
                    minHeight: "128px",
                  }}
                >
                  <IconDoc />
                  <div style={{ fontSize: "11px", fontWeight: 700, color: FH.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "10px" }}>Applications</div>
                  <div style={{ fontSize: "30px", fontWeight: 800, color: FH.text, marginTop: "4px" }}>{String(jobCount).padStart(2, "0")}</div>
                  <div style={{ fontSize: "12px", color: FH.muted, marginTop: "4px" }}>Active status</div>
                  <MiniSpark stroke="#5eead4" d="M0,22 L12,8 L26,16 L40,6 L54,14 L70,10" />
                </div>
                <div
                  className="ch-stat-shine"
                  style={{
                    position: "relative",
                    padding: "16px 16px 20px",
                    borderRadius: "16px",
                    border: "1px solid rgba(196, 181, 253, 0.35)",
                    background: FH.glass,
                    backdropFilter: "blur(16px)",
                    boxShadow: FH.shadow,
                    overflow: "hidden",
                    minHeight: "128px",
                  }}
                >
                  <IconCalendar />
                  <div style={{ fontSize: "11px", fontWeight: 700, color: FH.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "10px" }}>Next session</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: FH.text, marginTop: "8px", lineHeight: 1.35, maxWidth: "92%" }}>{nextSessionMain}</div>
                  <div style={{ fontSize: "12px", color: FH.muted, marginTop: "6px" }}>{nextSessionSub}</div>
                  <div style={{ fontSize: "11px", color: "#c4b5fd", marginTop: "10px", fontWeight: 600, textShadow: "0 0 16px rgba(167,139,250,0.5)" }}>
                    Countdown {formatCountdown(msToNextMidnight())}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
              <button
                type="button"
                onClick={() => onPrepare?.()}
                style={{
                  width: "100%",
                  maxWidth: "440px",
                  minHeight: "54px",
                  padding: "16px 24px",
                  textAlign: "center",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: FH.font,
                  fontWeight: 700,
                  fontSize: "16px",
                  borderRadius: "999px",
                  color: "#fff",
                  background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
                  boxShadow: "0 8px 36px rgba(124, 58, 237, 0.55), 0 0 48px rgba(124, 58, 237, 0.25)",
                  transition: "filter 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
                }}
                {...primaryGlowHover}
              >
                Start Practice Simulation
              </button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", width: "100%" }}>
                <button type="button" onClick={() => onDashboard?.()} style={secondaryBtn(false)} {...glassBtnHover}>
                  Review Insights
                </button>
                <button type="button" onClick={() => onDashboard?.()} style={secondaryBtn(false)} {...glassBtnHover}>
                  Dashboard & history
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                  width: "100%",
                  maxWidth: 640,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isDemo) {
                      onOpenUpgrade?.();
                      return;
                    }
                    onAriaLive?.();
                  }}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                    border: FH.border,
                    borderRadius: "16px",
                    background: FH.glass,
                    backdropFilter: "blur(16px)",
                    boxShadow: FH.shadow,
                    padding: "18px 20px",
                    fontFamily: FH.font,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                  }}
                  {...glassTileHover}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(124,58,237,.25)",
                      border: "1px solid rgba(167,139,250,.4)",
                      color: "#e9d5ff",
                    }}
                  >
                    NEW
                  </span>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                        boxShadow: "0 0 24px rgba(124,58,237,.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      A
                    </div>
                    <div style={{ minWidth: 0, paddingRight: 48 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: FH.text, marginBottom: 6 }}>Aria Live</div>
                      <div style={{ fontSize: 13, color: FH.muted, lineHeight: 1.45 }}>Talk to your AI coach in real time</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {recent.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <h2 style={{ fontWeight: 800, color: "#9ca3af", marginBottom: "14px", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Recent prep activity
                </h2>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {recent.map((s, idx) => {
                    const edge = actEdges[idx % actEdges.length];
                    const b = activityBadge(s);
                    return (
                      <li key={s.id} style={{ marginBottom: "12px" }}>
                        <button
                          type="button"
                          onClick={() => onOpenLastReport?.(s)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "16px 18px",
                            cursor: "pointer",
                            border: "1px solid rgba(139, 92, 246, 0.15)",
                            borderLeft: `3px solid ${edge}`,
                            borderRadius: "14px",
                            background: "rgba(10, 8, 24, 0.65)",
                            backdropFilter: "blur(12px)",
                            fontFamily: FH.font,
                            boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
                            transition: "box-shadow 0.2s ease, transform 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "0 8px 32px rgba(124, 58, 237, 0.12)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.28)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                            <span style={{ fontWeight: 700, color: FH.text, fontSize: "15px" }}>{s.job_title || "Interview"}</span>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                background: b.bg,
                                color: b.c,
                                border: b.b,
                              }}
                            >
                              {b.t}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <span style={{ color: FH.muted, fontSize: "13px" }}>{formatActivityWhen(s.created_at)}</span>
                            <span style={{ color: FH.text, fontSize: "14px", fontWeight: 600 }}>Score {s.score ?? "—"}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <details
              className="ch-tools-details"
              style={{ marginTop: "24px", borderRadius: "14px", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(8,6,20,0.4)", padding: "4px 8px" }}
            >
              <summary style={{ padding: "12px 14px", cursor: "pointer", fontWeight: 700, fontSize: "13px", color: "#c4b5fd" }}>More tools</summary>
              <div style={{ padding: "8px 8px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
                {tile("Prepare for an interview", "Paste CV + job description and get tailored questions.", "prepare")}
                {tile(
                  "Company research",
                  isPro
                    ? "Briefing pack for your target employer."
                    : hasUsedFreeResearch()
                      ? "You've used your free research — Pro for unlimited."
                      : "One free research in this browser, then Pro.",
                  "research",
                  { showLock: true }
                )}
                {tile("CV Tailor", "Rewrite your CV to match a specific role.", "cvtailor", { proOnly: true })}
                {tile("CV Editor", "Strengths, gaps, and ATS-oriented suggestions.", "cveditor", { proOnly: true })}
                {tile("Interview Academy", "Structured lessons and AI feedback.", "academy", { proOnly: true })}
                {tile("Documents", "Cover letters and notes saved by job.", "documents")}
              </div>
            </details>

            <div style={{ marginTop: "28px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => onPricing?.()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#a78bfa",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Pricing &amp; how Pro works
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
