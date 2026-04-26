import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";
import { messageForFailedApiResponse } from "./apiClientError.js";

const PAGE_BG = "#030008";
const CONTENT_MAX = 720;
const RING_SIZE = 148;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
/** Spec stroke-dasharray for progress ring */
const RING_DASH = 478;

function scoreTier100(s) {
  const n = Math.max(0, Math.min(100, Number(s) || 0));
  if (n <= 39) {
    return {
      key: "low",
      grad: "linear-gradient(135deg, #ef4444, #dc2626)",
      track: "rgba(239,68,68,0.08)",
      badgeColor: "#ef4444",
      badgeText: "Needs work",
    };
  }
  if (n <= 69) {
    return {
      key: "mid",
      grad: "linear-gradient(135deg, #f59e0b, #d97706)",
      track: "rgba(245,158,11,0.08)",
      badgeColor: "#f59e0b",
      badgeText: "Getting there",
    };
  }
  return {
    key: "high",
    grad: "linear-gradient(135deg, #10b981, #059669)",
    track: "rgba(16,185,129,0.08)",
    badgeColor: "#10b981",
    badgeText: "Interview ready",
  };
}

/** Map 0–10 question score to pill style (aligned to 0–100 bands). */
function pillStyleForQuestion(score10, skipped) {
  if (skipped) {
    return {
      bg: "rgba(239,68,68,0.1)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.2)",
      text: "SKIPPED",
    };
  }
  const n = Math.max(0, Math.min(10, Number(score10) || 0)) * 10;
  if (n <= 39) {
    return {
      bg: "rgba(239,68,68,0.1)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.2)",
      text: `${score10}/10`,
    };
  }
  if (n <= 69) {
    return {
      bg: "rgba(245,158,11,0.1)",
      color: "#f59e0b",
      border: "1px solid rgba(245,158,11,0.2)",
      text: `${score10}/10`,
    };
  }
  return {
    bg: "rgba(16,185,129,0.1)",
    color: "#10b981",
    border: "1px solid rgba(16,185,129,0.2)",
    text: `${score10}/10`,
  };
}

