import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function Dashboard({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setLoading(false); return; }
        const { data } = await supabase
          .from("interview_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: true });
        if (data) setSessions(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
        <p style={{ color: "#6c63ff", fontWeight: "700", fontSize: "1.1rem" }}>Loading dashboard...</p>
      </div>
    </div>
  );

  const scored = sessions.filter(s => s.score > 0);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
  const best = scored.length ? Math.max(...scored.map(s => s.score)) : 0;
  const trend = scored.length >= 2 ? scored[scored.length - 1].score - scored[0].score : 0;

  // Chart
  const chartW = 620, chartH = 180, pad = 40;
  const points = scored.map((s, i) => {
    const x = scored.length === 1 ? chartW / 2 : pad + (i / (scored.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((s.score / 100) * (chartH - pad * 2));
    return { x, y, score: s.score, date: s.created_at, title: s.job_title };
  });
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = points.length > 1
    ? `M${points[0].x},${chartH - pad} ` + points.map(p => `L${p.x},${p.y}`).join(" ") + ` L${points[points.length-1].x},${chartH - pad} Z`
    : "";

  // Weak topics from all answers
  const allGrades = sessions.flatMap(s =>
    Array.isArray(s.answers) ? s.answers.filter(a => a.score !== undefined && a.score < 6).map(a => a.question) : []
  );
  const topicCounts = {};
  allGrades.forEach(q => {
    const key = q?.slice(0, 40) || "Unknown";
    topicCounts[key] = (topicCounts[key] || 0) + 1;
  });
  const weakTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const scoreColor = (s) => s >= 80 ? "#4ecdc4" : s >= 60 ? "#ffd93d" : s >= 40 ? "#ff9a4d" : "#ff6b6b";

  const formatDate = (ts) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "750px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <button onClick={onBack} style={{ background: "white", border: "2px solid #e0e0e0", borderRadius: "12px", padding: "0.5rem 1.1rem", cursor: "pointer", fontWeight: "700", color: "#666", fontSize: "0.9rem" }}>← Back</button>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: "#1e3a5f", margin: 0 }}>📊 Dashboard</h1>
            <p style={{ color: "#888", margin: "0.2rem 0 0", fontSize: "0.85rem" }}>Your performance over time</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div style={{ background: "white", borderRadius: "24px", padding: "3rem 2rem", textAlign: "center", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📈</div>
            <h2 style={{ color: "#1e3a5f", fontWeight: "800", marginBottom: "0.5rem" }}>No data yet</h2>
            <p style={{ color: "#888" }}>Complete interviews to see your progress here.</p>
            <button onClick={onBack} style={{ marginTop: "1.5rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", padding: "0.85rem 2rem", fontWeight: "800", cursor: "pointer", fontSize: "1rem" }}>🚀 Start an Interview</button>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total Sessions", value: sessions.length, icon: "🎤", color: "#6c63ff" },
                { label: "Average Score", value: avg, icon: "📈", color: scoreColor(avg) },
                { label: "Best Score", value: best, icon: "🏆", color: "#4ecdc4" },
              ].map((c, i) => (
                <div key={i} style={{ background: "white", borderRadius: "18px", padding: "1.25rem", textAlign: "center", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>{c.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: "900", color: c.color }}>{c.value}</div>
                  <div style={{ color: "#aaa", fontSize: "0.78rem", fontWeight: "700", marginTop: "0.2rem" }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Trend */}
            {scored.length >= 2 && (
              <div style={{ background: "white", borderRadius: "18px", padding: "1rem 1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{trend >= 0 ? "📈" : "📉"}</span>
                <span style={{ fontWeight: "700", color: trend >= 0 ? "#2d6a4f" : "#b82e2e", fontSize: "0.95rem" }}>
                  {trend >= 0 ? `+${trend}` : trend} points since your first interview
                </span>
                <span style={{ color: "#aaa", fontSize: "0.82rem", marginLeft: "auto" }}>
                  {formatDate(scored[0].created_at)} → {formatDate(scored[scored.length-1].created_at)}
                </span>
              </div>
            )}

            {/* Score chart */}
            {scored.length >= 2 && (
              <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)", overflowX: "auto" }}>
                <h3 style={{ color: "#1e3a5f", fontWeight: "800", fontSize: "0.95rem", marginBottom: "1rem", margin: "0 0 1rem" }}>Score Trend</h3>
                <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ minWidth: "300px" }}>
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(v => {
                    const y = chartH - pad - (v / 100) * (chartH - pad * 2);
                    return (
                      <g key={v}>
                        <line x1={pad} y1={y} x2={chartW - pad} y2={y} stroke="#f0ebff" strokeWidth="1" />
                        <text x={pad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#bbb">{v}</text>
                      </g>
                    );
                  })}
                  {/* Area fill */}
                  {area && <path d={area} fill="url(#grad)" opacity="0.3" />}
                  {/* Line */}
                  {points.length > 1 && <polyline points={polyline} fill="none" stroke="#6c63ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
                  {/* Dots */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill={scoreColor(p.score)} stroke="white" strokeWidth="2" />
                      <text x={p.x} y={chartH - 6} textAnchor="middle" fontSize="9" fill="#bbb">{formatDate(p.date)}</text>
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#6c63ff" fontWeight="700">{p.score}</text>
                    </g>
                  ))}
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6c63ff" />
                      <stop offset="100%" stopColor="#6c63ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            {/* Weak topics */}
            {weakTopics.length > 0 && (
              <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
                <h3 style={{ color: "#1e3a5f", fontWeight: "800", fontSize: "0.95rem", margin: "0 0 1rem" }}>🎯 Most Missed Topics</h3>
                {weakTopics.map(([q, count], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.85rem", color: "#333", fontWeight: "600", marginBottom: "0.3rem" }}>{q}{q.length >= 40 ? "..." : ""}</div>
                      <div style={{ background: "#f0ebff", borderRadius: "99px", height: "6px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, count * 33)}%`, height: "100%", background: "linear-gradient(90deg, #ff6b6b, #ff9a4d)", borderRadius: "99px" }} />
                      </div>
                    </div>
                    <div style={{ background: "#fff0f0", color: "#ff6b6b", borderRadius: "20px", padding: "0.2rem 0.6rem", fontSize: "0.78rem", fontWeight: "800", whiteSpace: "nowrap" }}>{count}x missed</div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent sessions mini list */}
            <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
              <h3 style={{ color: "#1e3a5f", fontWeight: "800", fontSize: "0.95rem", margin: "0 0 1rem" }}>📋 Recent Sessions</h3>
              {[...sessions].reverse().slice(0, 5).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: i < 4 ? "1px solid #f8f4ff" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${scoreColor(s.score)}22`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "0.85rem", color: scoreColor(s.score) }}>{s.score || "—"}</div>
                    <div>
                      <div style={{ fontWeight: "700", color: "#1e3a5f", fontSize: "0.85rem" }}>{s.job_title || "Interview"}</div>
                      <div style={{ color: "#bbb", fontSize: "0.75rem" }}>{formatDate(s.created_at)}</div>
                    </div>
                  </div>
                  <div>{[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: "0.75rem", filter: n <= (s.stars || 0) ? "none" : "grayscale(1) opacity(0.2)" }}>⭐</span>)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
