import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover } from "./candidateUi.jsx";

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const PREFS_KEY = "settings_prefs";

const defaultPrefs = () => ({
  email_interview_reminders: true,
  email_weekly_digest: false,
  email_product_updates: true,
  reduce_motion: false,
  high_contrast_focus: false,
});

function mergePrefs(raw) {
  return { ...defaultPrefs(), ...(raw && typeof raw === "object" ? raw : {}) };
}

const primaryGlowHover = {
  onMouseEnter: (e) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.filter = "brightness(1.06)";
    e.currentTarget.style.boxShadow = "0 10px 40px rgba(124, 58, 237, 0.65), 0 0 56px rgba(45, 212, 191, 0.15)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.filter = "brightness(1)";
    e.currentTarget.style.boxShadow = "0 8px 36px rgba(124, 58, 237, 0.55), 0 0 48px rgba(124, 58, 237, 0.25)";
  },
};

const ghostBtnHover = {
  onMouseEnter: (e) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.background = "rgba(139, 92, 246, 0.14)";
    e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.45)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.28)";
  },
};

const inputDark = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  fontSize: "15px",
  fontFamily: FH.font,
  border: "1px solid rgba(139, 92, 246, 0.22)",
  background: "rgba(8, 6, 20, 0.55)",
  color: FH.text,
  outline: "none",
  boxSizing: "border-box",
};

const labelUpper = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#9ca3af",
  marginBottom: "8px",
};

const NAV = [
  { id: "general", label: "General" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "billing", label: "Billing" },
  { id: "connected", label: "Connected accounts" },
  { id: "privacy", label: "Privacy & data" },
];

function Toggle({ checked, onChange, disabled, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: "48px",
        height: "28px",
        borderRadius: "999px",
        border: "1px solid rgba(139, 92, 246, 0.35)",
        background: checked ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(0,0,0,0.35)",
        padding: "3px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "#fff",
          marginLeft: checked ? "auto" : 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          transition: "margin 0.2s ease",
        }}
      />
    </button>
  );
}

