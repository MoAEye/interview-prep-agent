import { useState, useEffect } from "react";
import {
  supabase,
  isSupabaseConfigured,
  SUPABASE_FETCH_TIMEOUT_MS,
  checkSupabaseBrowserReachable,
} from "./supabaseClient";
import { readSignupPrefill, clearSignupPrefill, setImportSuccessBanner, POST_SIGNUP_PROFILE_KEY, OPEN_SIGNUP_SESSION_KEY, clearOpenSignupIntent } from "./signupPrefill";
import NeonFlowBackground from "./NeonFlowBackground";

/** Trim + strip zero-width chars (fixes “invalid email” from Supabase when the field looks fine) */
function normalizeEmail(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function authErrorMessage(err) {
  if (!err) return "";
  const msg = String(err.message || err || "").trim();
  const code = err.code ? String(err.code) : "";
  const status = err.status != null ? String(err.status) : "";
  return [msg, code && `code: ${code}`, status && `status: ${status}`].filter(Boolean).join(" · ");
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label || `Timed out after ${ms / 1000}s`)), ms)),
  ]);
}

const NETWORK_HELP =
  "Open the app in Chrome or Safari (not Cursor’s Simple Browser / embedded preview). Turn off VPN or ad blockers for *.supabase.co. In Supabase Dashboard, confirm the project isn’t paused. Try visiting your project URL in a new tab to verify the network path works.";

async function applyPrefillToDb(userId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id || session.user.id !== userId) {
    // No JWT → RLS blocks writes (common if email confirmation is on and session not ready yet)
    return false;
  }
  const p = readSignupPrefill();
  if (!p || (!p.resume_text && !p.target_job_role && !p.job_description)) {
    clearSignupPrefill();
    return false;
  }
  const resume = p.resume_text || "";
  const title = (p.target_job_role || "Role").trim() || "Role";
  const jd = (p.job_description || "").trim();
  const { error: upErr } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      resume_text: resume,
      target_job_role: title,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (upErr) {
    console.error("applyPrefillToDb user_profiles:", upErr);
    return false;
  }
  if (jd) {
    const { error: jdErr } = await supabase.from("job_descriptions").insert({ user_id: userId, job_title: title, job_description: jd });
    if (jdErr) console.error("applyPrefillToDb job_descriptions:", jdErr);
  }
  if (resume) {
    const { error: rErr } = await supabase.from("resumes").insert({ user_id: userId, resume_text: resume });
    if (rErr) console.error("applyPrefillToDb resumes:", rErr);
  }
  clearSignupPrefill();
  setImportSuccessBanner();
  return true;
}

function SupabaseReachabilityHint() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  return (
    <div style={{ marginTop: "0.55rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult(null);
          try {
            const r = await checkSupabaseBrowserReachable();
            if (r.ok) {
              setResult({ ok: true, text: `Reachable (HTTP ${r.status}). Sign-in should be able to talk to this project.` });
            } else {
              setResult({
                ok: false,
                text: `Cannot reach Supabase from this browser: ${r.detail}${r.status != null ? ` (HTTP ${r.status})` : ""}. Copy the Project URL from Dashboard → Settings → API and compare every character (typos like jey/jay break DNS). Try Chrome/Safari, another network or hotspot, and disable VPN/ad block for *.supabase.co.`,
              });
            }
          } finally {
            setBusy(false);
          }
        }}
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          padding: "0.4rem 0.85rem",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          color: "#a1a1aa",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Testing connection…" : "Test Supabase connection"}
      </button>
      {result ? (
        <p
          style={{
            margin: 0,
            maxWidth: "22rem",
            fontSize: "0.68rem",
            lineHeight: 1.45,
            color: result.ok ? "#86efac" : "#fdba74",
            textAlign: "center",
          }}
        >
          {result.text}
        </p>
      ) : null}
    </div>
  );
}

