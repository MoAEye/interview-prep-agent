/**
 * Post-auth portal chooser — visual only; navigation via callbacks from App.
 */
const transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";

function firstName(user) {
  const meta = user?.user_metadata || {};
  const n = meta.full_name || meta.name || meta.first_name;
  if (n && typeof n === "string") return n.trim().split(/\s+/)[0] || "there";
  if (user?.email) return user.email.split("@")[0];
  return "there";
}

export default function PortalSelect({ user, isRecruiter, onCandidateClick, onRecruiterClick }) {
  const name = firstName(user);

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#888888",
    marginBottom: "8px",
  };

  const featureRow = (text, checkColor = "#ffffff") => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "12px",
        fontSize: "15px",
        lineHeight: 1.5,
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <span style={{ color: checkColor, fontWeight: 700, flexShrink: 0 }}>✓</span>
      <span>{text}</span>
    </div>
  );

  const featureRowDark = (text) => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "12px",
        fontSize: "15px",
        lineHeight: 1.5,
        color: "#a1a1aa",
      }}
    >
      <span style={{ color: "#00d9a6", fontWeight: 700, flexShrink: 0 }}>✓</span>
      <span>{text}</span>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0005 0%, #000000 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px 32px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: "800px", textAlign: "center" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "clamp(1.5rem, 4vw, 1.75rem)",
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
            }}
          >
            InterviewAI
          </h1>
          <p style={{ color: "#888888", fontSize: "15px", fontWeight: 400, margin: 0 }}>
            AI-powered interview preparation & hiring
          </p>
        </div>

        <h2
          style={{
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "32px",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
            lineHeight: 1.2,
          }}
        >
          Welcome back, {name}
        </h2>
        <p style={{ color: "#888888", fontSize: "16px", margin: "0 0 40px", fontWeight: 400 }}>
          Where would you like to go?
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "24px",
            justifyContent: "center",
            alignItems: "stretch",
          }}
        >
          {/* Candidate card */}
          <div
            style={{
              flex: "1 1 280px",
              maxWidth: "380px",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(124,58,237,0.3)",
              padding: "40px",
              textAlign: "left",
              transition,
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 28px 80px rgba(124,58,237,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 20px 60px rgba(124,58,237,0.3)";
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  fill="white"
                />
              </svg>
            </div>
            <div style={{ ...labelStyle, color: "rgba(255,255,255,0.7)" }}>Prepare & grow</div>
            <h3
              style={{
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "24px",
                letterSpacing: "-0.02em",
                margin: "0 0 8px",
              }}
            >
              Candidate Portal
            </h3>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "15px", margin: "0 0 24px", lineHeight: 1.5 }}>
              Practice interviews & track your job search
            </p>
            {featureRow("AI-powered mock interviews")}
            {featureRow("Job tracker & cover letters")}
            {featureRow("Detailed performance analytics")}
            <button
              type="button"
              onClick={onCandidateClick}
              style={{
                width: "100%",
                marginTop: "24px",
                padding: "12px 24px",
                borderRadius: "10px",
                border: "none",
                background: "#ffffff",
                color: "#7c3aed",
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
                transition,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.95";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Enter Candidate Portal →
            </button>
          </div>

          {/* Recruiter card */}
          {isRecruiter && (
            <div
              style={{
                flex: "1 1 280px",
                maxWidth: "380px",
                background: "#111111",
                border: "1px solid #333333",
                borderRadius: "16px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                padding: "40px",
                textAlign: "left",
                transition,
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "#444444";
                e.currentTarget.style.boxShadow = "0 28px 80px rgba(0,217,166,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#333333";
                e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,0.5)";
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#1a1a1a",
                  border: "1px solid #333333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M10 16v-1H3.01L3 19c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-4h-7v1H10zm-1-7.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S11.33 10 10.5 10 9 9.33 9 8.5zm5 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S15.33 10 14.5 10 13 9.33 13 8.5zm5 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S20.33 10 19.5 10 18 9.33 18 8.5zM20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12z"
                    fill="#00d9a6"
                  />
                </svg>
              </div>
              <div style={labelStyle}>Hire</div>
              <h3
                style={{
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "24px",
                  letterSpacing: "-0.02em",
                  margin: "0 0 8px",
                }}
              >
                Recruiter Portal
              </h3>
              <p style={{ color: "#a1a1aa", fontSize: "15px", margin: "0 0 24px", lineHeight: 1.5 }}>
                Hire smarter with AI-assisted screening
              </p>
              {featureRowDark("Create roles & share links")}
              {featureRowDark("AI candidate scoring & shortlists")}
              {featureRowDark("Hiring pipeline management")}
              <button
                type="button"
                onClick={onRecruiterClick}
                style={{
                  width: "100%",
                  marginTop: "24px",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#ffffff",
                  color: "#000000",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: "pointer",
                  transition,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Enter Recruiter Portal →
              </button>
              <div
                style={{
                  marginTop: "16px",
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#00d9a6",
                  padding: "8px 12px",
                  background: "rgba(0,217,166,0.1)",
                  borderRadius: "999px",
                  border: "1px solid rgba(0,217,166,0.25)",
                }}
              >
                AI Assistant coming soon
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "48px" }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
            }}
            style={{
              color: "#666666",
              fontSize: "13px",
              textDecoration: "none",
              transition,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#888888";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#666666";
            }}
          >
            Need help? Read our guide
          </a>
          <p style={{ color: "#444444", fontSize: "12px", margin: "16px 0 0", fontWeight: 400 }}>
            InterviewAI v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
