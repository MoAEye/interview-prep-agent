import PublicMarketingLayout from "./components/PublicMarketingLayout.jsx";

const card = {
  background: "rgba(10,5,25,0.8)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
  padding: "clamp(1.5rem, 4vw, 2.5rem)",
  marginTop: "2rem",
};

const h2 = { color: "#a78bfa", fontWeight: 700, fontSize: "1.1rem", marginTop: "1.5rem", marginBottom: "0.75rem" };
const p = { color: "#aaa", lineHeight: 1.8, fontSize: "0.92rem", margin: "0 0 1rem" };

export default function CookiePage({ marketingNav, marketingFooter }) {
  return (
    <PublicMarketingLayout navProps={marketingNav} footerProps={marketingFooter}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(1.25rem, 4vw, 3rem) 3rem" }}>
        <header style={{ textAlign: "center", paddingTop: "2.5rem" }}>
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
            LEGAL
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Cookie Policy</h1>
          <p style={{ color: "#666", marginTop: "0.75rem", fontSize: "0.95rem" }}>Last updated: March 2026</p>
        </header>

        <article style={card}>
          <p style={p}>
            This Cookie Policy explains how InterviewAI (&quot;we&quot;) uses cookies and similar technologies when you use our website and application. It should be read alongside our Privacy Policy.
          </p>

          <h2 style={h2}>What are cookies?</h2>
          <p style={p}>
            Cookies are small text files stored on your device. We also use similar technologies such as local storage and session storage where needed for authentication and preferences.
          </p>

          <h2 style={h2}>How we use cookies</h2>
          <ul style={{ ...p, paddingLeft: "1.25rem" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong style={{ color: "#ccc" }}>Strictly necessary:</strong> session, security, and load balancing (e.g. keeping you signed in via Supabase Auth).
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong style={{ color: "#ccc" }}>Functional:</strong> remember choices such as UI preferences where we implement them.
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong style={{ color: "#ccc" }}>Analytics (optional):</strong> if enabled, to understand usage and improve the product — only with consent where required.
            </li>
          </ul>

          <h2 style={h2}>Third parties</h2>
          <p style={p}>
            Providers such as Supabase, Vercel, and (if used) analytics or payment partners may set their own cookies or identifiers subject to their policies.
          </p>

          <h2 style={h2}>Managing cookies</h2>
          <p style={p}>
            You can block or delete cookies through your browser settings. Blocking strictly necessary cookies may prevent parts of the Service from working (e.g. login).
          </p>

          <h2 style={h2}>Contact</h2>
          <p style={p}>
            <a href="mailto:privacy@interviewai.app" style={{ color: "#a78bfa" }}>
              privacy@interviewai.app
            </a>
          </p>
        </article>
      </div>
    </PublicMarketingLayout>
  );
}
