export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", fontFamily: "sans-serif" }}>
      <nav style={{ padding: "1.5rem 3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🎯</span>
          <span style={{ fontWeight: "800", fontSize: "1.2rem", color: "#1e3a5f" }}>InterviewAI</span>
        </div>
        <button onClick={onGetStarted} style={{ background: "#6c63ff", color: "white", border: "none", borderRadius: "25px", padding: "0.6rem 1.5rem", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem" }}>Get Started Free</button>
      </nav>
      <div style={{ textAlign: "center", padding: "4rem 2rem 3rem" }}>
        <div style={{ display: "inline-block", background: "#ede9ff", color: "#6c63ff", borderRadius: "25px", padding: "0.4rem 1rem", fontSize: "0.85rem", fontWeight: "700", marginBottom: "1.5rem" }}>🤖 Powered by AI</div>
        <h1 style={{ fontSize: "3.5rem", fontWeight: "900", color: "#1e3a5f", lineHeight: "1.1", marginBottom: "1.5rem", maxWidth: "700px", margin: "0 auto 1.5rem" }}>Ace Your Next <span style={{ color: "#6c63ff" }}>Interview</span> With AI</h1>
        <p style={{ fontSize: "1.2rem", color: "#666", maxWidth: "550px", margin: "0 auto 2.5rem", lineHeight: "1.7" }}>Meet <strong>Aria</strong>, your personal AI interview coach. Upload your resume, get tailored questions, and practice with a real-time mock interview.</p>
        <button onClick={onGetStarted} style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "30px", padding: "1rem 2.5rem", fontWeight: "800", cursor: "pointer", fontSize: "1.1rem", boxShadow: "0 8px 30px rgba(108,99,255,0.3)" }}>Start Practicing Free →</button>
        <p style={{ color: "#aaa", fontSize: "0.85rem", marginTop: "1rem" }}>No credit card required</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "3rem", padding: "2rem", marginBottom: "3rem" }}>
        {[["10K+", "Interviews Practiced"], ["94%", "Success Rate"], ["500+", "Job Roles Covered"]].map(([stat, label]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: "900", color: "#6c63ff" }}>{stat}</div>
            <div style={{ fontSize: "0.85rem", color: "#888" }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "3rem" }}>How It Works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem" }}>
          {[
            { emoji: "📄", step: "1", title: "Upload Resume", desc: "Paste your CV and the job description" },
            { emoji: "🤖", step: "2", title: "AI Analyses", desc: "Aria identifies your strengths and gaps" },
            { emoji: "🎤", step: "3", title: "Mock Interview", desc: "Answer questions with 30s timer" },
            { emoji: "🏆", step: "4", title: "Get Graded", desc: "Receive a detailed score and feedback" },
          ].map((item) => (
            <div key={item.step} style={{ background: "white", borderRadius: "16px", padding: "1.5rem", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{item.emoji}</div>
              <div style={{ background: "#ede9ff", color: "#6c63ff", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "800", margin: "0 auto 0.75rem" }}>{item.step}</div>
              <h3 style={{ fontWeight: "700", color: "#1e3a5f", marginBottom: "0.4rem", fontSize: "0.95rem" }}>{item.title}</h3>
              <p style={{ color: "#888", fontSize: "0.82rem", lineHeight: "1.5", margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: "900px", margin: "4rem auto", padding: "2rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "3rem" }}>Everything You Need</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
          {[
            { emoji: "🎯", title: "Tailored Questions", desc: "Questions generated specifically from your resume and the job description", color: "#ede9ff" },
            { emoji: "⏱️", title: "30s Timer Challenge", desc: "Practice under pressure with a real countdown timer per question", color: "#e9f7ff" },
            { emoji: "🗣️", title: "Voice with Aria", desc: "Aria reads questions aloud and listens to your spoken answers", color: "#f0fff4" },
            { emoji: "📊", title: "Detailed Scoring", desc: "Get scored per question and an overall interview rating out of 100", color: "#fff9e9" },
            { emoji: "💡", title: "Gap Analysis", desc: "See exactly where your resume is weak vs what the job requires", color: "#fff0f0" },
            { emoji: "📄", title: "Full Report", desc: "Download a detailed PDF report of your mock interview performance", color: "#f4f0ff" },
          ].map((f) => (
            <div key={f.title} style={{ background: f.color, borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{f.emoji}</div>
              <h3 style={{ fontWeight: "700", color: "#1e3a5f", marginBottom: "0.4rem", fontSize: "0.95rem" }}>{f.title}</h3>
              <p style={{ color: "#666", fontSize: "0.82rem", lineHeight: "1.5", margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "4rem 2rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "24px", maxWidth: "860px", margin: "2rem auto" }}>
        <h2 style={{ color: "white", fontSize: "2rem", fontWeight: "800", marginBottom: "1rem" }}>Ready to Ace Your Interview?</h2>
        <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: "2rem", fontSize: "1rem" }}>Join thousands of candidates who landed their dream job with Aria</p>
        <button onClick={onGetStarted} style={{ background: "white", color: "#6c63ff", border: "none", borderRadius: "30px", padding: "1rem 2.5rem", fontWeight: "800", cursor: "pointer", fontSize: "1.1rem" }}>Start Free Today →</button>
      </div>
      <div style={{ textAlign: "center", padding: "2rem", color: "#aaa", fontSize: "0.85rem" }}>© 2026 InterviewAI · Built with ❤️</div>
    </div>
  );
}
