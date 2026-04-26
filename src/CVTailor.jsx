import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { messageForFailedApiResponse } from "./apiClientError.js";
import { jsonAuthHeaders } from "./jsonAuthHeaders.js";
import { btnPrimary, btnPrimaryHover, C } from "./candidateUi.jsx";

const FH = { font: C.font, text: "#e5e7eb", muted: "#a1a1aa", dim: "#71717a" };

const shell = {
  flex: "1 1 auto",
  minHeight: 0,
  height: "100%",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  alignSelf: "stretch",
  position: "relative",
  boxSizing: "border-box",
  fontFamily: FH.font,
  color: FH.text,
  background: "#070510",
  backgroundImage: "linear-gradient(165deg, #08060f 0%, #0a0618 42%, #000000 100%)",
  colorScheme: "dark",
  overflow: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
};

const glassCard = {
  borderRadius: "16px",
  background: "rgba(16, 12, 32, 0.58)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  padding: "24px",
  boxSizing: "border-box",
};

const labelDark = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
  marginBottom: "8px",
};

const textareaDark = {
  width: "100%",
  minHeight: "220px",
  resize: "vertical",
  fontFamily: "inherit",
  padding: "14px 16px",
  borderRadius: "12px",
  fontSize: "14px",
  lineHeight: 1.5,
  outline: "none",
  boxSizing: "border-box",
  background: "rgba(6, 4, 14, 0.85)",
  border: "1px solid rgba(139, 92, 246, 0.22)",
  color: "#f4f4f5",
  transition: C.transition,
};

const btnSecondaryDark = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#e5e7eb",
  fontWeight: 600,
  padding: "10px 22px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontFamily: C.font,
  transition: C.transition,
};

const btnSecondaryDarkHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.45)";
    e.currentTarget.style.color = "#c4b5fd";
    e.currentTarget.style.background = "rgba(124, 58, 237, 0.08)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
    e.currentTarget.style.color = "#e5e7eb";
    e.currentTarget.style.background = "transparent";
  },
};

export default function CVTailor({ user, isPro, onOpenUpgrade }) {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState(null);
  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase.from("user_profiles").select("resume_text").eq("user_id", user.id).maybeSingle();
      if (data?.resume_text) setCvText(data.resume_text);
    })();
  }, [user?.id, isDemo]);

  const run = async () => {
    if (!isPro) {
      onOpenUpgrade?.();
      return;
    }
    if (isDemo) {
      setError("Sign in to tailor your CV.");
      return;
    }
    setError("");
    setOut(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tailor-cv", {
        method: "POST",
        headers: await jsonAuthHeaders(),
        body: JSON.stringify({ cvText, jobDescription }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data?.code === "PRO_REQUIRED") {
          const uid =
            data?.authUserId != null
              ? String(data.authUserId)
              : user?.id && user.id !== "demo"
                ? String(user.id)
                : "";
          setError(
            isPro
              ? `The server didn’t see Pro for this session.${
                  uid
                    ? ` In Supabase, open user_profiles and ensure the row where user_id = ${uid} has is_pro = true (that UUID is who the API thinks you are).`
                    : " Refresh, sign out/in, then confirm user_profiles.is_pro for your account matches VITE_SUPABASE_URL in .env.local."
                }`
              : messageForFailedApiResponse(res, data)
          );
        } else {
          setError(messageForFailedApiResponse(res, data));
        }
        setLoading(false);
        return;
      }
      setOut(data);
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user?.id || isDemo || !out?.tailoredCV) return;
    await supabase.from("user_profiles").upsert(
      { user_id: user.id, resume_text: out.tailoredCV, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  };

  return (
    <div style={shell}>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "960px", margin: "0 auto", padding: "24px 16px 48px", width: "100%", boxSizing: "border-box" }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#fafafa",
            margin: "0 0 8px",
          }}
        >
          CV Tailor{" "}
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              verticalAlign: "middle",
              color: "#fff",
              background: "linear-gradient(135deg,#7c3aed,#2563eb)",
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            Pro
          </span>
        </h1>
        <p style={{ fontSize: "15px", fontWeight: 400, color: FH.muted, lineHeight: 1.5, margin: "0 0 20px" }}>
          Tailor your CV to any job in seconds.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div style={glassCard}>
            <label style={labelDark}>Your CV</label>
            <textarea
              style={textareaDark}
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste CV…"
            />
          </div>
          <div style={glassCard}>
            <label style={labelDark}>Job description</label>
            <textarea
              style={textareaDark}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description…"
            />
          </div>
        </div>

        <button type="button" style={{ ...btnPrimary, width: "100%", maxWidth: "400px", minHeight: "48px" }} {...btnPrimaryHover} onClick={run} disabled={loading}>
          {loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <span className="candidate-spinner" style={{ width: "18px", height: "18px" }} />
              Tailoring your CV…
            </span>
          ) : isPro ? (
            "Tailor my CV →"
          ) : (
            "Unlock with Pro"
          )}
        </button>
        {error ? (
          <p style={{ fontSize: "14px", color: "#fca5a5", marginTop: "12px", marginBottom: 0, lineHeight: 1.5 }}>{error}</p>
        ) : null}

        {out?.tailoredCV && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
              marginTop: "28px",
            }}
          >
            <div style={{ ...glassCard, background: "rgba(12, 10, 20, 0.75)" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 800, color: FH.dim, textTransform: "uppercase", margin: "0 0 12px" }}>Original CV</h2>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "13px", lineHeight: 1.5, margin: 0, color: FH.muted }}>{cvText}</pre>
            </div>
            <div
              style={{
                ...glassCard,
                border: "1px solid rgba(167, 139, 250, 0.35)",
                boxShadow: "0 8px 32px rgba(124,58,237,0.15)",
              }}
            >
              <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#c4b5fd", textTransform: "uppercase", margin: "0 0 12px" }}>Tailored CV</h2>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "14px", lineHeight: 1.55, margin: "0 0 16px", color: "#f4f4f5" }}>{out.tailoredCV}</pre>
              <p style={{ fontSize: "13px", color: FH.muted, margin: 0 }}>
                <strong style={{ color: "#e5e7eb" }}>Match score:</strong> {out.matchScore ?? "—"}/100
              </p>
              {Array.isArray(out.changes) && out.changes.length > 0 && (
                <ul style={{ fontSize: "13px", color: FH.muted, paddingLeft: "18px", margin: "10px 0 0" }}>
                  {out.changes.map((c) => (
                    <li key={c} style={{ marginBottom: "4px" }}>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              {Array.isArray(out.tips) && out.tips.length > 0 && (
                <p style={{ fontSize: "13px", marginTop: "10px", color: FH.muted }}>
                  <strong style={{ color: "#e5e7eb" }}>Tips:</strong> {out.tips.join(" ")}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                <button type="button" style={{ ...btnPrimary, width: "100%" }} {...btnPrimaryHover} onClick={() => navigator.clipboard.writeText(out.tailoredCV)}>
                  Copy tailored CV
                </button>
                <button type="button" style={{ ...btnSecondaryDark, width: "100%" }} {...btnSecondaryDarkHover} onClick={saveProfile}>
                  Save to profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
