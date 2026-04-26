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
  minHeight: "200px",
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
  marginBottom: "16px",
  transition: C.transition,
};

function scoreColorDark(overall) {
  const n = Number(overall) || 0;
  if (n >= 70) {
    return {
      wrapBg: "rgba(16, 185, 129, 0.1)",
      wrapBorder: "rgba(52, 211, 153, 0.35)",
      score: "#6ee7b7",
      subLabel: "#a7f3d0",
    };
  }
  if (n >= 40) {
    return {
      wrapBg: "rgba(245, 158, 11, 0.1)",
      wrapBorder: "rgba(251, 191, 36, 0.35)",
      score: "#fcd34d",
      subLabel: "#fde68a",
    };
  }
  return {
    wrapBg: "rgba(239, 68, 68, 0.1)",
    wrapBorder: "rgba(248, 113, 113, 0.35)",
    score: "#fca5a5",
    subLabel: "#fecaca",
  };
}

const accentBar = { borderLeft: "4px solid #7c3aed" };

export default function CVEditor({ user, isPro, onOpenUpgrade }) {
  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data: row } = await supabase.from("user_profiles").select("resume_text").eq("user_id", user.id).maybeSingle();
      if (row?.resume_text) setCvText(row.resume_text);
    })();
  }, [user?.id, isDemo]);

  const run = async () => {
    if (!isPro) {
      onOpenUpgrade?.();
      return;
    }
    if (isDemo) {
      setError("Sign in to analyse your CV.");
      return;
    }
    setError("");
    setData(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyse-cv", {
        method: "POST",
        headers: await jsonAuthHeaders(),
        body: JSON.stringify({ cvText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && json?.code === "PRO_REQUIRED") {
          const uid =
            json?.authUserId != null
              ? String(json.authUserId)
              : user?.id && user.id !== "demo"
                ? String(user.id)
                : "";
          setError(
            isPro
              ? `The server didn’t see Pro for this session.${
                  uid
                    ? ` In Supabase, open user_profiles and ensure the row where user_id = ${uid} has is_pro = true.`
                    : " Refresh, sign out/in, then confirm user_profiles.is_pro matches your Supabase project in .env.local."
                }`
              : messageForFailedApiResponse(res, json)
          );
        } else {
          setError(messageForFailedApiResponse(res, json));
        }
        setLoading(false);
        return;
      }
      setData(json);
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  };

  const overall = data?.overallScore ?? 0;
  const sc = scoreColorDark(overall);
  const subs = data?.subScores || {};

  const priorityPill = (p) => {
    if (p === "high") return { bg: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.35)" };
    if (p === "medium") return { bg: "rgba(245,158,11,0.15)", color: "#fcd34d", border: "1px solid rgba(251,191,36,0.3)" };
    return { bg: "rgba(255,255,255,0.06)", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.1)" };
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
      <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", margin: "0 auto", padding: "24px 16px 48px", width: "100%", boxSizing: "border-box" }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#fafafa",
            margin: "0 0 8px",
          }}
        >
          CV Editor{" "}
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
        <p style={{ fontSize: "15px", fontWeight: 400, color: FH.muted, lineHeight: 1.5, margin: "0 0 20px" }}>Get AI feedback on your CV.</p>

        <div style={{ ...glassCard, ...accentBar }}>
          <label style={labelDark}>Paste your CV here</label>
          <textarea
            style={textareaDark}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Full CV text…"
          />
          <button type="button" style={{ ...btnPrimary, minHeight: "44px" }} {...btnPrimaryHover} onClick={run} disabled={loading}>
            {loading ? "Analysing…" : isPro ? "Analyse my CV" : "Unlock with Pro"}
          </button>
          {error ? (
            <p style={{ fontSize: "14px", color: "#fca5a5", marginTop: "12px", marginBottom: 0, lineHeight: 1.5 }}>{error}</p>
          ) : null}
        </div>

        {data && (
          <>
            <div
              style={{
                ...glassCard,
                ...accentBar,
                marginTop: "20px",
                background: sc.wrapBg,
                border: `1px solid ${sc.wrapBorder}`,
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: sc.subLabel, textTransform: "uppercase", marginBottom: "8px" }}>
                CV score
              </div>
              <div style={{ fontSize: "56px", fontWeight: 900, color: sc.score, lineHeight: 1 }}>{overall}</div>
              <div style={{ fontSize: "15px", color: FH.muted, marginTop: "8px" }}>out of 100</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginTop: "20px" }}>
                {[
                  ["Clarity", subs.clarity],
                  ["Relevance", subs.relevance],
                  ["Impact", subs.impact],
                  ["ATS", subs.atsFriendliness],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      background: "rgba(6, 4, 14, 0.65)",
                      borderRadius: "12px",
                      padding: "12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: FH.dim, fontWeight: 600 }}>{k}</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#f4f4f5" }}>{v ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...glassCard, ...accentBar, marginTop: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>
                Improvements
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {(data.improvements || []).map((imp, i) => {
                  const pill = priorityPill(imp.priority);
                  const list = data.improvements || [];
                  return (
                    <li
                      key={i}
                      style={{
                        marginBottom: "16px",
                        paddingBottom: "16px",
                        borderBottom: i < list.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          ...pill,
                        }}
                      >
                        {imp.priority}
                      </span>
                      <p style={{ fontWeight: 700, margin: "8px 0 4px", color: "#fafafa" }}>{imp.section}</p>
                      <p style={{ fontSize: "15px", color: FH.muted, margin: "0 0 6px", lineHeight: 1.5 }}>
                        <strong style={{ color: "#d4d4d8" }}>Issue:</strong> {imp.issue}
                      </p>
                      <p style={{ fontSize: "15px", color: FH.muted, margin: "0 0 6px", lineHeight: 1.5 }}>
                        <strong style={{ color: "#d4d4d8" }}>Suggestion:</strong> {imp.suggestion}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          background: "rgba(0,0,0,0.35)",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          color: "#d4d4d8",
                          border: "1px solid rgba(255,255,255,0.06)",
                          lineHeight: 1.45,
                        }}
                      >
                        {imp.example}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div style={{ ...glassCard, ...accentBar, marginTop: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "12px" }}>
                Rewritten bullets
              </div>
              {(data.rewrittenBullets || []).map((b, i) => (
                <div key={i} style={{ marginBottom: "20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                    <div style={{ padding: "14px", background: "rgba(12, 10, 20, 0.85)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: FH.dim, marginBottom: "6px" }}>Original</div>
                      <p style={{ margin: 0, fontSize: "14px", color: "#e5e7eb", lineHeight: 1.5 }}>{b.original}</p>
                    </div>
                    <div
                      style={{
                        padding: "14px",
                        background: "rgba(88, 28, 135, 0.18)",
                        borderRadius: "12px",
                        border: "1px solid rgba(167, 139, 250, 0.35)",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#c4b5fd", marginBottom: "6px" }}>Improved</div>
                      <p style={{ margin: 0, fontSize: "14px", color: "#f5f3ff", lineHeight: 1.5 }}>{b.improved}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: "14px", color: FH.muted, marginTop: "8px", lineHeight: 1.5 }}>{b.reason}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
