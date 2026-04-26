import { useState, useEffect, useRef, useCallback } from "react";

const BREAKPOINT = 768;
const transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
const font = "'Inter', system-ui, sans-serif";

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1h-5v-8H9v8H4a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * @param {() => void} [props.onGoPortalSelect] — home → portal chooser
 * @param {() => void} props.onCandidateArea — open candidate prepare (upload)
 */
export default function RecruiterNavBar({ user, onLogout, currentTab, onCandidateArea, onGoPortalSelect }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < BREAKPOINT : false
  );
  const [homeHover, setHomeHover] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const closeAll = useCallback(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, []);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "Recruiter");
  const email = user?.email || "";

  const goHome = () => {
    onGoPortalSelect?.();
    closeAll();
  };

  const tabActive = {
    color: "#a78bfa",
    background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.35)",
    borderRadius: "10px",
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: "14px",
    fontFamily: font,
    boxShadow: "0 0 12px rgba(139,92,246,0.2)",
    transition,
  };

  const tabInactiveBtn = {
    color: "#b8b8c8",
    background: "transparent",
    border: "none",
    borderRadius: "10px",
    padding: "8px 16px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    transition,
    fontFamily: font,
  };

  return (
    <header className="recruiter-nav-fut" style={{ fontFamily: font }}>
      <style>{`
        .recruiter-nav-fut {
          position: sticky;
          top: 0;
          z-index: 200;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139,92,246,0.25);
        }
        .recruiter-nav-fut::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(79,70,229,0.6), transparent);
          pointer-events: none;
        }
        .recruiter-nav-logo {
          font-weight: 800;
          font-size: 16px;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .recruiter-nav-avatar {
          animation: recruiter-float 3s ease-in-out infinite;
        }
        @keyframes recruiter-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 16px",
          height: "64px",
          minHeight: "64px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "nowrap",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        <button
          type="button"
          aria-label="Home — choose portal"
          onClick={goHome}
          onMouseEnter={() => setHomeHover(true)}
          onMouseLeave={() => setHomeHover(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            border: "none",
            borderRadius: "10px",
            background: "transparent",
            color: homeHover ? "#a78bfa" : "#888888",
            cursor: "pointer",
            transition,
          }}
        >
          <HomeIcon />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <span className="recruiter-nav-logo">InterviewAI</span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#ffffff",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              padding: "4px 10px",
              borderRadius: "999px",
              boxShadow: "0 0 16px rgba(124,58,237,0.5)",
            }}
          >
            Recruiter
          </span>
        </div>

        {!narrow && (
          <nav style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, justifyContent: "center" }}>
            <span style={{ ...tabActive, cursor: "default" }} aria-current={currentTab === "roles" ? "page" : undefined}>
              Roles
            </span>
            <button
              type="button"
              style={tabInactiveBtn}
              onClick={() => {
                onCandidateArea();
                closeAll();
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#a78bfa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#555555";
              }}
            >
              Candidate area
            </button>
          </nav>
        )}

        {narrow && <div style={{ flex: 1 }} />}

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          {!narrow && (
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(139,92,246,0.25)",
                background: "rgba(139,92,246,0.08)",
                color: "#a78bfa",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition,
                fontFamily: font,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.45)";
                e.currentTarget.style.background = "rgba(139,92,246,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
                e.currentTarget.style.background = "rgba(139,92,246,0.08)";
              }}
            >
              <MicIcon />
              AI Assistant
            </button>
          )}

          {narrow && (
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                border: "1px solid rgba(139,92,246,0.25)",
                background: "rgba(139,92,246,0.08)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition,
              }}
            >
              <span style={{ width: "18px", height: "2px", background: "#a78bfa", borderRadius: "1px" }} />
              <span style={{ width: "18px", height: "2px", background: "#a78bfa", borderRadius: "1px" }} />
              <span style={{ width: "18px", height: "2px", background: "#a78bfa", borderRadius: "1px" }} />
            </button>
          )}

          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="recruiter-nav-avatar"
              onClick={() => setMenuOpen((p) => !p)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                transition,
                fontFamily: font,
                boxShadow: "0 0 20px rgba(124,58,237,0.5)",
              }}
            >
              {(displayName || "?").slice(0, 1).toUpperCase()}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: "260px",
                  background: "rgba(10,0,20,0.95)",
                  borderRadius: "16px",
                  border: "1px solid rgba(139,92,246,0.25)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.15)",
                  padding: "8px",
                  zIndex: 300,
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
                  <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "15px", letterSpacing: "-0.02em" }}>{displayName}</div>
                  <div style={{ fontSize: "13px", color: "#555555", marginTop: "4px", wordBreak: "break-all" }}>{email}</div>
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#a78bfa",
                    }}
                  >
                    Recruiter portal
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onCandidateArea();
                    closeAll();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    border: "none",
                    background: "transparent",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#ffffff",
                    cursor: "pointer",
                    borderRadius: "10px",
                    transition,
                    fontFamily: font,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Switch to Candidate portal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    closeAll();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    marginTop: "4px",
                    border: "none",
                    background: "transparent",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#ff4444",
                    cursor: "pointer",
                    borderRadius: "10px",
                    transition,
                    fontFamily: font,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,68,68,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {narrow && mobileOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(139,92,246,0.2)",
            padding: "16px",
            background: "rgba(10,0,20,0.9)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(139,92,246,0.25)",
                background: "rgba(139,92,246,0.08)",
                color: "#a78bfa",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                transition,
                fontFamily: font,
              }}
            >
              <MicIcon />
              AI Assistant
            </button>
            <div style={{ ...tabActive, textAlign: "center", width: "100%", boxSizing: "border-box" }}>Roles</div>
            <button
              type="button"
              style={{ ...tabInactiveBtn, width: "100%", color: "#a78bfa", textAlign: "center" }}
              onClick={() => {
                onCandidateArea();
                closeAll();
              }}
            >
              Candidate area
            </button>
            <button
              type="button"
              onClick={() => {
                onLogout();
                closeAll();
              }}
              style={{
                marginTop: "8px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "none",
                background: "transparent",
                fontWeight: 700,
                fontSize: "14px",
                color: "#ff4444",
                cursor: "pointer",
                transition,
                fontFamily: font,
              }}
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {aiOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-assistant-title"
          onClick={() => setAiOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(10,0,20,0.95)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: "20px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 0 60px rgba(124,58,237,0.2)",
            }}
          >
            <h2 id="ai-assistant-title" style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>
              AI Voice Assistant
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: "15px", lineHeight: 1.5, color: "#555555", fontWeight: 400 }}>
              Coming soon — AI Voice Assistant
            </p>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              style={{
                width: "100%",
                padding: "12px 24px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5, #7c3aed)",
                backgroundSize: "200% 200%",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
                transition,
                fontFamily: font,
                boxShadow: "0 0 24px rgba(124,58,237,0.4)",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
