import { useState, useEffect, useRef } from "react";
import MockInterview from "./MockInterview";
import { supabase } from "./supabaseClient";
import { SIGNUP_PREFILL_KEY, OPEN_SIGNUP_SESSION_KEY, setOpenSignupIntent } from "./signupPrefill";

export default function RecruiterCandidateFlow({ slug }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState("intro");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateCv, setCandidateCv] = useState("");
  const [questionsData, setQuestionsData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [finalScore, setFinalScore] = useState(null);
  const [lastAnswers, setLastAnswers] = useState(null);
  const [loadKey, setLoadKey] = useState(0);
  const [introBannerDismissed, setIntroBannerDismissed] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!slug) return;
    cancelledRef.current = false;
    setLoading(true);
    setError("");
    setRole(null);
    const overallTimeout = 40000; // 40s
    const timeoutId = setTimeout(() => {
      if (cancelledRef.current) return;
      setError("Loading timed out. Check your connection and try again.");
      setLoading(false);
    }, overallTimeout);

    const done = (r, errMsg) => {
      if (cancelledRef.current) return;
      clearTimeout(timeoutId);
      setLoading(false);
      if (r && (r.id != null || r.title != null)) {
        setRole({ id: r.id, title: r.title || "", description: r.description || "" });
      } else {
        setError(errMsg || "Role not found");
      }
    };

    const apiPromise = (async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 18000);
      try {
        const res = await fetch(`/api/recruiter/role-by-slug?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        clearTimeout(t);
        const data = await res.json().catch(() => ({}));
        if (data?.id != null || data?.title != null) return data;
        return null;
      } catch (_) {
        clearTimeout(t);
        return null;
      }
    })();

    const rpcPromise = supabase
      .rpc("get_role_by_slug", { slug })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data[0]) return data[0];
        return null;
      })
      .catch(() => null);

    let settled = 0;
    let finished = false;
    const tryFinish = (roleData) => {
      if (cancelledRef.current || finished) return;
      if (roleData && (roleData.id != null || roleData.title != null)) {
        finished = true;
        done(roleData);
        return;
      }
      settled += 1;
      if (settled === 2) {
        finished = true;
        done(null, "Role not found");
      }
    };

    apiPromise.then(tryFinish);
    rpcPromise.then(tryFinish);

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeoutId);
    };
  }, [slug, loadKey]);

  const handleStartInterview = async () => {
    if (!role) return;
    const name = candidateName.trim();
    const email = candidateEmail.trim();
    const cv = candidateCv.trim();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!cv) {
      setError("Please paste or enter your CV / resume.");
      return;
    }
    setError("");
    setStep("loading_questions");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: cv,
          job_title: role.title || "",
          job_description: role.description || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const isLikelyNoApi =
          res.status === 404 ||
          res.status === 502 ||
          res.status === 504 ||
          (typeof data?.error === "string" && data.error.includes("Cannot POST"));
        setError(
          isLikelyNoApi
            ? "No API behind this page. Run npm run dev:local (or npm run api:local in one terminal + npm run dev in another), then retry. Or use npm run start on http://localhost:3000 after vercel login."
            : data?.error || "Failed to generate questions"
        );
        setStep("intro");
        return;
      }
      const questions = Array.isArray(data.questions) ? data.questions : [];
      if (questions.length === 0) {
        setError("No questions generated. Try again.");
        setStep("intro");
        return;
      }
      setQuestionsData({ interview_questions: questions, job_title: role.title });
      setStep("interview");
    } catch (e) {
      setError(
        "Could not call /api. Run npm run dev:local, or npm run api:local + npm run dev (API on :8787)."
      );
      setStep("intro");
    }
  };

  const handleFinish = async (answers) => {
    if (!slug) return;
    setLastAnswers(answers);
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/recruiter/submit-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          candidate_name: candidateName.trim(),
          candidate_email: candidateEmail.trim(),
          candidate_cv: candidateCv.trim(),
          answers,
        }),
      });
      let data = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (_) {
        data = {};
      }
      if (!res.ok) {
        const msg = data?.error || data?.message || `Submission failed (${res.status})`;
        setSubmitError(msg);
        setSubmitting(false);
        return;
      }
      setFinalScore(data.score);
      setStep("done");
    } catch (e) {
      setSubmitError("Something went wrong");
    }
    setSubmitting(false);
  };

  const retrySubmit = () => lastAnswers && handleFinish(lastAnswers);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6c63ff", fontWeight: "700" }}>Loading…</p>
      </div>
    );
  }

  if (error && !role) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#b82e2e", marginBottom: "1rem" }}>{error}</p>
          <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>This link may be invalid or the role may have been removed.</p>
          <button onClick={() => setLoadKey((k) => k + 1)} style={{ padding: "0.6rem 1.2rem", background: "#6c63ff", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700", fontSize: "0.95rem" }}>Retry</button>
        </div>
      </div>
    );
  }

  if (step === "interview" && (submitting || submitError)) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          {submitting && <p style={{ color: "#6c63ff", fontWeight: "700", marginBottom: "0.5rem" }}>Submitting your answers…</p>}
          {submitError && (
            <>
              <p style={{ color: "#b82e2e", marginBottom: "0.5rem" }}>{submitError}</p>
              <button onClick={retrySubmit} style={{ padding: "0.5rem 1rem", background: "#6c63ff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>Try again</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step === "done") {
    const signupUrl = typeof window !== "undefined" ? `${window.location.origin}/?signup=1` : "/?signup=1";
    const goToCreateAccount = () => {
      try {
        const payload = {
          email: (candidateEmail || "").trim(),
          resume_text: candidateCv || "",
          target_job_role: role?.title || "",
          job_description: role?.description || "",
          fromRecruiter: true,
        };
        sessionStorage.setItem(SIGNUP_PREFILL_KEY, JSON.stringify(payload));
        sessionStorage.setItem(OPEN_SIGNUP_SESSION_KEY, "1");
      } catch (_) {}
      window.location.href = signupUrl;
    };
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff 0%, #e8f4fc 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "420px", background: "white", borderRadius: "20px", padding: "2.5rem 2rem", boxShadow: "0 10px 40px rgba(30,58,95,0.08)", border: "1px solid rgba(108,99,255,0.12)" }}>
          <div style={{ width: "64px", height: "64px", margin: "0 auto 1.25rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "white" }}>✓</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "0.5rem" }}>Thank you</h1>
          <p style={{ color: "#5c6b7a", marginBottom: "0.75rem", lineHeight: 1.5 }}>Your responses have been submitted successfully.</p>
          {finalScore != null && (
            <p style={{ marginBottom: "1rem", fontSize: "1rem" }}>
              <span style={{ color: "#5c6b7a" }}>Your score: </span>
              <span style={{ color: "#2563eb", fontWeight: "700", fontSize: "1.25rem" }}>{finalScore} out of 100</span>
            </p>
          )}
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.25rem" }}>The recruiter may contact you if you're shortlisted.</p>
          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ color: "#1e3a5f", fontWeight: "600", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Want to practise and improve?</p>
            <p style={{ color: "#5c6b7a", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1rem" }}>Create a free candidate account with the same email you used above. Your CV and this role’s job description will be saved to your profile automatically.</p>
            <button type="button" onClick={goToCreateAccount} style={{ display: "inline-block", padding: "0.6rem 1.25rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: "700", cursor: "pointer", boxShadow: "0 4px 14px rgba(108,99,255,0.3)" }}>Create account</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "interview" && questionsData) {
    return (
      <MockInterview
        data={questionsData}
        jobTitle={role?.title}
        onFinish={handleFinish}
        voiceReadAloud
      />
    );
  }

  if (step === "loading_questions") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6c63ff", fontWeight: "700" }}>Preparing your interview…</p>
      </div>
    );
  }

  const signupUrl = typeof window !== "undefined" ? `${window.location.origin}/?signup=1` : "/?signup=1";
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", fontFamily: "sans-serif", padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
      {!introBannerDismissed && (
        <div style={{ maxWidth: "500px", width: "100%", marginBottom: "1rem", background: "linear-gradient(135deg, #e8f4fc, #ede9ff)", borderRadius: "12px", padding: "0.75rem 1rem", border: "1px solid rgba(108,99,255,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e3a5f" }}>Create a free candidate account to save your results and practise this interview again with full feedback.</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <a href={signupUrl} onClick={() => setOpenSignupIntent()} style={{ padding: "0.35rem 0.75rem", background: "#6c63ff", color: "white", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", textDecoration: "none" }}>Sign up</a>
            <button type="button" onClick={() => setIntroBannerDismissed(true)} style={{ background: "none", border: "none", color: "#5c6b7a", cursor: "pointer", fontSize: "0.85rem" }} aria-label="Dismiss">×</button>
          </div>
        </div>
      )}
      <div style={{ maxWidth: "500px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#1e3a5f", marginBottom: "0.5rem" }}>Quick interview</h1>
          <p style={{ color: "#6c63ff", fontWeight: "700", fontSize: "1.1rem" }}>{role?.title || "Role"}</p>
          {role?.description && <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.75rem", textAlign: "left" }}>{role.description.slice(0, 300)}{role.description.length > 300 ? "…" : ""}</p>}
        </div>
        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(108,99,255,0.08)" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "0.35rem", fontSize: "0.9rem" }}>Your name <span style={{ color: "#b82e2e" }}>*</span></label>
            <input type="text" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="e.g. Jane Smith" style={{ width: "100%", padding: "0.6rem 0.8rem", border: "2px solid #e8e0ff", borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "0.35rem", fontSize: "0.9rem" }}>Email address <span style={{ color: "#b82e2e" }}>*</span></label>
            <input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: "0.6rem 0.8rem", border: "2px solid #e8e0ff", borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "0.35rem", fontSize: "0.9rem" }}>Your CV / resume <span style={{ color: "#b82e2e" }}>*</span></label>
            <textarea value={candidateCv} onChange={(e) => setCandidateCv(e.target.value)} placeholder="Paste your CV or resume text here…" rows={6} style={{ width: "100%", padding: "0.6rem 0.8rem", border: "2px solid #e8e0ff", borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box", resize: "vertical", minHeight: "120px" }} />
          </div>
          {error && <p style={{ color: "#b82e2e", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</p>}
          <button onClick={handleStartInterview} style={{ width: "100%", padding: "0.75rem 1.5rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontSize: "1rem", fontWeight: "700", cursor: "pointer", boxShadow: "0 6px 24px rgba(108,99,255,0.25)" }}>Start quick interview</button>
        </div>
      </div>
    </div>
  );
}