function SettingRow({ title, description, children }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        padding: "18px 0",
        borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
      }}
    >
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "14px", color: FH.text, marginBottom: "4px" }}>{title}</div>
        {description ? (
          <div style={{ fontSize: "13px", color: FH.muted, lineHeight: 1.5 }}>{description}</div>
        ) : null}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function CandidateSettings({
  user,
  isPro,
  onBack,
  onOpenUpgrade,
  onManagePlan,
  onPrivacy,
  onTerms,
  onCookies,
  onLogout,
  onOpenProfile,
  monthlyInterviewCount = 0,
}) {
  const [section, setSection] = useState("general");
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [resetSent, setResetSent] = useState("");
  const [resetError, setResetError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [linkedIdentities, setLinkedIdentities] = useState([]);

  const email = user?.email || "";
  const isDemo = user?.id === "demo";

  useEffect(() => {
    setResetError("");
  }, [section]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && Array.isArray(data?.user?.identities)) setLinkedIdentities(data.user.identities);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/settings");
    } catch (_) {}
  }, []);

  useEffect(() => {
    const meta = user?.user_metadata || {};
    let fromMeta = mergePrefs(meta[PREFS_KEY]);
    try {
      const raw = localStorage.getItem(`interviewai_${PREFS_KEY}`);
      if (raw) fromMeta = mergePrefs({ ...JSON.parse(raw), ...fromMeta });
    } catch (_) {}
    setPrefs(fromMeta);
    setDisplayName(
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
        (typeof meta.name === "string" && meta.name.trim()) ||
        (email ? email.split("@")[0] : "")
    );
  }, [user?.id, user?.user_metadata, email]);

  const persistPrefs = useCallback(
    async (next) => {
      if (isDemo) return;
      setPrefs(next);
      setPrefsSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { [PREFS_KEY]: next },
        });
        if (error) throw error;
        try {
          localStorage.setItem(`interviewai_${PREFS_KEY}`, JSON.stringify(next));
        } catch (__) {}
      } catch (_) {
        try {
          localStorage.setItem(`interviewai_${PREFS_KEY}`, JSON.stringify(next));
        } catch (__) {}
      }
      setPrefsSaving(false);
    },
    [isDemo]
  );

  const togglePref = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    void persistPrefs(next);
  };

  const saveDisplayName = async () => {
    if (isDemo) return;
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");
    const trimmed = displayName.trim();
    if (!trimmed) {
      setProfileError("Name cannot be empty.");
      setSavingProfile(false);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed, name: trimmed },
      });
      if (error) throw error;
      await supabase.from("user_profiles").upsert(
        { user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      setProfileMessage("Saved.");
      setTimeout(() => setProfileMessage(""), 2500);
    } catch (e) {
      setProfileError(e?.message || "Could not save.");
    }
    setSavingProfile(false);
  };

  const sendPasswordReset = async () => {
    if (!email || isDemo) return;
    setResetSent("");
    setResetError("");
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: origin ? `${origin}/login` : undefined,
      });
      if (error) throw error;
      setResetSent("Check your email for a reset link.");
    } catch (e) {
      setResetError(e?.message || "Could not send email.");
    }
  };

  const linkGoogle = async () => {
    if (isDemo) return;
    setLinkBusy(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: origin ? `${origin}/settings` : undefined },
      });
      if (error) throw error;
    } catch (e) {
      setResetError(e?.message || "Could not start Google linking. Enable Google in Supabase Auth.");
    }
    setLinkBusy(false);
  };

  const exportMyData = async () => {
    if (!user?.id || isDemo) return;
    setExportBusy(true);
    try {
      const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
      const { count } = await supabase
        .from("interview_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      const jobRes = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const docRes = await supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const jobCount = jobRes.error ? null : jobRes.count;
      const docCount = docRes.error ? null : docRes.count;
      const payload = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
        user_profiles: profile || null,
        counts: {
          interview_sessions: typeof count === "number" ? count : null,
          jobs: typeof jobCount === "number" ? jobCount : null,
          documents: typeof docCount === "number" ? docCount : null,
        },
        note: "Full row data for sessions and documents is not included in this export. Contact support for a complete GDPR export.",
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `interviewai-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (_) {
      setResetError("Export failed. Try again or contact support.");
    }
    setExportBusy(false);
  };

  const hasGoogle = linkedIdentities.some((i) => i?.provider === "google");

  const sectionTitle = NAV.find((n) => n.id === section)?.label || "Settings";

  const navBtn = (id, label) => {
    const active = section === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setSection(id)}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          marginBottom: "4px",
          borderRadius: "10px",
          border: "none",
          borderLeft: active ? "3px solid #a78bfa" : "3px solid transparent",
          background: active ? "rgba(124, 58, 237, 0.18)" : "transparent",
          color: active ? "#e9d5ff" : FH.muted,
          fontWeight: active ? 700 : 600,
          fontSize: "13px",
          cursor: "pointer",
          fontFamily: FH.font,
          paddingLeft: active ? "9px" : "12px",
          transition: "background 0.15s ease, color 0.15s ease",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="settings-page-shell"
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
        @keyframes st-gridPulse { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.62; } }
        .st-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.055) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: st-gridPulse 8s ease-in-out infinite;
        }
        .st-glass-panel {
          position: relative;
          border-radius: 22px;
          background: rgba(16, 12, 32, 0.58);
          border: 1px solid rgba(139, 92, 246, 0.24);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 24px 64px rgba(0, 0, 0, 0.45),
            0 0 60px rgba(124, 58, 237, 0.06);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
      `}</style>
      <div className="st-page-grid" aria-hidden />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1040px",
          margin: "0 auto",
          padding: "24px 16px 64px",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            border: "none",
            background: "transparent",
            color: FH.muted,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: FH.font,
            padding: "4px 0",
            marginBottom: "20px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span aria-hidden>←</span> Back
        </button>

        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8b8b9b",
            }}
          >
            Account
          </p>
          <h1
            style={{
              fontSize: "clamp(1.55rem, 4vw, 2.05rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              margin: "0 0 10px",
              lineHeight: 1.15,
              background: "linear-gradient(180deg, #ffffff 0%, #f5f3ff 38%, #c4b5fd 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Settings
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: FH.muted, lineHeight: 1.55, maxWidth: "560px" }}>
            Manage your account, security, and preferences. CV and role details stay in Profile.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <aside style={{ width: "100%", maxWidth: "220px", flexShrink: 0 }}>
            <div className="st-glass-panel" style={{ padding: "12px 8px" }}>
              {NAV.map((n) => navBtn(n.id, n.label))}
            </div>
          </aside>

          <main style={{ flex: "1 1 360px", minWidth: 0 }}>
            <div className="st-glass-panel" style={{ padding: "clamp(20px, 4vw, 28px)" }}>
              <h2 style={{ margin: "0 0 20px", fontSize: "13px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af" }}>
                {sectionTitle}
              </h2>

              {resetError ? (
                <p style={{ color: "#fca5a5", fontSize: "13px", margin: "0 0 16px" }}>{resetError}</p>
              ) : null}

              {section === "general" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 0 2px rgba(167,139,250,0.35)",
                      }}
                    >
                      {(displayName || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: FH.dim }}>Avatar uses your initial. Photo upload coming later.</div>
                    </div>
                  </div>
                  <label htmlFor="settings-display-name" style={labelUpper}>
                    Display name
                  </label>
                  <input
                    id="settings-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isDemo}
                    style={{ ...inputDark, marginBottom: "16px" }}
                  />
                  <label style={labelUpper}>Email</label>
                  <div style={{ ...inputDark, opacity: 0.85, marginBottom: "16px", cursor: "default" }}>{email || "—"}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                    <button
                      type="button"
                      disabled={isDemo || savingProfile}
                      onClick={() => void saveDisplayName()}
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        color: "#fff",
                        fontWeight: 600,
                        padding: "10px 20px",
                        borderRadius: "12px",
                        border: "none",
                        fontSize: "14px",
                        cursor: isDemo ? "not-allowed" : "pointer",
                        opacity: savingProfile ? 0.7 : 1,
                        boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                      }}
                      {...primaryGlowHover}
                    >
                      {savingProfile ? "Saving…" : "Save changes"}
                    </button>
                    {onOpenProfile ? (
                      <button
                        type="button"
                        onClick={onOpenProfile}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(139, 92, 246, 0.28)",
                          color: FH.text,
                          fontWeight: 600,
                          padding: "10px 18px",
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontFamily: FH.font,
                        }}
                        {...ghostBtnHover}
                      >
                        Open Profile &amp; CV
                      </button>
                    ) : null}
                  </div>
                  {profileMessage ? <p style={{ color: "#86efac", fontSize: "13px", margin: "8px 0 0" }}>{profileMessage}</p> : null}
                  {profileError ? <p style={{ color: "#fca5a5", fontSize: "13px", margin: "8px 0 0" }}>{profileError}</p> : null}
                </div>
              )}

              {section === "security" && (
                <div>
                  <SettingRow
                    title="Password"
                    description="We’ll email you a secure link to choose a new password."
                  >
                    <button
                      type="button"
                      disabled={isDemo || !email}
                      onClick={() => void sendPasswordReset()}
                      style={{
                        ...btnSecondary,
                        padding: "8px 14px",
                        fontSize: "13px",
                        borderColor: "rgba(139,92,246,0.35)",
                        color: FH.text,
                        background: "rgba(255,255,255,0.06)",
                      }}
                      {...btnSecondaryHover}
                    >
                      Send reset email
                    </button>
                  </SettingRow>
                  {resetSent ? <p style={{ color: "#86efac", fontSize: "13px", marginTop: "-8px", marginBottom: "16px" }}>{resetSent}</p> : null}
                  <SettingRow
                    title="Two-factor authentication"
                    description="Extra protection for your account. Full MFA enrollment is coming soon; use a strong password and reset link above for now."
                  >
                    <Toggle checked={false} onChange={() => {}} disabled />
                  </SettingRow>
                </div>
              )}

              {section === "notifications" && (
                <div>
                  <p style={{ fontSize: "12px", color: FH.dim, margin: "0 0 8px" }}>
                    {prefsSaving ? "Saving…" : "Preferences are stored on your account when possible."}
                  </p>
                  <SettingRow
                    title="Interview reminders"
                    description="Tips before scheduled practice or follow-ups after a session."
                  >
                    <Toggle checked={prefs.email_interview_reminders} onChange={() => togglePref("email_interview_reminders")} disabled={isDemo} />
                  </SettingRow>
                  <SettingRow
                    title="Weekly digest"
                    description="A summary of your progress and suggested focus areas."
                  >
                    <Toggle checked={prefs.email_weekly_digest} onChange={() => togglePref("email_weekly_digest")} disabled={isDemo} />
                  </SettingRow>
                  <SettingRow title="Product updates" description="New features and improvements to InterviewAI.">
                    <Toggle checked={prefs.email_product_updates} onChange={() => togglePref("email_product_updates")} disabled={isDemo} />
                  </SettingRow>
                </div>
              )}

              {section === "billing" && (
                <div>
                  <p style={{ margin: "0 0 16px", fontSize: "14px", color: FH.muted, lineHeight: 1.6 }}>
                    {isPro
                      ? "You’re on Pro — unlimited mocks, full reports, cover tools, and read-aloud in practice."
                      : "You’re on Free — limited mocks and lighter reports. Upgrade when you’re ready."}
                  </p>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(8, 6, 20, 0.55)",
                      border: "1px solid rgba(139, 92, 246, 0.2)",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: FH.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                      Usage this month (UTC)
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: FH.text }}>
                      {isPro ? "Unlimited mock interviews" : `${monthlyInterviewCount} of 3 mock interviews used`}
                    </div>
                  </div>
                  {isPro ? (
                    <button type="button" onClick={onManagePlan} style={{ ...btnPrimary, marginBottom: "24px" }} {...btnPrimaryHover}>
                      Manage plan
                    </button>
                  ) : (
                    <button type="button" onClick={onOpenUpgrade} style={{ ...btnPrimary, marginBottom: "24px" }} {...btnPrimaryHover}>
                      Upgrade to Pro
                    </button>
                  )}
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: FH.dim, marginBottom: "10px" }}>
                    Invoices
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: FH.muted }}>No invoices yet. When billing goes live, receipts will appear here.</p>
                </div>
              )}

              {section === "connected" && (
                <div>
                  <SettingRow
                    title="Google"
                    description={hasGoogle ? "Signed in with Google is linked to this account." : "Link Google for faster sign-in. Enable the Google provider in Supabase if you see an error."}
                  >
                    {hasGoogle ? (
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#86efac" }}>Connected</span>
                    ) : (
                      <button
                        type="button"
                        disabled={isDemo || linkBusy}
                        onClick={() => void linkGoogle()}
                        style={{
                          ...btnSecondary,
                          padding: "8px 14px",
                          fontSize: "13px",
                          borderColor: "rgba(139,92,246,0.35)",
                          color: FH.text,
                          background: "rgba(255,255,255,0.06)",
                        }}
                        {...btnSecondaryHover}
                      >
                        {linkBusy ? "…" : "Connect Google"}
                      </button>
                    )}
                  </SettingRow>
                  <SettingRow title="LinkedIn" description="Workplace sign-in via LinkedIn isn’t configured yet.">
                    <span style={{ fontSize: "12px", color: FH.dim }}>Coming soon</span>
                  </SettingRow>
                </div>
              )}

              {section === "privacy" && (
                <div>
                  <SettingRow
                    title="Download your data"
                    description="JSON summary: profile row, counts, and account email. Request a full export via support if you need everything."
                  >
                    <button
                      type="button"
                      disabled={isDemo || exportBusy}
                      onClick={() => void exportMyData()}
                      style={{
                        ...btnSecondary,
                        padding: "8px 14px",
                        fontSize: "13px",
                        borderColor: "rgba(139,92,246,0.35)",
                        color: FH.text,
                        background: "rgba(255,255,255,0.06)",
                      }}
                      {...btnSecondaryHover}
                    >
                      {exportBusy ? "…" : "Export JSON"}
                    </button>
                  </SettingRow>
                  <div style={{ borderBottom: "1px solid rgba(139, 92, 246, 0.1)", paddingBottom: "8px", marginBottom: "8px" }} />
                  {[
                    ["Privacy policy", onPrivacy],
                    ["Terms of service", onTerms],
                    ["Cookie policy", onCookies],
                  ].map(([label, fn]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={fn}
                      style={{
                        display: "flex",
                        width: "100%",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 0",
                        border: "none",
                        borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
                        background: "transparent",
                        color: FH.text,
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: FH.font,
                        textAlign: "left",
                      }}
                    >
                      {label}
                      <span style={{ opacity: 0.4 }}>→</span>
                    </button>
                  ))}
                  <a
                    href="mailto:privacy@interviewai.app?subject=InterviewAI%20support"
                    style={{
                      display: "flex",
                      width: "100%",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 0",
                      color: "#c4b5fd",
                      fontSize: "14px",
                      fontWeight: 600,
                      textDecoration: "none",
                      fontFamily: FH.font,
                    }}
                  >
                    Contact support
                    <span style={{ opacity: 0.4 }}>→</span>
                  </a>

                  <div
                    style={{
                      marginTop: "28px",
                      padding: "18px",
                      borderRadius: "14px",
                      border: "1px solid rgba(248, 113, 113, 0.25)",
                      background: "rgba(127, 29, 29, 0.2)",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#fca5a5", marginBottom: "8px" }}>Danger zone</div>
                    <p style={{ margin: "0 0 12px", fontSize: "13px", color: FH.muted, lineHeight: 1.5 }}>
                      Deleting your account removes access permanently. We’ll need to verify ownership before erasing data.
                    </p>
                    <a
                      href={`mailto:privacy@interviewai.app?subject=Account%20deletion%20request&body=Please%20delete%20my%20account%20(${encodeURIComponent(email || "")}).`}
                      style={{ color: "#fca5a5", fontWeight: 700, fontSize: "13px" }}
                    >
                      Request account deletion
                    </a>
                  </div>

                  <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid rgba(139, 92, 246, 0.12)" }}>
                    <button
                      type="button"
                      onClick={() => onLogout?.()}
                      style={{
                        ...btnSecondary,
                        padding: "10px 20px",
                        borderColor: "rgba(248, 113, 113, 0.28)",
                        color: "#fca5a5",
                        background: "transparent",
                      }}
                      {...btnSecondaryHover}
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
