import { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import Login from "./Login";
import UploadForm from "./UploadForm";
import QuestionsList from "./QuestionsList";
import MockInterview from "./MockInterview";
import InterviewReport from "./InterviewReport";
import PracticeAgain from "./PracticeAgain";
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
      if (session?.user) { setUser(session.user); setScreen(s => s === 'report' || s === 'mock' || s === 'questions' ? s : 'upload'); }
      else { setUser(null); setScreen("landing"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleResults = (data) => {
    if (Array.isArray(data)) setResults({ interview_questions: data });
    else if (data?.interview_questions) setResults(data);
    else if (data?.[0]?.interview_questions) setResults(data[0]);
    else setResults({ interview_questions: data });
    setScreen("questions");
  };

  const handleFinish = (completedAnswers) => {
    setAnswers(completedAnswers);
    setScreen("report");
  };

  const handleShowPracticeAgain = () => setScreen("practiceagain");

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

  if (screen === "loading") return <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div><p style={{ color: "#6c63ff", fontWeight: "700" }}>Loading...</p></div></div>;
  if (screen === "landing") return <LandingPage onGetStarted={() => setScreen(user ? "upload" : "login")} />;
  if (screen === "login") return <Login onLogin={(u) => { setUser(u); setScreen("upload"); }} />;
  if (screen === "upload") return <UploadForm user={user} onQuestionsGenerated={handleResults} />;
  if (screen === "questions") return <QuestionsList questions={results} onStartOver={() => setScreen("upload")} onStartInterview={() => setScreen("mock")} />;
  if (screen === "mock") return <MockInterview data={results} onFinish={handleFinish} />;
  if (screen === "report") return (
    <InterviewReport
      answers={answers}
      onRetry={() => setScreen("mock")}
      onRetryWeak={handleRetryWeak}
      onStartOver={handleShowPracticeAgain}
      onDone={handleShowPracticeAgain}
    />
  );
  if (screen === "practiceagain") return (
    <PracticeAgain
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
