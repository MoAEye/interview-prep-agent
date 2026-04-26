import { useState, useEffect, useId, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { btnPrimary, btnPrimaryHover, StarDots } from "./candidateUi.jsx";

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const GOAL_SCORE = 75;

const glassCard = {
  borderRadius: "16px",
  background: "rgba(16, 12, 32, 0.58)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const mockCard = {
  borderRadius: "14px",
  background: "rgba(22, 22, 29, 0.94)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

/** Wraps dashboard blocks with Show / Hide — keeps the page compact. */
const collapsibleShell = {
  marginBottom: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(139, 92, 246, 0.2)",
  background: "rgba(10, 8, 18, 0.78)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  overflow: "hidden",
};

const ghostBtnHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
    e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.35)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.28)";
  },
};

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function streakFromSessions(sessions) {
  const set = new Set(sessions.map((s) => dayKey(s.created_at)));
  let start = 0;
  const today = dayKey(Date.now());
  if (!set.has(today)) start = 1;
  let streak = 0;
  for (let i = start; i < 400; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    if (set.has(dayKey(d.getTime()))) streak++;
    else break;
  }
  return streak;
}

function mondayOfWeek(ts) {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** GitHub-style grid: rows = Mon–Sun, cols = weeks (oldest → newest). */
function buildGitHubHeatmap(sessions, weekCols = 28) {
  const countsByDay = {};
  sessions.forEach((s) => {
    const k = dayKey(s.created_at);
    countsByDay[k] = (countsByDay[k] || 0) + 1;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const endMonday = mondayOfWeek(todayMs);
  const start = new Date(endMonday);
  start.setDate(start.getDate() - (weekCols - 1) * 7);
  const startMs = start.getTime();
  const grid = Array.from({ length: 7 }, () => []);
  let maxC = 1;
  for (let c = 0; c < weekCols; c++) {
    for (let r = 0; r < 7; r++) {
      const dms = startMs + (c * 7 + r) * 86400000;
      const d = new Date(dms);
      const k = dayKey(dms);
      const isFuture = dms > todayMs;
      const count = isFuture ? 0 : countsByDay[k] || 0;
      if (count > maxC) maxC = count;
      grid[r][c] = { t: dms, count, k, isFuture };
    }
  }
  return { grid, maxC: Math.max(1, maxC), startMs, weekCols };
}

function ariaFocusLabel(id) {
  const m = {
    general: "General coaching",
    star: "STAR & stories",
    weak_area: "Weakest area",
    mock_warmup: "Mock sprint",
  };
  if (!id) return "—";
  return m[id] || String(id).replace(/_/g, " ");
}

function focusByType(sessions, typeOrder) {
  const acc = {};
  sessions.forEach((s) => {
    (Array.isArray(s.answers) ? s.answers : []).forEach((a) => {
      if (a?.type == null || a.score === undefined || a.score === null) return;
      const t = String(a.type).toLowerCase();
      if (!acc[t]) acc[t] = { sum: 0, n: 0 };
      acc[t].sum += Number(a.score);
      acc[t].n += 1;
    });
  });
  return typeOrder.map((label) => {
    const key = label.toLowerCase();
    const v = acc[key];
    if (!v || v.n === 0) return { label, pct: null };
    const pct = Math.round((v.sum / v.n / 10) * 100);
    return { label, pct: Math.min(100, Math.max(0, pct)) };
  });
}

function skipRateInsight(sessions) {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const buckets = [
    { skip: 0, tot: 0 },
    { skip: 0, tot: 0 },
  ];
  sessions.forEach((s) => {
    const t = new Date(s.created_at).getTime();
    const idx = t >= now - weekMs ? 0 : t >= now - 2 * weekMs && t < now - weekMs ? 1 : -1;
    if (idx < 0) return;
    (Array.isArray(s.answers) ? s.answers : []).forEach((a) => {
      buckets[idx].tot++;
      if (a.skipped) buckets[idx].skip++;
    });
  });
  const [cur, prev] = buckets;
  if (cur.tot < 2 || prev.tot < 2) return null;
  const r0 = prev.skip / prev.tot;
  const r1 = cur.skip / cur.tot;
  const drop = Math.round((r0 - r1) * 100);
  if (drop >= 8) return `Tip: Your skip rate dropped ${drop}% vs the prior week.`;
  if (drop <= -15) return `Heads up: Skip rate is up recently — try shorter verbal answers to stay in flow.`;
  return null;
}

function heroHeadline(avg, trend, nScored) {
  if (nScored === 0) return "Start your interview journey";
  if (trend >= 8) return "Your trajectory is sharpening";
  if (trend <= -8) return "Reset and focus — every session counts";
  if (avg >= 65) return "Solid progress — keep the rhythm";
  return "Build consistency one session at a time";
}

function suggestedFocusLine(sessions, scoredChrono, trend) {
  const typeMisses = {};
  sessions.forEach((s) => {
    (Array.isArray(s.answers) ? s.answers : []).forEach((a) => {
      if (a?.score !== undefined && Number(a.score) < 6 && a.type) {
        const t = String(a.type).toLowerCase();
        typeMisses[t] = (typeMisses[t] || 0) + 1;
      }
    });
  });
  const top = Object.entries(typeMisses).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const label = top[0].charAt(0).toUpperCase() + top[0].slice(1);
    return `Strengthen ${label} answers — ${top[1]} low score${top[1] > 1 ? "s" : ""} in recent sessions.`;
  }
  const allGrades = sessions.flatMap((s) =>
    Array.isArray(s.answers) ? s.answers.filter((a) => a.score !== undefined && a.score < 6) : []
  );
  if (allGrades.length > 0) return "Review your lowest-scoring questions in Prepare — small improvements compound quickly.";
  const recent = scoredChrono.slice(-3);
  const declining =
    recent.length >= 2 && recent[recent.length - 1].score < recent[0].score - 8;
  const lastLow = recent.length > 0 && recent[recent.length - 1].score < 25;
  if (sessions.length >= 3 && scoredChrono.length >= 2 && !declining && !lastLow && trend >= -8) {
    return "Great momentum. Try a full mock interview this week to lock in consistency.";
  }
  if (declining || trend < -12 || lastLow) {
    return "Recent scores dipped — tighten answers on your weakest prompts in Prepare, then run a short mock to steady the trend.";
  }
  return "Complete a few more scored interviews to unlock personalized focus tips.";
}

function SemiGauge({ avg, gaugeGradId }) {
  const r = 78;
  const cx = 108;
  const cy = 102;
  const arcLen = Math.PI * r;
  const pct = Math.min(100, Math.max(0, avg));
  const dash = (pct / 100) * arcLen;
  const glowId = `${gaugeGradId}-glow`;
  return (
    <svg width="216" height="124" viewBox="0 0 216 124" aria-hidden style={{ filter: "drop-shadow(0 0 24px rgba(139, 92, 246, 0.4))" }}>
      <defs>
        <linearGradient id={gaugeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={`url(#${gaugeGradId})`}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${arcLen}`}
        filter={`url(#${glowId})`}
      />
      <text textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
        <tspan x={cx} y={cy - 10} fill="#fafafa" fontSize="28" fontWeight="800">
          {avg}%
        </tspan>
        <tspan x={cx} y={cy + 6} fill="#a1a1aa" fontSize="10" fontWeight="600">
          average
        </tspan>
        <tspan x={cx} y={cy + 22} fill="#71717a" fontSize="10" fontWeight="600">
          {`vs goal ${GOAL_SCORE}%`}
        </tspan>
      </text>
    </svg>
  );
}

function StreakDiamond({ gradId }) {
  const gid = gradId || "sd";
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.95 }}>
      <path d="M12 4l7 8-7 8-7-8 7-8z" fill={`url(#${gid})`} stroke="rgba(250,204,21,0.35)" strokeWidth="0.6" />
      <defs>
        <linearGradient id={gid} x1="5" y1="4" x2="19" y2="20">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Purple bar + caps label — real DOM node so it never reads as a stray “I” next to uppercase text. */
function SectionLabel({ children, style }) {
  return (
    <div className="dash-section-label" style={style}>
      <span className="dash-section-label-bar" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

function CollapsibleDashSection({ title, subtitle, defaultOpen = true, badge, contentStyle, id, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} style={collapsibleShell}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "14px 16px",
          background: open ? "rgba(124, 58, 237, 0.08)" : "transparent",
          border: "none",
          borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none",
          cursor: "pointer",
          fontFamily: FH.font,
          textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: subtitle ? 6 : 0 }}>
            <SectionLabel style={{ marginBottom: 0 }}>{title}</SectionLabel>
            {badge != null && badge !== "" ? (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#c4b5fd",
                  background: "rgba(124, 58, 237, 0.2)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  border: "1px solid rgba(167, 139, 250, 0.35)",
                }}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? <p style={{ margin: 0, fontSize: "12px", color: FH.dim, lineHeight: 1.5 }}>{subtitle}</p> : null}
        </div>
        <span style={{ flexShrink: 0, fontSize: "12px", fontWeight: 700, color: "#a78bfa" }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div style={{ padding: "12px 14px 16px", boxSizing: "border-box", ...contentStyle }}>{children}</div>
      ) : null}
    </div>
  );
}

