import { useState, useEffect } from "react";

export default function PracticeAgain({ onRedoFull, onRedoWeak, onNewInterview, onHome, onShowDashboard, score }) {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const pieces = Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.5 + Math.random() * 2,
      color: ["#6c63ff","#4ecdc4","#ffd93d","#ff6b6b","#ff9a4d","#c3b1e1","#a8edea"][Math.floor(Math.random() * 7)],
      size: 7 + Math.random() * 8,
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? "50%" : "2px",
    }));
    setConfetti(pieces);
  }, []);

  const emoji = !score ? "🎯" : score >= 80 ? "🏆" : score >= 60 ? "🎯" : score >= 40 ? "💪" : "🎤";
  const headline = !score ? "Great effort, Aria is proud!" : score >= 80 ? "Outstanding performance!" : score >= 60 ? "Great effort, Aria is proud!" : score >= 40 ? "Good start — keep going!" : "Every attempt makes you stronger!";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem", overflow: "hidden", position: "relative" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes glow { 0%,100% { box-shadow: 0 4px 20px rgba(108,99,255,0.3); } 50% { box-shadow: 0 8px 40px rgba(108,99,255,0.55); } }
        .btn-pa { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .btn-pa:hover { transform: translateY(-3px) scale(1.02); }
        .btn-pa:active { transform: scale(0.97); }
      `}</style>

      {confetti.map(c => (
        <div key={c.id} style={{
          position: "fixed", left: `${c.x}%`, top: "-20px",
          width: `${c.size}px`, height: `${c.size}px`,
          background: c.color, borderRadius: c.shape,
          animation: `fall ${c.duration}s ${c.delay}s ease-in forwards`,
          transform: `rotate(${c.rotation}deg)`, zIndex: 0, pointerEvents: "none",
        }} />
      ))}

      <div style={{ textAlign: "center", maxWidth: "480px", width: "100%", position: "relative", zIndex: 1, opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}>
        <div style={{ fontSize: "5rem", marginBottom: "0.75rem", display: "inline-block", animation: "float 3s ease-in-out infinite" }}>{emoji}</div>
        <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.5rem", animation: "fadeUp 0.5s 0.1s ease both" }}>{headline}</h1>
        <p style={{ color: "#aaa", marginBottom: "0.75rem", fontSize: "1rem", animation: "fadeUp 0.5s 0.2s ease both" }}>What would you like to do next?</p>

        {score > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "white", borderRadius: "20px", padding: "0.4rem 1.2rem", marginBottom: "2rem", boxShadow: "0 2px 16px rgba(108,99,255,0.12)", animation: "popIn 0.6s 0.3s ease both" }}>
            <span style={{ fontWeight: "900", fontSize: "1.3rem", color: "#6c63ff" }}>{score}</span>
            <span style={{ color: "#ccc", fontSize: "0.85rem", fontWeight: "600" }}>/ 100</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", animation: "fadeUp 0.5s 0.35s ease both" }}>
          <button className="btn-pa" onClick={onRedoFull} style={{ padding: "1rem 2rem", borderRadius: "16px", border: "none", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", fontSize: "1rem", fontWeight: "700", cursor: "pointer", animation: "glow 3s ease-in-out infinite" }}>
            🔁 Redo Full Interview
          </button>
          <button className="btn-pa" onClick={onRedoWeak} style={{ padding: "1rem 2rem", borderRadius: "16px", border: "2px solid #6c63ff", background: "white", color: "#6c63ff", fontSize: "1rem", fontWeight: "700", cursor: "pointer" }}>
            💪 Practice Weak Questions
          </button>
          <button className="btn-pa" onClick={onShowDashboard} style={{ padding: "1rem 2rem", borderRadius: "16px", border: "2px solid #4ecdc4", background: "white", color: "#2d9d9d", fontSize: "1rem", fontWeight: "700", cursor: "pointer" }}>
            📊 View My Dashboard
          </button>
          <button className="btn-pa" onClick={onNewInterview} style={{ padding: "1rem 2rem", borderRadius: "16px", border: "2px solid #e8e0ff", background: "white", color: "#888", fontSize: "1rem", fontWeight: "700", cursor: "pointer" }}>
            📄 Upload New Resume
          </button>
          <button onClick={onHome} style={{ padding: "0.6rem 2rem", borderRadius: "14px", border: "none", background: "transparent", color: "#ccc", fontSize: "0.9rem", cursor: "pointer", fontWeight: "600" }}>
            🏠 Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
