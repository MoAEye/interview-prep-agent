import { useState, useEffect, useRef } from "react";

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

export default function LandingPage({ onGetStarted, onTryDemo }) {
  const [scrollY, setScrollY] = useState(0);
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
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #faf7ff 0%, #f0f7ff 40%, #f4fff9 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif", overflowX: "hidden" }}>
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
        .cta-btn { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .cta-btn:hover { transform: translateY(-3px) scale(1.03) !important; box-shadow: 0 16px 50px rgba(108,99,255,0.45) !important; }
        .cta-btn:active { transform: scale(0.98) !important; }
        .step-card { transition: all 0.3s ease; }
        .step-card:hover { transform: translateY(-6px); box-shadow: 0 20px 50px rgba(108,99,255,0.12) !important; }
        .feature-card { transition: all 0.3s ease; }
        .feature-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 16px 40px rgba(108,99,255,0.1) !important; }
        .nav-btn { transition: all 0.2s ease; }
        .nav-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(108,99,255,0.35) !important; }
        @media (max-width: 768px) {
          .hero-title { font-size: 2.4rem !important; }
          .stats-grid { gap: 1.5rem !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .nav-links { display: none; }
        }
        @media (max-width: 480px) {
          .steps-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 2rem !important; }
        }
      `}</style>

      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)", borderRadius: "50%", animation: "orb1 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-8%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(78,205,196,0.1) 0%, transparent 70%)", borderRadius: "50%", animation: "orb2 15s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "800px", height: "400px", background: "radial-gradient(ellipse, rgba(108,99,255,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, padding: "1rem 3rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: scrollY > 20 ? "rgba(255,255,255,0.85)" : "transparent", backdropFilter: scrollY > 20 ? "blur(20px)" : "none", borderBottom: scrollY > 20 ? "1px solid rgba(108,99,255,0.08)" : "none", transition: "all 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🎯</div>
          <span style={{ fontWeight: "900", fontSize: "1.2rem", color: "#1e3a5f", letterSpacing: "-0.02em" }}>InterviewAI</span>
        </div>
        <div className="nav-links" style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {["How it works", "Features", "Pricing"].map(l => (
            <span key={l} style={{ color: "#666", fontWeight: "600", fontSize: "0.9rem", cursor: "pointer", transition: "color 0.2s" }}>{l}</span>
          ))}
        </div>
        <button className="nav-btn" onClick={onGetStarted} style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "25px", padding: "0.6rem 1.5rem", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem", boxShadow: "0 4px 15px rgba(108,99,255,0.3)" }}>
          Get Started Free
        </button>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "5rem 2rem 4rem", position: "relative", zIndex: 1 }}>
        <div style={{ animation: "slideIn 0.6s 0.1s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "white", border: "1px solid rgba(108,99,255,0.2)", borderRadius: "25px", padding: "0.4rem 1.1rem", fontSize: "0.82rem", fontWeight: "700", color: "#6c63ff", marginBottom: "2rem", boxShadow: "0 4px 15px rgba(108,99,255,0.08)" }}>
            <span style={{ width: "6px", height: "6px", background: "#4ecdc4", borderRadius: "50%", display: "inline-block", animation: "pulse-ring 2s infinite" }} />
            Powered by GPT-4o · Free to use
          </div>
        </div>

        <h1 className="hero-title" style={{ fontSize: "4rem", fontWeight: "900", color: "#1e3a5f", lineHeight: "1.08", marginBottom: "1.5rem", maxWidth: "750px", margin: "0 auto 1.5rem", letterSpacing: "-0.03em", animation: "slideIn 0.6s 0.2s ease both" }}>
          Ace Your Next<br />
          <span style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {typedWord || "Interview"}<span style={{ opacity: 1, animation: "blink 1s step-end infinite", color: "#6c63ff", WebkitTextFillColor: "#6c63ff" }}>|</span>
          </span><br />
          <span style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Interview With AI</span>
        </h1>

        <p style={{ fontSize: "1.15rem", color: "#777", maxWidth: "520px", margin: "0 auto 2.5rem", lineHeight: "1.75", animation: "slideIn 0.6s 0.3s ease both" }}>
          Meet <strong style={{ color: "#6c63ff" }}>Aria</strong>, your personal AI coach. Upload your CV, get tailored questions, practice live, and get a detailed graded report.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", animation: "slideIn 0.6s 0.4s ease both" }}>
          <button className="cta-btn" onClick={onGetStarted} style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "30px", padding: "1rem 2.5rem", fontWeight: "800", cursor: "pointer", fontSize: "1.05rem", boxShadow: "0 8px 30px rgba(108,99,255,0.35)", letterSpacing: "-0.01em" }}>
            Start Practicing Free →
          </button>
          {onTryDemo && (
            <button className="cta-btn" onClick={onTryDemo} style={{ background: "white", color: "#6c63ff", border: "2px solid rgba(108,99,255,0.2)", borderRadius: "30px", padding: "1rem 2rem", fontWeight: "700", cursor: "pointer", fontSize: "1.05rem", transition: "all 0.2s ease" }}>
              Try without signing up
            </button>
          )}
          <button onClick={onGetStarted} style={{ background: "white", color: "#6c63ff", border: "2px solid rgba(108,99,255,0.2)", borderRadius: "30px", padding: "1rem 2rem", fontWeight: "700", cursor: "pointer", fontSize: "1.05rem", transition: "all 0.2s ease" }}>
            See How It Works
          </button>
        </div>
        <p style={{ color: "#bbb", fontSize: "0.82rem", marginTop: "1rem", animation: "slideIn 0.6s 0.5s ease both" }}>No credit card · No setup · Just practice</p>

        {/* Floating UI preview cards */}
        <div style={{ position: "relative", maxWidth: "700px", margin: "4rem auto 0", animation: "slideIn 0.8s 0.5s ease both" }}>
          {/* Main card */}
          <div style={{ background: "white", borderRadius: "24px", padding: "2rem", boxShadow: "0 30px 80px rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.08)", position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🎙️</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "0.95rem" }}>Aria's Feedback</div>
                <div style={{ color: "#aaa", fontSize: "0.78rem" }}>Just now</div>
              </div>
              <div style={{ marginLeft: "auto", background: "#f0fff4", color: "#2d6a4f", borderRadius: "20px", padding: "0.25rem 0.75rem", fontSize: "0.78rem", fontWeight: "800" }}>87 / 100</div>
            </div>
            <div style={{ background: "linear-gradient(135deg, #f0edff, #e8f7ff)", borderRadius: "16px", padding: "1.25rem", textAlign: "left", marginBottom: "1rem" }}>
              <p style={{ color: "#444", fontSize: "0.88rem", lineHeight: "1.6", margin: 0 }}>
                "Great answer! You demonstrated strong problem-solving skills and connected your experience directly to the role. Try to use the STAR method more consistently..."
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {["💪 Communication", "🎯 Relevance", "⭐ Clarity"].map(tag => (
                <span key={tag} style={{ background: "#f8f4ff", color: "#6c63ff", borderRadius: "20px", padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: "700" }}>{tag}</span>
              ))}
            </div>
          </div>
          {/* Floating score badge */}
          <div style={{ position: "absolute", top: "-20px", right: "-20px", background: "white", borderRadius: "20px", padding: "1rem 1.25rem", boxShadow: "0 12px 35px rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.1)", animation: "float1 4s ease-in-out infinite", zIndex: 3, textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#6c63ff", lineHeight: 1 }}>87</div>
            <div style={{ fontSize: "0.7rem", color: "#aaa", fontWeight: "600" }}>Score</div>
            <div style={{ fontSize: "0.9rem", marginTop: "2px" }}>⭐⭐⭐⭐</div>
          </div>
          {/* Floating timer badge */}
          <div style={{ position: "absolute", bottom: "-15px", left: "-25px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "16px", padding: "0.75rem 1.1rem", boxShadow: "0 8px 25px rgba(108,99,255,0.3)", animation: "float2 5s ease-in-out infinite", zIndex: 3 }}>
            <div style={{ color: "white", fontWeight: "900", fontSize: "1.1rem", lineHeight: 1 }}>⏱ 28s</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem", fontWeight: "600" }}>Time left</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="stats-grid" style={{ display: "flex", justifyContent: "center", gap: "4rem", padding: "4rem 2rem 3rem", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
        {[
          { value: count1, suffix: "+", label: "Interviews Practiced", color: "#6c63ff" },
          { value: count2, suffix: "%", label: "Success Rate", color: "#4ecdc4" },
          { value: count3, suffix: "+", label: "Job Roles Covered", color: "#ff9a4d" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.8rem", fontWeight: "900", color: s.color, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {s.value >= 1000 ? `${(s.value/1000).toFixed(0)}K` : s.value}{s.suffix}
            </div>
            <div style={{ fontSize: "0.88rem", color: "#999", marginTop: "0.4rem", fontWeight: "600" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ maxWidth: "960px", margin: "2rem auto", padding: "2rem", position: "relative", zIndex: 1 }}>
        <AnimatedSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#ede9ff", color: "#6c63ff", borderRadius: "20px", padding: "0.3rem 0.9rem", fontSize: "0.78rem", fontWeight: "700", marginBottom: "0.75rem" }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#1e3a5f", margin: 0, letterSpacing: "-0.02em" }}>From zero to interview-ready<br />in 4 simple steps</h2>
          </div>
        </AnimatedSection>
        <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.25rem" }}>
          {[
            { emoji: "📄", step: "01", title: "Upload Resume", desc: "Paste your CV and the job description you're applying for", color: "rgba(108,99,255,0.06)" },
            { emoji: "🤖", step: "02", title: "AI Analyses", desc: "Aria identifies your strengths, gaps, and key focus areas", color: "rgba(78,205,196,0.06)" },
            { emoji: "🎤", step: "03", title: "Mock Interview", desc: "Answer tailored questions with a live timer and voice input", color: "rgba(255,154,77,0.06)" },
            { emoji: "🏆", step: "04", title: "Get Graded", desc: "Receive a full report with scores, feedback, and ideal answers", color: "rgba(108,99,255,0.06)" },
          ].map((item, i) => (
            <AnimatedSection key={item.step} delay={i * 0.1}>
              <div className="step-card" style={{ background: "white", borderRadius: "20px", padding: "1.75rem", textAlign: "center", boxShadow: "0 4px 24px rgba(108,99,255,0.06)", height: "100%", cursor: "default", border: `1px solid ${item.color.replace("0.06", "0.12")}` }}>
                <div style={{ fontSize: "2.2rem", marginBottom: "1rem" }}>{item.emoji}</div>
                <div style={{ background: item.color, color: "#6c63ff", borderRadius: "8px", padding: "0.2rem 0.5rem", fontSize: "0.7rem", fontWeight: "900", display: "inline-block", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>{item.step}</div>
                <h3 style={{ fontWeight: "800", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>{item.title}</h3>
                <p style={{ color: "#888", fontSize: "0.82rem", lineHeight: "1.6", margin: 0 }}>{item.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: "960px", margin: "4rem auto", padding: "2rem", position: "relative", zIndex: 1 }}>
        <AnimatedSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#e8f7ff", color: "#2d9d9d", borderRadius: "20px", padding: "0.3rem 0.9rem", fontSize: "0.78rem", fontWeight: "700", marginBottom: "0.75rem" }}>FEATURES</div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#1e3a5f", margin: 0, letterSpacing: "-0.02em" }}>Everything you need to land the job</h2>
          </div>
        </AnimatedSection>
        <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
          {[
            { emoji: "🎯", title: "Tailored Questions", desc: "Questions generated from your exact resume and job description — not generic templates", bg: "#faf7ff", accent: "#6c63ff" },
            { emoji: "⏱️", title: "Timed Pressure Mode", desc: "30 second countdown per question to simulate real interview pressure", bg: "#f0fbff", accent: "#2d9d9d" },
            { emoji: "🗣️", title: "Voice with Aria", desc: "Aria reads questions aloud and transcribes your spoken answers in real time", bg: "#f4fff9", accent: "#2d6a4f" },
            { emoji: "📊", title: "Detailed Scoring", desc: "Per-question scores, strengths, improvements, and ideal answers all in one report", bg: "#fffbf0", accent: "#b8860b" },
            { emoji: "📈", title: "Progress Dashboard", desc: "Track your scores over time and see which topics you keep missing", bg: "#fff7f4", accent: "#b85c2e" },
            { emoji: "📄", title: "Export Report", desc: "Download a full PDF report or save your report card as an image to share", bg: "#f7f4ff", accent: "#6c63ff" },
          ].map((f, i) => (
            <AnimatedSection key={f.title} delay={i * 0.08}>
              <div className="feature-card" style={{ background: f.bg, borderRadius: "20px", padding: "1.75rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.04)", cursor: "default" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{f.emoji}</div>
                <h3 style={{ fontWeight: "800", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.95rem", letterSpacing: "-0.01em" }}>{f.title}</h3>
                <p style={{ color: "#777", fontSize: "0.82rem", lineHeight: "1.6", margin: 0 }}>{f.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ maxWidth: "960px", margin: "4rem auto", padding: "2rem", position: "relative", zIndex: 1 }}>
        <AnimatedSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{ display: "inline-block", background: "#f0fff4", color: "#2d6a4f", borderRadius: "20px", padding: "0.3rem 0.9rem", fontSize: "0.78rem", fontWeight: "700", marginBottom: "0.75rem" }}>TESTIMONIALS</div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "900", color: "#1e3a5f", margin: 0, letterSpacing: "-0.02em" }}>Loved by job seekers</h2>
          </div>
        </AnimatedSection>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
          {[
            { quote: "I used InterviewAI for 3 days before my Google interview. Got the offer. This thing is genuinely incredible.", name: "Sarah K.", role: "Software Engineer @ Google", emoji: "👩‍💻", stars: 5 },
            { quote: "The Aria feedback felt like having a real coach. My confidence went through the roof after just a few sessions.", name: "James T.", role: "Product Manager @ Meta", emoji: "👨‍💼", stars: 5 },
            { quote: "I was terrified of interviews. After 5 practice sessions here, I felt completely prepared. Landed my dream job!", name: "Priya M.", role: "UX Designer @ Airbnb", emoji: "👩‍🎨", stars: 5 },
          ].map((t, i) => (
            <AnimatedSection key={i} delay={i * 0.1}>
              <div style={{ background: "white", borderRadius: "20px", padding: "1.75rem", boxShadow: "0 4px 24px rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.06)", height: "100%" }}>
                <div style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>{[...Array(t.stars)].map((_, i) => <span key={i}>⭐</span>)}</div>
                <p style={{ color: "#444", fontSize: "0.88rem", lineHeight: "1.65", marginBottom: "1.25rem", fontStyle: "italic" }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #ede9ff, #e8f7ff)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{t.emoji}</div>
                  <div>
                    <div style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "0.85rem" }}>{t.name}</div>
                    <div style={{ color: "#aaa", fontSize: "0.75rem" }}>{t.role}</div>
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
          <div style={{ background: "linear-gradient(135deg, #6c63ff 0%, #5a52d5 50%, #4ecdc4 100%)", borderRadius: "28px", padding: "4rem 3rem", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(108,99,255,0.3)" }}>
            <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", bottom: "-30px", left: "-30px", width: "150px", height: "150px", background: "rgba(255,255,255,0.04)", borderRadius: "50%" }} />
            <div style={{ fontSize: "3rem", marginBottom: "1rem", animation: "float3 3s ease-in-out infinite" }}>🚀</div>
            <h2 style={{ color: "white", fontSize: "2.2rem", fontWeight: "900", marginBottom: "1rem", letterSpacing: "-0.02em" }}>Ready to ace your interview?</h2>
            <p style={{ color: "rgba(255,255,255,0.82)", marginBottom: "2rem", fontSize: "1rem", maxWidth: "420px", margin: "0 auto 2rem", lineHeight: "1.7" }}>Join thousands of candidates who landed their dream job with Aria as their coach.</p>
            <button className="cta-btn" onClick={onGetStarted} style={{ background: "white", color: "#6c63ff", border: "none", borderRadius: "30px", padding: "1.1rem 2.75rem", fontWeight: "800", cursor: "pointer", fontSize: "1.1rem", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", letterSpacing: "-0.01em" }}>
              Start Free Today →
            </button>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", marginTop: "1rem" }}>No credit card · Takes 2 minutes to start</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "2.5rem 2rem", borderTop: "1px solid rgba(108,99,255,0.08)", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>🎯</div>
          <span style={{ fontWeight: "800", color: "#1e3a5f", fontSize: "1rem" }}>InterviewAI</span>
        </div>
        <p style={{ color: "#bbb", fontSize: "0.82rem", margin: 0 }}>© 2026 InterviewAI · Built with ❤️ · Powered by GPT-4o</p>
      </footer>
    </div>
  );
}
