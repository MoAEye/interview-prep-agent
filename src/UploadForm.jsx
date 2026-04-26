import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { IMPORT_SUCCESS_KEY } from "./signupPrefill";
import { messageForFailedApiResponse } from "./apiClientError.js";

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const labelDark = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#9ca3af",
  marginBottom: "8px",
};

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
  onMouseDown: (e) => {
    e.currentTarget.style.transform = "scale(0.99)";
  },
  onMouseUp: (e) => {
    e.currentTarget.style.transform = "scale(1)";
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

const inputBase = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "12px",
  fontSize: "15px",
  fontFamily: FH.font,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

async function jsonAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

export default function UploadForm({ user, isPro = false, onQuestionsGenerated, onMonthlyLimit }) {
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedProfile, setSavedProfile] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [recruiterSubmissions, setRecruiterSubmissions] = useState([]);
  const [showImportBanner, setShowImportBanner] = useState(false);

  const isDemo = user?.id === "demo";
  const isAuthed = Boolean(user) && !isDemo;
  const maxQuestions = !isAuthed ? 10 : isPro ? 10 : 5;
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("balanced");
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(30);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(IMPORT_SUCCESS_KEY) === "1") {
        setShowImportBanner(true);
        sessionStorage.removeItem(IMPORT_SUCCESS_KEY);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase.from("user_profiles").select("resume_text, target_job_role").eq("user_id", user.id).single();
      if (data && (data.resume_text || data.target_job_role)) setSavedProfile(data);
    })();
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data } = await supabase.from("jobs").select("id, title, company, job_description").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20);
      setSavedJobs(Array.isArray(data) ? data : []);
    })();
  }, [user?.id, isDemo]);

  useEffect(() => {
    setNumQuestions((n) => Math.min(Math.max(3, n), maxQuestions));
  }, [maxQuestions]);

  useEffect(() => {
    if (!user || isDemo) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch("/api/candidate/my-recruiter-submissions", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(json?.submissions)) setRecruiterSubmissions(json.submissions);
      } catch (_) {}
    })();
  }, [user?.id, isDemo]);

  const startRecruiterPractice = async (sub) => {
    if (!sub?.title || !sub?.description) return;
    setError("");
    setLoading(true);
    try {
      const headers = await jsonAuthHeaders();
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          resume_text: sub.candidate_cv || "",
          job_description: sub.description,
          job_title: sub.title,
          question_count: numQuestions,
          difficulty,
          seconds_per_question: secondsPerQuestion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data?.code === "MONTHLY_INTERVIEW_LIMIT") {
          onMonthlyLimit?.();
          setError(typeof data?.error === "string" ? data.error : "Monthly interview limit reached.");
        } else if (res.status === 401) {
          setError(typeof data?.error === "string" ? data.error : "Session expired. Sign in again.");
        } else {
          setError(messageForFailedApiResponse(res, data));
        }
        setLoading(false);
        return;
      }
      onQuestionsGenerated(data, sub.title, null, {
        cv_text: sub.candidate_cv || "",
        job_description: sub.description || "",
        session_preferences: {
          question_count: numQuestions,
          seconds_per_question: secondsPerQuestion,
          difficulty,
        },
      });
    } catch (e) {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!resumeText || !jobTitle || !jobDescription) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      if (!isDemo) {
        await supabase.from("resumes").insert([{ user_id: user.id, resume_text: resumeText }]);
        await supabase.from("job_descriptions").insert([{ user_id: user.id, job_title: jobTitle, job_description: jobDescription }]);
        await supabase.from("user_profiles").upsert(
          { user_id: user.id, resume_text: resumeText, target_job_role: jobTitle, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      }
      const headers = await jsonAuthHeaders();
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
          job_title: jobTitle,
          question_count: numQuestions,
          difficulty,
          seconds_per_question: secondsPerQuestion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data?.code === "MONTHLY_INTERVIEW_LIMIT") {
          onMonthlyLimit?.();
          setError(typeof data?.error === "string" ? data.error : "Monthly interview limit reached.");
        } else if (res.status === 401) {
          setError(typeof data?.error === "string" ? data.error : "Session expired. Sign in again.");
        } else {
          setError(messageForFailedApiResponse(res, data));
        }
        setLoading(false);
        return;
      }
      onQuestionsGenerated(data, jobTitle, selectedJobId || null, {
        cv_text: resumeText,
        job_description: jobDescription,
        session_preferences: {
          question_count: numQuestions,
          seconds_per_question: secondsPerQuestion,
          difficulty,
        },
      });
    } catch (e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const bannerBase = {
    marginBottom: "20px",
    padding: "16px 18px",
    borderRadius: "14px",
    border: "1px solid rgba(139, 92, 246, 0.28)",
    background: "rgba(16, 12, 32, 0.72)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  };

  const secSummaryLabel = (s) => (s === 0 ? "no auto timer" : `${s}s`);

  const steps = [
    { id: "content", label: "Content", active: true },
    { id: "questions", label: "Questions", active: false },
    { id: "report", label: "Report", active: false },
  ];

  return (
    <div
      className="prepare-page-shell"
      style={{
        minHeight: "100dvh",
        fontFamily: FH.font,
        color: FH.text,
        overflowX: "hidden",
        boxSizing: "border-box",
        position: "relative",
        colorScheme: "dark",
        isolation: "isolate",
        background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #000000 100%)",
        paddingBottom: "56px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #0d0718 100%)",
          pointerEvents: "none",
        }}
      />
      <style>{`
        @keyframes prep-gridPulse { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.62; } }
        .prep-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.055) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: prep-gridPulse 8s ease-in-out infinite;
        }
        .prep-title-grad {
          font-size: clamp(1.55rem, 4vw, 2.05rem);
          font-weight: 900;
          letter-spacing: -0.03em;
          margin: 0 0 10px;
          line-height: 1.15;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 38%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .prep-glass-panel {
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
        @keyframes prep-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
      <div className="prep-page-grid" style={{ zIndex: 1 }} aria-hidden />

      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 0, 10, 0.88)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="candidate-spinner" style={{ marginBottom: "22px" }} />
          <h2 style={{ margin: 0, fontSize: "clamp(1.25rem, 3vw, 1.5rem)", fontWeight: 800, color: FH.text, letterSpacing: "-0.02em" }}>
            Analysing your profile…
          </h2>
          <p style={{ color: FH.muted, marginBottom: "22px", fontSize: "15px" }}>Generating tailored interview questions</p>
          <div style={{ display: "flex", gap: "8px" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: "7px",
                  height: "7px",
                  background: "linear-gradient(135deg, #a78bfa, #5eead4)",
                  borderRadius: "50%",
                  animation: "prep-bounce 1s ease-in-out infinite",
                  animationDelay: `${i * 0.12}s`,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 2, maxWidth: "720px", margin: "0 auto", padding: "20px 16px 56px", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
            Prepare
          </p>
          <h1 className="prep-title-grad">Tailor your practice</h1>
          <p style={{ fontSize: "15px", color: FH.muted, margin: 0, lineHeight: 1.55, maxWidth: "520px", marginLeft: "auto", marginRight: "auto" }}>
            Paste your CV and job description — we’ll generate questions matched to this role.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "24px",
          }}
        >
          {steps.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {i > 0 && <span style={{ color: "#3f3f46", fontSize: "11px", fontWeight: 700 }}>→</span>}
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  border: s.active ? "1px solid rgba(167, 139, 250, 0.55)" : "1px solid rgba(113, 113, 122, 0.45)",
                  background: s.active ? "rgba(124, 58, 237, 0.22)" : "rgba(255,255,255,0.04)",
                  color: s.active ? "#e9d5ff" : FH.dim,
                  boxShadow: s.active ? "0 0 24px rgba(124, 58, 237, 0.15)" : "none",
                }}
              >
                {i + 1}. {s.label}
              </div>
            </div>
          ))}
        </div>

        {showImportBanner && (
          <div style={bannerBase}>
            <strong style={{ color: FH.text }}>Imported from your recruiter interview.</strong>{" "}
            <span style={{ color: FH.muted, fontSize: "14px", lineHeight: 1.5 }}>
              Your CV and job description are saved — use &quot;Use my saved profile&quot; below or generate when you’re ready.
            </span>
            <button
              type="button"
              onClick={() => setShowImportBanner(false)}
              style={{
                marginLeft: "12px",
                marginTop: "8px",
                background: "none",
                border: "none",
                color: "#c4b5fd",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {recruiterSubmissions.length > 0 && !isDemo && (
          <div style={{ ...bannerBase, marginBottom: "24px" }}>
            <div style={{ ...labelDark, marginBottom: "6px" }}>Recruiter applications</div>
            <h2 style={{ fontSize: "17px", fontWeight: 800, color: FH.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Practice from saved applications</h2>
            <p style={{ color: FH.muted, marginBottom: "16px", fontSize: "14px", lineHeight: 1.5 }}>Roles you applied to via a recruiter link — same job and CV for full feedback.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recruiterSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                    background: "rgba(8, 6, 20, 0.65)",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                  }}
                >
                  <span style={{ fontWeight: 600, color: FH.text }}>{sub.title}</span>
                  <button
                    type="button"
                    onClick={() => startRecruiterPractice(sub)}
                    disabled={loading}
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      color: "#fff",
                      fontWeight: 600,
                      padding: "10px 18px",
                      borderRadius: "10px",
                      border: "none",
                      fontSize: "14px",
                      cursor: loading ? "wait" : "pointer",
                      opacity: loading ? 0.7 : 1,
                      boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
                    }}
                    {...primaryGlowHover}
                  >
                    Start practice interview
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prep-glass-panel candidate-card-hover" style={{ padding: "clamp(22px, 4vw, 32px)" }}>
          {savedProfile && !isDemo && (
            <div style={{ marginBottom: "22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => { setResumeText(savedProfile.resume_text || ""); setJobTitle(savedProfile.target_job_role || jobTitle); }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(139, 92, 246, 0.28)",
                  color: FH.text,
                  fontWeight: 600,
                  padding: "10px 18px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontFamily: FH.font,
                }}
                {...ghostBtnHover}
              >
                Use my saved profile
              </button>
              <span style={{ fontSize: "13px", color: FH.dim }}>Pre-fill CV and job title</span>
            </div>
          )}
          {!isDemo && (
            <div style={{ marginBottom: "22px" }}>
              <label style={labelDark}>Saved job (optional)</label>
              {savedJobs.length > 0 ? (
                <>
                  <select
                    className="candidate-input"
                    value={selectedJobId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedJobId(id);
                      if (id) {
                        const job = savedJobs.find(j => j.id === id);
                        if (job) { setJobTitle(job.title || ""); setJobDescription(job.job_description || ""); }
                      }
                    }}
                    style={{ ...inputBase, maxWidth: "100%" }}
                  >
                    <option value="">— New job (paste below) —</option>
                    {savedJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}{j.company ? ` @ ${j.company}` : ""}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: "13px", color: FH.dim, margin: "8px 0 0" }}>Link this practice to a job to see attempts in Job Tracker.</p>
                </>
              ) : (
                <p style={{ fontSize: "14px", color: FH.dim, margin: 0 }}>No saved jobs yet. Add one from <strong style={{ color: FH.muted }}>Applications</strong> in the nav, then return here.</p>
              )}
            </div>
          )}
          <div style={{ marginBottom: "22px" }}>
            <label style={labelDark}>Your CV</label>
            <textarea
              className="candidate-input"
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              placeholder="Paste your full CV here (or use saved profile above)…"
              style={{ ...inputBase, minHeight: "150px", resize: "vertical" }}
            />
          </div>
          <div style={{ marginBottom: "22px" }}>
            <label style={labelDark}>Job title</label>
            <input className="candidate-input" type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer, Data Analyst" style={inputBase} />
          </div>
          <div style={{ marginBottom: "22px" }}>
            <label style={labelDark}>Job description</label>
            <textarea className="candidate-input" value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the full job description…" style={{ ...inputBase, minHeight: "150px", resize: "vertical" }} />
          </div>
          <div
            style={{
              marginBottom: "24px",
              borderRadius: "18px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "linear-gradient(160deg, rgba(22, 16, 45, 0.85) 0%, rgba(8, 5, 18, 0.75) 100%)",
              boxShadow: "0 0 0 1px rgba(124, 58, 237, 0.12), 0 20px 50px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px 14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                background: "linear-gradient(90deg, rgba(124, 58, 237, 0.12), transparent)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#a78bfa",
                }}
              >
                Session
              </p>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#fafafa",
                }}
              >
                How should we run this practice?
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "13px", color: FH.muted, lineHeight: 1.5, maxWidth: "520px" }}>
                These apply to the questions we generate and to the live mock. You can always add time or skip in the session.
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1px",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {[
                {
                  key: "n",
                  title: "Question count",
                  hint: `${isPro ? "Pro" : isAuthed ? "Free" : "Guest"} · up to ${maxQuestions} on your plan`,
                  control: (
                    <select
                      className="candidate-input"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                      style={{ ...inputBase, fontWeight: 600 }}
                    >
                      {Array.from({ length: maxQuestions - 2 }, (_, i) => i + 3).map((k) => (
                        <option key={k} value={k}>
                          {k} questions
                        </option>
                      ))}
                    </select>
                  ),
                },
                {
                  key: "d",
                  title: "Difficulty",
                  hint: "Steers how demanding the questions feel",
                  control: (
                    <select
                      className="candidate-input"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      style={{ ...inputBase, fontWeight: 600 }}
                    >
                      <option value="balanced">Balanced (default)</option>
                      <option value="easier">More supportive</option>
                      <option value="tougher">More challenging</option>
                    </select>
                  ),
                },
                {
                  key: "t",
                  title: "Timer",
                  hint: "Countdown in the live mock, or go open-ended",
                  control: (
                    <select
                      className="candidate-input"
                      value={secondsPerQuestion}
                      onChange={(e) => setSecondsPerQuestion(Number(e.target.value))}
                      style={{ ...inputBase, fontWeight: 600 }}
                    >
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds</option>
                      <option value={0}>No timer (your pace)</option>
                    </select>
                  ),
                },
              ].map((row) => (
                <div
                  key={row.key}
                  style={{
                    padding: "16px 20px 18px",
                    minWidth: 0,
                    background: "rgba(8, 6, 20, 0.92)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.11em",
                      textTransform: "uppercase",
                      color: "#64748b",
                    }}
                  >
                    {row.title}
                  </p>
                  {row.control}
                  <p style={{ fontSize: "12px", color: "#71717a", margin: "8px 0 0", lineHeight: 1.45 }}>{row.hint}</p>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "10px 20px 14px",
                fontSize: "12px",
                color: "#52525b",
                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              {secondsPerQuestion === 0
                ? "You chose no auto timer — use Next or Finish to move on during the mock."
                : `Live mock: ${secSummaryLabel(secondsPerQuestion)} per answer, with optional +30s when time runs low.`}
            </div>
          </div>
          {error && (
            <div
              style={{
                background: "rgba(127, 29, 29, 0.35)",
                border: "1px solid rgba(248, 113, 113, 0.45)",
                borderRadius: "12px",
                padding: "12px 16px",
                color: "#fecaca",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
              color: "#ffffff",
              fontWeight: 700,
              padding: "14px 24px",
              borderRadius: "12px",
              border: "none",
              cursor: loading ? "wait" : "pointer",
              fontSize: "16px",
              fontFamily: FH.font,
              opacity: loading ? 0.85 : 1,
              boxShadow: "0 8px 36px rgba(124, 58, 237, 0.55), 0 0 48px rgba(124, 58, 237, 0.25)",
            }}
            {...primaryGlowHover}
          >
            Generate interview questions
          </button>
        </div>
      </div>
    </div>
  );
}
