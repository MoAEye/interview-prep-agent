import { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import Login from "./Login";
import UploadForm from "./UploadForm";
import QuestionsList from "./QuestionsList";
import MockInterview from "./MockInterview";
import InterviewReport from "./InterviewReport";
import PracticeAgain from "./PracticeAgain";
import InterviewHistory from "./InterviewHistory";
import Dashboard from "./Dashboard";
import { supabase } from "./supabaseClient";

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [results, setResults] = useState(null);
  const [answers, setAnswers] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); setScreen("upload"); }
      else { setScreen("landing"); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setScreen(s => ["report", "mock", "questions", "history"].includes(s) ? s : "upload");
      } else {
        setUser(null);
        setScreen("landing");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleResults = (data, jobTitle) => {
    // API may return either:
    // 1) { questions: [...] , candidate_summary, job_summary, ... }  (prep pack)
    // 2) { interview_questions: [...] } (legacy)
    // 3) [...] (array of questions)
    // 4) { interview_questions: { ... } } (edge)
    if (Array.isArray(data)) {
      setResults({ interview_questions: data, job_title: jobTitle || undefined });
    } else if (data?.questions && Array.isArray(data.questions)) {
      // Preserve full pack fields + map questions into interview_questions (what the UI uses)
      setResults({ ...data, interview_questions: data.questions, job_title: jobTitle || data.job_title });
    } else if (data?.interview_questions) {
      setResults({ ...data, job_title: jobTitle || data.job_title });
    } else if (data?.[0]?.interview_questions) {
      setResults({ ...data[0], job_title: jobTitle || data[0]?.job_title });
    } else {
      setResults({ interview_questions: data, job_title: jobTitle || undefined });
    }

    setScreen("questions");
    if (jobTitle) setResults((prev) => ({ ...prev, job_title: jobTitle }));
  };

  const handleFinish = (completedAnswers, jobTitle) => {
    setAnswers(completedAnswers);
    setResults(prev => ({ ...prev, job_title: jobTitle }));
    setScreen("report");
  };

  const handleShowPracticeAgain = () => setScreen("practiceagain");
  const handleComplete = (s) => { setResults(prev => ({ ...prev, final_score: s })); setScreen("practiceagain"); }

  const handleRetryWeak = (weakAnswers) => {
    const weakQuestions = weakAnswers.map(a => ({
      question: a.question,
      type: a.type,
      targets: a.targets,
      reason: a.reason,
    }));
    setResults({ ...results, interview_questions: weakQuestions });
    setScreen("mock");
  };

  if (screen === "loading") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
        <p style={{ color: "#6c63ff", fontWeight: "700" }}>Loading...</p>
      </div>
    </div>
  );

  if (screen === "landing") return <LandingPage onGetStarted={() => setScreen(user ? "upload" : "login")} />;
  if (screen === "login") return <Login onLogin={(u) => { setUser(u); setScreen("upload"); }} />;
  if (screen === "upload") return <UploadForm user={user} onQuestionsGenerated={handleResults} onShowHistory={() => setScreen("history")} />;
  if (screen === "questions") return <QuestionsList questions={results} onStartOver={() => setScreen("upload")} onStartInterview={() => setScreen("mock")} />;
  if (screen === "mock") return <MockInterview data={results} jobTitle={results?.job_title} onFinish={handleFinish} />;
  if (screen === "report") return <InterviewReport answers={answers} jobTitle={results?.job_title} onRetry={() => setScreen("mock")} onRetryWeak={handleRetryWeak} onStartOver={handleShowPracticeAgain} onComplete={(s) => handleComplete(s)} />;
  if (screen === "history") return <InterviewHistory onBack={() => setScreen("upload")} onShowDashboard={() => setScreen("dashboard")} />;
  if (screen === "dashboard") return <Dashboard onBack={() => setScreen("history")} />;
  if (screen === "practiceagain") return (
    <PracticeAgain score={results?.final_score} onShowDashboard={() => setScreen("dashboard")}
      onRedoFull={() => setScreen("mock")}
      onRedoWeak={() => {
        if (answers) {
          const weak = answers.filter(a => !a.skipped && (a.score === undefined || a.score < 7));
          if (weak.length > 0) handleRetryWeak(weak);
          else setScreen("mock");
        }
      }}
      onNewInterview={() => setScreen("upload")}
      onHome={() => setScreen("landing")}
    />
  );
}
