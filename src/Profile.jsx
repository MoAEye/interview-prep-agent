import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  btnPrimary,
  btnPrimaryHover,
  btnSecondary,
  btnSecondaryHover,
  C,
} from "./candidateUi.jsx";

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const glass = {
  borderRadius: "16px",
  background: "rgba(16, 12, 32, 0.5)",
  border: "1px solid rgba(139, 92, 246, 0.14)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
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

const inputDark = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  fontSize: "15px",
  fontFamily: FH.font,
  border: "1px solid rgba(139, 92, 246, 0.18)",
  background: "rgba(8, 6, 20, 0.45)",
  color: FH.text,
  outline: "none",
  boxSizing: "border-box",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "cv", label: "CV & preferences" },
  { id: "account", label: "Account" },
];

function formatSaved(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function wordCount(s) {
  const t = (s || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export default function Profile({
  user,
  onBack,
  onboarding,
  onCompleteOnboarding,
  isPro = false,
  onOpenUpgrade,
  onOpenSettings,
}) {
  const [resumeText, setResumeText] = useState("");
  const [targetJobRole, setTargetJobRole] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [jobsInDemand, setJobsInDemand] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  const isDemo = user?.id === "demo";
  const email = user?.email || "";
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (email ? email.split("@")[0] : "You");

  const hasRole = Boolean(targetJobRole.trim());
  const hasLocation = Boolean(targetLocation.trim());
  const hasCv = wordCount(resumeText) >= 40;
  const strength = Math.round(((hasRole ? 1 : 0) + (hasLocation ? 1 : 0) + (hasCv ? 1 : 0)) * (100 / 3));
  const wc = wordCount(resumeText);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/profile");
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("resume_text, target_job_role, target_location, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") console.error(error);
      if (data) {
        setResumeText(data.resume_text || "");
        setTargetJobRole(data.target_job_role || "");
        setTargetLocation(data.target_location || "");
        if (data.updated_at) setLastSavedAt(data.updated_at);
      }
      setLoadedAt(new Date().toISOString());
    })();
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (!targetLocation.trim()) {
      setJobsInDemand(null);
      return;
    }
    setJobsLoading(true);
    fetch(`/api/jobs-in-demand?location=${encodeURIComponent(targetLocation)}&job=${encodeURIComponent(targetJobRole)}`)
      .then((r) => r.json())
      .then((data) => {
        setJobsInDemand(data);
        setJobsLoading(false);
      })
      .catch(() => setJobsLoading(false));
  }, [targetLocation, targetJobRole]);

  const handleSave = async () => {
    if (isDemo) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setSaveError(
          "You’re not fully signed in yet. If you just registered, confirm your email from Supabase, then sign in again — then saving will work."
        );
        return;
      }
      await supabase.auth.refreshSession().catch(() => {});
      const { error } = await supabase.from("user_profiles").upsert(
        {
          user_id: session.user.id,
          resume_text: resumeText,
          target_job_role: targetJobRole,
          target_location: targetLocation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) {
        const msg = error.message || "";
        if (msg.includes("row-level security") || msg.includes("RLS")) {
          setSaveError(
            "Database blocked this save (row-level security). Usually: confirm your email and sign in, or in Supabase → Authentication → Email, disable “Confirm email” for testing."
          );
        } else {
          setSaveError(msg || "Could not save. Check Supabase: user_profiles table and RLS policies.");
        }
        return;
      }
      const now = new Date().toISOString();
      setLastSavedAt(now);
      setSaved(true);
      if (onboarding && onCompleteOnboarding) {
        setTimeout(() => onCompleteOnboarding(), 600);
      } else {
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
      setSaveError(e?.message || "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const checkRow = (ok, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: ok ? "#a7f3d0" : FH.dim, marginBottom: "10px" }}>
      <span style={{ width: "18px", textAlign: "center", opacity: ok ? 1 : 0.35 }}>{ok ? "✓" : "○"}</span>
      <span style={{ fontWeight: ok ? 600 : 500 }}>{label}</span>
    </div>
  );

  const jobsBlock = useMemo(() => {
    if (!targetLocation.trim()) return null;
    return (
      <div style={{ ...glass, padding: "20px", marginTop: "20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: FH.text }}>Jobs in demand — {targetLocation}</h3>
        {jobsLoading ? (
          <p style={{ color: FH.muted, margin: 0, fontSize: "14px" }}>Loading…</p>
        ) : jobsInDemand?.source === "adzuna" && Array.isArray(jobsInDemand?.jobs) && jobsInDemand.jobs.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(jobsInDemand.jobs || []).map((j, i) => (
              <li key={i} style={{ padding: "12px 0", borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
                <a href={j.url} target="_blank" rel="noopener noreferrer" style={{ color: "#c4b5fd", fontWeight: 600, textDecoration: "none", fontSize: "14px" }}>
                  {j.title}
                </a>
                {j.company && <span style={{ color: FH.muted, marginLeft: "8px", fontSize: "13px" }}>— {j.company}</span>}
              </li>
            ))}
            <p style={{ marginTop: "12px", color: FH.dim, fontSize: "13px" }}>About {jobsInDemand.total_count} roles in this area.</p>
          </ul>
        ) : Array.isArray(jobsInDemand?.in_demand_roles) && jobsInDemand.in_demand_roles.length > 0 ? (
          <>
            <p style={{ color: FH.muted, marginBottom: "12px", fontSize: "14px", lineHeight: 1.5 }}>
              Roles often in demand (add Adzuna API keys for listings in your area):
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(jobsInDemand.in_demand_roles || []).map((r, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(139,92,246,0.08)", fontSize: "14px" }}>
                  <span style={{ fontWeight: 600, color: FH.text }}>{r.title}</span>
                  <span style={{ color: "#a78bfa", fontWeight: 600 }}>{r.demand}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  }, [targetLocation, jobsLoading, jobsInDemand]);

  if (isDemo) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: FH.font, padding: "32px 16px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <p style={{ color: C.muted, marginBottom: "16px" }}>Save a profile is only available when you sign in.</p>
          <button type="button" onClick={onBack} style={btnPrimary} {...btnPrimaryHover}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: FH.font,
        color: FH.text,
        overflowX: "hidden",
        boxSizing: "border-box",
        position: "relative",
        background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #000000 100%)",
        colorScheme: "dark",
      }}
    >
      <style>{`
        @keyframes prof-gridPulse { 0%, 100% { opacity: 0.38; } 50% { opacity: 0.52; } }
        .prof-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: prof-gridPulse 10s ease-in-out infinite;
        }
      `}</style>
      <div className="prof-page-grid" aria-hidden />

      <div style={{ position: "relative", zIndex: 2, maxWidth: "1080px", margin: "0 auto", padding: "24px 16px 64px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "28px" }}>
          <button
            type="button"
            onClick={onboarding && onCompleteOnboarding ? onCompleteOnboarding : onBack}
            style={{
              ...btnSecondary,
              borderColor: "rgba(139,92,246,0.22)",
              color: FH.muted,
              background: "rgba(255,255,255,0.04)",
            }}
            {...btnSecondaryHover}
          >
            {onboarding ? "Skip for now" : "← Back"}
          </button>
        </div>

        <header style={{ marginBottom: "28px", textAlign: "center", maxWidth: "640px", marginLeft: "auto", marginRight: "auto" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8b8b9b" }}>Your account</p>
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: "clamp(1.65rem, 4vw, 2.1rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "#fafafa",
            }}
          >
            My profile
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: FH.muted, lineHeight: 1.55 }}>CV and preferences power your mock interviews.</p>
        </header>

        {/* Plan strip — calm, no heavy glow */}
        <div
          style={{
            ...glass,
            maxWidth: "800px",
            margin: "0 auto 28px",
            padding: "16px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            borderColor: "rgba(139, 92, 246, 0.16)",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: FH.dim, marginBottom: "6px" }}>Current plan</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: isPro ? "1px solid rgba(167, 139, 250, 0.35)" : "1px solid rgba(255,255,255,0.1)",
                  background: isPro ? "rgba(124, 58, 237, 0.2)" : "rgba(255,255,255,0.04)",
                  color: "#fafafa",
                }}
              >
                {isPro ? "Pro" : "Free"}
              </span>
              <span style={{ fontSize: "13px", color: FH.muted, lineHeight: 1.45 }}>
                {isPro ? "Unlimited mocks · Full reports · Cover tools · Read-aloud" : "Limited mocks · Lighter reports — upgrade anytime"}
              </span>
            </div>
          </div>
          {!isPro && onOpenUpgrade ? (
            <button type="button" onClick={onOpenUpgrade} style={{ ...btnPrimary, padding: "10px 18px", fontSize: "14px", boxShadow: "0 4px 16px rgba(124,58,237,0.25)" }} {...btnPrimaryHover}>
              Upgrade
            </button>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>
          {/* Sidebar */}
          <aside style={{ flex: "1 1 260px", maxWidth: "100%" }}>
            <div style={{ ...glass, padding: "22px", borderColor: "rgba(139, 92, 246, 0.14)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {(displayName || "?").slice(0, 1).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: FH.text, lineHeight: 1.25 }}>{displayName}</div>
                  <div style={{ fontSize: "12px", color: FH.dim, wordBreak: "break-all", marginTop: "2px" }}>{email || "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)", color: FH.muted }}>
                  Candidate
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: isPro ? "rgba(124, 58, 237, 0.25)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: "#e9d5ff",
                  }}
                >
                  {isPro ? "Pro" : "Free"}
                </span>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: FH.dim, marginBottom: "6px" }}>
                  <span>Profile strength</span>
                  <span style={{ color: FH.muted, fontWeight: 600 }}>{strength}%</span>
                </div>
                <div style={{ height: "6px", borderRadius: "999px", background: "rgba(0,0,0,0.35)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${strength}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: "linear-gradient(90deg, #0d9488, #7c3aed)",
                      transition: "width 0.35s ease",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid rgba(139,92,246,0.1)" }}>
                {checkRow(hasRole, "Target role")}
                {checkRow(hasLocation, "Location")}
                {checkRow(hasCv, "CV saved (40+ words)")}
              </div>
            </div>
          </aside>

          {/* Main */}
          <div style={{ flex: "1 1 400px", minWidth: 0 }}>
            <div style={{ ...glass, padding: "0", overflow: "hidden", borderColor: "rgba(139, 92, 246, 0.14)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "8px 10px 0", borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      style={{
                        padding: "12px 16px",
                        border: "none",
                        borderBottom: active ? "2px solid #a78bfa" : "2px solid transparent",
                        marginBottom: "-1px",
                        background: "transparent",
                        color: active ? "#e9d5ff" : FH.muted,
                        fontWeight: active ? 700 : 600,
                        fontSize: "13px",
                        cursor: "pointer",
                        fontFamily: FH.font,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ padding: "24px 22px 22px" }}>
                {(tab === "overview" || tab === "cv") && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "22px" }}>
                    {[
                      ["Words", wc > 0 ? `${wc.toLocaleString()}` : "—"],
                      ["Saved", formatSaved(lastSavedAt || loadedAt)],
                      ["Market", "UK"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(0,0,0,0.2)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          minWidth: "100px",
                        }}
                      >
                        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: FH.dim, marginBottom: "4px" }}>{k}</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: FH.text }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "overview" && (
                  <div>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={labelDark}>Target role</label>
                      <input
                        className="candidate-input"
                        type="text"
                        value={targetJobRole}
                        onChange={(e) => setTargetJobRole(e.target.value)}
                        placeholder="e.g. Software Engineer, Data Analyst"
                        style={inputDark}
                      />
                    </div>
                    <div style={{ marginBottom: "8px" }}>
                      <label style={labelDark}>Location (UK city or area)</label>
                      <input
                        className="candidate-input"
                        type="text"
                        value={targetLocation}
                        onChange={(e) => setTargetLocation(e.target.value)}
                        placeholder="e.g. London, Manchester, Remote"
                        style={inputDark}
                      />
                    </div>
                  </div>
                )}

                {tab === "cv" && (
                  <div>
                    <label style={labelDark}>CV (saved to profile)</label>
                    <textarea
                      className="candidate-input"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste your full CV here. We’ll use it to tailor interviews and Job Tracker tools."
                      style={{ ...inputDark, minHeight: "220px", resize: "vertical", lineHeight: 1.55 }}
                    />
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(139, 92, 246, 0.12)",
                        background: "rgba(124, 58, 237, 0.06)",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a78bfa", marginBottom: "8px" }}>Tips</div>
                      <ul style={{ margin: 0, paddingLeft: "18px", color: FH.muted, fontSize: "13px", lineHeight: 1.6 }}>
                        <li>Use clear role titles and dates so questions match your experience.</li>
                        <li>Paste plain text — avoid tables from PDFs when possible.</li>
                        <li>Update after each application to keep mocks aligned.</li>
                      </ul>
                    </div>
                    {jobsBlock}
                  </div>
                )}

                {tab === "account" && (
                  <div>
                    <div style={{ marginBottom: "18px" }}>
                      <label style={labelDark}>Signed in as</label>
                      <div style={{ ...inputDark, cursor: "default", opacity: 0.9 }}>{email || "—"}</div>
                    </div>
                    <p style={{ fontSize: "14px", color: FH.muted, lineHeight: 1.6, margin: "0 0 18px" }}>
                      Password, notifications, and data export live in Settings.
                    </p>
                    {onOpenSettings ? (
                      <button
                        type="button"
                        onClick={onOpenSettings}
                        style={{
                          ...btnSecondary,
                          padding: "10px 18px",
                          borderColor: "rgba(139,92,246,0.28)",
                          color: FH.text,
                          background: "rgba(255,255,255,0.05)",
                          marginBottom: "12px",
                        }}
                        {...btnSecondaryHover}
                      >
                        Open Settings
                      </button>
                    ) : null}
                    {!isPro && onOpenUpgrade ? (
                      <button type="button" onClick={onOpenUpgrade} style={{ ...btnPrimary, display: "block", marginTop: "8px", padding: "10px 18px", fontSize: "14px" }} {...btnPrimaryHover}>
                        Upgrade to Pro
                      </button>
                    ) : null}
                  </div>
                )}

                {saveError ? (
                  <p style={{ color: "#fca5a5", fontSize: "14px", marginTop: "18px", padding: "12px 14px", borderRadius: "10px", background: "rgba(127,29,29,0.25)", border: "1px solid rgba(248,113,113,0.2)" }}>{saveError}</p>
                ) : null}

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(139,92,246,0.1)" }}>
                  <span style={{ fontSize: "13px", color: saved ? "#86efac" : FH.dim, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: saved ? "#34d399" : "rgba(255,255,255,0.2)" }} aria-hidden />
                    {saved ? "Saved" : saving ? "Saving…" : "Changes not saved yet"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ ...btnPrimary, padding: "11px 22px", fontSize: "14px", opacity: saving ? 0.75 : 1, cursor: saving ? "wait" : "pointer", boxShadow: "0 4px 18px rgba(124,58,237,0.28)" }}
                    {...btnPrimaryHover}
                  >
                    {saving ? "Saving…" : onboarding ? "Save and continue" : "Save profile"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
