import { useState, useRef, useId } from "react";
import { btnPrimary, btnPrimaryHover } from "./candidateUi.jsx";

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

function MicIcon({ size = 22, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WaveformArt({ gradientId }) {
  const gid = gradientId || "wf";
  return (
    <svg viewBox="0 0 320 100" style={{ width: "100%", maxWidth: 320, height: "auto", display: "block" }} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <path
        d="M0,52 Q40,28 80,52 T160,52 T240,52 T320,52"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M0,62 Q50,42 100,62 T200,62 T320,62"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="1"
        opacity="0.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

const primaryGlowHover = {
  onMouseEnter: (e) => {
    if (e.currentTarget.disabled) return;
    e.currentTarget.style.filter = "brightness(1.05)";
    e.currentTarget.style.boxShadow = "0 10px 36px rgba(124, 58, 237, 0.45)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.filter = "brightness(1)";
    e.currentTarget.style.boxShadow = "0 8px 28px rgba(124, 58, 237, 0.35)";
  },
};

const lab = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9ca3af",
};

const glassPanel = {
  borderRadius: "18px",
  background: "rgba(16, 12, 32, 0.58)",
  border: "1px solid rgba(139, 92, 246, 0.22)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

function FlowShell({ children }) {
  return (
    <div
      className="flow-dark-shell"
      style={{
        minHeight: "100dvh",
        fontFamily: FH.font,
        color: FH.text,
        position: "relative",
        boxSizing: "border-box",
        colorScheme: "dark",
        isolation: "isolate",
        background: "linear-gradient(165deg, #030008 0%, #0a0618 38%, #000000 100%)",
        paddingBottom: "48px",
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
        @keyframes mi-gridPulse { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.58; } }
        .mi-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: mi-gridPulse 8s ease-in-out infinite;
        }
        .mi-title-grad {
          font-size: clamp(1.65rem, 4vw, 2.1rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0 0 12px;
          line-height: 1.15;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 40%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes mi-gradShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes mi-shimmerSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        .mi-footer-row {
          display: flex;
          gap: 12px;
          align-items: stretch;
          flex-wrap: nowrap;
          margin-top: 8px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .mi-btn-skip {
          flex: 0 0 auto;
          min-width: 108px;
          padding: 14px 20px;
          border-radius: 14px;
          background: rgba(8, 3, 18, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-weight: 700;
          font-size: 15px;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .mi-btn-skip:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(167, 139, 250, 0.35);
        }
        .mi-btn-next {
          position: relative;
          overflow: hidden;
          flex: 1 1 0;
          min-width: 0;
          min-height: 52px;
          padding: 16px 22px;
          border-radius: 14px;
          border: none;
          color: #ffffff;
          font-weight: 800;
          font-size: 15px;
          font-family: inherit;
          cursor: pointer;
          background: linear-gradient(135deg, #7c3aed, #5b21b6, #4f46e5);
          background-size: 200% 200%;
          animation: mi-gradShift 4s ease infinite;
          box-shadow: 0 6px 28px rgba(124, 58, 237, 0.35);
          transition: box-shadow 0.2s, filter 0.2s;
        }
        .mi-btn-next::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
          pointer-events: none;
          z-index: 1;
        }
        .mi-btn-next::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 45%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transform: translateX(-100%);
          pointer-events: none;
        }
        .mi-btn-next:hover::after {
          animation: mi-shimmerSweep 0.85s ease;
        }
        .mi-btn-next:hover {
          filter: brightness(1.06);
          box-shadow: 0 10px 36px rgba(124, 58, 237, 0.48);
        }
        @media (max-width: 520px) {
          .mi-footer-row { flex-direction: column; }
          .mi-btn-skip { width: 100%; min-width: 0; }
          .mi-btn-next { width: 100%; }
        }
      `}</style>
      <div className="mi-page-grid" aria-hidden />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

function resolvePerQuestionSeconds(d) {
  const prefs = d?.session_preferences;
  const fromPrefs = prefs && Object.prototype.hasOwnProperty.call(prefs, "seconds_per_question");
  const s = fromPrefs ? prefs.seconds_per_question : d?.seconds_per_question;
  if (s === 0 || s === "0") return 0;
  if (s == null || s === "") return 30;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 30;
  return n;
}

export default function MockInterview({ data, jobTitle, onFinish, voiceReadAloud = true }) {
  const questions = data?.interview_questions || [];
  const perQuestionSec = resolvePerQuestionSeconds(data);
  const timerEnabled = perQuestionSec > 0;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState("intro");
  const [answer, setAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const answersRef = useRef([]);
  const answerRef = useRef("");
  const finishedRef = useRef(false);
  const currentIndexRef = useRef(0);
  const isTypingRef = useRef(false);
  const isDoneRef = useRef(false);
  const wfGradId = useId().replace(/:/g, "");

  const currentQ = questions[currentIndex];

  const stopSpeaking = () => window.speechSynthesis.cancel();

  const speak = (text) => new Promise((resolve) => {
    if (!voiceReadAloud) {
      resolve();
      return;
    }
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1.1;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Karen") ||
      v.name.includes("Zira") || v.name.includes("Victoria") ||
      v.name.includes("Susan") || v.name.includes("Moira")
    );
    if (female) utter.voice = female;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
    setTimeout(resolve, 10000);
  });

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    stopListening();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    const answerBeforeMic = answerRef.current;
    r.onresult = (e) => {
      const finals = Array.from(e.results).filter(x => x.isFinal).map(x => x[0].transcript).join(" ");
      const interim = Array.from(e.results).filter(x => !x.isFinal).map(x => x[0].transcript).join(" ");
      const speech = finals || interim;
      const combined = answerBeforeMic ? answerBeforeMic.trimEnd() + " " + speech : speech;
      setAnswer(combined);
      answerRef.current = combined;
    };
    r.onerror = () => {};
    try { r.start(); recognitionRef.current = r; setIsListening(true); } catch {}
  };

  const startTimer = (index, startSeconds = 30) => {
    if (startSeconds <= 0) return;
    clearInterval(timerRef.current);
    setShowWarning(false);
    let seconds = startSeconds;
    setTimeLeft(startSeconds);
    timerRef.current = setInterval(() => {
      if (isDoneRef.current) { clearInterval(timerRef.current); return; }
      seconds -= 1;
      setTimeLeft(seconds);
      if (seconds === 10 && startSeconds > 0) {
        setShowWarning(true);
        stopListening();
        if (voiceReadAloud) speak("10 seconds remaining. Would you like more time?");
      }
      if (seconds <= 0) {
        clearInterval(timerRef.current);
        submitAnswer(false, index);
      }
    }, 1000);
  };

  const beginQuestion = (index) => {
    if (isDoneRef.current) return;
    stopSpeaking();
    clearInterval(timerRef.current);
    stopListening();
    currentIndexRef.current = index;
    setCurrentIndex(index);
    setAnswer("");
    answerRef.current = "";
    isTypingRef.current = false;
    setShowWarning(false);
    setTimeLeft(30);
    if (!voiceReadAloud) {
      setPhase("answering");
      startTimer(index);
      return;
    }

    setPhase("speaking");

    const utter = new SpeechSynthesisUtterance(questions[index].question);
    utter.rate = 0.92;
    utter.pitch = 1.1;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Karen") ||
      v.name.includes("Zira") || v.name.includes("Victoria") ||
      v.name.includes("Susan") || v.name.includes("Moira")
    );
    if (female) utter.voice = female;
    utter.onend = () => {
      if (isDoneRef.current) return;
      setPhase("answering");
      if (timerEnabled) startTimer(index, perQuestionSec);
    };
    utter.onerror = () => {
      if (isDoneRef.current) return;
      setPhase("answering");
      if (timerEnabled) startTimer(index, perQuestionSec);
    };
    setTimeout(() => {
      if (isDoneRef.current) return;
      setPhase(p => p === "speaking" ? "answering" : p);
    }, 15000);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const submitAnswer = (skipped, indexOverride) => {
    if (isDoneRef.current) return;
    stopSpeaking();
    clearInterval(timerRef.current);
    stopListening();
    const idx = indexOverride !== undefined ? indexOverride : currentIndexRef.current;
    const q = questions[idx];
    answersRef.current.push({
      question: q.question,
      type: q.type,
      answer: skipped ? "" : answerRef.current,
      skipped,
      targets: q.targets,
      reason: q.reason,
    });
    const nextIndex = idx + 1;
    if (nextIndex >= questions.length) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      isDoneRef.current = true;
      setPhase("finished");
      onFinish([...answersRef.current], jobTitle);
    } else {
      beginQuestion(nextIndex);
    }
  };

  const addTime = () => {
    if (!timerEnabled) return;
    setShowWarning(false);
    const newTime = timeLeft + 30;
    startTimer(currentIndexRef.current, newTime);
  };

  const toggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleTyping = (e) => {
    isTypingRef.current = true;
    setAnswer(e.target.value);
    answerRef.current = e.target.value;
    clearTimeout(window._typingTimeout);
    window._typingTimeout = setTimeout(() => { isTypingRef.current = false; }, 2000);
  };

  const timerColor =
    !timerEnabled || timeLeft < 0
      ? "#6b7280"
      : timeLeft > 15
        ? "#10b981"
        : timeLeft > 8
          ? "#eab308"
          : "#ef4444";
  const circumference = 2 * Math.PI * 45;
  const timerTotal = perQuestionSec > 0 ? perQuestionSec : 30;
  const strokeDash =
    timerEnabled && timeLeft >= 0 ? Math.max(0, (timeLeft / timerTotal) * circumference) : 0;
  const nq = Math.max(questions.length, 1);
  const progressPct = (currentIndex / nq) * 100;

  if (phase === "intro") {
    const hasQuestions = questions.length > 0;
    return (
      <FlowShell>
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(28px, 5vw, 48px) 16px 48px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "40px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: "1 1 360px", maxWidth: "580px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8b8b9b", margin: "0 0 10px" }}>
                {voiceReadAloud ? "Voice session" : "Text session"}
              </p>
              <h1 className="mi-title-grad">Practice with Aria</h1>
              <p style={{ color: FH.muted, fontSize: "16px", lineHeight: 1.65, margin: "0 0 12px" }}>
                Trained on patterns from thousands of real interviews — Aria coaches you toward clear, confident answers.
              </p>
              <p style={{ color: FH.dim, fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                {voiceReadAloud ? (
                  timerEnabled ? (
                    <>
                      Each question is read aloud. You have <strong style={{ color: "#d4d4d8" }}>{perQuestionSec} seconds</strong> per
                      answer — speak or type.
                    </>
                  ) : (
                    <>
                      Each question is read aloud. <strong style={{ color: "#d4d4d8" }}>No per-question timer</strong> — go at your own
                      pace (mic or type).
                    </>
                  )
                ) : timerEnabled ? (
                  <>Questions on screen (Free: no read-aloud). <strong style={{ color: "#d4d4d8" }}>{perQuestionSec}s</strong> per answer unless you turned the timer off.</>
                ) : (
                  <>Questions on screen. <strong style={{ color: "#d4d4d8" }}>No auto timer</strong> — use Next when you are ready.</>
                )}
              </p>
            </div>
            <div style={{ flex: "0 1 280px", opacity: 0.92 }}>
              <WaveformArt gradientId={wfGradId} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              marginTop: "40px",
              marginBottom: "32px",
              maxWidth: "640px",
            }}
          >
            {[
              [`${questions.length}`, "Questions"],
              [timerEnabled ? `${perQuestionSec}s` : "—", "Per answer"],
              ["2", "Input modes"],
            ].map(([a, b]) => (
              <div
                key={b}
                style={{
                  textAlign: "center",
                  padding: "18px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(20, 20, 24, 0.9)",
                }}
              >
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#f4f4f5", letterSpacing: "-0.03em" }}>{a}</div>
                <div style={{ fontSize: "11px", color: FH.dim, marginTop: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {b}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => beginQuestion(0)}
              disabled={!hasQuestions}
              style={{
                ...btnPrimary,
                padding: "14px 48px",
                fontSize: "16px",
                fontWeight: 700,
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
                boxShadow: "0 8px 28px rgba(124, 58, 237, 0.35)",
                opacity: hasQuestions ? 1 : 0.5,
                cursor: hasQuestions ? "pointer" : "not-allowed",
              }}
              {...primaryGlowHover}
            >
              Start session
            </button>
            {!hasQuestions && (
              <p style={{ color: FH.dim, fontSize: "13px", marginTop: "14px" }}>No questions loaded. Go back and generate your prep pack first.</p>
            )}
          </div>
        </div>
      </FlowShell>
    );
  }

  if (phase === "finished") {
    return (
      <FlowShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: "48px 16px" }}>
          <div style={{ textAlign: "center" }}>
            <div className="candidate-spinner" style={{ margin: "0 auto 24px" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: FH.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Interview complete</h1>
            <p style={{ color: FH.muted, fontSize: "15px", margin: 0 }}>Grading your answers…</p>
          </div>
        </div>
      </FlowShell>
    );
  }

  return (
    <FlowShell>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                border: "1px solid rgba(139, 92, 246, 0.35)",
                background: "rgba(124, 58, 237, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MicIcon size={20} color="#c4b5fd" />
            </div>
            <span style={{ fontWeight: 800, color: FH.text, fontSize: "16px", letterSpacing: "-0.02em" }}>Aria</span>
          </div>
          <span style={{ color: FH.dim, fontSize: "14px", fontWeight: 600 }}>
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "10px", height: "8px", marginBottom: "24px", overflow: "hidden" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              borderRadius: "10px",
              height: "100%",
              width: `${progressPct}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        <div className="candidate-card-hover" style={{ ...glassPanel, padding: "28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px", position: "relative" }}>
            <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }} aria-hidden>
              <circle cx="55" cy="55" r="45" fill="none" stroke="#3f3f46" strokeWidth="8" />
              <circle
                cx="55"
                cy="55"
                r="45"
                fill="none"
                stroke={timerColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - strokeDash}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              {timerEnabled && timeLeft >= 0 ? (
                <>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: timerColor }}>{timeLeft}</div>
                  <div style={{ fontSize: "11px", color: FH.dim, fontWeight: 600 }}>SEC</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#a1a1aa" }}>∞</div>
                  <div style={{ fontSize: "10px", color: FH.dim, fontWeight: 600 }}>open</div>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span
              style={{
                display: "inline-block",
                background: "rgba(124, 58, 237, 0.15)",
                color: "#d8b4fe",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "1px solid rgba(139, 92, 246, 0.2)",
              }}
            >
              {currentQ?.type}
            </span>
          </div>

          <p style={{ fontSize: "18px", fontWeight: 600, color: FH.text, textAlign: "center", lineHeight: 1.55, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
            {currentQ?.question}
          </p>

          {phase === "speaking" && (
            <div
              style={{
                textAlign: "center",
                color: "#d8b4fe",
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "16px",
                padding: "12px 14px",
                background: "rgba(124, 58, 237, 0.12)",
                borderRadius: "10px",
                border: "1px solid rgba(139, 92, 246, 0.22)",
              }}
            >
              Aria is reading the question…
            </div>
          )}

          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <span style={lab}>Your answer</span>
              <button
                type="button"
                onClick={toggleMic}
                style={{
                  ...btnPrimary,
                  padding: "8px 16px",
                  fontSize: "13px",
                  background: isListening ? "#dc2626" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                }}
                {...btnPrimaryHover}
              >
                {isListening ? "Stop mic" : "Start mic"}
              </button>
            </div>
            <textarea
              className="candidate-input"
              value={answer}
              onChange={handleTyping}
              placeholder="Use the mic or type your answer…"
              style={{
                width: "100%",
                minHeight: "120px",
                resize: "vertical",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "15px",
                fontFamily: FH.font,
                outline: "none",
                boxSizing: "border-box",
                background: isListening ? "rgba(124, 58, 237, 0.12)" : undefined,
                borderColor: isListening ? "rgba(167, 139, 250, 0.45)" : undefined,
              }}
            />
          </div>

          {showWarning && timerEnabled && (
            <div
              style={{
                background: "rgba(113, 63, 18, 0.35)",
                border: "1px solid rgba(251, 191, 36, 0.35)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#fde68a", fontWeight: 700, margin: "0 0 12px" }}>10 seconds left</p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={addTime} style={{ ...btnPrimary, background: "#ca8a04", color: "#fffbeb", boxShadow: "none" }} {...btnPrimaryHover}>
                  +30 seconds
                </button>
                <button type="button" onClick={() => submitAnswer(false)} style={btnPrimary} {...btnPrimaryHover}>
                  Submit now
                </button>
              </div>
            </div>
          )}

          <div className="mi-footer-row">
            <button type="button" className="mi-btn-skip" onClick={() => submitAnswer(true)}>
              Skip
            </button>
            <button type="button" className="mi-btn-next" onClick={() => submitAnswer(false)}>
              <span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%" }}>
                <span style={{ flex: 1, textAlign: "center" }}>
                  {currentIndex + 1 >= questions.length ? "Finish interview" : "Next question"}
                </span>
                <span style={{ fontSize: 20, fontWeight: 300, opacity: 0.95, flexShrink: 0 }} aria-hidden>
                  ›
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </FlowShell>
  );
}
