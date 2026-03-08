import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function InterviewReport({ answers, onRetry, onRetryWeak, onStartOver }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQ, setActiveQ] = useState(null);
  const [animatedStars, setAnimatedStars] = useState(0);
  const hasSpokeRef = useRef(false);
  const hasGradedRef = useRef(false);
  const hasSavedRef = useRef(false);

  const saveSession = async (gradeData, answersData) => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("interview_sessions").insert({
        user_id: user.id,
        score: gradeData.overall_score || 0,
        stars: gradeData.stars || 0,
        job_title: gradeData.job_title || "Interview",
        answers: answersData,
      });
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Zira"));
    if (female) utter.voice = female;
    window.speechSynthesis.speak(utter);
  };

  const exportPDF = async (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById("report-content");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#f8f4ff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    let position = 0;
    let remaining = pdfHeight;
    const pageHeight = pdf.internal.pageSize.getHeight();
    while (remaining > 0) {
      pdf.addImage(imgData, "PNG", 0, position === 0 ? 0 : -(pdfHeight - remaining), pdfWidth, pdfHeight);
      remaining -= pageHeight;
      if (remaining > 0) { pdf.addPage(); position += pageHeight; }
    }
    pdf.save("interview-report.pdf");
  };

  const shareImage = async (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById("report-card");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#f8f4ff" });
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "interview-report-card.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  useEffect(() => {
    if (hasGradedRef.current) return;
    hasGradedRef.current = true;
    const grade = async () => {
      try {
        const res = await fetch("http://localhost:5678/webhook/grade-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers })
        });
        const data = await res.json();
        setReport(data);
        setLoading(false);
        saveSession(data, answers);
        let s = 0;
        const interval = setInterval(() => {
          s += 0.5;
          setAnimatedStars(s);
          if (s >= data.star_rating) clearInterval(interval);
        }, 150);
        if (!hasSpokeRef.current) {
          hasSpokeRef.current = true;
          setTimeout(() => speak(data.aria_summary), 1000);
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
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚙️</div>
        <h2 style={{ color: "#1e3a5f", fontWeight: "800" }}>Aria is grading your interview...</h2>
        <p style={{ color: "#888", marginTop: "0.5rem" }}>This takes about 10 seconds</p>
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
      <div id="report-content" style={{ maxWidth: "750px", margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏆</div>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem" }}>Interview Report</h1>
          <p style={{ color: "#888" }}>Here's how you did</p>
        </div>

        <div id="report-card" style={{ background: "white", borderRadius: "24px", padding: "2rem", textAlign: "center", boxShadow: "0 8px 40px rgba(108,99,255,0.08)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", fontSize: "2.5rem", marginBottom: "1rem" }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ transition: "all 0.3s", filter: i <= animatedStars ? "none" : "grayscale(1) opacity(0.3)", transform: i <= animatedStars ? "scale(1.1)" : "scale(1)" }}>⭐</span>
            ))}
          </div>
          <div style={{ fontSize: "4rem", fontWeight: "900", color: "#6c63ff", margin: "0.5rem 0 0.25rem" }}>{report.overall_score}</div>
          <div style={{ color: "#888", fontSize: "0.9rem", marginBottom: "1.5rem" }}>out of 100</div>
          <div style={{ background: "linear-gradient(135deg, #f0edff, #e8f7ff)", borderRadius: "16px", padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", justifyContent: "center" }}>
              <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>🎙️</div>
              <span style={{ fontWeight: "700", color: "#6c63ff", fontSize: "0.85rem" }}>Aria's Feedback</span>
              <button onClick={() => speak(report.aria_summary)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#6c63ff" }}>🔊 Replay</button>
            </div>
            <p style={{ color: "#444", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>{report.aria_summary}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <h3 style={{ color: "#2d6a4f", fontWeight: "800", fontSize: "0.9rem", marginBottom: "1rem" }}>💪 What You Did Well</h3>
            {report.strengths?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <span style={{ color: "#4ecdc4", fontWeight: "800" }}>✓</span>
                <span style={{ color: "#444", fontSize: "0.85rem", lineHeight: "1.5" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.06)" }}>
            <h3 style={{ color: "#b85c2e", fontWeight: "800", fontSize: "0.9rem", marginBottom: "1rem" }}>🎯 Areas to Improve</h3>
            {report.improvements?.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <span style={{ color: "#ff9a4d", fontWeight: "800" }}>→</span>
                <span style={{ color: "#444", fontSize: "0.85rem", lineHeight: "1.5" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <h2 style={{ color: "#1e3a5f", fontWeight: "800", marginBottom: "1rem", fontSize: "1.1rem" }}>📋 Question Breakdown</h2>
        {report.question_grades?.map((q, i) => {
          const colors = scoreColor(q.score);
          const isSkipped = q.skipped || answers[i]?.skipped;
          return (
            <div key={i} style={{ background: "white", borderRadius: "16px", marginBottom: "1rem", overflow: "hidden", boxShadow: "0 4px 20px rgba(108,99,255,0.06)", border: isSkipped ? "2px solid #ff6b6b" : "2px solid transparent" }}>
              <div onClick={() => setActiveQ(activeQ === i ? null : i)} style={{ padding: "1.25rem 1.5rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                  {isSkipped ? (
                    <span style={{ background: "#fff0f0", color: "#ff6b6b", borderRadius: "20px", padding: "0.2rem 0.7rem", fontSize: "0.75rem", fontWeight: "800", whiteSpace: "nowrap" }}>⚠️ SKIPPED</span>
                  ) : (
                    <span style={{ background: colors.bg, color: colors.text, borderRadius: "20px", padding: "0.2rem 0.7rem", fontSize: "0.75rem", fontWeight: "800", whiteSpace: "nowrap", border: `1px solid ${colors.border}` }}>{q.score}/10</span>
                  )}
                  <span style={{ color: "#1e3a5f", fontSize: "0.9rem", fontWeight: "600", lineHeight: "1.4" }}>{q.question}</span>
                </div>
                <span style={{ color: "#aaa", marginLeft: "1rem" }}>{activeQ === i ? "▲" : "▼"}</span>
              </div>
              {activeQ === i && (
                <div style={{ borderTop: "1px solid #f0ebff", padding: "1.5rem" }}>
                  {isSkipped ? (
                    <div style={{ background: "#fff0f0", borderRadius: "10px", padding: "1rem", color: "#ff6b6b", fontWeight: "600" }}>❌ This question was skipped</div>
                  ) : (
                    <>
                      <div style={{ background: "#f8f9fa", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "#888", fontWeight: "700", marginBottom: "0.4rem" }}>YOUR ANSWER</div>
                        <p style={{ color: "#444", fontSize: "0.9rem", lineHeight: "1.5", margin: 0 }}>{q.answer_given || "No answer recorded"}</p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div style={{ background: "#f0fff4", borderRadius: "10px", padding: "1rem" }}>
                          <div style={{ fontSize: "0.75rem", color: "#2d6a4f", fontWeight: "700", marginBottom: "0.4rem" }}>✅ WHAT WAS GOOD</div>
                          <p style={{ color: "#444", fontSize: "0.85rem", lineHeight: "1.5", margin: 0 }}>{q.what_was_good}</p>
                        </div>
                        <div style={{ background: "#fff9e6", borderRadius: "10px", padding: "1rem" }}>
                          <div style={{ fontSize: "0.75rem", color: "#b8860b", fontWeight: "700", marginBottom: "0.4rem" }}>🎯 WHAT TO IMPROVE</div>
                          <p style={{ color: "#444", fontSize: "0.85rem", lineHeight: "1.5", margin: 0 }}>{q.what_to_improve}</p>
                        </div>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, #f0edff, #e8f7ff)", borderRadius: "10px", padding: "1rem" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6c63ff", fontWeight: "700", marginBottom: "0.4rem" }}>💡 IDEAL ANSWER</div>
                        <p style={{ color: "#444", fontSize: "0.85rem", lineHeight: "1.5", margin: 0 }}>{q.ideal_answer}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", marginBottom: "1rem" }}>
          <button onClick={exportPDF} style={{ flex: 1, padding: "0.9rem", background: "white", color: "#6c63ff", border: "2px solid #6c63ff", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "0.95rem" }}>
            📄 Export PDF
          </button>
          <button onClick={shareImage} style={{ flex: 1, padding: "0.9rem", background: "white", color: "#4ecdc4", border: "2px solid #4ecdc4", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "0.95rem" }}>
            🖼️ Save Report Image
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "3rem" }}>
          {weakAnswers.length > 0 && (
            <button onClick={() => onRetryWeak(weakAnswers)} style={{ padding: "1rem", background: "linear-gradient(135deg, #ff9a4d, #ff6b6b)", color: "white", border: "none", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "1rem" }}>
              🔁 Redo Weak & Skipped Questions ({weakAnswers.length})
            </button>
          )}
          <button onClick={onRetry} style={{ padding: "1rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontWeight: "800", cursor: "pointer", fontSize: "1rem" }}>
            🎤 Redo Full Interview
          </button>
          <button onClick={onStartOver} style={{ padding: "1rem", background: "#f8f9fa", color: "#888", border: "2px solid #e0e0e0", borderRadius: "12px", fontWeight: "700", cursor: "pointer", fontSize: "1rem" }}>
            🔄 Start Over with New Resume
          </button>
        </div>
      </div>
    </div>
  );
}
