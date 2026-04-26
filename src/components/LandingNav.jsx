import { useState, useEffect } from "react";

const linkBtn = {
  background: "none",
  border: "none",
  fontWeight: "600",
  fontSize: "0.9rem",
  cursor: "pointer",
  fontFamily: "inherit",
  padding: "0.35rem 0",
  color: "#888",
};

/**
 * Public marketing navbar.
 * @param {object} props
 * @param {() => void} props.onLogo
 * @param {() => void} props.onHowItWorks
 * @param {() => void} props.onFeatures
 * @param {() => void} props.onAcademy
 * @param {() => void} props.onPricing
 * @param {() => void} props.onGetStarted
 * @param {() => void} [props.onRecruiter]
 */
export default function LandingNav({
  onLogo,
  onHowItWorks,
  onFeatures,
  onAcademy,
  onPricing,
  onGetStarted,
  onRecruiter,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onResize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [menuOpen]);

  const NavLink = ({ children, onClick, title }) => (
    <button type="button" className="landing-nav-link" style={linkBtn} onClick={onClick} title={title}>
      {children}
    </button>
  );

  const linkRow = (
    <>
      <NavLink
        onClick={() => {
          setMenuOpen(false);
          onHowItWorks?.();
        }}
      >
        How it works
      </NavLink>
      <NavLink
        onClick={() => {
          setMenuOpen(false);
          onFeatures?.();
        }}
      >
        Features
      </NavLink>
      <NavLink
        onClick={() => {
          setMenuOpen(false);
          onAcademy?.();
        }}
      >
        Academy
      </NavLink>
      <NavLink
        onClick={() => {
          setMenuOpen(false);
          onPricing?.();
        }}
      >
        Pricing
      </NavLink>
      <button
        type="button"
        className="landing-nav-link"
        style={{ ...linkBtn, cursor: "help" }}
        title="Coming soon"
        onClick={() => setMenuOpen(false)}
      >
        Blog
      </button>
    </>
  );

  return (
    <>
      <style>{`
        .landing-nav-link { transition: color 0.2s ease; }
        .landing-nav-link:hover { color: #fff !important; }
        @media (min-width: 768px) {
          .landing-nav-desktop { display: flex !important; }
          .landing-nav-mobile-toggle { display: none !important; }
          .landing-nav-mobile-panel { display: none !important; }
        }
        @media (max-width: 767px) {
          .landing-nav-desktop { display: none !important; }
          .landing-nav-mobile-toggle { display: flex !important; }
        }
      `}</style>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          minHeight: 64,
          boxSizing: "border-box",
          padding: "0 clamp(1rem, 4vw, 2rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          background: "rgba(5,2,15,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            onLogo?.();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              boxShadow: "0 0 20px rgba(124, 58, 237, 0.35)",
            }}
          >
            🎯
          </div>
          <span
            style={{
              fontWeight: "900",
              fontSize: "1.15rem",
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #ffffff, #a78bfa)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            InterviewAI
          </span>
        </button>

        <div className="landing-nav-desktop" style={{ alignItems: "center", gap: "1.75rem", flex: 1, justifyContent: "center" }}>
          {linkRow}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }} className="landing-nav-desktop">
          {onRecruiter && (
            <button
              type="button"
              onClick={onRecruiter}
              style={{
                background: "transparent",
                color: "#ccc",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 25,
                padding: "0.55rem 1.15rem",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.88rem",
                fontFamily: "inherit",
              }}
            >
              I&apos;m a recruiter
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onGetStarted?.();
            }}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff",
              border: "none",
              borderRadius: 25,
              padding: "0.55rem 1.35rem",
              fontWeight: "700",
              cursor: "pointer",
              fontSize: "0.88rem",
              fontFamily: "inherit",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            Get Started Free
          </button>
        </div>

        <button
          type="button"
          className="landing-nav-mobile-toggle"
          aria-expanded={menuOpen}
          aria-label="Open menu"
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(124,58,237,0.1)",
            color: "#fff",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{menuOpen ? "✕" : "☰"}</span>
        </button>
      </nav>

      {menuOpen && (
        <div
          className="landing-nav-mobile-panel"
          style={{
            position: "sticky",
            top: 64,
            zIndex: 199,
            margin: "0 1rem 1rem",
            padding: "1rem 1.25rem",
            borderRadius: 16,
            background: "rgba(5,2,15,0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(124,58,237,0.2)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>{linkRow}</div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "0.5rem", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {onRecruiter && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onRecruiter();
                }}
                style={{
                  background: "transparent",
                  color: "#ccc",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "0.75rem 1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                I&apos;m a recruiter
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onGetStarted?.();
              }}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "0.85rem 1rem",
                fontWeight: "800",
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 0 20px rgba(124,58,237,0.35)",
              }}
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </>
  );
}
