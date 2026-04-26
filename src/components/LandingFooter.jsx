const colTitle = {
  fontSize: "0.72rem",
  fontWeight: "800",
  letterSpacing: "0.12em",
  color: "#a78bfa",
  marginBottom: "1rem",
  textTransform: "uppercase",
};

const linkStyle = {
  color: "#555",
  textDecoration: "none",
  fontSize: "0.88rem",
  display: "block",
  marginBottom: "0.65rem",
  transition: "color 0.2s ease",
  cursor: "pointer",
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  fontFamily: "inherit",
};

/**
 * @param {object} props
 * @param {() => void} props.onPricing
 * @param {() => void} props.onFeatures
 * @param {() => void} props.onHowItWorks
 * @param {() => void} props.onAcademy
 * @param {() => void} props.onCompanyResearch
 * @param {() => void} props.onPrivacy
 * @param {() => void} props.onTerms
 * @param {() => void} props.onCookies
 * @param {() => void} props.onContact — mailto or future page
 */
export default function LandingFooter({
  onPricing,
  onFeatures,
  onHowItWorks,
  onAcademy,
  onCompanyResearch,
  onPrivacy,
  onTerms,
  onCookies,
  onContact,
}) {
  const L = ({ children, onClick, title, asSpan }) =>
    asSpan ? (
      <span style={linkStyle} className="landing-footer-link" title={title}>
        {children}
      </span>
    ) : (
      <button type="button" style={linkStyle} className="landing-footer-link" onClick={onClick} title={title}>
        {children}
      </button>
    );

  return (
    <>
      <style>{`
        .landing-footer-link:hover { color: #a78bfa !important; }
      `}</style>
      <footer
        style={{
          background: "rgba(5,2,15,0.95)",
          borderTop: "1px solid rgba(124,58,237,0.1)",
          marginTop: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "3rem clamp(1.25rem, 4vw, 3rem) 2rem",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "2rem",
          }}
          className="landing-footer-grid"
        >
          <style>{`
            @media (max-width: 900px) {
              .landing-footer-grid { grid-template-columns: 1fr 1fr !important; }
            }
            @media (max-width: 520px) {
              .landing-footer-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.95rem",
                }}
              >
                🎯
              </div>
              <span
                style={{
                  fontWeight: "900",
                  fontSize: "1rem",
                  background: "linear-gradient(135deg, #ffffff, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                InterviewAI
              </span>
            </div>
            <p style={{ color: "#555", fontSize: "0.85rem", lineHeight: 1.55, margin: "0 0 1rem" }}>
              AI-powered interview preparation &amp; hiring
            </p>
            <p style={{ color: "#444", fontSize: "0.78rem", margin: 0 }}>© 2026 InterviewAI</p>
          </div>

          <div>
            <div style={colTitle}>Product</div>
            <L onClick={onPricing}>Pricing</L>
            <L onClick={onFeatures}>Features</L>
            <L onClick={onHowItWorks}>How it works</L>
            <L onClick={onAcademy}>Academy</L>
            <L onClick={onCompanyResearch}>Company Research</L>
          </div>

          <div>
            <div style={colTitle}>Legal</div>
            <L onClick={onPrivacy}>Privacy Policy</L>
            <L onClick={onTerms}>Terms of Service</L>
            <L onClick={onCookies}>Cookie Policy</L>
          </div>

          <div>
            <div style={colTitle}>Company</div>
            <L asSpan title="Coming soon">
              About
            </L>
            <L onClick={onContact}>Contact</L>
            <L asSpan title="Coming soon">
              Changelog
            </L>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "1.25rem clamp(1.25rem, 4vw, 3rem)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#444", fontSize: "0.8rem", margin: 0 }}>
            © 2026 InterviewAI · Built with GPT-4o · Powered by Supabase
          </p>
        </div>
      </footer>
    </>
  );
}
