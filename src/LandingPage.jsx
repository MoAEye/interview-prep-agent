import { useState, useEffect, useRef } from "react";
import { InteractiveRobotSpline } from "./components/InteractiveRobotSpline.jsx";
import LandingNav from "./components/LandingNav.jsx";
import LandingFooter from "./components/LandingFooter.jsx";
import { UPGRADE_MODAL_FREE, UPGRADE_MODAL_PRO } from "./pricingFeatures.js";

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function AnimatedSection({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(40px)", transition: `opacity 0.7s ${delay}s ease, transform 0.7s ${delay}s ease`, ...style }}>
      {children}
    </div>
  );
}

function scrollToSection(id) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const wfStroke = "#a78bfa";

function WorkflowIconBuilding() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V10l8-4 8 4v10M9 20v-6h6v6" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WorkflowIconCv() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 12h8M8 16h5M8 8l2 2 4-4" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WorkflowIconAcademy() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7h8M8 11h6" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WorkflowIconMock() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v3M9 21h6" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="7" r="2" stroke={wfStroke} strokeWidth="2" />
    </svg>
  );
}

function WorkflowIconVoice() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M21 10v4M3 10v4" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function WorkflowIconTracker() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M5 6h.01M5 12h.01M5 18h.01" stroke={wfStroke} strokeWidth="2" strokeLinecap="round" />
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={wfStroke} strokeWidth="2" />
    </svg>
  );
}

const WORKFLOW_ICON = {
  building: WorkflowIconBuilding,
  cv: WorkflowIconCv,
  academy: WorkflowIconAcademy,
  mock: WorkflowIconMock,
  voice: WorkflowIconVoice,
  tracker: WorkflowIconTracker,
};