function ariaLiveModeShort(modeKey) {
  if (modeKey === "coach") return "Coach";
  if (modeKey === "teach") return "Teach";
  if (modeKey === "mock") return "Mock";
  return String(modeKey || "—");
}

function formatAriaLiveDuration(sec) {
  const dur = Number(sec) || 0;
  const mm = Math.floor(dur / 60);
  const ss = dur % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function AriaLiveSessionCard({ row, formatDateTime }) {
  const [expanded, setExpanded] = useState(false);
  const topics = Array.isArray(row.topics) ? row.topics : [];
  const fullSummary = String(row.summary || "").replace(/\s+/g, " ").trim();

  const preview = useMemo(() => {
    const max = 168;
    if (fullSummary.length <= max) return { text: fullSummary, truncated: false };
    const cut = fullSummary.slice(0, max);
    const sp = cut.lastIndexOf(" ");
    return { text: `${sp > max * 0.55 ? cut.slice(0, sp) : cut}…`, truncated: true };
  }, [fullSummary]);

  const showBody = Boolean(fullSummary);
  const showToggle = preview.truncated;

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "14px",
        border: "1px solid rgba(139,92,246,0.22)",
        background: "linear-gradient(165deg, rgba(24,20,35,0.95) 0%, rgba(10,10,14,0.88) 100%)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 10px", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", fontWeight: 800, color: FH.text }}>{formatDateTime(row.created_at)}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            { k: "t", v: formatAriaLiveDuration(row.duration_seconds) },
            { k: "m", v: `${row.message_count ?? 0} msgs` },
            { k: "o", v: ariaLiveModeShort(row.session_mode) },
          ].map((chip) => (
            <span
              key={chip.k}
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "4px 8px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(124,58,237,0.15)",
                color: "#e4e4e7",
              }}
            >
              {chip.v}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginTop: "10px", fontSize: "11px", color: FH.muted }}>
        <span style={{ fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "9px" }}>Focus</span>
        <span style={{ marginLeft: 8, color: "#d4d4d8" }}>{ariaFocusLabel(row.focus_id)}</span>
      </div>
      {topics.length ? (
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {topics.map((t) => (
            <span
              key={t}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "999px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.28)",
                color: "#86efac",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {showBody ? (
        <>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: "13px",
              color: "#d4d4d8",
              lineHeight: 1.55,
              ...(expanded || !showToggle
                ? {}
                : {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }),
            }}
          >
            {expanded ? fullSummary : preview.text}
          </p>
          {showToggle ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              style={{
                marginTop: "8px",
                background: "none",
                border: "none",
                color: "#a78bfa",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              {expanded ? "Show less" : "Read full summary"}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ContributionHeatmap({ gh }) {
  const { grid, maxC, startMs, weekCols } = gh;
  const cell = 11;
  const gap = 3;
  const monthLabels = [];
  for (let c = 0; c < weekCols; c++) {
    const monday = new Date(startMs + c * 7 * 86400000);
    const prevM = c > 0 ? new Date(startMs + (c - 1) * 7 * 86400000).getMonth() : -1;
    monthLabels.push(c === 0 || monday.getMonth() !== prevM ? monday.toLocaleDateString("en-GB", { month: "short" }) : "");
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: weekCols * (cell + gap) + 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {grid.map((row, r) => (
            <div key={r} style={{ display: "flex", gap }}>
              {row.map((cellData, c) => {
                const intensity = cellData.isFuture ? 0 : cellData.count / maxC;
                const bg = cellData.isFuture
                  ? "rgba(255,255,255,0.02)"
                  : cellData.count === 0
                    ? "rgba(255,255,255,0.05)"
                    : `rgba(139, 92, 246, ${0.25 + intensity * 0.7})`;
                return (
                  <div
                    key={c}
                    title={cellData.isFuture ? "" : `${cellData.count} session(s) · ${cellData.k}`}
                    style={{
                      width: cell,
                      height: cell,
                      borderRadius: 3,
                      background: bg,
                      border: "1px solid rgba(139,92,246,0.12)",
                      flexShrink: 0,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap, marginTop: 8 }}>
          {monthLabels.map((lab, c) => (
            <div
              key={c}
              style={{
                width: cell,
                flexShrink: 0,
                fontSize: 7,
                color: "#52525b",
                textAlign: "center",
                lineHeight: 1.15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {lab}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ onBack, isPro = true }) {
  const gradId = useId().replace(/:/g, "");
  const gaugeGradId = useId().replace(/:/g, "");
  const streakGradId = useId().replace(/:/g, "");
  const [sessions, setSessions] = useState([]);
  const [ariaLiveSessions, setAriaLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [toastDismissed, setToastDismissed] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        let q = supabase
          .from("interview_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (!isPro) q = q.limit(3);
        let aq = supabase
          .from("aria_live_sessions")
          .select("id, created_at, duration_seconds, focus_id, session_mode, topics, message_count, summary")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (!isPro) aq = aq.limit(5);
        const [{ data }, ariaRes] = await Promise.all([q, aq]);
        if (data) setSessions(data);
        if (ariaRes.error) {
          setAriaLiveSessions([]);
        } else if (ariaRes.data) {
          setAriaLiveSessions(ariaRes.data);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [isPro]);

  const scored = useMemo(
    () => [...sessions].filter((s) => s.score > 0).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [sessions]
  );
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
  const best = scored.length ? Math.max(...scored.map((s) => s.score)) : 0;
  const trend = scored.length >= 2 ? scored[scored.length - 1].score - scored[0].score : 0;
  const streak = useMemo(() => streakFromSessions(sessions), [sessions]);
  const gh = useMemo(() => buildGitHubHeatmap(sessions, 28), [sessions]);
  const focusChips = useMemo(() => focusByType(sessions, ["Behavioral", "Technical", "Situational"]), [sessions]);
  const sessionsNewest = useMemo(() => [...sessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [sessions]);
  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return sessionsNewest;
    return sessionsNewest.filter((s) => {
      const title = (s.job_title || "").toLowerCase();
      if (title.includes(q)) return true;
      const ans = Array.isArray(s.answers) ? s.answers : [];
      return ans.some((a) => (a.question || "").toLowerCase().includes(q) || (a.answer || "").toLowerCase().includes(q));
    });
  }, [sessionsNewest, historyQuery]);
  const skipTip = useMemo(() => skipRateInsight(sessions), [sessions]);
  const insight = useMemo(() => suggestedFocusLine(sessions, scored, trend), [sessions, scored, trend]);

  const chartW = 440;
  const chartH = 168;
  const pad = 38;
  const points = scored.map((s, i) => {
    const x = scored.length === 1 ? chartW / 2 : pad + (i / (scored.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((s.score / 100) * (chartH - pad * 2));
    return { x, y, score: s.score, date: s.created_at, title: s.job_title };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area =
    points.length > 1
      ? `M${points[0].x},${chartH - pad} ${points.map((p) => `L${p.x},${p.y}`).join(" ")} L${points[points.length - 1].x},${chartH - pad} Z`
      : "";

  const scoreColor = (s) => (s >= 80 ? "#34d399" : s >= 60 ? "#fbbf24" : s >= 40 ? "#fb923c" : "#f87171");

  const formatDate = (ts) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const formatDateTime = (ts) =>
    new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const heroTitle = heroHeadline(avg, trend, scored.length);

  if (loading) {
    return (
      <div
        className="flow-dark-shell"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          height: "100%",
          width: "100%",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FH.font,
          background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #000000 100%)",
          colorScheme: "dark",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="candidate-spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#c4b5fd", fontWeight: 600, fontSize: "15px" }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flow-dark-shell"
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        height: "100%",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
        fontFamily: FH.font,
        color: FH.text,
        position: "relative",
        boxSizing: "border-box",
        background: "#070510",
        backgroundImage: "linear-gradient(165deg, #08060f 0%, #0a0618 42%, #000000 100%)",
        colorScheme: "dark",
        overflow: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <style>{`
        @keyframes dash-gridPulse { 0%, 100% { opacity: 0.38; } 50% { opacity: 0.52; } }
        @media (max-width: 960px) {
          .dash-mock-grid { grid-template-columns: 1fr !important; }
          .dash-hero-mock-top { grid-template-columns: 1fr !important; justify-items: center; text-align: center; }
          .dash-hero-mock-top .dash-hero-copy { text-align: center; }
          .dash-hero-mock-top .dash-hero-mock-stats { max-width: 100%; }
        }
        @media (max-width: 640px) {
          .dash-hero-mock-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .dash-hist-head { display: none !important; }
          .dash-hist-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            grid-template-columns: unset !important;
          }
          .dash-hist-chev { align-self: flex-end; margin-top: -20px; }
        }
        .dash-page-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: dash-gridPulse 8s ease-in-out infinite;
        }
        .dash-title-grad {
          font-size: clamp(1.65rem, 4vw, 2.15rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0;
          line-height: 1.15;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 40%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dash-hero-shell {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(139, 92, 246, 0.22);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 24px 80px rgba(0,0,0,0.45),
            0 0 120px rgba(124, 58, 237, 0.12);
        }
        .dash-hero-shell::before {
          content: "";
          position: absolute;
          width: min(520px, 90vw);
          height: min(520px, 90vw);
          right: -18%;
          top: -55%;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.38) 0%, rgba(88, 28, 135, 0.12) 45%, transparent 68%);
          pointer-events: none;
        }
        .dash-hero-shell::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 42%, transparent 58%, rgba(139,92,246,0.06) 100%);
          pointer-events: none;
        }
        .dash-hero-inner { position: relative; z-index: 1; }
        .dash-section-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #71717a;
        }
        .dash-section-label-bar {
          flex-shrink: 0;
          width: 4px;
          height: 12px;
          border-radius: 2px;
          background: linear-gradient(180deg, #a78bfa, #6d28d9);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.45);
        }
      `}</style>
      <div className="dash-page-grid" aria-hidden />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "24px 16px 72px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onBack}
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
            {...ghostBtnHover}
          >
            Back
          </button>
          <div>
            <h1 className="dash-title-grad">Dashboard</h1>
            <p style={{ margin: "8px 0 0", fontSize: "15px", color: FH.muted, lineHeight: 1.5 }}>Your performance over time</p>
          </div>
        </div>

        {!isPro ? (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(167,139,250,0.3)",
              background: "rgba(124,58,237,0.08)",
              fontSize: 13,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#e9d5ff" }}>Free plan:</strong> showing your last 3 interview sessions only. Pro unlocks full history and deeper analytics.
          </div>
        ) : null}

        {sessions.length === 0 && ariaLiveSessions.length === 0 ? (
          <div style={{ ...glassCard, padding: "40px 28px", textAlign: "center" }}>
            <h2 style={{ color: FH.text, fontWeight: 800, fontSize: "20px", margin: "0 0 8px", letterSpacing: "-0.02em" }}>No data yet</h2>
            <p style={{ color: FH.muted, margin: 0, fontSize: "15px" }}>Complete interviews or Aria Live sessions to see your progress here.</p>
            <button type="button" onClick={onBack} style={{ ...btnPrimary, marginTop: "24px" }} {...btnPrimaryHover}>
              Start an interview
            </button>
          </div>
        ) : sessions.length === 0 && ariaLiveSessions.length > 0 ? (
          <>
            <div style={{ ...glassCard, padding: "22px 20px", marginBottom: "14px" }}>
              <h2 style={{ color: FH.text, fontWeight: 800, fontSize: "17px", margin: "0 0 8px" }}>Aria Live practice</h2>
              <p style={{ margin: 0, fontSize: "14px", color: FH.muted, lineHeight: 1.55 }}>
                Scored mock interviews will fill the charts once you complete them from Prepare. Expand the section below for your voice session history.
              </p>
            </div>
            <CollapsibleDashSection
              title="Aria Live sessions"
              subtitle="Each card is one voice session — time, focus, themes, and recap."
              defaultOpen={false}
              badge={`${ariaLiveSessions.length}`}
              contentStyle={{ padding: "4px 6px 10px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {ariaLiveSessions.map((row) => (
                  <AriaLiveSessionCard key={row.id} row={row} formatDateTime={formatDateTime} />
                ))}
              </div>
            </CollapsibleDashSection>
          </>
        ) : (
          <>
            <CollapsibleDashSection
              title="Performance summary"
              subtitle="Headline, stats, and your average vs the goal."
              defaultOpen
              contentStyle={{ padding: "8px 12px 14px" }}
            >
            <div
              className="dash-hero-shell"
              style={{
                borderRadius: "16px",
                background: "rgba(14, 14, 20, 0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                padding: "22px 22px 20px",
              }}
            >
              <div
                className="dash-hero-inner dash-hero-mock-top"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: "20px 28px",
                  alignItems: "center",
                }}
              >
                <div className="dash-hero-copy" style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "clamp(1.05rem, 2vw, 1.22rem)",
                      fontWeight: 700,
                      color: "#fafafa",
                      lineHeight: 1.3,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {heroTitle}
                  </p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#71717a", lineHeight: 1.55 }}>
                    Avg score vs a {GOAL_SCORE}% goal. Data from your saved interview sessions.
                  </p>
                  <div
                    className="dash-hero-mock-stats"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: "8px",
                      marginTop: "16px",
                      maxWidth: "420px",
                    }}
                  >
                    {[
                      ["Sessions", sessions.length, "#f4f4f5"],
                      ["Avg", avg, "#c4b5fd"],
                      ["Best", best, "#34d399"],
                      ["Streak", `${streak}d`, "#fbbf24"],
                    ].map(([label, val, col]) => (
                      <div
                        key={label}
                        style={{
                          padding: "10px 6px",
                          borderRadius: "10px",
                          background: "rgba(0,0,0,0.35)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "#71717a",
                            marginBottom: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3px",
                          }}
                        >
                          {label}
                          {label === "Streak" ? <StreakDiamond gradId={streakGradId} /> : null}
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: col, letterSpacing: "-0.02em" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <SemiGauge avg={avg} gaugeGradId={gaugeGradId} />
                </div>
              </div>
            </div>
            </CollapsibleDashSection>

            <CollapsibleDashSection
              title="Activity, focus & trends"
              subtitle="Heatmap, question types, score chart, and a short coaching note."
              defaultOpen
              contentStyle={{ padding: "6px 8px 12px" }}
            >
            <div
              className="dash-mock-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
                alignItems: "stretch",
                marginBottom: "12px",
              }}
            >
              <div style={{ ...mockCard, padding: "16px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <SectionLabel style={{ marginBottom: 0 }}>Session heatmap</SectionLabel>
                  <span
                    style={{
                      fontSize: "8px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      padding: "5px 10px",
                      borderRadius: "999px",
                      background: "rgba(124, 58, 237, 0.28)",
                      color: "#e9d5ff",
                      border: "1px solid rgba(167, 139, 250, 0.35)",
                    }}
                  >
                    NEW FEATURE
                  </span>
                </div>
                <ContributionHeatmap gh={gh} />
              </div>

              <div style={{ ...mockCard, padding: "16px 14px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <SectionLabel style={{ marginBottom: "10px" }}>Focus areas</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {focusChips.map(({ label, pct }) => (
                      <div key={label} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: FH.text }}>{label}</span>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: pct == null ? FH.dim : "#c4b5fd" }}>{pct == null ? "—" : `${pct}%`}</span>
                        </div>
                        <div style={{ height: "5px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div
                            style={{
                              width: pct == null ? "0%" : `${pct}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, #6d28d9, #a78bfa)",
                              borderRadius: "999px",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {scored.length >= 2 ? (
                  <div style={{ marginTop: "2px" }}>
                    <SectionLabel style={{ marginBottom: "10px" }}>Score trend</SectionLabel>
                    <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ maxWidth: "100%", height: "auto", display: "block" }}>
                      {[0, 25, 50, 75, 100].map((v) => {
                        const y = chartH - pad - (v / 100) * (chartH - pad * 2);
                        return (
                          <g key={v}>
                            <line x1={pad} y1={y} x2={chartW - pad} y2={y} stroke="rgba(63,63,70,0.9)" strokeWidth="1" />
                            <text x={pad - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#71717a">
                              {v}
                            </text>
                          </g>
                        );
                      })}
                      {area && <path d={area} fill={`url(#${gradId})`} opacity="0.4" />}
                      {points.length > 1 && (
                        <polyline points={polyline} fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
                      )}
                      {points.length > 1 && (
                        <polyline points={polyline} fill="none" stroke="#a78bfa" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
                      )}
                      {points.map((p, i) => {
                        const dStr = formatDate(p.date);
                        const prevStr = i > 0 ? formatDate(points[i - 1].date) : null;
                        const xAxisLabel = prevStr === dStr ? "" : dStr;
                        return (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" fill={scoreColor(p.score)} stroke="#18181b" strokeWidth="2" />
                            {xAxisLabel ? (
                              <text x={p.x} y={chartH - 8} textAnchor="middle" fontSize="9" fill="#71717a">
                                {xAxisLabel}
                              </text>
                            ) : null}
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#e9d5ff" fontWeight="700">
                              {p.score}
                            </text>
                          </g>
                        );
                      })}
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                ) : (
                  <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: FH.dim, lineHeight: 1.5 }}>Complete at least two scored interviews to see your trend line.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mock — compact insight + trend context */}
            <div
              style={{
                ...mockCard,
                marginBottom: 0,
                padding: "12px 16px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "12px 16px",
              }}
            >
              {scored.length >= 2 ? (
                <span style={{ fontWeight: 700, color: trend >= 0 ? "#86efac" : "#fca5a5", fontSize: "13px", whiteSpace: "nowrap" }}>
                  {trend >= 0 ? `+${trend}` : trend} pts · first → latest
                </span>
              ) : null}
              <span style={{ fontSize: "13px", color: "#d4d4d8", lineHeight: 1.5, flex: "1 1 200px", minWidth: 0 }}>{insight}</span>
              {scored.length >= 2 ? (
                <span style={{ fontSize: "12px", color: FH.dim, marginLeft: "auto", whiteSpace: "nowrap" }}>
                  {formatDate(scored[0].created_at)} → {formatDate(scored[scored.length - 1].created_at)}
                </span>
              ) : null}
            </div>
            </CollapsibleDashSection>

            {/* Aria Live session summaries */}
            {ariaLiveSessions.length > 0 ? (
              <CollapsibleDashSection
                title="Aria Live sessions"
                subtitle="Voice coaching — themes and recap. Expand a card for the full thread."
                defaultOpen={false}
                badge={`${ariaLiveSessions.length}`}
                contentStyle={{ padding: "4px 6px 10px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {ariaLiveSessions.map((row) => (
                    <AriaLiveSessionCard key={row.id} row={row} formatDateTime={formatDateTime} />
                  ))}
                </div>
              </CollapsibleDashSection>
            ) : null}

            <CollapsibleDashSection
              title="Session timeline"
              subtitle="Chronological dots for scored interviews."
              defaultOpen={false}
              badge={scored.length ? `${scored.length}` : undefined}
              contentStyle={{ padding: "8px 8px 12px" }}
            >
              <div style={{ ...mockCard, padding: "14px 16px 18px", marginBottom: 0 }}>
                {scored.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "12px", color: FH.dim }}>No scored sessions yet.</p>
                ) : (
                  <div style={{ position: "relative", paddingTop: "8px" }}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: "18px", height: "2px", background: "rgba(255,255,255,0.08)", borderRadius: "1px" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", gap: "4px" }}>
                      {scored.map((s, i) => (
                        <div key={s.id ?? i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", minWidth: 0 }}>
                          <div
                            title={`${s.job_title || "Interview"} · ${s.score}`}
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              background: scoreColor(s.score),
                              border: "2px solid #18181b",
                              boxShadow: "0 0 0 1px rgba(139,92,246,0.3)",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: "8px", color: "#52525b", marginTop: "10px", textAlign: "center", lineHeight: 1.2, maxWidth: "48px", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {formatDate(s.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleDashSection>

            <CollapsibleDashSection
              id="dash-interview-history"
              title="Interview history"
              subtitle="Search and expand rows for scores, stars, and Q&A detail."
              defaultOpen={false}
              badge={`${filteredHistory.length}`}
              contentStyle={{ padding: "4px 4px 8px" }}
            >
            <div style={{ ...mockCard, padding: 0, overflow: "hidden", marginBottom: 0 }}>
              <div style={{ padding: "12px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: FH.dim, fontWeight: 600 }}>{filteredHistory.length} shown</span>
                  <input
                    type="search"
                    placeholder="Search sessions…"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    className="candidate-input"
                    style={{
                      width: "200px",
                      maxWidth: "100%",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontFamily: FH.font,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(100px,1fr) minmax(120px,2fr) 72px 100px 72px",
                  gap: "8px",
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(139,92,246,0.12)",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: FH.dim,
                }}
                className="dash-hist-head"
              >
                <span>Date</span>
                <span>Role</span>
                <span style={{ textAlign: "center" }}>Score</span>
                <span style={{ textAlign: "center" }}>Stars</span>
                <span />
              </div>
              {filteredHistory.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: FH.dim, fontSize: "13px" }}>No sessions match your search.</div>
              ) : (
                filteredHistory.map((s, idx) => {
                  const rowId = s.id != null ? s.id : String(s.created_at ?? `row-${idx}`);
                  const open = historyOpen === rowId;
                  const answers = Array.isArray(s.answers) ? s.answers : [];
                  return (
                    <div key={rowId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <button
                        type="button"
                        className="dash-hist-row"
                        onClick={() => setHistoryOpen(open ? null : rowId)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(100px,1fr) minmax(120px,2fr) 72px 100px 72px",
                          gap: "8px",
                          width: "100%",
                          padding: "12px 16px",
                          alignItems: "center",
                          background: open ? "rgba(124,58,237,0.1)" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: FH.font,
                          color: FH.text,
                        }}
                      >
                        <span style={{ fontSize: "12px", color: FH.muted }}>{formatDateTime(s.created_at)}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.job_title || "Interview"}</span>
                        <span style={{ textAlign: "center", fontWeight: 800, fontSize: "13px", color: scoreColor(s.score || 0) }}>{s.score ?? "—"}</span>
                        <span style={{ display: "flex", justifyContent: "center" }}>
                          <StarDots count={s.stars || 0} size={5} />
                        </span>
                        <span className="dash-hist-chev" style={{ textAlign: "right", fontSize: "11px", fontWeight: 700, color: "#a78bfa" }}>{open ? "Collapse" : "Expand"}</span>
                      </button>
                      {open && (
                        <div style={{ padding: "0 16px 16px", background: "rgba(0,0,0,0.35)" }}>
                          {answers.length === 0 ? (
                            <p style={{ margin: "10px 0 0", color: FH.dim, fontSize: "13px" }}>No answer details saved for this session.</p>
                          ) : (
                            answers.map((a, j) => (
                              <div
                                key={j}
                                style={{
                                  padding: "12px 0",
                                  borderBottom: j < answers.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                                }}
                              >
                                <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a78bfa", marginBottom: "6px" }}>
                                  Q{j + 1}
                                </div>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: FH.text, marginBottom: "6px", lineHeight: 1.45 }}>{a.question || "—"}</div>
                                <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#d4d4d8" }}>
                                  {a.skipped ? <span style={{ color: "#f87171", fontWeight: 600 }}>Skipped</span> : (a.answer || "No answer recorded")}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            </CollapsibleDashSection>
          </>
        )}
      </div>

      {/* Insight toast */}
      {skipTip && !toastDismissed && sessions.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "min(520px, calc(100% - 32px))",
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "14px",
            background: "rgba(16, 12, 32, 0.92)",
            border: "1px solid rgba(139, 92, 246, 0.28)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
            fontFamily: FH.font,
          }}
        >
          <p style={{ margin: 0, flex: 1, fontSize: "13px", color: "#e4e4e7", lineHeight: 1.45 }}>{skipTip}</p>
          <button
            type="button"
            onClick={() => setToastDismissed(true)}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: FH.muted,
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FH.font,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

    </div>
  );
}
