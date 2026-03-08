import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const inputStyle = {
    width: "100%", padding: "0.9rem 1rem", border: "2px solid #e8e0ff",
    borderRadius: "12px", fontSize: "0.95rem", fontFamily: "sans-serif",
    outline: "none", boxSizing: "border-box", background: "white", color: "#333"
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #f0f7ff 50%, #f4fff8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: "70px", height: "70px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 1rem" }}>🎯</div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "0.3rem" }}>InterviewAI</h1>
          <p style={{ color: "#888", fontSize: "0.95rem" }}>{isSignUp ? "Create your account" : "Welcome back!"}</p>
        </div>
        <div style={{ background: "white", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 8px 40px rgba(108,99,255,0.08)" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>📧 Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: "700", color: "#1e3a5f", marginBottom: "0.5rem", fontSize: "0.9rem" }}>🔒 Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          </div>
          {error && (
            <div style={{ background: "#fff0f0", border: "2px solid #ff6b6b", borderRadius: "10px", padding: "0.75rem 1rem", color: "#b82e2e", fontSize: "0.9rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "1rem", background: loading ? "#ccc" : "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "800", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 8px 30px rgba(108,99,255,0.3)" }}>
            {loading ? "Loading..." : isSignUp ? "🚀 Create Account" : "🚀 Sign In"}
          </button>
          <div style={{ marginTop: "1.5rem", textAlign: "center", borderTop: "1px solid #f0ebff", paddingTop: "1.5rem" }}>
            <p style={{ color: "#888", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </p>
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} style={{ background: "none", border: "none", color: "#6c63ff", fontWeight: "700", cursor: "pointer", fontSize: "0.95rem", textDecoration: "underline" }}>
              {isSignUp ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}