export default function InterviewReport({
  answers,
  jobTitle,
  jobId,
  cvText,
  jobDescription,
  onRetry,
  onRetryWeak,
  onStartOver,
  onComplete,
  skipSessionSave = false,
  isPro = false,
  onOpenUpgrade,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeQ, setActiveQ] = useState(null);
  const [animatedStars, setAnimatedStars] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [visible, setVisible] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [ariaPanelTab, setAriaPanelTab] = useState("feedback");
  const [totalSessions, setTotalSessions] = useState(null);
  const [shareToast, setShareToast] = useState("");
  const hasSpokeRef = useRef(false);
  const hasGradedRef = useRef(false);
  const hasSavedRef = useRef(false);
  const answerList = Array.isArray(answers) ? answers : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id || cancelled) return;
        const { count, error: cErr } = await supabase
          .from("interview_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        if (!cancelled && !cErr) setTotalSessions(typeof count === "number" ? count : 0);
      } catch {
        if (!cancelled) setTotalSessions(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveSession = async (gradeData, answersData) => {
    if (skipSessionSave) return;
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const score = Math.max(0, Math.min(100, Number.isFinite(Number(gradeData?.overall_score)) ? Math.round(Number(gradeData.overall_score)) : 0));
      const stars = Math.max(0, Math.min(5, Number.isFinite(Number(gradeData?.star_rating)) ? Number(gradeData.star_rating) : 0));

      const insertRow = {
        user_id: session.user.id,
        score,
        stars,
        job_title: jobTitle || gradeData.job_title || "Interview",
        answers: answersData,
      };
      if (jobId) insertRow.job_id = jobId;
      const { error } = await supabase.from("interview_sessions").insert(insertRow);

      if (error) {
        console.error("❌ Failed to save session:", error);
      }
    } catch (err) { console.error("❌ Failed to save session:", err); }
  };

  const speak = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95; utter.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Zira"));
    if (female) utter.voice = female;
    window.speechSynthesis.speak(utter);
  };

  const buildStaticHTML = () => {
    const scoreVal = Number.isFinite(Number(report?.overall_score)) ? Number(report.overall_score) : 0;
    const starsVal = Number.isFinite(Number(report?.star_rating)) ? Number(report.star_rating) : 0;
    const starsText = `Rating: ${starsVal} / 5`;
    const strengths = (report.strengths || []).map(s => `<li>${s}</li>`).join("");
    const improvements = (report.improvements || []).map(s => `<li>${s}</li>`).join("");
    const qs = (report.question_grades || []).map((q, i) => {
      const ans = answerList[i];
      const skipped = q.skipped || ans?.skipped;
      return `<div style="background:white;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #eee;">
        <div style="font-weight:700;color:#1e3a5f;margin-bottom:8px;">${skipped ? "SKIPPED" : q.score+"/10"} — ${q.question || ans?.question || "Question "+(i+1)}</div>
        ${skipped ? "<p style='color:#ff6b6b'>This question was skipped.</p>" : `
          <p style="font-size:13px;color:#555;margin-bottom:8px;"><strong>Your answer:</strong> ${q.answer_given || ans?.answer || "—"}</p>
          <p style="font-size:13px;color:#2d6a4f;margin-bottom:4px;"><strong>What was good:</strong> ${(q.what_was_good || q.feedback || "")}</p>
          <p style="font-size:13px;color:#b8860b;margin-bottom:4px;"><strong>To improve:</strong> ${(q.what_to_improve || "")}</p>
          <p style="font-size:13px;color:#6c63ff;"><strong>Ideal answer:</strong> ${(q.ideal_answer || "")}</p>`}
      </div>`;
    }).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,sans-serif;background:#f8f4ff;margin:0;padding:32px;}
      .container{max-width:700px;margin:0 auto;background:white;border-radius:24px;padding:32px;box-shadow:0 4px 20px rgba(108,99,255,0.08);}
      h1{color:#1e3a5f;text-align:center;font-size:28px;margin-bottom:4px;}
      .sub{text-align:center;color:#aaa;margin-bottom:24px;}
      .score{text-align:center;font-size:72px;font-weight:900;color:#6c63ff;margin:16px 0 4px;}
      .stars{text-align:center;font-size:32px;margin-bottom:8px;}
      .out{text-align:center;color:#bbb;margin-bottom:24px;}
      .feedback{background:#f0edff;border-radius:16px;padding:20px;margin-bottom:24px;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
      .card{background:#f8f9fa;border-radius:12px;padding:16px;}
      .card h3{font-size:14px;margin:0 0 12px;}
      .card li{font-size:13px;color:#444;margin-bottom:6px;}
      h2{color:#1e3a5f;font-size:18px;margin-bottom:16px;}
    </style></head><body><div class="container">
      <h1>Interview Report</h1>
      <p class="sub">Here's how you did${jobTitle ? " — " + jobTitle : ""}</p>
      <div class="stars">${starsText}</div>
      <div class="score">${scoreVal}</div>
      <div class="out">out of 100</div>
      <div class="feedback"><strong style="color:#6c63ff">Aria feedback</strong><p style="margin:8px 0 0;color:#444;line-height:1.6">${report.summary}</p></div>
      <div class="grid">
        <div class="card"><h3 style="color:#2d6a4f">What you did well</h3><ul>${strengths}</ul></div>
        <div class="card"><h3 style="color:#b85c2e">Areas to improve</h3><ul>${improvements}</ul></div>
      </div>
      <h2>Question breakdown</h2>${qs}
    </div></body></html>`;
  };

  const exportPDF = async (e) => {
    if (e) e.preventDefault();
    if (!report || pdfGenerating) return;
    if (!isPro) {
      onOpenUpgrade?.();
      return;
    }
    setPdfGenerating(true);
    try {
      const html = buildStaticHTML();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:820px;border:none;visibility:hidden;";
      iframe.setAttribute("aria-hidden", "true");
      iframe.src = url;
      document.body.appendChild(iframe);
      await new Promise((r) => setTimeout(r, 900));
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      const el = idoc.querySelector(".container");
      if (!el) throw new Error("Missing report container for PDF");
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgW = pageWidth;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageHeight;
      }

      const titlePart = (jobTitle || report?.job_title || "").toString().trim();
      const slug = titlePart
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename =
        titlePart && slug ? `interview-report-${slug}-${dateStr}.pdf` : "interview-report.pdf";

      pdf.save(filename);
    } catch (err) {
      console.error("Export PDF failed:", err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const shareImage = async (e) => {
    if (e) e.preventDefault();
    const score = Number.isFinite(Number(report?.overall_score)) ? Number(report.overall_score) : 0;
    const stars = Number.isFinite(Number(report?.star_rating)) ? Number(report.star_rating) : 0;
    const starsHTML = `<span style="font-size:16px;color:#6b7280;font-weight:600;">Rating: ${stars} / 5</span>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{margin:0;padding:0;background:#f8f4ff;font-family:-apple-system,sans-serif;}
      .card{width:600px;background:white;border-radius:24px;padding:40px;text-align:center;box-shadow:0 8px 40px rgba(108,99,255,0.1);}
      .stars{font-size:36px;margin-bottom:12px;}
      .score{font-size:80px;font-weight:900;color:#6c63ff;margin:8px 0 4px;}
      .out{color:#bbb;font-size:14px;margin-bottom:24px;}
      .feedback{background:linear-gradient(135deg,#f0edff,#e8f7ff);border-radius:16px;padding:20px;text-align:left;}
      .aria-label{font-weight:700;color:#6c63ff;font-size:14px;margin-bottom:8px;}
      .aria-text{color:#444;font-size:15px;line-height:1.6;margin:0;}
      .brand{margin-top:20px;color:#bbb;font-size:12px;font-weight:600;letter-spacing:0.05em;}
    </style></head><body>
    <div style="padding:32px;background:#f8f4ff;min-height:100vh;display:flex;align-items:center;justify-content:center;">
    <div class="card">
      <div class="stars">${starsHTML}</div>
      <div class="score">${score}</div>
      <div class="out">out of 100</div>
      <div class="feedback">
        <div class="aria-label">Aria feedback</div>
        <p class="aria-text">${report.summary}</p>
      </div>
      <div class="brand">InterviewAI • interview-prep-agent-lac.vercel.app</div>
    </div></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:700px;height:600px;border:none;";
    iframe.src = url;
    document.body.appendChild(iframe);
    await new Promise(r => setTimeout(r, 600));
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const cardEl = iframeDoc.querySelector(".card");
    const canvas = await html2canvas(cardEl, { scale: 2, backgroundColor: "#f8f4ff", useCORS: true, logging: false });
    document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob2) => {
      const u = URL.createObjectURL(blob2);
      const a = document.createElement("a");
      a.href = u; a.download = "interview-report-card.png"; a.click();
      URL.revokeObjectURL(u);
    });
  };

  const copyShareLink = async (e) => {
    if (e) e.preventDefault();
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      await navigator.clipboard.writeText(url);
      setShareToast("Share link copied!");
      setTimeout(() => setShareToast(""), 2800);
    } catch {
      setShareToast("Could not copy link");
      setTimeout(() => setShareToast(""), 2800);
    }
  };

  useEffect(() => {
    if (hasGradedRef.current) return;
    hasGradedRef.current = true;
    const grade = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        const res = await fetch("/api/grade-interview", {
          method: "POST",
          headers,
          body: JSON.stringify({
            answers: answerList,
            ...(typeof cvText === "string" && cvText.trim() ? { cv_text: cvText } : {}),
            ...(typeof jobDescription === "string" && jobDescription.trim() ? { job_description: jobDescription } : {}),
            ...(typeof jobTitle === "string" && jobTitle.trim() ? { job_title: jobTitle } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            res.status === 404
              ? messageForFailedApiResponse(res, data)
              : data?.error === "grading_failed"
                ? "Couldn’t grade this interview (AI error). Check OPENAI_API_KEY in .env.local, restart npm run dev:vite, and try again."
                : typeof data?.error === "string" && data.error
                  ? data.error
                  : res.statusText || "Failed to load report.";
          setError(msg);
          setLoading(false);
          return;
        }
        setReport(data);
        setLoading(false);
        saveSession(data, answerList);
        setTimeout(() => setVisible(true), 50);
        let count = 0;
        const scoreInterval = setInterval(() => {
          count += 2;
          const targetScore = Number.isFinite(Number(data?.overall_score)) ? Number(data.overall_score) : 0; setAnimatedScore(Math.min(count, targetScore));
          if (count >= targetScore) clearInterval(scoreInterval);
        }, 20);
        let s = 0;
        const starsInterval = setInterval(() => {
          s += 0.5;
          setAnimatedStars(s);
          const targetStars = Number.isFinite(Number(data?.star_rating)) ? Number(data.star_rating) : 0; if (s >= targetStars) clearInterval(starsInterval);
        }, 150);
        if (!hasSpokeRef.current && data?.grading_tier === "pro") {
          hasSpokeRef.current = true;
          setTimeout(() => speak(data.summary), 1000);
        }
      } catch (e) {
        setError("Failed to load report. Please try again.");
        setLoading(false);
      }
    };
    grade();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- grade once per report view; answers + CV/JD are stable when this screen opens
  }, []);

  const shellStyle = {
    minHeight: "100vh",
    background: PAGE_BG,
    fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative",
    overflowX: "hidden",
    color: "#e5e5e5",
  };

  if (loading) {
    return (
      <div style={{ ...shellStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`
          @keyframes ir-spin { to { transform: rotate(360deg); } }
          @keyframes ir-pulse-dot { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
        `}</style>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,.05) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />
          <div style={{ position: "absolute", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,.1) 0%, transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,.08) 0%, transparent 70%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: 48, maxWidth: 400 }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 24px",
              border: "3px solid rgba(124,58,237,.2)",
              borderTopColor: "#7c3aed",
              borderRadius: "50%",
              animation: "ir-spin 1s linear infinite",
            }}
          />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Grading your interview...</h2>
          <p style={{ fontSize: 14, color: "#555", margin: "0 0 20px" }}>This takes about 10 seconds</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#7c3aed",
                  animation: `ir-pulse-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...shellStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,.05) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: 48, maxWidth: 420 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 20, lineHeight: 1.45 }}>{error}</h2>
          <button
            type="button"
            onClick={onStartOver}
            style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "14px 24px",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 15,
              boxShadow: "0 6px 28px rgba(124,58,237,.28)",
            }}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const freeReport = report?.grading_tier === "free";
  const weakAnswers = freeReport ? [] : answerList.filter((a, i) => a.skipped || (report.question_grades?.[i]?.score < 6));
  const starDisplay = Math.min(5, Math.max(0, Math.round(animatedStars)));
  const answeredCount = answerList.filter((a) => !a.skipped).length;
  const skippedCount = answerList.filter((a) => a.skipped).length;
  const score100 = Math.max(0, Math.min(100, Number(animatedScore) || 0));
  const tier = scoreTier100(score100);
  const dashOffset = RING_DASH - (score100 / 100) * RING_DASH;
  const metaDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const metaJob = jobTitle || report?.job_title || "Interview";
  const metaCompany = "—";

  const overallForRec = Number.isFinite(Number(report?.overall_score)) ? Number(report.overall_score) : 0;
  const allSkipped = answerList.length > 0 && skippedCount === answerList.length;
  let recBody = "";
  if (allSkipped) {
    recBody = `You skipped <strong>${skippedCount} of ${answerList.length} questions</strong>. Practising those specific questions typically results in a <strong>25–40 point improvement</strong> on your next attempt.`;
  } else if (overallForRec < 40) {
    recBody = "Your answers need more depth and specific examples. Try the <strong>STAR method</strong> — Situation, Task, Action, Result.";
  } else if (overallForRec < 70) {
    recBody = "You're on the right track. Focus on your <strong>weakest questions</strong> to push past 70.";
  } else {
    recBody = "Excellent session. Keep practising to maintain <strong>consistency</strong> before your real interview.";
  }

  const gradId = `ir-ring-grad-${tier.key}`;

  return (
    <div style={shellStyle}>
      <style>{`
        @keyframes ir-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes ir-fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ir-spin { to { transform: rotate(360deg); } }
        .ir-metric-card { position: relative; overflow: hidden; }
        .ir-metric-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,.35), transparent);
          pointer-events: none;
        }
        .ir-aria-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,.45), transparent);
          pointer-events: none;
          z-index: 1;
        }
        .ir-aria-rec {
          position: relative;
          background: rgba(10, 6, 22, 0.92);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 14px;
          box-shadow: 0 0 32px rgba(124, 58, 237, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .ir-redo-row {
          position: relative;
          overflow: hidden;
          background: rgba(8, 5, 18, 0.92);
          border: 1px solid rgba(124, 58, 237, 0.28);
          border-radius: 12px;
          box-shadow: 0 0 22px rgba(124, 58, 237, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ir-redo-row:hover {
          border-color: rgba(167, 139, 250, 0.42);
          box-shadow: 0 0 28px rgba(124, 58, 237, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .ir-btn-shimmer { position: relative; overflow: hidden; }
        .ir-btn-shimmer::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
          transform: translateX(-100%);
          pointer-events: none;
        }
        .ir-btn-shimmer:hover::after { animation: ir-shimmer 0.85s ease; }
        .ir-complete-bar:hover {
          border-color: rgba(167, 139, 250, 0.35) !important;
          box-shadow: 0 4px 28px rgba(124, 58, 237, 0.12) !important;
        }
        .ir-q-row { transition: border-color 0.2s, background 0.2s; }
        .ir-q-row:hover {
          border-color: rgba(124,58,237,.2) !important;
          background: rgba(124,58,237,.04) !important;
        }
        @media (max-width: 767px) {
          .ir-hero-grid { grid-template-columns: 1fr !important; }
          .ir-hero-ring { order: -1; justify-self: center !important; }
          .ir-hero-text { order: 0; text-align: center !important; }
          .ir-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .ir-strength-grid { grid-template-columns: 1fr !important; }
          .ir-steps { flex-wrap: wrap; justify-content: center; }
          .ir-tool-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(124,58,237,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,.05) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div style={{ position: "absolute", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,.1) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,.08) 0%, transparent 70%)" }} />
      </div>

      {shareToast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 400,
            background: "rgba(17,24,39,0.95)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}
        >
          {shareToast}
        </div>
      ) : null}

      <div
        id="report-content"
        className="ir-main-fade"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: CONTENT_MAX,
          margin: "0 auto",
          padding: "44px 24px 56px",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease",
          animation: visible ? "ir-fadeUp 0.55s ease forwards" : "none",
        }}
      >
        {/* Step indicator */}
        <div className="ir-steps" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 36, gap: 0 }}>
          {[
            { done: true, label: "Content" },
            { done: true, label: "Interview" },
            { done: false, label: "Report", num: "3" },
          ].map((step, idx) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    margin: "0 auto 6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: step.done ? 14 : 13,
                    fontWeight: 800,
                    color: "#fff",
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    boxShadow: step.done ? "0 0 12px rgba(124,58,237,.35)" : "0 0 16px rgba(124,58,237,.5)",
                  }}
                >
                  {step.done ? "✓" : step.num}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: step.done ? "#a78bfa" : "#c4b5fd" }}>{step.label}</div>
              </div>
              {idx < 2 && (
                <div
                  style={{
                    width: 44,
                    height: 1,
                    margin: "0 8px",
                    marginBottom: 22,
                    background: "linear-gradient(90deg,rgba(124,58,237,.4),rgba(124,58,237,.15))",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Hero */}
        <div className="ir-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 28, alignItems: "center", marginBottom: 28 }}>
          <div className="ir-hero-text" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#333", marginBottom: 10 }}>
              Interview Report
            </div>
            <h1 style={{ margin: 0, lineHeight: 1.05 }}>
              <span style={{ display: "block", fontSize: 38, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>Your</span>
              <span
                style={{
                  display: "block",
                  fontSize: 38,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  background: "linear-gradient(135deg,#a78bfa,#7c3aed)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Score Report
              </span>
            </h1>
            <p style={{ fontSize: 13, color: "#444", margin: "14px 0 0", lineHeight: 1.5 }}>
              {metaJob} · {metaCompany} · {metaDate}
            </p>
            {jobId ? (
              <button
                type="button"
                onClick={() => { if (typeof window !== "undefined") window.location.hash = ""; /* parent app uses screen state — link to jobs via in-app nav not available here */ }}
                style={{
                  marginTop: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#6d28d9",
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" />
                </svg>
                View in Job Tracker
              </button>
            ) : null}
          </div>

          <div className="ir-hero-ring" style={{ justifySelf: "end" }}>
            <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: "rotate(-90deg)", display: "block" }} aria-hidden>
              <defs>
                <linearGradient id={`${gradId}-r`} x1="0%" y1="0%" x2="100%" y2="100%">
                  {tier.key === "low" && (<><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#dc2626" /></>)}
                  {tier.key === "mid" && (<><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></>)}
                  {tier.key === "high" && (<><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" /></>)}
                </linearGradient>
              </defs>
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke={tier.track} strokeWidth={RING_STROKE} />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={`url(#${gradId}-r)`}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_DASH}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div
              style={{
                position: "relative",
                marginTop: -RING_SIZE,
                height: RING_SIZE,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div style={{ fontSize: 42, fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{Math.round(animatedScore)}</div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", marginTop: 2 }}>/ 100</div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: tier.badgeColor, marginTop: 6 }}>
                {tier.badgeText}
              </div>
            </div>
          </div>
        </div>

        {!freeReport ? (
          <>
        {/* Metrics */}
        <div className="ir-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { v: answeredCount, l: "Questions answered" },
            { v: skippedCount, l: "Skipped" },
            { v: `${starDisplay}★`, l: "Star rating" },
            { v: totalSessions != null ? String(totalSessions) : "—", l: "Total sessions" },
          ].map((m) => (
            <div key={m.l} className="ir-metric-card" style={{ background: "rgba(124,58,237,.05)", border: "1px solid rgba(124,58,237,.1)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{m.v}</div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>{m.l}</div>
            </div>
          ))}
        </div>
          </>
        ) : (
          <div
            style={{
              marginBottom: 22,
              padding: "16px 18px",
              borderRadius: 14,
              border: "1px solid rgba(167,139,250,0.35)",
              background: "rgba(124,58,237,0.08)",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#e9d5ff", marginBottom: 8 }}>Free plan — overall score only</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
              Upgrade to Pro for per-question scores, strengths, ideal answers, PDF export, and read-aloud on mock interviews.
            </p>
            {onOpenUpgrade ? (
              <button
                type="button"
                onClick={onOpenUpgrade}
                style={{
                  marginTop: 12,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                  color: "#fff",
                }}
              >
                View Pro
              </button>
            ) : null}
          </div>
        )}

        {/* Aria feedback card */}
        <div className="ir-aria-card" style={{ position: "relative", background: "rgba(8,3,18,.9)", border: "1px solid rgba(124,58,237,.12)", borderRadius: 18, padding: 22, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setAriaPanelTab("feedback")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: ariaPanelTab === "feedback" ? "1px solid rgba(124,58,237,.25)" : "1px solid transparent",
                background: ariaPanelTab === "feedback" ? "rgba(124,58,237,.18)" : "transparent",
                color: ariaPanelTab === "feedback" ? "#a78bfa" : "#333",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Aria feedback
            </button>
            {isPro ? (
            <button
              type="button"
              onClick={() => {
                setAriaPanelTab("replay");
                speak(report.summary);
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: ariaPanelTab === "replay" ? "1px solid rgba(124,58,237,.25)" : "1px solid transparent",
                background: ariaPanelTab === "replay" ? "rgba(124,58,237,.18)" : "transparent",
                color: ariaPanelTab === "replay" ? "#a78bfa" : "#333",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Replay audio
            </button>
            ) : null}
          </div>
          {ariaPanelTab === "feedback" || !isPro ? (
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.8, margin: 0 }}>{report.summary}</p>
          ) : (
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, margin: 0 }}>
              Press <strong style={{ color: "#777", fontWeight: 600 }}>Replay audio</strong> above to hear Aria read your summary again.
            </p>
          )}
        </div>

        {!freeReport ? (
        <>
        {/* Strengths & improvements */}
        <div className="ir-strength-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          <div style={{ background: "rgba(16,185,129,.04)", border: "1px solid rgba(16,185,129,.12)", borderLeft: "2px solid #10b981", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#10b981", marginBottom: 12 }}>What you did well</div>
            {(Array.isArray(report.strengths) ? report.strengths : []).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", marginTop: 6, flexShrink: 0 }} />
                <span style={{ color: "#666", fontSize: 12, lineHeight: 1.55 }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(245,158,11,.04)", border: "1px solid rgba(245,158,11,.12)", borderLeft: "2px solid #f59e0b", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#f59e0b", marginBottom: 12 }}>Areas to improve</div>
            {(Array.isArray(report.improvements) ? report.improvements : []).map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", marginTop: 6, flexShrink: 0 }} />
                <span style={{ color: "#666", fontSize: 12, lineHeight: 1.55 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Question breakdown */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#333", marginBottom: 10 }}>Question breakdown</div>
          <div style={{ height: 1, background: "rgba(255,255,255,.04)", marginBottom: 12 }} />
        </div>

        {(Array.isArray(report.question_grades) ? report.question_grades : []).map((q, i) => {
          const isSkipped = q.skipped || answerList[i]?.skipped;
          const pill = pillStyleForQuestion(q.score, isSkipped);
          return (
            <div
              key={i}
              className="ir-q-row"
              style={{
                background: "rgba(8,3,18,.7)",
                border: "1px solid rgba(255,255,255,.05)",
                borderRadius: 13,
                marginBottom: 7,
                overflow: "hidden",
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveQ(activeQ === i ? null : i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveQ(activeQ === i ? null : i); } }}
                style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, userSelect: "none" }}
              >
                <span style={{ background: pill.bg, color: pill.color, border: pill.border, borderRadius: 999, padding: "5px 10px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {pill.text}
                </span>
                <span style={{ fontSize: 12, color: "#555", flex: 1, lineHeight: 1.4, minWidth: 0 }}>{q.question || answerList[i]?.question || `Question ${i + 1}`}</span>
                <span style={{ color: "#2a2a3a", fontSize: 16, flexShrink: 0 }}>›</span>
              </div>
              {activeQ === i && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "12px 16px 16px" }}>
                  {isSkipped ? (
                    <div style={{ color: "#ef4444", fontWeight: 600, fontSize: 13 }}>This question was skipped</div>
                  ) : (
                    <>
                      <div style={{ background: "rgba(8,3,18,.85)", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid rgba(255,255,255,.05)" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#444", marginBottom: 6 }}>Your answer</div>
                        <p style={{ color: "#666", fontSize: 12, lineHeight: 1.65, margin: 0 }}>{q.answer_given || answerList[i]?.answer || "No answer recorded"}</p>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
                        <div style={{ background: "rgba(8,3,18,.85)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,.05)" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: "#10b981", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>What was good</div>
                          <p style={{ color: "#666", fontSize: 12, lineHeight: 1.55, margin: 0 }}>{(q.what_was_good || q.feedback || "")}</p>
                        </div>
                        <div style={{ background: "rgba(8,3,18,.85)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,.05)" }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: "#f59e0b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>What to improve</div>
                          <p style={{ color: "#666", fontSize: 12, lineHeight: 1.55, margin: 0 }}>{(q.what_to_improve || "")}</p>
                        </div>
                      </div>
                      <div style={{ background: "rgba(8,3,18,.85)", borderRadius: 10, padding: 14, border: "1px solid rgba(124,58,237,.12)" }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Ideal answer</div>
                        <p style={{ color: "#666", fontSize: 12, lineHeight: 1.55, margin: 0 }}>{(q.ideal_answer || "")}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </>
        ) : null}

        {/* Next steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "36px 0 18px" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} />
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)" }}>Next steps</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} />
        </div>

        <div className="ir-aria-rec" style={{ display: "flex", gap: 14, padding: "15px 18px", marginBottom: 16, alignItems: "flex-start" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(124,58,237,0.45)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="#f5f3ff" strokeWidth="1.65" />
              <path d="M12 7.5V12l3.5 2" stroke="#f5f3ff" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", marginBottom: 6 }}>Aria&apos;s recommendation</div>
            <p style={{ fontSize: 12, color: "#e5e7eb", lineHeight: 1.6, margin: 0 }} dangerouslySetInnerHTML={{ __html: recBody.replace(/<strong>/g, "<strong style=\"color:#ffffff;font-weight:700\">") }} />
          </div>
        </div>

        {weakAnswers.length > 0 && (
          <button
            type="button"
            className="ir-redo-row ir-btn-shimmer"
            onClick={() => onRetryWeak(weakAnswers)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              color: "#fff",
              padding: "16px 20px",
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: 12,
            }}
          >
            <div style={{ textAlign: "left", position: "relative", zIndex: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Redo weak &amp; skipped questions</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>Targeted practice on your lowest scoring areas</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 2 }}>
              <span
                style={{
                  background: "rgba(239,68,68,0.22)",
                  border: "1px solid rgba(248,113,113,0.5)",
                  color: "#fecaca",
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                {weakAnswers.length} {weakAnswers.length === 1 ? "question" : "questions"}
              </span>
              <span style={{ fontSize: 18, color: "#ffffff", fontWeight: 300 }} aria-hidden>›</span>
            </div>
          </button>
        )}

        <button
          type="button"
          className="ir-redo-row ir-btn-shimmer"
          onClick={onRetry}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            color: "#fff",
            padding: "16px 20px",
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 14,
          }}
        >
          <div style={{ textAlign: "left", position: "relative", zIndex: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Redo full interview</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>Start fresh with the same role &amp; questions</div>
          </div>
          <span style={{ fontSize: 18, color: "#ffffff", fontWeight: 300, position: "relative", zIndex: 2 }} aria-hidden>›</span>
        </button>

        <div className="ir-tool-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {[
            {
              label: isPro ? "Export PDF" : "PDF · Pro",
              icon: "pdf",
              onClick: (ev) => {
                if (!isPro) {
                  onOpenUpgrade?.();
                  return;
                }
                exportPDF(ev);
              },
              disabled: pdfGenerating,
              dim: !isPro,
            },
            { label: "Save image", icon: "img", onClick: shareImage, disabled: false, dim: false },
            { label: "Share report", icon: "share", onClick: copyShareLink, disabled: false, dim: false },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              disabled={t.disabled}
              onClick={t.onClick}
              className="ir-tool-btn"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "14px 10px",
                cursor: t.disabled ? "wait" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                opacity: t.disabled ? 0.7 : t.dim ? 0.65 : 1,
              }}
            >
              <div className="ir-tool-ic" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                {t.icon === "pdf" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M12 18V9M9 12l3 3 3-3" />
                  </svg>
                )}
                {t.icon === "img" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                )}
                {t.icon === "share" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
                  </svg>
                )}
              </div>
              <span className="ir-tool-lbl" style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{t.disabled && isPro && t.icon === "pdf" ? "Generating…" : t.label}</span>
            </button>
          ))}
        </div>
        <style>{`
          .ir-tool-btn:hover:not(:disabled) {
            border-color: rgba(124,58,237,.2) !important;
            background: rgba(124,58,237,.04) !important;
          }
          .ir-tool-btn:hover:not(:disabled) .ir-tool-lbl { color: #a78bfa !important; }
          .ir-tool-btn:hover:not(:disabled) .ir-tool-ic { color: #c4b5fd !important; }
        `}</style>

        <button
          type="button"
          aria-label="Mark session complete"
          onClick={() => onComplete(report?.overall_score)}
          className="ir-complete-bar ir-btn-shimmer"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            background: "rgba(12, 10, 22, 0.95)",
            color: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "16px 18px",
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 12,
            boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1.45, textAlign: "left", position: "relative", zIndex: 2 }}>
            Save to history and return to dashboard
          </span>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 20px rgba(124,58,237,0.45)",
              position: "relative",
              zIndex: 2,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
          <button
            type="button"
            onClick={onStartOver}
            style={{
              width: "auto",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff",
              borderRadius: 999,
              padding: "12px 28px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            Start over with new resume
          </button>
        </div>
      </div>

      <div id="report-card" style={{ position: "absolute", left: -9999, opacity: 0, pointerEvents: "none", width: 1, height: 1 }} aria-hidden />
    </div>
  );
}
