import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      if (result.error) throw result.error;
      if (result.data?.user) onLogin(result.data.user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = (name) => ({
    width: "100%", padding: "0.9rem 1rem 0.9rem 2.8rem",
    border: `2px solid ${focused === name ? "#6c63ff" : "#ede9ff"}`,
    borderRadius: "14px", fontSize: "0.95rem", fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", background: focused === name ? "#faf8ff" : "white",
    color: "#333", transition: "all 0.2s ease",
    boxShadow: focused === name ? "0 0 0 4px rgba(108,99,255,0.08)" : "none"
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #faf7ff 0%, #f0f7ff 40%, #f4fff9 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "2rem", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-30px)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,20px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes logoSpin { 0%{transform:rotate(0deg) scale(1)} 50%{transform:rotate(5deg) scale(1.05)} 100%{transform:rotate(0deg) scale(1)} }
        .login-card { animation: fadeUp 0.6s ease both; }
        .submit-btn { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1) !important; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 12px 35px rgba(108,99,255,0.4) !important; }
        .submit-btn:active:not(:disabled) { transform: scale(0.98) !important; }
        .toggle-btn:hover { color: #4ecdc4 !important; }
        .logo-icon { animation: logoSpin 4s ease-in-out infinite; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-5%", right: "-5%", width: "450px", height: "450px", background: "radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)", borderRadius: "50%", animation: "orbFloat1 10s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-5%", left: "-8%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(78,205,196,0.08) 0%, transparent 70%)", borderRadius: "50%", animation: "orbFloat2 13s ease-in-out infinite" }} />
      </div>

      <div className="login-card" style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="logo-icon" style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", margin: "0 auto 1.25rem", boxShadow: "0 12px 35px rgba(108,99,255,0.3)" }}>🎯</div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.4rem", letterSpacing: "-0.02em" }}>InterviewAI</h1>
          <p style={{ color: "#999", fontSize: "0.92rem", fontWeight: "500" }}>
            {isSignUp ? "Create your free account" : "Welcome back! Ready to practice?"}
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", borderRadius: "28px", padding: "2.5rem", boxShadow: "0 20px 60px rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.08)" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.85rem", letterSpacing: "0.02em" }}>EMAIL ADDRESS</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem", pointerEvents: "none" }}>📧</span>
              <input
                type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                style={inputStyle("email")}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.85rem", letterSpacing: "0.02em" }}>PASSWORD</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", fontSize: "1rem", pointerEvents: "none" }}>🔒</span>
              <input
                type="password" placeholder="••••••••" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                style={inputStyle("password")}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: "#fff0f0", border: "1.5px solid #ffb3b3", borderRadius: "12px", padding: "0.75rem 1rem", color: "#c0392b", fontSize: "0.85rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: "100%", padding: "1rem", background: loading ? "#ddd" : "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: loading ? "#aaa" : "white", border: "none", borderRadius: "14px", fontSize: "1rem", fontWeight: "800", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 8px 30px rgba(108,99,255,0.3)", letterSpacing: "-0.01em" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                {isSignUp ? "Creating account..." : "Signing in..."}
              </span>
            ) : isSignUp ? "🚀 Create Account" : "🚀 Sign In"}
          </button>

          <div style={{ marginTop: "1.5rem", textAlign: "center", borderTop: "1px solid #f0ebff", paddingTop: "1.5rem" }}>
            <p style={{ color: "#aaa", marginBottom: "0.5rem", fontSize: "0.88rem" }}>
              {isSignUp ? "Already have an account?" : "Don't have an account yet?"}
            </p>
            <button
              className="toggle-btn"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              style={{ background: "none", border: "none", color: "#6c63ff", fontWeight: "800", cursor: "pointer", fontSize: "0.95rem", transition: "color 0.2s ease" }}
            >
              {isSignUp ? "Sign In Instead" : "Create Free Account"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#ccc", fontSize: "0.78rem", marginTop: "1.5rem" }}>
          🔒 Secured by Supabase · Your data is private
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
