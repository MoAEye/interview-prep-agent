import PublicMarketingLayout from "./components/PublicMarketingLayout.jsx";

function RobotMark() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden style={{ animation: "notfound-float 3.2s ease-in-out infinite" }}>
      <defs>
        <linearGradient id="notfound-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect x="28" y="38" width="64" height="52" rx="12" stroke="url(#notfound-grad)" strokeWidth="3" />
      <circle cx="48" cy="58" r="5" fill="#a78bfa" />
      <circle cx="72" cy="58" r="5" fill="#a78bfa" />
      <path d="M46 76c8 6 20 6 28 0" stroke="url(#notfound-grad)" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 22v12M44 28h32" stroke="#6b21a8" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 64h12M90 64h12" stroke="#5b21b6" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export default function NotFoundPage({ marketingNav, marketingFooter, user, onGoHome, onGoDashboard }) {
  const showDash = !!user;

  return (
    <PublicMarketingLayout navProps={marketingNav} footerProps={marketingFooter}>
      <style>{`
        @keyframes notfound-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(2rem, 6vw, 5rem) clamp(1.25rem, 4vw, 3rem) 4rem",
          textAlign: "center",
          minHeight: "55vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ marginBottom: "1.5rem", opacity: 0.95 }}>
          <RobotMark />
        </div>
        <div
          style={{
            fontSize: "clamp(72px, 18vw, 120px)",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #fff, #a78bfa, #7c3aed)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.5rem",
          }}
        >
          404
        </div>
        <h1 style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Page not found</h1>
        <p style={{ color: "#888", maxWidth: "420px", lineHeight: 1.65, margin: "0 0 2rem", fontSize: "0.95rem" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onGoHome}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff",
              border: "none",
              borderRadius: "14px",
              padding: "0.9rem 1.5rem",
              fontWeight: "800",
              cursor: "pointer",
              fontSize: "0.95rem",
              boxShadow: "0 0 22px rgba(124,58,237,0.35)",
              fontFamily: "inherit",
            }}
          >
            Go Home
          </button>
          {showDash && (
            <button
              type="button"
              onClick={onGoDashboard}
              style={{
                background: "transparent",
                color: "#ccc",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "14px",
                padding: "0.9rem 1.5rem",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontFamily: "inherit",
              }}
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </PublicMarketingLayout>
  );
}
