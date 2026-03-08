import { useState, useRef } from "react";

export default function MockInterview({ data, onFinish }) {
  const questions = data?.interview_questions || [];
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

  const currentQ = questions[currentIndex];

  const stopSpeaking = () => window.speechSynthesis.cancel();

  const speak = (text) => new Promise((resolve) => {
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
    // Fallback: if speech hasn't ended in 10s, resolve anyway
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
    r.onresult = (e) => {
      if (isTypingRef.current) return;
      const t = Array.from(e.results).map(x => x[0].transcript).join("");
      setAnswer(t);
      answerRef.current = t;
    };
    r.onerror = () => {};
    try { r.start(); recognitionRef.current = r; setIsListening(true); } catch {}
  };

  const startTimer = (index, startSeconds = 30) => {
    clearInterval(timerRef.current);
    setShowWarning(false);
    let seconds = startSeconds;
    setTimeLeft(startSeconds);
    timerRef.current = setInterval(() => {
      if (isDoneRef.current) { clearInterval(timerRef.current); return; }
      seconds -= 1;
      setTimeLeft(seconds);
      if (seconds === 10) {
        setShowWarning(true);
        stopListening();
        speak("10 seconds remaining. Would you like more time?");
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
    setPhase("speaking");

    // Speak immediately (synchronous start = user gesture context)
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
      startTimer(index);
    };
    utter.onerror = () => {
      if (isDoneRef.current) return;
      setPhase("answering");
      startTimer(index);
    };
    // Fallback if onend never fires
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
      onFinish([...answersRef.current]);
    } else {
      beginQuestion(nextIndex);
    }
  };

  const addTime = () => {
    setShowWarning(false);
    const newTime = timeLeft + 30;
    startTimer(currentIndexRef.current, newTime);
    startListening();
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

  const timerColor = timeLeft > 15 ? "#4ecdc4" : timeLeft > 8 ? "#ffd93d" : "#ff6b6b";
  const circumference = 2 * Math.PI * 45;
  const strokeDash = Math.max(0, (timeLeft / 30) * circumference);

  if (phase === "intro") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: "500px", padding: "2rem" }}>
        <div style={{ width: "100px", height: "100px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", margin: "0 auto 2rem" }}>🎙️</div>
        <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f", marginBottom: "1rem" }}>Meet Aria</h1>
        <p style={{ color: "#666", fontSize: "1.1rem", lineHeight: "1.7", marginBottom: "2rem" }}>Your AI interview coach. I'll read each question aloud — you have <strong>30 seconds</strong> to answer. Speak or type your answer.</p>
        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[["🎯", `${questions.length} Questions`], ["⏱️", "30s Per Question"], ["🎤", "Voice + Text"]].map(([e, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem" }}>{e}</div>
                <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.3rem" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => beginQuestion(0)} style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "30px", padding: "1rem 3rem", fontWeight: "800", fontSize: "1.1rem", cursor: "pointer", boxShadow: "0 8px 30px rgba(108,99,255,0.3)" }}>
          Start Interview 🚀
        </button>
      </div>
    </div>
  );

  if (phase === "finished") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏆</div>
        <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "#1e3a5f" }}>Interview Complete!</h1>
        <p style={{ color: "#666", marginTop: "1rem" }}>Aria is grading your answers...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", fontFamily: "sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>🎙️</div>
            <span style={{ fontWeight: "800", color: "#1e3a5f" }}>Aria</span>
          </div>
          <span style={{ color: "#888", fontSize: "0.9rem" }}>Question {currentIndex + 1} of {questions.length}</span>
        </div>

        <div style={{ background: "#e8e0ff", borderRadius: "10px", height: "8px", marginBottom: "2rem" }}>
          <div style={{ background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", borderRadius: "10px", height: "100%", width: `${(currentIndex / questions.length) * 100}%`, transition: "width 0.5s ease" }} />
        </div>

        <div style={{ background: "white", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 8px 40px rgba(108,99,255,0.1)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem", position: "relative" }}>
            <svg width="110" height="110" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="55" cy="55" r="45" fill="none" stroke="#f0ebff" strokeWidth="8" />
              <circle cx="55" cy="55" r="45" fill="none" stroke={timerColor} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={circumference - strokeDash}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
            </svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: "900", color: timerColor }}>{timeLeft}</div>
              <div style={{ fontSize: "0.7rem", color: "#aaa" }}>seconds</div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <span style={{ background: "#ede9ff", color: "#6c63ff", borderRadius: "20px", padding: "0.3rem 0.8rem", fontSize: "0.8rem", fontWeight: "700" }}>{currentQ?.type}</span>
          </div>

          <p style={{ fontSize: "1.2rem", fontWeight: "600", color: "#1e3a5f", textAlign: "center", lineHeight: "1.6", margin: "0 0 1.5rem" }}>{currentQ?.question}</p>

          {phase === "speaking" && (
            <div style={{ textAlign: "center", color: "#6c63ff", fontSize: "0.85rem", fontWeight: "700", marginBottom: "1rem", padding: "0.5rem", background: "#f0edff", borderRadius: "8px" }}>
              🎙️ Aria is reading the question...
            </div>
          )}

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#888" }}>Your answer</span>
              <button onClick={toggleMic} style={{ background: isListening ? "#ff6b6b" : "#4ecdc4", color: "white", border: "none", borderRadius: "20px", padding: "0.3rem 0.9rem", fontWeight: "700", cursor: "pointer", fontSize: "0.8rem" }}>
                {isListening ? "⏹ Stop Mic" : "🎤 Start Mic"}
              </button>
            </div>
            <textarea
              value={answer}
              onChange={handleTyping}
              placeholder="Click 'Start Mic' to speak, or type your answer here..."
              style={{ width: "100%", minHeight: "100px", padding: "1rem", border: `2px solid ${isListening ? "#4ecdc4" : "#e8e0ff"}`, borderRadius: "12px", fontSize: "0.95rem", lineHeight: "1.6", fontFamily: "sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box", background: isListening ? "#f0fff4" : "#faf8ff", color: "#333" }}
            />
          </div>

          {showWarning && (
            <div style={{ background: "#fff9e6", border: "2px solid #ffd93d", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", textAlign: "center" }}>
              <p style={{ color: "#b8860b", fontWeight: "700", margin: "0 0 0.75rem" }}>⚠️ 10 seconds left!</p>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button onClick={addTime} style={{ background: "#ffd93d", color: "#1e3a5f", border: "none", borderRadius: "20px", padding: "0.5rem 1.5rem", fontWeight: "700", cursor: "pointer" }}>+30 Seconds</button>
                <button onClick={() => submitAnswer(false)} style={{ background: "#6c63ff", color: "white", border: "none", borderRadius: "20px", padding: "0.5rem 1.5rem", fontWeight: "700", cursor: "pointer" }}>Submit Now</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem" }}>
            <button onClick={() => submitAnswer(true)} style={{ flex: 1, padding: "0.8rem", background: "#faf8ff", color: "#888", border: "2px solid #e8e0ff", borderRadius: "12px", fontWeight: "700", cursor: "pointer" }}>
              Skip ⏭️
            </button>
            <button onClick={() => submitAnswer(false)} style={{ flex: 2, padding: "0.8rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", cursor: "pointer" }}>
              {currentIndex + 1 >= questions.length ? "Finish Interview 🏆" : "Next Question →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
