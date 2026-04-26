import PublicMarketingLayout from "./components/PublicMarketingLayout.jsx";

export default function EmailConfirmedPage({ marketingNav, marketingFooter, onEnter }) {
  return (
    <PublicMarketingLayout navProps={marketingNav} footerProps={marketingFooter}>
      <style>{`
        @keyframes email-confirm-pop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .email-confirm-icon {
          animation: email-confirm-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(3rem, 10vw, 6rem) clamp(1.25rem, 4vw, 3rem) 4rem",
          textAlign: "center",
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="email-confirm-icon" style={{ marginBottom: "1.75rem" }}>
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
            <circle cx="48" cy="48" r="44" stroke="rgba(34,197,94,0.35)" strokeWidth="3" />
            <circle cx="48" cy="48" r="40" fill="rgba(34,197,94,0.12)" />
            <path d="M28 48l14 14 26-28" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ color: "#fff", fontSize: "clamp(1.6rem, 4vw, 2.25rem)", fontWeight: 900, margin: "0 0 0.65rem", letterSpacing: "-0.02em" }}>Email confirmed!</h1>
        <p style={{ color: "#888", maxWidth: "440px", lineHeight: 1.65, margin: "0 0 2rem", fontSize: "1rem" }}>
          Your account is ready. Let&apos;s get you interview-ready.
        </p>
        <button
          type="button"
          onClick={onEnter}
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            padding: "1rem 2rem",
            fontWeight: "800",
            cursor: "pointer",
            fontSize: "1.05rem",
            boxShadow: "0 0 24px rgba(124,58,237,0.4)",
            fontFamily: "inherit",
          }}
        >
          Enter InterviewAI →
        </button>
      </div>
    </PublicMarketingLayout>
  );
}
