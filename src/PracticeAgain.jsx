import { useState, useEffect, useId } from "react";

const FONT = "'Inter', system-ui, sans-serif";
const RING_R = 40;
const RING_DASH = 2 * Math.PI * RING_R;

function ScoreRing({ score, gradId }) {
  const n = Math.max(0, Math.min(100, Number(score) || 0));
  const off = RING_DASH - (n / 100) * RING_DASH;
  return (
    <div style={{ margin: "0 auto 22px", textAlign: "center" }}>
      <div style={{ width: 96, height: 96, margin: "0 auto 10px", position: "relative" }} aria-hidden>
        <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ display: "block", transform: "rotate(-90deg)", filter: "drop-shadow(0 0 20px rgba(124,58,237,0.25))" }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={RING_R} fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r={RING_R}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_DASH}
            strokeDashoffset={off}
            style={{ filter: "drop-shadow(0 0 10px rgba(124,58,237,0.45))" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 28, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, textShadow: "0 0 28px rgba(124,58,237,0.35)" }}>{n}</span>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "rgba(255,255,255,0.32)", textTransform: "uppercase" }}>
        Session score · out of 100
      </p>
    </div>
  );
}

function HeroMark() {
  return (
    <div style={{ width: 96, height: 96, margin: "0 auto 28px", position: "relative" }} aria-hidden>
      <div
        style={{
          position: "absolute",
          inset: -10,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 65%)",
          animation: "pa-heroPulse 3.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -3,
          borderRadius: "50%",
          border: "1px solid rgba(167,139,250,0.25)",
          boxShadow: "0 0 24px rgba(124,58,237,0.2)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "linear-gradient(145deg, #9333ea 0%, #6d28d9 45%, #4f46e5 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 40px rgba(91,33,182,0.45)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      />
    </div>
  );
}

export default function PracticeAgain({ onRedoFull, onRedoWeak, onNewInterview, onHome, onShowDashboard, score }) {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const ringGradId = useId().replace(/:/g, "");

  const numericScore = Number(score);
  const showScore = Number.isFinite(numericScore) && numericScore > 0;

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const n = Number.isFinite(numericScore) && numericScore > 0 ? numericScore : 0;
    const celebrate = n >= 55;
    const count = celebrate ? 18 : 10;
    const pieces = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2.2,
      duration: 3.2 + Math.random() * 2.4,
      color: ["#7c3aed", "#4f46e5", "#a78bfa", "#c4b5fd", "#818cf8", "#6366f1"][Math.floor(Math.random() * 6)],
      size: 5 + Math.random() * 6,
      rotation: Math.random() * 360,
      shape: Math.random() > 0.55 ? "50%" : "2px",
    }));
    setConfetti(pieces);
  }, [numericScore]);

  const headline = !showScore
    ? "Great effort — keep going"
    : numericScore >= 80
      ? "Outstanding performance"
      : numericScore >= 60
        ? "Strong work"
        : numericScore >= 40
          ? "Good start — keep practicing"
          : "Every attempt builds skill";

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: FONT,
        color: "#f4f4f5",
        position: "relative",
        boxSizing: "border-box",
        background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #000000 100%)",
        colorScheme: "dark",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes pa-fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pa-heroPulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.05); } }
        @keyframes pa-gridPulse { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.58; } }
        @keyframes pa-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 0.7; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        @keyframes pa-gradShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes pa-shimmerSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        .pa-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: pa-gridPulse 8s ease-in-out infinite;
        }
        .pa-glass-card {
          position: relative;
          overflow: hidden;
        }
        .pa-glass-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 12%;
          right: 12%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(196, 181, 253, 0.45), transparent);
          pointer-events: none;
          z-index: 1;
        }
        .pa-title-grad {
          font-size: clamp(1.55rem, 4.2vw, 1.95rem);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1.18;
          margin: 0 0 14px;
          max-width: 20ch;
          margin-left: auto;
          margin-right: auto;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 42%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pa-btn-primary {
          position: relative;
          overflow: hidden;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 14px;
          border: none;
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          font-family: inherit;
          cursor: pointer;
          background: linear-gradient(135deg, #7c3aed, #5b21b6, #4f46e5);
          background-size: 200% 200%;
          animation: pa-gradShift 4s ease infinite;
          box-shadow: 0 6px 28px rgba(124, 58, 237, 0.35);
          transition: box-shadow 0.2s, filter 0.2s;
        }
        .pa-btn-primary::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
          pointer-events: none;
          z-index: 1;
        }
        .pa-btn-primary::after {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 45%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          pointer-events: none;
        }
        .pa-btn-primary:hover::after { animation: pa-shimmerSweep 0.85s ease; }
        .pa-btn-primary:hover {
          filter: brightness(1.06);
          box-shadow: 0 10px 36px rgba(124, 58, 237, 0.48);
        }
        .pa-btn-primary:focus-visible {
          outline: 2px solid rgba(196, 181, 253, 0.8);
          outline-offset: 3px;
        }
        .pa-btn-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          text-align: left;
          background: rgba(8, 5, 18, 0.92);
          border: 1px solid rgba(124, 58, 237, 0.28);
          box-shadow: 0 0 22px rgba(124, 58, 237, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s ease;
        }
        .pa-btn-row:hover {
          border-color: rgba(167, 139, 250, 0.42);
          box-shadow: 0 0 28px rgba(124, 58, 237, 0.22);
        }
        .pa-btn-row:active {
          transform: scale(0.992);
        }
        .pa-btn-row:focus-visible {
          outline: 2px solid rgba(196, 181, 253, 0.65);
          outline-offset: 2px;
        }
        .pa-btn-row small {
          display: block;
          margin-top: 5px;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.35;
          color: rgba(255, 255, 255, 0.38);
        }
        .pa-stack {
          border-radius: 16px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
      `}</style>

      <div className="pa-page-grid" aria-hidden />
      <div
        style={{
          position: "absolute",
          top: -180,
          left: -120,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          right: -80,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      />

      {confetti.map((c) => (
        <div
          key={c.id}
          style={{
            position: "fixed",
            left: `${c.x}%`,
            top: "-20px",
            width: `${c.size}px`,
            height: `${c.size}px`,
            background: c.color,
            borderRadius: c.shape,
            opacity: 0.3,
            animation: `pa-fall ${c.duration}s ${c.delay}s ease-in forwards`,
            transform: `rotate(${c.rotation}deg)`,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      ))}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 460,
          padding: "28px 20px 56px",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div
          className="pa-glass-card"
          style={{
            borderRadius: 22,
            background: "rgba(16, 12, 32, 0.62)",
            border: "1px solid rgba(139, 92, 246, 0.24)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "40px 26px 32px",
            boxShadow: "0 28px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 60px rgba(91,33,182,0.08)",
          }}
        >
          {showScore ? (
            <div style={{ animation: "pa-fadeUp 0.5s 0.1s ease both" }}>
              <ScoreRing score={numericScore} gradId={ringGradId} />
            </div>
          ) : (
            <div style={{ animation: "pa-fadeUp 0.5s 0.1s ease both" }}>
              <HeroMark />
            </div>
          )}

          <h1 className="pa-title-grad" style={{ textAlign: "center", animation: "pa-fadeUp 0.5s 0.15s ease both" }}>
            {headline}
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.48)",
              margin: "0 auto 26px",
              maxWidth: "32ch",
              animation: "pa-fadeUp 0.5s 0.2s ease both",
            }}
          >
            What would you like to do next?
          </p>

          <div
            style={{
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
              margin: "0 0 22px",
              animation: "pa-fadeUp 0.5s 0.22s ease both",
            }}
            aria-hidden
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "pa-fadeUp 0.5s 0.28s ease both" }}>
            <button type="button" className="pa-btn-primary" onClick={onRedoFull}>
              <span style={{ position: "relative", zIndex: 2, letterSpacing: "0.02em" }}>Redo full interview</span>
              <span style={{ position: "relative", zIndex: 2, fontSize: 20, fontWeight: 300, opacity: 0.95 }} aria-hidden>
                ›
              </span>
            </button>

            <div className="pa-stack" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" className="pa-btn-row" onClick={onRedoWeak} style={{ padding: "14px 18px", borderRadius: 11 }}>
                <span>
                  Practice weak questions
                  <small>Same role, lowest-scoring prompts only</small>
                </span>
                <span style={{ fontSize: 18, fontWeight: 300, flexShrink: 0, opacity: 0.9 }} aria-hidden>
                  ›
                </span>
              </button>

              <button type="button" className="pa-btn-row" onClick={onShowDashboard} style={{ padding: "14px 18px", borderRadius: 11 }}>
                <span>
                  View dashboard
                  <small>History, tracker, and documents</small>
                </span>
                <span style={{ fontSize: 18, fontWeight: 300, flexShrink: 0, opacity: 0.9 }} aria-hidden>
                  ›
                </span>
              </button>

              <button type="button" className="pa-btn-row" onClick={onNewInterview} style={{ padding: "14px 18px", borderRadius: 11 }}>
                <span>
                  New interview (upload)
                  <small>Fresh CV and job context</small>
                </span>
                <span style={{ fontSize: 18, fontWeight: 300, flexShrink: 0, opacity: 0.9 }} aria-hidden>
                  ›
                </span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
          <button
            type="button"
            onClick={onHome}
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.92)",
              borderRadius: 999,
              padding: "13px 32px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: FONT,
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)";
              e.currentTarget.style.background = "rgba(124,58,237,0.14)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
              e.currentTarget.style.background = "rgba(0,0,0,0.5)";
              e.currentTarget.style.color = "rgba(255,255,255,0.92)";
            }}
          >
            Go to home
          </button>
        </div>
      </div>
    </div>
  );
}