function CheckBullet({ pro }) {
  const fill = pro ? "#a78bfa" : "#6ee7b7";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="12" cy="12" r="10" stroke={pro ? "rgba(124,58,237,0.45)" : "rgba(110,231,183,0.35)"} strokeWidth="1.5" />
      <path d="M8 12l2.5 2.5L16 9" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage({ onGetStarted, onRecruiterEntry, landingNavProps, landingFooterProps }) {
  const ROBOT_SCENE = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";
  const [typedWord, setTypedWord] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const words = ["Software Engineer", "Product Manager", "Data Scientist", "UX Designer", "Marketing Lead", "Finance Analyst"];

  useEffect(() => {
    const current = words[wordIndex];
    const speed = deleting ? 40 : 80;
    const timeout = setTimeout(() => {
      if (!deleting && charIndex < current.length) {
        setTypedWord(current.slice(0, charIndex + 1));
        setCharIndex(c => c + 1);
      } else if (deleting && charIndex > 0) {
        setTypedWord(current.slice(0, charIndex - 1));
        setCharIndex(c => c - 1);
      } else if (!deleting && charIndex === current.length) {
        setTimeout(() => setDeleting(true), 1800);
      } else if (deleting && charIndex === 0) {
        setDeleting(false);
        setWordIndex(i => (i + 1) % words.length);
      }
    }, speed);
    return () => clearTimeout(timeout);
  }, [charIndex, deleting, wordIndex]);
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [count3, setCount3] = useState(0);
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!statsVisible) return;
    let frame;
    const animate = (start, end, setter, duration) => {
      const startTime = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setter(Math.floor(eased * end));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    animate(0, 10000, setCount1, 1800);
    animate(0, 94, setCount2, 1600);
    animate(0, 500, setCount3, 1400);
    return () => cancelAnimationFrame(frame);
  }, [statsVisible]);

  return (
    <div style={{ minHeight: "100vh", background: "#05020f", fontFamily: "'Segoe UI', system-ui, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-18px) rotate(3deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0px) rotate(0deg)} 50%{transform:translateY(-12px) rotate(-2deg)} }
        @keyframes float3 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes pulse-ring { 0%{transform:scale(0.95);box-shadow:0 0 0 0 rgba(108,99,255,0.4)} 70%{transform:scale(1);box-shadow:0 0 0 20px rgba(108,99,255,0)} 100%{transform:scale(0.95)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes slideIn { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-15px,25px) scale(0.97)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,15px) scale(1.03)} 66%{transform:translate(20px,-30px) scale(0.98)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cta-btn { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .cta-btn:hover { transform: translateY(-3px) scale(1.03) !important; box-shadow: 0 0 28px rgba(124,58,237,0.55) !important; }
        .cta-btn:active { transform: scale(0.98) !important; }
        .step-card { transition: all 0.3s ease; }
        .step-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(124,58,237,0.12) !important; }
        .landing-step-card-dark { position: relative; overflow: hidden; }
        .landing-step-card-dark::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent);
          pointer-events: none;
          z-index: 1;
        }
        .nav-btn { transition: all 0.2s ease; }
        .landing-stat-num {
          font-size: 2.8rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #fff, #a78bfa);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .landing-cta-block {
          position: relative;
          overflow: hidden;
        }
        .landing-cta-block::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent);
          pointer-events: none;
          z-index: 1;
        }
        .landing-workflow-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
        .landing-compare-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; align-items: stretch; }
        @media (max-width: 900px) {
          .landing-workflow-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .hero-title { font-size: 2.4rem !important; }
          .stats-grid { gap: 1.5rem !important; }
          .landing-workflow-grid { grid-template-columns: 1fr 1fr !important; }
          .landing-compare-row { grid-template-columns: 1fr !important; }
          .nav-links { display: none; }
          .landing-hero-inner { flex-direction: column !important; align-items: stretch !important; }
          .landing-hero-col-text { text-align: center !important; }
          .landing-hero-col-text .landing-hero-ctas { justify-content: center !important; }
          .landing-hero-col-robot {
            flex: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 350px !important;
          }
          .landing-spline-float-10 { font-size: 9px !important; }
          .landing-spline-float-11 { font-size: 10px !important; }
          .landing-spline-float-12 { font-size: 11px !important; }
          .landing-spline-float-13 { font-size: 12px !important; }
          .landing-spline-float-14 { font-size: 13px !important; }
        }
        @media (max-width: 480px) {
          .landing-workflow-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 2rem !important; }
        }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", borderRadius: "50%", animation: "orb1 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-8%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)", borderRadius: "50%", animation: "orb2 15s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "800px", height: "400px", background: "radial-gradient(ellipse, rgba(124,58,237,0.04) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <LandingNav {...landingNavProps} />

      {/* Hero */}
      <div
        className="landing-hero-wrap"
        style={{
          position: "relative",
          zIndex: 1,
          background: "#05020f",
          padding: "5rem 2rem 4rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            backgroundImage:
              "linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
            top: "-100px",
            left: "-100px",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)",
            top: 0,
            right: "-100px",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          className="landing-hero-inner"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "2.5rem",
            maxWidth: "1200px",
            margin: "0 auto",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div className="landing-hero-col-text" style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ animation: "slideIn 0.6s 0.1s ease both" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(10,5,25,0.88)",
                  border: "1px solid rgba(124,58,237,0.28)",
                  borderRadius: "25px",
                  padding: "0.4rem 1.1rem",
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  color: "#c4b5fd",
                  marginBottom: "2rem",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#4ecdc4",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "pulse-ring 2s infinite",
                  }}
                />
                Powered by GPT-4o · Free to use
              </div>
            </div>

            <h1
              className="hero-title"
              style={{
                fontSize: "4rem",
                fontWeight: "900",
                color: "#f8fafc",
                lineHeight: "1.08",
                marginBottom: "1.5rem",
                maxWidth: "750px",
                margin: "0 0 1.5rem",
                letterSpacing: "-0.03em",
                animation: "slideIn 0.6s 0.2s ease both",
              }}
            >
              Ace Your Next<br />
              <span
                style={{
                  background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {typedWord || "Interview"}
                <span
                  style={{
                    opacity: 1,
                    animation: "blink 1s step-end infinite",
                    color: "#a78bfa",
                    WebkitTextFillColor: "#a78bfa",
                  }}
                >
                  |
                </span>
              </span>
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Interview With AI
              </span>
            </h1>

            <p
              style={{
                fontSize: "1.15rem",
                color: "#a1a1aa",
                maxWidth: "520px",
                margin: "0 0 2.5rem",
                lineHeight: "1.75",
                animation: "slideIn 0.6s 0.3s ease both",
              }}
            >
              Meet <strong style={{ color: "#c4b5fd" }}>Aria</strong>, your personal AI coach. Upload your CV, get tailored questions, practice live, and get a detailed graded report.
            </p>

            <div
              className="landing-hero-ctas"
              style={{ display: "flex", gap: "1rem", justifyContent: "flex-start", flexWrap: "wrap", animation: "slideIn 0.6s 0.4s ease both" }}
            >
              <button
                type="button"
                className="cta-btn"
                onClick={() => onGetStarted?.()}
                style={{
                  background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                  color: "white",
                  border: "none",
                  borderRadius: "30px",
                  padding: "1rem 2.5rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  fontSize: "1.05rem",
                  boxShadow: "0 8px 30px rgba(108,99,255,0.35)",
                  letterSpacing: "-0.01em",
                }}
              >
                Start Practicing Free →
              </button>
              {onRecruiterEntry && (
                <button
                  type="button"
                  onClick={() => onRecruiterEntry()}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#e2e8f0",
                    border: "2px solid rgba(148,163,184,0.35)",
                    borderRadius: "30px",
                    padding: "1rem 2rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontSize: "1.05rem",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>👔</span> I'm a recruiter
                </button>
              )}
              <button
                type="button"
                onClick={() => scrollToSection("how-it-works")}
                style={{
                  background: "transparent",
                  color: "#c4b5fd",
                  border: "2px solid rgba(124,58,237,0.45)",
                  borderRadius: "30px",
                  padding: "1rem 2rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "1.05rem",
                  transition: "all 0.2s ease",
                }}
              >
                See How It Works
              </button>
            </div>
            <p style={{ color: "#71717a", fontSize: "0.82rem", marginTop: "1rem", animation: "slideIn 0.6s 0.5s ease both" }}>No credit card · No setup · Just practice</p>
          </div>

          <div
            className="landing-hero-col-robot"
            style={{
              flex: "0 0 480px",
              height: "560px",
              position: "relative",
              zIndex: 5,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "24px",
                overflow: "hidden",
                position: "relative",
                background: "rgba(124,58,237,0.03)",
                border: "1px solid rgba(124,58,237,0.12)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "380px",
                  height: "380px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />

              <InteractiveRobotSpline
                scene={ROBOT_SCENE}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(ellipse at center, transparent 35%, #05020f 100%)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 28,
                  left: 16,
                  background: "rgba(10,5,25,0.88)",
                  border: "1px solid rgba(124,58,237,0.28)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                <div className="landing-spline-float-10" style={{ fontSize: 10, color: "#71717a", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>
                  Your score
                </div>
                <div className="landing-spline-float-14" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  87 / 100
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed" }} />
                  ))}
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a2a3a" }} />
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  top: 140,
                  right: 12,
                  maxWidth: 150,
                  background: "rgba(10,5,25,0.88)",
                  border: "1px solid rgba(124,58,237,0.28)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                <div className="landing-spline-float-10" style={{ fontSize: 10, color: "#71717a", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>
                  Aria says
                </div>
                <div className="landing-spline-float-12" style={{ fontSize: 12, fontWeight: 500, color: "#d4d4d8", lineHeight: 1.4 }}>
                  Great structure! Add a specific example next time.
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: 48,
                  left: 16,
                  background: "rgba(10,5,25,0.88)",
                  border: "1px solid rgba(124,58,237,0.28)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                <div className="landing-spline-float-10" style={{ fontSize: 10, color: "#71717a", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>
                  Question type
                </div>
                <div className="landing-spline-float-13" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  Behavioral
                </div>
                <div className="landing-spline-float-11" style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                  STAR method recommended
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: 48,
                  right: 12,
                  background: "rgba(10,5,25,0.88)",
                  border: "1px solid rgba(124,58,237,0.28)",
                  borderRadius: 12,
                  padding: "10px 12px 10px 10px",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  pointerEvents: "none",
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ width: 44, height: 44, flexShrink: 0, position: "relative" }} aria-hidden>
                  <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
                    <defs>
                      <linearGradient id="landingHeroTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#4ecdc4" />
                      </linearGradient>
                    </defs>
                    <circle cx="22" cy="22" r="17" fill="none" stroke="rgba(42,42,58,0.95)" strokeWidth="3.5" />
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      fill="none"
                      stroke="url(#landingHeroTimerGrad)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="106.8"
                      strokeDashoffset="21.4"
                    />
                  </svg>
                </div>
                <div>
                  <div className="landing-spline-float-10" style={{ fontSize: 10, color: "#71717a", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>
                    Time left
                  </div>
                  <div className="landing-spline-float-14" style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>
                    24s
                  </div>
                  <div className="landing-spline-float-11" style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                    Keep going
                  </div>
                </div>
              </div>

              <a
                href="https://spline.design"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 12,
                  zIndex: 12,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#52525b",
                  textDecoration: "none",
                  pointerEvents: "auto",
                }}
              >
                Built with Spline
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        ref={statsRef}
        className="stats-grid"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "4rem",
          padding: "4rem 2rem 3rem",
          flexWrap: "wrap",
          position: "relative",
          zIndex: 1,
          background: "rgba(8,4,18,0.9)",
          borderTop: "1px solid rgba(124,58,237,0.1)",
          borderBottom: "1px solid rgba(124,58,237,0.1)",
        }}
      >
        {[
          { value: count1, suffix: "+", label: "Interviews Practiced" },
          { value: count2, suffix: "%", label: "Success Rate" },
          { value: count3, suffix: "+", label: "Job Roles Covered" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div className="landing-stat-num">
              {s.value >= 1000 ? `${(s.value / 1000).toFixed(0)}K` : s.value}
              {s.suffix}
            </div>
            <div style={{ fontSize: "0.88rem", color: "#555", marginTop: "0.4rem", fontWeight: "600" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How it works — full product workflow + Free/Pro hints */}
      <div id="how-it-works" style={{ maxWidth: "1040px", margin: "2rem auto", padding: "2rem", position: "relative", zIndex: 1, scrollMarginTop: "88px", background: "transparent" }}>
        <AnimatedSection>
          <div style={{ textAlign: "center", marginBottom: "2.75rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.2)",
                color: "#a78bfa",
                borderRadius: "20px",
                padding: "0.3rem 0.9rem",
                fontSize: "0.78rem",
                fontWeight: "700",
                marginBottom: "0.75rem",
              }}
            >
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#fff", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2 }}>Research, refine, practice — then track every application</h2>
            <p style={{ color: "#666", fontSize: "0.95rem", margin: "0.85rem auto 0", maxWidth: "560px", lineHeight: 1.55 }}>
              One workspace for company intel, CV work, mock interviews with Aria, Academy lessons, and your pipeline. Free gets you started; Pro unlocks voice, depth, and exports.
            </p>
          </div>
        </AnimatedSection>
        <div className="landing-workflow-grid">
          {[
            {
              step: "01",
              iconKey: "building",
              title: "Company Research",
              desc: "Dig into the company and role before you write or interview. Free includes one browser research; Pro opens the full research tool.",
              chips: [
                { label: "FREE", sub: "1 lookup", pro: false },
                { label: "PRO", sub: "Full workspace", pro: true },
              ],
            },
            {
              step: "02",
              iconKey: "cv",
              title: "CV Tailor & CV Editor",
              desc: "Align your CV to each job description with AI, then polish every section in the editor — tuned to what recruiters scan for.",
              chips: [{ label: "PRO", sub: "Tailor + edit", pro: true }],
            },
            {
              step: "03",
              iconKey: "academy",
              title: "Interview Academy",
              desc: "Structured prep paths, drills, and content beyond one-off mocks so fundamentals stick before the real loop.",
              chips: [{ label: "PRO", sub: "Full library", pro: true }],
            },
            {
              step: "04",
              iconKey: "mock",
              title: "Mock interviews",
              desc: "Questions generated from your CV and the job description, timed answers, and grading. Free has monthly limits; Pro is unlimited with deeper breakdowns.",
              chips: [
                { label: "FREE", sub: "3 / mo · 5 Qs", pro: false },
                { label: "PRO", sub: "Unlimited · 10 Qs", pro: true },
              ],
            },
            {
              step: "05",
              iconKey: "voice",
              title: "Aria voice interviews",
              desc: "On Pro, your browser reads questions aloud so you can practice out loud; Free stays text-only for mocks.",
              chips: [{ label: "PRO", sub: "Read-aloud", pro: true }],
            },
            {
              step: "06",
              iconKey: "tracker",
              title: "Job tracker & documents",
              desc: "Keep applications organized, generate cover letters, and export polished PDFs when you need to share outcomes.",
              chips: [
                { label: "FREE", sub: "Essentials", pro: false },
                { label: "PRO", sub: "Cover + PDF", pro: true },
              ],
            },
          ].map((item, i) => {
            const IconCmp = WORKFLOW_ICON[item.iconKey];
            return (
              <AnimatedSection key={item.step} delay={i * 0.06}>
                <div
                  className="step-card landing-step-card-dark"
                  style={{
                    background: "rgba(124,58,237,0.05)",
                    borderRadius: "16px",
                    padding: "1.75rem",
                    textAlign: "center",
                    height: "100%",
                    cursor: "default",
                    border: "1px solid rgba(124,58,237,0.15)",
                    paddingTop: "1.85rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>{IconCmp ? <IconCmp /> : null}</div>
                  <div
                    style={{
                      color: "#7c3aed",
                      borderRadius: "8px",
                      padding: "0.2rem 0.5rem",
                      fontSize: "0.7rem",
                      fontWeight: "900",
                      display: "inline-block",
                      marginBottom: "0.65rem",
                      letterSpacing: "0.05em",
                      background: "rgba(124,58,237,0.12)",
                    }}
                  >
                    {item.step}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "center", marginBottom: "0.65rem" }}>
                    {item.chips.map((c) => (
                      <span
                        key={`${item.step}-${c.label}-${c.sub}`}
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: "800",
                          letterSpacing: "0.06em",
                          padding: "0.2rem 0.45rem",
                          borderRadius: "999px",
                          border: c.pro ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(110,231,183,0.35)",
                          background: c.pro ? "rgba(124,58,237,0.12)" : "rgba(16,185,129,0.1)",
                          color: c.pro ? "#c4b5fd" : "#6ee7b7",
                        }}
                        title={c.sub}
                      >
                        {c.label}
                        <span style={{ opacity: 0.85, fontWeight: "700" }}> · {c.sub}</span>
                      </span>
                    ))}
                  </div>
                  <h3 style={{ fontWeight: "800", color: "#fff", marginBottom: "0.5rem", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>{item.title}</h3>
                  <p style={{ color: "#666", fontSize: "0.82rem", lineHeight: "1.6", margin: 0, flex: 1 }}>{item.desc}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>

      {/* Free vs Pro — aligned with pricingFeatures copy */}
      <div id="features" style={{ maxWidth: "960px", margin: "4rem auto", padding: "2rem", position: "relative", zIndex: 1, scrollMarginTop: "88px" }}>
        <AnimatedSection>
          <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.2)",
                color: "#a78bfa",
                borderRadius: "20px",
                padding: "0.3rem 0.9rem",
                fontSize: "0.78rem",
                fontWeight: "700",
                marginBottom: "0.75rem",
              }}
            >
              FREE VS PRO
            </div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Pick where you start — upgrade when you need the full stack</h2>
            <p style={{ color: "#666", fontSize: "0.92rem", margin: "0.75rem auto 0", maxWidth: "520px", lineHeight: 1.55 }}>Same dark workspace; Pro adds voice, Academy, CV tooling, company research depth, and exports.</p>
          </div>
        </AnimatedSection>
        <div className="landing-compare-row">
          <AnimatedSection delay={0.05}>
            <div
              style={{
                background: "rgba(10,5,25,0.55)",
                borderRadius: "18px",
                padding: "1.75rem 1.5rem",
                border: "1px solid rgba(255,255,255,0.08)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: "800", letterSpacing: "0.14em", color: "#6ee7b7", marginBottom: "0.35rem" }}>FREE</div>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.35rem", fontWeight: "900", color: "#fff", letterSpacing: "-0.02em" }}>Start practicing today</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {UPGRADE_MODAL_FREE.map((line) => (
                  <li key={line} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start", marginBottom: "0.65rem", color: "#aaa", fontSize: "0.88rem", lineHeight: 1.45 }}>
                    <CheckBullet pro={false} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="cta-btn"
                onClick={() => onGetStarted?.()}
                style={{
                  marginTop: "1.35rem",
                  width: "100%",
                  background: "transparent",
                  color: "#e5e5e5",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "14px",
                  padding: "0.85rem 1rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                }}
              >
                Continue with Free
              </button>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div
              style={{
                background: "linear-gradient(145deg, rgba(124,58,237,0.14), rgba(10,5,25,0.75))",
                borderRadius: "18px",
                padding: "1.75rem 1.5rem",
                border: "1px solid rgba(124,58,237,0.35)",
                boxShadow: "0 0 40px rgba(124,58,237,0.12)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", top: "12px", right: "12px", fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.1em", color: "#0f172a", background: "linear-gradient(135deg, #c4b5fd, #a78bfa)", padding: "0.25rem 0.55rem", borderRadius: "999px" }}>POPULAR</div>
              <div style={{ fontSize: "0.72rem", fontWeight: "800", letterSpacing: "0.14em", color: "#a78bfa", marginBottom: "0.35rem" }}>PRO</div>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.35rem", fontWeight: "900", color: "#fff", letterSpacing: "-0.02em" }}>Everything serious candidates use</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {UPGRADE_MODAL_PRO.map((line) => (
                  <li key={line} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start", marginBottom: "0.65rem", color: "#d4d4d8", fontSize: "0.88rem", lineHeight: 1.45 }}>
                    <CheckBullet pro />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="cta-btn"
                onClick={() => (landingNavProps?.onPricing ? landingNavProps.onPricing() : onGetStarted?.())}
                style={{
                  marginTop: "1.35rem",
                  width: "100%",
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "0.95rem 1rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  fontSize: "0.98rem",
                  boxShadow: "0 0 22px rgba(124,58,237,0.35)",
                }}
              >
                {landingNavProps?.onPricing ? "View Pro pricing" : "Upgrade to Pro"}
              </button>
            </div>
          </AnimatedSection>
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ maxWidth: "960px", margin: "4rem auto", padding: "2rem", position: "relative", zIndex: 1 }}>
        <AnimatedSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.2)",
                color: "#a78bfa",
                borderRadius: "20px",
                padding: "0.3rem 0.9rem",
                fontSize: "0.78rem",
                fontWeight: "700",
                marginBottom: "0.75rem",
              }}
            >
              TESTIMONIALS
            </div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Loved by job seekers</h2>
          </div>
        </AnimatedSection>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
          {[
            { quote: "I used InterviewAI for 3 days before my Google interview. Got the offer. This thing is genuinely incredible.", name: "Sarah K.", role: "Software Engineer @ Google", emoji: "👩‍💻", stars: 5 },
            { quote: "The Aria feedback felt like having a real coach. My confidence went through the roof after just a few sessions.", name: "James T.", role: "Product Manager @ Meta", emoji: "👨‍💼", stars: 5 },
            { quote: "I was terrified of interviews. After 5 practice sessions here, I felt completely prepared. Landed my dream job!", name: "Priya M.", role: "UX Designer @ Airbnb", emoji: "👩‍🎨", stars: 5 },
          ].map((t, i) => (
            <AnimatedSection key={i} delay={i * 0.1}>
              <div
                style={{
                  background: "rgba(10,5,25,0.8)",
                  borderRadius: "16px",
                  padding: "1.75rem",
                  border: "1px solid rgba(255,255,255,0.07)",
                  height: "100%",
                }}
              >
                <div style={{ fontSize: "1rem", marginBottom: "0.75rem", lineHeight: 1 }}>
                  {[...Array(t.stars)].map((_, si) => (
                    <span key={si} style={{ color: "#f59e0b", marginRight: 2 }} aria-hidden>
                      ★
                    </span>
                  ))}
                </div>
                <p style={{ color: "#aaa", fontSize: "0.88rem", lineHeight: "1.65", marginBottom: "1.25rem", fontStyle: "italic" }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    {t.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: "800", color: "#fff", fontSize: "0.85rem" }}>{t.name}</div>
                    <div style={{ color: "#666", fontSize: "0.75rem" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>

      {/* CTA */}
      <AnimatedSection>
        <div style={{ maxWidth: "860px", margin: "4rem auto 3rem", padding: "0 2rem", position: "relative", zIndex: 1 }}>
          <div
            className="landing-cta-block"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))",
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: "24px",
              padding: "4rem 3rem",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: "rgba(124,58,237,0.08)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", bottom: "-30px", left: "-30px", width: "150px", height: "150px", background: "rgba(79,70,229,0.06)", borderRadius: "50%" }} />
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 1.25rem",
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(79,70,229,0.25))",
                border: "1px solid rgba(124,58,237,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "float3 3s ease-in-out infinite",
              }}
              aria-hidden
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="#e9d5ff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" fill="#a78bfa" />
              </svg>
            </div>
            <h2 style={{ color: "#fff", fontSize: "40px", fontWeight: "900", marginBottom: "1rem", letterSpacing: "-0.02em", lineHeight: 1.15 }}>Ready to ace your interview?</h2>
            <p style={{ color: "#888", marginBottom: "2rem", fontSize: "1rem", maxWidth: "440px", margin: "0 auto 2rem", lineHeight: "1.7" }}>Start on Free, then unlock Pro for voice interviews, Academy, CV tools, and full company research when you are ready.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", alignItems: "center" }}>
              <button
                type="button"
                className="cta-btn"
                onClick={() => onGetStarted?.()}
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "30px",
                  padding: "1.1rem 2.75rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  boxShadow: "0 0 20px rgba(124,58,237,0.4)",
                  letterSpacing: "-0.01em",
                }}
              >
                Start Free Today →
              </button>
              {landingNavProps?.onPricing && (
                <button
                  type="button"
                  className="nav-btn"
                  onClick={() => landingNavProps.onPricing()}
                  style={{
                    background: "transparent",
                    color: "#ccc",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "30px",
                    padding: "1.05rem 1.75rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  Compare Free vs Pro
                </button>
              )}
            </div>
            <p style={{ color: "#666", fontSize: "0.82rem", marginTop: "1rem" }}>No credit card · Takes 2 minutes to start</p>
          </div>
        </div>
      </AnimatedSection>

      <LandingFooter {...landingFooterProps} />
    </div>
  );
}