export default function Login({ onLogin, recruiterMode, initialSignUpMode, onConsumeInitialSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1);
  const [joinRole, setJoinRole] = useState("seeker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState("");

  useEffect(() => {
    if (initialSignUpMode) {
      setIsSignUp(true);
      onConsumeInitialSignUp?.();
    }
  }, [initialSignUpMode, onConsumeInitialSignUp]);

  useEffect(() => {
    const p = readSignupPrefill();
    if (p?.email) setEmail(normalizeEmail(String(p.email)));
  }, []);

  const persistJoinRole = async (userId) => {
    const pre = readSignupPrefill();
    if (pre?.fromRecruiter) return;
    const isRec = joinRole === "recruiter";
    const iso = new Date().toISOString();
    const { data: ex } = await supabase.from("user_profiles").select("user_id").eq("user_id", userId).maybeSingle();
    if (ex) {
      await supabase.from("user_profiles").update({ is_recruiter: isRec, updated_at: iso }).eq("user_id", userId);
    } else {
      await supabase.from("user_profiles").insert({
        user_id: userId,
        is_recruiter: isRec,
        resume_text: "",
        target_job_role: "",
        updated_at: iso,
      });
    }
  };

  const continueToRoleStep = (e) => {
    e?.preventDefault?.();
    setError("");
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const p = readSignupPrefill();
    if (p?.fromRecruiter && p?.email) {
      const want = normalizeEmail(String(p.email)).toLowerCase();
      if (want !== cleanEmail.toLowerCase()) {
        setError(`Use the same email you used for the recruiter interview: ${normalizeEmail(String(p.email))}`);
        return;
      }
    }
    setSignUpStep(2);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isSignUp && !recruiterMode && signUpStep === 1) return;
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        const p = readSignupPrefill();
        if (p?.fromRecruiter && p?.email) {
          const want = normalizeEmail(String(p.email)).toLowerCase();
          const got = cleanEmail.toLowerCase();
          if (want !== got) {
            setError(`Use the same email you used for the recruiter interview: ${normalizeEmail(String(p.email))}`);
            return;
          }
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
      }

      const authResult = isSignUp
        ? await supabase.auth.signUp({ email: cleanEmail, password })
        : await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (authResult?.error) throw authResult.error;
      const user = authResult?.data?.user;
      const newSession = authResult?.data?.session;
      if (!user) {
        if (isSignUp) {
          setError("Check your email to confirm your account if required. After confirming, sign in — we’ll still import your CV and job from the recruiter link.");
        } else {
          setError("Could not sign in. Try again.");
        }
        return;
      }

      // Never await setSession — it can hang indefinitely on some networks; signIn/signUp already set the client session.
      if (newSession?.access_token && newSession?.refresh_token) {
        void supabase.auth
          .setSession({
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token,
          })
          .then(({ error: sessErr }) => {
            if (sessErr) console.warn("[Login] setSession (background, non-fatal):", sessErr);
          })
          .catch((e) => console.warn("[Login] setSession (background):", e));
      }

      // Email confirmation on: sign-up returns user but often no session → cannot write under RLS yet
      if (isSignUp && !newSession) {
        setError(
          "Check your email and confirm your account, then sign in with the same email. After that, your recruiter interview details will import and you can save your profile. (Or turn off “Confirm email” in Supabase → Authentication → Providers → Email, for local testing.)"
        );
        return;
      }

      if (!recruiterMode) {
        const prefill = readSignupPrefill();
        const emailMatch =
          !prefill?.email ||
          normalizeEmail(String(prefill.email)).toLowerCase() === normalizeEmail(user.email || "").toLowerCase();
        if (prefill?.fromRecruiter && emailMatch) {
          try {
            await withTimeout(applyPrefillToDb(user.id), 10000, "Saving imported profile timed out.");
          } catch (e) {
            console.warn("[Login] applyPrefillToDb (non-fatal):", e);
          }
        }
      }

      if (isSignUp && !recruiterMode && newSession) {
        try {
          await withTimeout(persistJoinRole(user.id), 10000, "Saving role choice timed out.");
        } catch (e) {
          console.warn("[Login] persistJoinRole (non-fatal):", e);
        }
      }

      clearOpenSignupIntent();
      if (recruiterMode) {
        onLogin(user, { recruiter: true });
      } else if (isSignUp) {
        try {
          sessionStorage.setItem(POST_SIGNUP_PROFILE_KEY, "1");
        } catch (_) {}
        onLogin(user, { afterSignUp: true });
      } else {
        onLogin(user);
      }
    } catch (err) {
      const name = String(err?.name || "");
      const code = String(err?.code || err?.name || "");
      const msg = authErrorMessage(err);
      const low = msg.toLowerCase();
      if (
        name === "AbortError" ||
        low.includes("abort") ||
        low.includes("aborted") ||
        low.includes("timed out") ||
        low.includes("timeout")
      ) {
        setError(
          `Request to Supabase was stopped after ${Math.round(SUPABASE_FETCH_TIMEOUT_MS / 1000)}s (no response). ${NETWORK_HELP} Then run: npm run check:env`
        );
      } else if (
        code === "invalid_credentials" ||
        low.includes("invalid login credentials") ||
        low.includes("invalid email or password")
      ) {
        setError(
          "Wrong email or password. If you’re sure they’re correct: open Supabase → Authentication → Users, confirm this user exists; reset the password there if needed. If you just registered, confirm the email (inbox) or turn off “Confirm email” under Authentication → Providers → Email for testing."
        );
      } else if (code === "email_not_confirmed" || low.includes("email not confirmed")) {
        setError(
          "This account isn’t confirmed yet. Check your inbox for the Supabase confirmation link, then sign in again. For local testing: Supabase → Authentication → Providers → Email → disable “Confirm email”."
        );
      } else if (low.includes("invalid api key") || low.includes("invalid key")) {
        setError("Supabase key mismatch. Stop the dev server (Ctrl+C), then run npm run dev:vite again. In Supabase → Settings → API, copy the anon key into .env.local as VITE_SUPABASE_ANON_KEY.");
      } else if (low.includes("failed to fetch") || low.includes("networkerror") || low.includes("load failed")) {
        setError(`Cannot reach Supabase. ${NETWORK_HELP} Also confirm .env.local has the correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart Vite.`);
      } else {
        setError(msg ? `${msg} (Run npm run check:env if unsure.)` : "Something went wrong. Run: npm run check:env");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name) => ({
    width: "100%",
    padding: "0.9rem 1rem 0.9rem 2.75rem",
    border: `1px solid ${focused === name ? "rgba(34,211,238,0.45)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: "12px",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    background: focused === name ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
    color: "#f4f4f5",
    transition: "all 0.2s ease",
    boxShadow: focused === name ? "0 0 0 3px rgba(139,92,246,0.2)" : "none",
  });

  const fieldIcon = (d) => (
    <svg
      aria-hidden
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        position: "absolute",
        left: "0.85rem",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#71717a",
        pointerEvents: "none",
      }}
    >
      {d}
    </svg>
  );

  return (
    <NeonFlowBackground enableClickInteraction={false} dimOverlay>
      <style>{`
        @keyframes login-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-shell { animation: login-fade-up 0.55s ease both; }
        .login-field::placeholder { color: rgba(161, 161, 170, 0.75); }
        .submit-btn { transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease !important; }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 16px 48px rgba(139, 92, 246, 0.45), 0 0 24px rgba(34, 211, 238, 0.2) !important;
          filter: brightness(1.05);
        }
        .submit-btn:active:not(:disabled) { transform: scale(0.99) !important; }
        .toggle-btn:hover { color: #67e8f9 !important; }
        @media (max-width: 520px) {
          .join-role-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="login-shell"
        style={{
          width: "100%",
          maxWidth: "440px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          pointerEvents: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          flex: "1 0 auto",
          minHeight: "100vh",
          fontFamily: "'Inter', system-ui, sans-serif",
          padding: "clamp(1.25rem, 4vw, 2rem)",
          color: "#fafafa",
        }}
      >
        {!isSupabaseConfigured && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "1rem 1.15rem",
              borderRadius: "14px",
              background: "rgba(120, 53, 15, 0.25)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              color: "#fde68a",
              fontSize: "0.86rem",
              lineHeight: 1.55,
              textAlign: "left",
            }}
          >
            <strong style={{ color: "#fef3c7" }}>Supabase is not configured.</strong> Create or edit{" "}
            <code style={{ fontSize: "0.78em", background: "rgba(0,0,0,0.35)", padding: "2px 6px", borderRadius: "4px", color: "#fff" }}>.env.local</code> in the{" "}
            <strong>same folder as package.json</strong> (not inside <code style={{ fontSize: "0.76em", color: "#e5e5e5" }}>src</code>). Use real values from Supabase → Settings → API:
            <ul style={{ margin: "0.6rem 0 0", paddingLeft: "1.2rem", color: "#fcd34d" }}>
              <li>
                <code style={{ fontSize: "0.76em" }}>VITE_SUPABASE_URL</code> = your Project URL
              </li>
              <li>
                <code style={{ fontSize: "0.76em" }}>VITE_SUPABASE_ANON_KEY</code> = anon public key
              </li>
            </ul>
            <p style={{ margin: "0.65rem 0 0", fontSize: "0.8rem", color: "#fcd34d" }}>
              Save the file, restart Vite, then run <code style={{ fontSize: "0.76em", background: "rgba(0,0,0,0.35)", padding: "2px 6px", borderRadius: "4px" }}>npm run check:env</code>.
            </p>
          </div>
        )}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 1.1rem",
              borderRadius: "18px",
              background: "linear-gradient(145deg, #22d3ee 0%, #7c3aed 50%, #c026d3 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(124, 58, 237, 0.35), 0 0 0 1px rgba(255,255,255,0.12)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.75" opacity="0.9" />
              <circle cx="12" cy="12" r="4" fill="white" opacity="0.95" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
          <h1 style={{ fontSize: "clamp(1.65rem, 4vw, 1.95rem)", fontWeight: 800, color: "#fff", margin: "0 0 0.35rem", letterSpacing: "-0.03em" }}>InterviewAI</h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.92rem", fontWeight: 500, margin: 0 }}>
            {recruiterMode ? (isSignUp ? "Create recruiter account" : "Recruiter sign in") : isSignUp ? "Create your free account" : "Welcome back. Ready to practice?"}
          </p>
          {isSupabaseConfigured ? (
            <>
              <p style={{ color: "#52525b", fontSize: "0.7rem", margin: "0.5rem 0 0", lineHeight: 1.4, wordBreak: "break-all" }}>
                {(() => {
                  try {
                    const h = new URL(String(import.meta.env.VITE_SUPABASE_URL || "").trim()).hostname;
                    return h ? `Auth API: ${h} · must match the project where your user exists` : "";
                  } catch {
                    return "";
                  }
                })()}
              </p>
              <SupabaseReachabilityHint />
            </>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            margin: 0,
            width: "100%",
            borderRadius: "1.2rem",
            padding: "2rem",
            background: "rgba(9, 9, 11, 0.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 0 0 1px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.45)",
          }}
        >

          {isSignUp && !recruiterMode && signUpStep === 2 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontWeight: 800, color: "#fafafa", marginBottom: "0.5rem", fontSize: "1rem" }}>I am joining as…</p>
              <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: "1rem" }}>Choose how you&apos;ll use InterviewAI.</p>
              <div className="join-role-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                {[
                  { id: "seeker", title: "Job Seeker", sub: "Practice interviews & track jobs", icon: "◎" },
                  { id: "recruiter", title: "Recruiter", sub: "Create roles & review candidates", icon: "◆" },
                ].map((opt) => {
                  const active = joinRole === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setJoinRole(opt.id)}
                      style={{
                        textAlign: "left",
                        padding: "1rem 1rem",
                        borderRadius: "14px",
                        border: active ? "1px solid rgba(34,211,238,0.5)" : "1px solid rgba(255,255,255,0.1)",
                        background: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: active ? "0 0 24px rgba(139,92,246,0.2)" : "none",
                      }}
                    >
                      <div style={{ fontSize: "1.35rem", marginBottom: "0.35rem", opacity: 0.9 }}>{opt.icon}</div>
                      <div style={{ fontWeight: 800, color: "#f4f4f5", fontSize: "0.95rem" }}>{opt.title}</div>
                      <div style={{ fontSize: "0.78rem", color: "#71717a", marginTop: "0.25rem", lineHeight: 1.4 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setSignUpStep(1)}
                style={{ marginTop: "1rem", background: "none", border: "none", color: "#a78bfa", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
              >
                ← Back
              </button>
            </div>
          )}

          {!(isSignUp && !recruiterMode && signUpStep === 2) && (
          <>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: 700, color: "#a1a1aa", marginBottom: "0.5rem", fontSize: "0.72rem", letterSpacing: "0.12em" }}>EMAIL ADDRESS</label>
            <div style={{ position: "relative" }}>
              {fieldIcon(
                <>
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </>
              )}
              <input
                className="login-field"
                type="email"
                placeholder="you@example.com"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused("")}
                style={inputStyle("email")}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: 700, color: "#a1a1aa", marginBottom: "0.5rem", fontSize: "0.72rem", letterSpacing: "0.12em" }}>PASSWORD</label>
            <div style={{ position: "relative" }}>
              {fieldIcon(
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              )}
              <input
                className="login-field"
                type="password"
                placeholder="••••••••"
                value={password}
                required
                minLength={isSignUp ? 8 : undefined}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                style={inputStyle("password")}
              />
            </div>
            {isSignUp && <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#71717a" }}>At least 8 characters.</p>}
          </div>

          {isSignUp && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 700, color: "#a1a1aa", marginBottom: "0.5rem", fontSize: "0.72rem", letterSpacing: "0.12em" }}>CONFIRM PASSWORD</label>
              <div style={{ position: "relative" }}>
                {fieldIcon(
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </>
                )}
                <input
                  className="login-field"
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocused("confirm")}
                  onBlur={() => setFocused("")}
                  style={inputStyle("confirm")}
                />
              </div>
            </div>
          )}
          </>
          )}

          {error && (
            <div
              style={{
                background: "rgba(127, 29, 29, 0.25)",
                border: "1px solid rgba(248, 113, 113, 0.35)",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                color: "#fecaca",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {isSignUp && !recruiterMode && signUpStep === 1 ? (
            <button
              type="button"
              className="submit-btn"
              onClick={continueToRoleStep}
              disabled={!isSupabaseConfigured}
              style={{
                width: "100%",
                minHeight: "48px",
                padding: "1rem",
                background: !isSupabaseConfigured ? "#27272a" : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 45%, #0891b2 100%)",
                color: !isSupabaseConfigured ? "#71717a" : "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "1rem",
                fontWeight: 800,
                cursor: !isSupabaseConfigured ? "not-allowed" : "pointer",
                boxShadow: !isSupabaseConfigured ? "none" : "0 8px 32px rgba(124, 58, 237, 0.35)",
                letterSpacing: "-0.01em",
              }}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !isSupabaseConfigured}
              style={{
                width: "100%",
                minHeight: "48px",
                padding: "1rem",
                background: loading || !isSupabaseConfigured ? "#27272a" : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 45%, #0891b2 100%)",
                color: loading || !isSupabaseConfigured ? "#71717a" : "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "1rem",
                fontWeight: 800,
                cursor: loading || !isSupabaseConfigured ? "not-allowed" : "pointer",
                boxShadow: loading || !isSupabaseConfigured ? "none" : "0 8px 32px rgba(124, 58, 237, 0.35)",
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : isSignUp ? "Create account" : "Sign in"}
            </button>
          )}

          <div style={{ marginTop: "1.5rem", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
            <p style={{ color: "#71717a", marginBottom: "0.5rem", fontSize: "0.88rem" }}>
              {isSignUp ? "Already have an account?" : "Don't have an account yet?"}
            </p>
            <button
              type="button"
              className="toggle-btn"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setConfirmPassword(""); setSignUpStep(1); setJoinRole("seeker"); }}
              style={{ background: "none", border: "none", color: "#c4b5fd", fontWeight: 800, cursor: "pointer", fontSize: "0.95rem", transition: "color 0.2s ease" }}
            >
              {isSignUp ? "Sign in instead" : "Create free account"}
            </button>
          </div>
        </form>

        <p style={{ textAlign: "center", color: "#71717a", fontSize: "0.75rem", marginTop: "1.35rem" }}>Secured by Supabase · Your data stays private</p>
      </div>
    </NeonFlowBackground>
  );
}
