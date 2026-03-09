import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "./supabaseClient";

export default function InterviewReport({ answers, jobTitle, onRetry, onRetryWeak, onStartOver, onComplete }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQ, setActiveQ] = useState(null);
  const [animatedStars, setAnimatedStars] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [visible, setVisible] = useState(false);
  const hasSpokeRef = useRef(false);
  const hasGradedRef = useRef(false);
  const hasSavedRef = useRef(false);

  const saveSession = async (gradeData, answersData) => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from("interview_sessions").insert({
        user_id: session.user.id,
        overall_score: gradeData.overall_score || 0,
        star_rating: gradeData.star_rating || 0,
        job_title: jobTitle || gradeData.job_title || "Interview",
        answers: answersData,
      });
    } catch (err) { console.error("❌ Failed to save session:", err); }
  };

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95; utter.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Zira"));
    if (female) utter.voice = female;
    window.speechSynthesis.speak(utter);
  };

  const buildStaticHTML = () => {
    const scoreVal = report.overall_score;
    const starsVal = report.star_rating;
    const stars = [1,2,3,4,5].map(i => i <= starsVal ? "⭐" : "☆").join(" ");
    const strengths = (report.strengths || []).map(s => `<li>${s}</li>`).join("");
    const improvements = (report.improvements || []).map(s => `<li>${s}</li>`).join("");
    const qs = (report.question_grades || []).map((q, i) => {
      const ans = answers[i];
      const skipped = q.skipped || ans?.skipped;
      return `<div style="background:white;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #eee;">
        <div style="font-weight:700;color:#1e3a5f;margin-bottom:8px;">${skipped ? "⚠️ SKIPPED" : q.score+"/10"} — ${q.question || ans?.question || "Question "+(i+1)}</div>
        ${skipped ? "<p style='color:#ff6b6b'>This question was skipped.</p>" : `
          <p style="font-size:13px;color:#555;margin-bottom:8px;"><strong>Your answer:</strong> ${q.answer_given || ans?.answer || "—"}</p>
          <p style="font-size:13px;color:#2d6a4f;margin-bottom:4px;"><strong>✅ What was good:</strong> ${q.what_was_good}</p>
          <p style="font-size:13px;color:#b8860b;margin-bottom:4px;"><strong>🎯 To improve:</strong> ${q.what_to_improve}</p>
          <p style="font-size:13px;color:#6c63ff;"><strong>💡 Ideal:</strong> ${q.ideal_answer}</p>`}
      </div>`;
    }).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,sans-serif;background:#f8f4ff;margin:0;padding:32px;}
      .container{max-width:700px;margin:0 auto;background:white;border-radius:24px;padding:32px;box-shadow:0 4px 20px rgba(108,99,255,0.08);}
      h1{color:#1e3a5f;text-align:center;font-size:28px;margin-bottom:4px;}
      .sub{text-align:center;color:#aaa;margin-bottom:24px;}
      .score{text-align:center;font-size:72px;font-weight:900;color:#6c63ff;margin:16px 0 4px;}
      .stars{text-align:center;font-size:32px;margin-bottom:8px;}
      .out{text-align:center;color:#bbb;margin-bottom:24px;}
      .feedback{background:#f0edff;border-radius:16px;padding:20px;margin-bottom:24px;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
      .card{background:#f8f9fa;border-radius:12px;padding:16px;}
      .card h3{font-size:14px;margin:0 0 12px;}
      .card li{font-size:13px;color:#444;margin-bottom:6px;}
      h2{color:#1e3a5f;font-size:18px;margin-bottom:16px;}
    </style></head><body><div class="container">
      <h1>🏆 Interview Report</h1>
      <p class="sub">Here's how you did${jobTitle ? " — " + jobTitle : ""}</p>
      <div class="stars">${stars}</div>
      <div class="score">${scoreVal}</div>
      <div class="out">out of 100</div>
      <div class="feedback"><strong style="color:#6c63ff">🎙️ Aria's Feedback</strong><p style="margin:8px 0 0;color:#444;line-height:1.6">${report.summary}</p></div>
      <div class="grid">
        <div class="card"><h3 style="color:#2d6a4f">💪 What You Did Well</h3><ul>${strengths}</ul></div>
        <div class="card"><h3 style="color:#b85c2e">🎯 Areas to Improve</h3><ul>${improvements}</ul></div>
      </div>
      <h2>📋 Question Breakdown</h2>${qs}
    </div></body></html>`;
  };

  const exportPDF = async (e) => {
    if (e) e.preventDefault();
    const html = buildStaticHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 800);
  };

  const shareImage = async (e) => {
    if (e) e.preventDefault();
    const score = report.overall_score;
    const stars = report.star_rating;
    const starsHTML = [1,2,3,4,5].map(i => i <= stars ? "⭐" : "☆").join(" ");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{margin:0;padding:0;background:#f8f4ff;font-family:-apple-system,sans-serif;}
      .card{width:600px;background:white;border-radius:24px;padding:40px;text-align:center;box-shadow:0 8px 40px rgba(108,99,255,0.1);}
      .stars{font-size:36px;margin-bottom:12px;}
      .score{font-size:80px;font-weight:900;color:#6c63ff;margin:8px 0 4px;}
      .out{color:#bbb;font-size:14px;margin-bottom:24px;}
      .feedback{background:linear-gradient(135deg,#f0edff,#e8f7ff);border-radius:16px;padding:20px;text-align:left;}
      .aria-label{font-weight:700;color:#6c63ff;font-size:14px;margin-bottom:8px;}
      .aria-text{color:#444;font-size:15px;line-height:1.6;margin:0;}
      .brand{margin-top:20px;color:#bbb;font-size:12px;font-weight:600;letter-spacing:0.05em;}
    </style></head><body>
    <div style="padding:32px;background:#f8f4ff;min-height:100vh;display:flex;align-items:center;justify-content:center;">
    <div class="card">
      <div class="stars">${starsHTML}</div>
      <div class="score">${score}</div>
      <div class="out">out of 100</div>
      <div class="feedback">
        <div class="aria-label">🎙️ Aria's Feedback</div>
        <p class="aria-text">${report.summary}</p>
      </div>
      <div class="brand">InterviewAI • interview-prep-agent-lac.vercel.app</div>
    </div></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:700px;height:600px;border:none;";
    iframe.src = url;
    document.body.appendChild(iframe);
    await new Promise(r => setTimeout(r, 600));
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const cardEl = iframeDoc.querySelector(".card");
    const canvas = await html2canvas(cardEl, { scale: 2, backgroundColor: "#f8f4ff", useCORS: true, logging: false });
    document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob2) => {
      const u = URL.createObjectURL(blob2);
      const a = document.createElement("a");
      a.href = u; a.download = "interview-report-card.png"; a.click();
      URL.revokeObjectURL(u);
    });
  };

  useEffect(() => {
    if (hasGradedRef.current) return;
    hasGradedRef.current = true;
    const grade = async () => {
      try {
        const res = await fetch("/api/grade-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers })
        });
        const data = await res.json();
        setReport(data);
        setLoading(false);
        saveSession(data, answers);
        setTimeout(() => setVisible(true), 50);
        // Animate score counter
        let count = 0;
        const scoreInterval = setInterval(() => {
          count += 2;
          setAnimatedScore(Math.min(count, data.overall_score));
          if (count >= data.overall_score) clearInterval(scoreInterval);
        }, 20);
        // Animate stars
        let s = 0;
        const starsInterval = setInterval(() => {
          s += 0.5;
          setAnimatedStars(s);
          if (s >= data.star_rating) clearInterval(starsInterval);
        }, 150);
        if (!hasSpokeRef.current) {
          hasSpokeRef.current = true;
          setTimeout(() => speak(data.summary), 1000);
        }
      } catch (e) {
        setError("Failed to load report. Please try again.");
        setLoading(false);
      }
    };
    grade();
  }, []);

  const scoreColor = (score) => {
    if (score >= 8) return { bg: "#f0fff4", border: "#4ecdc4", text: "#2d6a4f" };
    if (score >= 6) return { bg: "#fff9e6", border: "#ffd93d", text: "#b8860b" };
    if (score >= 4) return { bg: "#fff0e6", border: "#ff9a4d", text: "#b85c2e" };
    return { bg: "#fff0f0", border: "#ff6b6b", text: "#b82e2e" };
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }
        @keyframes dot { 0%,80%,100% { transform: scale(0); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1.5rem", display: "inline-block", animation: "spin 1.2s linear infinite" }}>⚙️</div>
        <h2 style={{ color: "#1e3a5f", fontWeight: "800", marginBottom: "0.5rem", animation: "pulse 2s ease-in-out infinite" }}>Aria is grading your interview...</h2>
        <p style={{ color: "#aaa", marginTop: "0.5rem", fontSize: "0.9rem" }}>This takes about 10 seconds</p>
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "1.5rem" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: "8px", height: "8px", background: "#6c63ff", borderRadius: "50%", animation: `dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem" }}>❌</div>
        <h2 style={{ color: "#1e3a5f" }}>{error}</h2>
        <button onClick={onStartOver} style={{ marginTop: "1rem", background: "#6c63ff", color: "white", border: "none", borderRadius: "20px", padding: "0.75rem 2rem", fontWeight: "700", cursor: "pointer" }}>Start Over</button>
      </div>
    </div>
  );

  const weakAnswers = answers.filter((a, i) => a.skipped || (report.question_grades?.[i]?.score < 6));

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif", padding: "2rem" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 70% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .report-card { animation: fadeUp 0.5s ease forwards; }
        .report-card:nth-child(2) { animation-delay: 0.1s; }
        .report-card:nth-child(3) { animation-delay: 0.2s; }
        .score-pop { animation: popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
        .btn-hover { transition: all 0.2s ease; }
        .btn-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(108,99,255,0.25); }
        .btn-hover:active { transform: translateY(0); }
      `}</style>
      <div id="report-content" style={{ maxWidth: "750px", margin: "0 auto", opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}>

        <div style={{ textAlign: "center", marginBottom: "2rem", animation: "fadeUp 0.5s ease forwards" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem" }}>Interview Report</h1>
          <p style={{ color: "#888" }}>Here's how you did{jobTitle ? ` — ${jobTitle}` : ""}</p>
        </div>

        <div id="report-card" className="report-card" style={{ background: "white", borderRadius: "24px", padding: "2rem", textAlign: "center", boxShadow: "0 8px 40px rgba(108,99,255,0.1)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", fontSize: "2.5rem", marginBottom: "1rem" }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)", filter: i <= animatedStars ? "none" : "grayscale(1) opacity(0.25)", transform: i <= animatedStars ? "scale(1.2)" : "scale(0.9)", display: "inline-block" }}>⭐</span>
            ))}
          </div>
          <div className="score-pop" style={{ fontSize: "5rem", fontWeight: "900", color: "#6c63ff", margin: "0.25rem 0" }}>{animatedScore}</div>
          <div style={{ color: "#bbb", fontSize: "0.9rem", marginBottom: "1.5rem", fontWeight: "600" }}>out of 100</div>
          <div style={{ background: "linear-gradient(135deg, #f0edff, #e8f7ff)", borderRadius: "16px", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", justifyContent: "center" }}>
              <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>🎙️</div>
              <span style={{ fontWeight: "700", color: "#6c63ff", fontSize: "0.85rem" }}>Aria's Feedback</span>
              <button onClick={() => speak(report.summary)} style={{ background: "rgba(108,99,255,0.1)", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#6c63ff", borderRadius: "20px", padding: "0.2rem 0.6rem", fontWeight: "700" }}>🔊 Replay</button>
            </div>
            <p style={{ color: "#444", fontSize: "0.95rem", lineHeight: "1.7", margin: 0 }}>{report.summary}</p>
          </div>
        </div>

        <div className="report-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <h3 style={{ color: "#2d6a4f", fontWeight: "800", fontSize: "0.9rem", marginBottom: "1rem" }}>💪 What You Did Well</h3>
            {report.strengths?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem", alignItems: "flex-start" }}>
                <span style={{ color: "#4ecdc4", fontWeight: "900", marginTop: "1px" }}>✓</span>
                <span style={{ color: "#444", fontSize: "0.85rem", lineHeight: "1.5" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <h3 style={{ color: "#b85c2e", fontWeight: "800", fontSize: "0.9rem", marginBottom: "1rem" }}>🎯 Areas to Improve</h3>
            {report.improvements?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem", alignItems: "flex-start" }}>
                <span style={{ color: "#ff9a4d", fontWeight: "900", marginTop: "1px" }}>→</span>
                <span style={{ color: "#444", fontSize: "0.85rem", lineHeight: "1.5" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <h2 className="report-card" style={{ color: "#1e3a5f", fontWeight: "800", marginBottom: "1rem", fontSize: "1.1rem" }}>📋 Question Breakdown</h2>
        {report.question_grades?.map((q, i) => {
          const colors = scoreColor(q.score);
          const isSkipped = q.skipped || answers[i]?.skipped;
          return (
            <div key={i} style={{ background: "white", borderRadius: "16px", marginBottom: "0.75rem", overflow: "hidden", boxShadow: "0 4px 20px rgba(108,99,255,0.06)", border: isSkipped ? "2px solid #ff6b6b" : "2px solid transparent", transition: "box-shadow 0.2s", animation: `fadeUp 0.4s ease ${0.05 * i}s both` }}>
              <div onClick={() => setActiveQ(activeQ === i ? null : i)} style={{ padding: "1.1rem 1.5rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                  {isSkipped ? (
                    <span style={{ background: "#fff0f0", color: "#ff6b6b", borderRadius: "20px", padding: "0.2rem 0.7rem", fontSize: "0.72rem", fontWeight: "800", whiteSpace: "nowrap" }}>⚠️ SKIPPED</span>
                  ) : (
                    <span style={{ background: colors.bg, color: colors.text, borderRadius: "20px", padding: "0.2rem 0.7rem", fontSize: "0.72rem", fontWeight: "800", whiteSpace: "nowrap", border: `1px solid ${colors.border}` }}>{q.score}/10</span>
                  )}
                  <span style={{ color: "#1e3a5f", fontSize: "0.88rem", fontWeight: "600", lineHeight: "1.4" }}>{q.question || answers[i]?.question || `Question ${i + 1}`}</span>
                </div>
                <span style={{ color: "#ccc", marginLeft: "1rem", transition: "transform 0.2s", transform: activeQ === i ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
              </div>
              {activeQ === i && (
                <div style={{ borderTop: "1px solid #f0ebff", padding: "1.25rem 1.5rem" }}>
                  {isSkipped ? (
                    <div style={{ background: "#fff0f0", borderRadius: "10px", padding: "1rem", color: "#ff6b6b", fontWeight: "600" }}>❌ This question was skipped</div>
                  ) : (
                    <>
                      <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
                        <div style={{ fontSize: "0.72rem", color: "#bbb", fontWeight: "700", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>YOUR ANSWER</div>
                        <p style={{ color: "#444", fontSize: "0.88rem", lineHeight: "1.6", margin: 0 }}>{q.answer_given || answers[i]?.answer || "No answer recorded"}</p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div style={{ background: "#f0fff4", borderRadius: "10px", padding: "1rem" }}>
                          <div style={{ fontSize: "0.72rem", color: "#2d6a4f", fontWeight: "700", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>✅ WHAT WAS GOOD</div>
                          <p style={{ color: "#444", fontSize: "0.84rem", lineHeight: "1.5", margin: 0 }}>{q.what_was_good}</p>
                        </div>
                        <div style={{ background: "#fff9e6", borderRadius: "10px", padding: "1rem" }}>
                          <div style={{ fontSize: "0.72rem", color: "#b8860b", fontWeight: "700", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>🎯 WHAT TO IMPROVE</div>
                          <p style={{ color: "#444", fontSize: "0.84rem", lineHeight: "1.5", margin: 0 }}>{q.what_to_improve}</p>
                        </div>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, #f0edff, #e8f7ff)", borderRadius: "10px", padding: "1rem" }}>
                        <div style={{ fontSize: "0.72rem", color: "#6c63ff", fontWeight: "700", marginBottom: "0.4rem", letterSpacing: "0.05em" }}>💡 IDEAL ANSWER</div>
                        <p style={{ color: "#444", fontSize: "0.84rem", lineHeight: "1.5", margin: 0 }}>{q.ideal_answer}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", marginBottom: "1rem" }}>
          <button className="btn-hover" onClick={exportPDF} style={{ flex: 1, padding: "0.9rem", background: "white", color: "#6c63ff", border: "2px solid #6c63ff", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "0.95rem" }}>
            📄 Export PDF
          </button>
          <button className="btn-hover" onClick={shareImage} style={{ flex: 1, padding: "0.9rem", background: "white", color: "#4ecdc4", border: "2px solid #4ecdc4", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "0.95rem" }}>
            🖼️ Save Image
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "3rem" }}>
          {weakAnswers.length > 0 && (
            <button className="btn-hover" onClick={() => onRetryWeak(weakAnswers)} style={{ padding: "1rem", background: "linear-gradient(135deg, #ff9a4d, #ff6b6b)", color: "white", border: "none", borderRadius: "14px", fontWeight: "800", cursor: "pointer", fontSize: "1rem", boxShadow: "0 4px 20px rgba(255,107,107,0.3)" }}>
              🔁 Redo Weak & Skipped Questions ({weakAnswers.length})
            </button>
          )}
          <button className="btn-hover" onClick={onRetry} style={{ padding: "1rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "14px", fontWeight: "800", cursor: "pointer", fontSize: "1rem", boxShadow: "0 4px 20px rgba(108,99,255,0.3)" }}>
            🎤 Redo Full Interview
          </button>
          <button className="btn-hover" onClick={onStartOver} style={{ padding: "1rem", background: "#f8f9fa", color: "#888", border: "2px solid #e8e0ff", borderRadius: "14px", fontWeight: "700", cursor: "pointer", fontSize: "1rem" }}>
            🔄 Start Over with New Resume
          </button>
          <button className="btn-hover" onClick={() => onComplete(report?.overall_score)} style={{ padding: "1.1rem", background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)", color: "white", border: "none", borderRadius: "14px", fontWeight: "800", cursor: "pointer", fontSize: "1rem", boxShadow: "0 4px 20px rgba(30,58,95,0.25)", letterSpacing: "0.02em" }}>
            ✅ Complete
          </button>
        </div>
      </div>
    </div>
  );
}
