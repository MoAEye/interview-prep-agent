import { useState, useEffect, useCallback } from "react";
import LandingPage from "./LandingPage";
import Login from "./Login";
import UploadForm from "./UploadForm";
import QuestionsList from "./QuestionsList";
import MockInterview from "./MockInterview";
import InterviewReport from "./InterviewReport";
import PracticeAgain from "./PracticeAgain";
import Dashboard from "./Dashboard";
import Profile from "./Profile";
import CandidateSettings from "./CandidateSettings";
import JobTracker from "./JobTracker";
import DocumentsLibrary from "./DocumentsLibrary";
import CandidateHome from "./CandidateHome";
import CompanyResearch from "./CompanyResearch";
import CVTailor from "./CVTailor";
import CVEditor from "./CVEditor";
import InterviewAcademy from "./InterviewAcademy";
import AriaLive from "./AriaLive";
import PricingPage from "./PricingPage";
import PrivacyPage from "./PrivacyPage";
import TermsPage from "./TermsPage";
import CookiePage from "./CookiePage";
import NotFoundPage from "./NotFoundPage";
import EmailConfirmedPage from "./EmailConfirmedPage";
import RecruiterDashboard from "./RecruiterDashboard";
import RecruiterCandidateFlow from "./RecruiterCandidateFlow";
import PortalSelect from "./PortalSelect";
import CandidateNavBar from "./components/CandidateNavBar";
import UpgradeModal from "./components/UpgradeModal";
import Toast from "./components/Toast";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { POST_SIGNUP_PROFILE_KEY, OPEN_SIGNUP_SESSION_KEY, persistSignupIntentFromUrl } from "./signupPrefill";
import { profileProEntitlement, jwtProEntitlement } from "../lib/proEntitlement.js";

function candidateTabFromScreen(s) {
  if (s === "candidateHome") return "dashboard";
  if (s === "candidatePricing" || s === "cvtailor" || s === "cveditor" || s === "settings" || s === "profile") return undefined;
  if (["upload", "questions", "mock", "report", "practiceagain"].includes(s)) return "prepare";
  if (s === "dashboard") return "dashboard";
  if (s === "jobs") return "jobs";
  if (s === "research") return "research";
  if (s === "academy") return "academy";
  if (s === "documents") return "documents";
  return "prepare";
}

function dashboardReturnScreen(s) {
  if (s === "practiceagain") return "practiceagain";
  if (s === "jobs") return "jobs";
  if (s === "documents") return "documents";
  if (s === "profile") return "profile";
  if (s === "candidateHome") return "candidateHome";
  if (s === "research") return "research";
  if (s === "academy") return "academy";
  if (s === "cvtailor") return "cvtailor";
  if (s === "cveditor") return "cveditor";
  if (s === "candidatePricing") return "candidatePricing";
  if (s === "settings") return "settings";
  return "upload";
}

/** Map URL path to marketing / legal screen (SPA). */
function getScreenFromPathname(pathname) {
  const p = (pathname || "").replace(/\/$/, "") || "/";
  if (p === "/pricing") return "pricing";
  if (p === "/privacy") return "privacy";
  if (p === "/terms") return "terms";
  if (p === "/cookies") return "cookies";
  if (p === "/email-confirmed") return "emailconfirmed";
  if (p.startsWith("/r/")) return null;
  if (p === "/" || p === "") return null;
  return "notfound";
}

function readEmailConfirmedFlag() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("emailconfirmed") === "1") return true;
    const h = window.location.hash || "";
    return h === "#email-confirmed" || h === "#emailconfirmed";
  } catch {
    return false;
  }
}

function shouldOpenCandidateSignup() {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("signup") === "1";
    const s = sessionStorage.getItem(OPEN_SIGNUP_SESSION_KEY) === "1";
    return q || s;
  } catch {
    return false;
  }
}

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [loginAsRecruiter, setLoginAsRecruiter] = useState(false);
  const [results, setResults] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [loginInitialSignUp, setLoginInitialSignUp] = useState(false);
  const [profileOnboarding, setProfileOnboarding] = useState(false);
  const [dashboardReturnTo, setDashboardReturnTo] = useState("upload");
  const [candidateIsPro, setCandidateIsPro] = useState(false);
  const [monthlyInterviewCount, setMonthlyInterviewCount] = useState(0);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [skipReportSave, setSkipReportSave] = useState(false);
  const [settingsBackScreen, setSettingsBackScreen] = useState("candidateHome");

  const refreshMonthlyInterviewCount = useCallback(async () => {
    if (!user?.id || user.id === "demo") {
      setMonthlyInterviewCount(0);
      return;
    }
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    try {
      const { count, error } = await supabase
        .from("interview_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString());
      if (!error) setMonthlyInterviewCount(typeof count === "number" ? count : 0);
    } catch {
      setMonthlyInterviewCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshMonthlyInterviewCount();
  }, [refreshMonthlyInterviewCount, screen]);

  const fetchProfileFlags = async (userId) => {
    if (!userId) return { recruiter: false, pro: false };
    let metaPro = false;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user;
      if (u?.id === userId) metaPro = jwtProEntitlement(u);
    } catch {
      /* ignore */
    }
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("is_recruiter, is_pro")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error) {
        return {
          recruiter: !!data?.is_recruiter,
          pro: profileProEntitlement(data?.is_pro) || metaPro,
        };
      }

      // Never assume Free just because the combined select failed (transient errors
      // or older clients used to force pro: false here). Try each column separately.
      const [recRes, proRes] = await Promise.all([
        supabase.from("user_profiles").select("is_recruiter").eq("user_id", userId).maybeSingle(),
        supabase.from("user_profiles").select("is_pro").eq("user_id", userId).maybeSingle(),
      ]);
      return {
        recruiter: !!recRes.data?.is_recruiter,
        pro: (!proRes.error && profileProEntitlement(proRes.data?.is_pro)) || metaPro,
      };
    } catch (_) {
      return { recruiter: false, pro: metaPro };
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (shouldOpenCandidateSignup()) {
        persistSignupIntentFromUrl();
        setLoginInitialSignUp(true);
        setScreen("login");
        if (typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname || "/");
      } else {
        const pathScreen = typeof window !== "undefined" ? getScreenFromPathname(window.location.pathname) : null;
        if (pathScreen === "notfound") setScreen("notfound");
        else if (pathScreen && ["pricing", "privacy", "terms", "cookies", "emailconfirmed"].includes(pathScreen)) setScreen(pathScreen);
        else if (readEmailConfirmedFlag()) setScreen("emailconfirmed");
        else setScreen("landing");
      }
      return undefined;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (shouldOpenCandidateSignup()) {
        persistSignupIntentFromUrl();
        setLoginInitialSignUp(true);
        setScreen("login");
        if (typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname || "/");
      } else {
        const pathScreen = typeof window !== "undefined" ? getScreenFromPathname(window.location.pathname) : null;
        if (readEmailConfirmedFlag()) setScreen("emailconfirmed");
        else if (pathScreen === "notfound") setScreen("notfound");
        else if (pathScreen && ["pricing", "privacy", "terms", "cookies", "emailconfirmed"].includes(pathScreen)) setScreen(pathScreen);
        else setScreen("landing");
      }
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const pathScreen = typeof window !== "undefined" ? getScreenFromPathname(window.location.pathname) : null;
      const emailFlag = readEmailConfirmedFlag();
      if (emailFlag && typeof window !== "undefined") {
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete("emailconfirmed");
          window.history.replaceState(null, "", u.pathname + (u.search || ""));
        } catch (_) {}
      }
      if (session?.user) {
        setUser(session.user);
        fetchProfileFlags(session.user.id).then(({ recruiter, pro }) => {
          setIsRecruiter(!!recruiter);
          setCandidateIsPro(!!pro);
        }).catch(() => {});
        if (emailFlag) {
          setScreen("emailconfirmed");
          return;
        }
        if (pathScreen === "notfound") {
          setScreen("notfound");
          return;
        }
        if (pathScreen && ["pricing", "privacy", "terms", "cookies"].includes(pathScreen)) {
          setScreen(pathScreen);
          return;
        }
        setScreen("portalSelect");
      } else {
        if (shouldOpenCandidateSignup()) {
          persistSignupIntentFromUrl();
          setLoginInitialSignUp(true);
          setScreen("login");
          if (typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname || "/");
        } else if (emailFlag) {
          setScreen("emailconfirmed");
        } else if (pathScreen === "notfound") {
          setScreen("notfound");
        } else if (pathScreen && ["pricing", "privacy", "terms", "cookies", "emailconfirmed"].includes(pathScreen)) {
          setScreen(pathScreen);
        } else {
          setScreen("landing");
        }
      }
    }).catch(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (shouldOpenCandidateSignup()) {
        persistSignupIntentFromUrl();
        setLoginInitialSignUp(true);
        setScreen("login");
        if (typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname || "/");
      } else {
        const pathScreen = typeof window !== "undefined" ? getScreenFromPathname(window.location.pathname) : null;
        if (readEmailConfirmedFlag()) setScreen("emailconfirmed");
        else if (pathScreen === "notfound") setScreen("notfound");
        else if (pathScreen && ["pricing", "privacy", "terms", "cookies", "emailconfirmed"].includes(pathScreen)) setScreen(pathScreen);
        else setScreen("landing");
      }
    });

    // Callback must return quickly: GoTrue awaits all listeners before signInWithPassword resolves.
    // Awaiting fetchProfileFlags here blocked login (spinning "Signing in…") or risked deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        // TOKEN_REFRESHED / USER_UPDATED fire often; navigation + profile refetch caused visible refresh loops.
        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          return;
        }
        void fetchProfileFlags(session.user.id)
          .then(({ recruiter, pro }) => {
            setIsRecruiter(!!recruiter);
            setCandidateIsPro(!!pro);
          })
          .catch(() => {});
        let openProfileOnboarding = false;
        try {
          if (typeof window !== "undefined" && sessionStorage.getItem(POST_SIGNUP_PROFILE_KEY) === "1") {
            sessionStorage.removeItem(POST_SIGNUP_PROFILE_KEY);
            openProfileOnboarding = true;
          }
        } catch (_) {}
        if (openProfileOnboarding) {
          setProfileOnboarding(true);
          setScreen("profile");
          return;
        }
        // First hydration is handled by getSession().then above; repeating here fights that and flickers the UI.
        if (event === "INITIAL_SESSION") {
          return;
        }
        setScreen((s) => {
          // Don't auto-redirect off the marketing page when a session exists (e.g. user clicked Home from the app).
          if (s === "landing") return "landing";
          const keep = [
            "report",
            "mock",
            "questions",
            "profile",
            "jobs",
            "documents",
            "recruiter",
            "upload",
            "dashboard",
            "practiceagain",
            "portalSelect",
            "candidateHome",
            "research",
            "academy",
            "arialive",
            "cvtailor",
            "cveditor",
            "candidatePricing",
            "settings",
            "pricing",
            "privacy",
            "terms",
            "cookies",
            "notfound",
            "emailconfirmed",
          ];
          return keep.includes(s) ? s : "portalSelect";
        });
      } else {
        setUser(null);
        setIsRecruiter(false);
        setCandidateIsPro(false);
        setLoginAsRecruiter(false);
        // Do not send users to landing on INITIAL_SESSION with no user — that overwrites
        // the sign-up screen right after ?signup=1 / Create account from recruiter flow.
        if (event === "SIGNED_OUT") {
          setScreen("landing");
        }
      }
    });
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Pick up user_profiles changes from Supabase (e.g. is_pro toggled in dashboard) without full reload
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return undefined;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      fetchProfileFlags(user.id).then(({ recruiter, pro }) => {
        setIsRecruiter(!!recruiter);
        setCandidateIsPro(!!pro);
      }).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user?.id]);

  useEffect(() => {
    if (screen !== "report") setSkipReportSave(false);
  }, [screen]);

  const mergeGradingContext = (ctx) => {
    if (!ctx || typeof ctx !== "object") return {};
    const o = {};
    if (typeof ctx.cv_text === "string") o.cv_text = ctx.cv_text;
    if (typeof ctx.job_description === "string") o.job_description = ctx.job_description;
    if (ctx.session_preferences && typeof ctx.session_preferences === "object")
      o.session_preferences = { ...ctx.session_preferences };
    return o;
  };

  const handleResults = (data, jobTitle, jobId, gradingContext) => {
    const job_id = jobId || null;
    const g = mergeGradingContext(gradingContext);
    const prefs = g.session_preferences;
    const wantN =
      typeof prefs?.question_count === "number" && Number.isFinite(prefs.question_count)
        ? Math.max(1, Math.floor(prefs.question_count))
        : null;
    const hasClientSec = prefs && Object.prototype.hasOwnProperty.call(prefs, "seconds_per_question");
    const resolvedSec = hasClientSec
      ? Number(prefs.seconds_per_question)
      : (data && typeof data === "object" && "seconds_per_question" in data
        ? data.seconds_per_question
        : 30);

    const take = (arr) =>
      wantN != null && Array.isArray(arr) && arr.length > wantN ? arr.slice(0, wantN) : arr;

    const withSession = (payload) => ({
      ...payload,
      ...g,
      seconds_per_question: resolvedSec,
    });

    // API may return either:
    // 1) { questions: [...] , candidate_summary, job_summary, ... }  (prep pack)
    // 2) { interview_questions: [...] } (legacy)
    // 3) [...] (array of questions)
    // 4) { interview_questions: { ... } } (edge)
    if (Array.isArray(data)) {
      setResults(
        withSession({ interview_questions: take(data), job_title: jobTitle || undefined, job_id })
      );
    } else if (data?.questions && Array.isArray(data.questions)) {
      const q = take(data.questions);
      setResults(
        withSession({
          ...data,
          questions: q,
          interview_questions: q,
          job_title: jobTitle || data.job_title,
          job_id,
        })
      );
    } else if (data?.interview_questions) {
      const list = Array.isArray(data.interview_questions) ? data.interview_questions : [];
      setResults(
        withSession({
          ...data,
          interview_questions: take(list),
          job_title: jobTitle || data.job_title,
          job_id,
        })
      );
    } else if (data?.[0]?.interview_questions) {
      const d0 = data[0];
      const list = Array.isArray(d0?.interview_questions) ? d0.interview_questions : [];
      setResults(
        withSession({ ...d0, interview_questions: take(list), job_title: jobTitle || d0?.job_title, job_id })
      );
    } else {
      setResults(
        withSession({ interview_questions: data, job_title: jobTitle || undefined, job_id })
      );
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
  const handleComplete = (s) => {
    setResults((prev) => ({ ...prev, final_score: s }));
    setScreen("practiceagain");
    void refreshMonthlyInterviewCount();
  };

  const isMonthlyMockBlocked =
    Boolean(user?.id && user.id !== "demo" && !candidateIsPro && monthlyInterviewCount >= 3);

  const tryEnterMock = () => {
    if (isMonthlyMockBlocked) {
      setToastMessage("Free plan: 3 mock interviews per calendar month (UTC). Upgrade to Pro for unlimited.");
      setUpgradeModalOpen(true);
      return;
    }
    setScreen("mock");
  };

  const handleRetryWeak = (weakAnswers) => {
    if (isMonthlyMockBlocked) {
      setToastMessage("Free plan: 3 mock interviews per calendar month (UTC). Upgrade to Pro for unlimited.");
      setUpgradeModalOpen(true);
      return;
    }
    const list = Array.isArray(weakAnswers) ? weakAnswers : [];
    const weakQuestions = list.map(a => ({
      question: a.question,
      type: a.type,
      targets: a.targets,
      reason: a.reason,
    }));
    setResults((prev) => ({ ...prev, interview_questions: weakQuestions }));
    setScreen("mock");
  };

  const handleLogin = async (u, opts) => {
    setUser(u);
    if (opts?.recruiter && u?.id) {
      setIsRecruiter(true);
      setLoginAsRecruiter(false);
      setScreen("portalSelect");
      supabase.from("user_profiles").upsert(
        { user_id: u.id, is_recruiter: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      ).then(() => {}).catch(() => {});
    } else if (opts?.afterSignUp && u?.id) {
      setProfileOnboarding(true);
      setScreen("profile");
    } else {
      setScreen("portalSelect");
    }
  };

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const recruiterSlugMatch = pathname.match(/^\/r\/([^/]+)/);
  if (recruiterSlugMatch) {
    return <RecruiterCandidateFlow slug={recruiterSlugMatch[1]} />;
  }

  /** Uses live Supabase session (not React `user` state) so CTAs work after refresh / tab sync / stale state. */
  const openCandidatePortal = async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setScreen("login");
      return;
    }
    let session = null;
    try {
      const res = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("getSession timeout")), 4000)),
      ]);
      session = res?.data?.session ?? null;
    } catch {
      setUser(null);
      setScreen("login");
      return;
    }
    if (!session?.user?.id) {
      setUser(null);
      setScreen("login");
      return;
    }
    setUser(session.user);
    try {
      const countResult = await Promise.race([
        supabase
          .from("interview_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error("interview count timeout")), 8000)),
      ]);
      const { count, error } = countResult;
      if (error) {
        setScreen("upload");
        return;
      }
      setScreen((count ?? 0) > 0 ? "candidateHome" : "upload");
    } catch {
      setScreen("upload");
    }
  };

  const ensureSessionAndNavigate = async (targetScreen) => {
    if (!isSupabaseConfigured) {
      setScreen("login");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setScreen("login");
        return;
      }
      setUser(session.user);
      void fetchProfileFlags(session.user.id)
        .then(({ recruiter, pro }) => {
          setIsRecruiter(!!recruiter);
          setCandidateIsPro(!!pro);
        })
        .catch(() => {});
      setScreen(targetScreen);
    } catch {
      setScreen("login");
    }
  };

  const marketingNav = {
    onLogo: () => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/");
      setScreen("landing");
    },
    onHowItWorks: () => {
      setScreen("landing");
      setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    },
    onFeatures: () => {
      setScreen("landing");
      setTimeout(() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    },
    onAcademy: () => void ensureSessionAndNavigate("academy"),
    onPricing: () => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/pricing");
      setScreen("pricing");
    },
    onGetStarted: () => void openCandidatePortal(),
    onRecruiter: () => {
      setLoginAsRecruiter(true);
      setScreen("login");
    },
  };

  const marketingFooter = {
    onPricing: marketingNav.onPricing,
    onFeatures: marketingNav.onFeatures,
    onHowItWorks: marketingNav.onHowItWorks,
    onAcademy: marketingNav.onAcademy,
    onCompanyResearch: () => void ensureSessionAndNavigate("research"),
    onPrivacy: () => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/privacy");
      setScreen("privacy");
    },
    onTerms: () => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/terms");
      setScreen("terms");
    },
    onCookies: () => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", "/cookies");
      setScreen("cookies");
    },
    onContact: () => {
      if (typeof window !== "undefined") window.location.href = "mailto:privacy@interviewai.app";
    },
  };

  const landingNavProps = {
    ...marketingNav,
    onLogo: () => {
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.history.replaceState(null, "", "/");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onHowItWorks: () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    onFeatures: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" }),
  };

  const landingFooterProps = {
    ...marketingFooter,
    onHowItWorks: landingNavProps.onHowItWorks,
    onFeatures: landingNavProps.onFeatures,
  };

  const handleCandidateNavigate = (tab) => {
    setProfileOnboarding(false);
    if (tab === "prepare") setScreen("upload");
    else if (tab === "dashboard") {
      setDashboardReturnTo(dashboardReturnScreen(screen));
      setScreen("dashboard");
    } else if (tab === "arialive") setScreen("arialive");
    else if (tab === "jobs") setScreen("jobs");
    else if (tab === "research") setScreen("research");
    else if (tab === "academy") setScreen("academy");
    else if (tab === "documents") setScreen("documents");
    else if (tab === "profile") setScreen("profile");
  };

  const withCandidateNav = (node) => (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="shrink-0">
      <CandidateNavBar
        user={user}
        currentTab={candidateTabFromScreen(screen)}
        onNavigate={handleCandidateNavigate}
        onLogout={() => supabase.auth.signOut()}
        showRecruiterSwitch={isRecruiter}
        onSwitchToRecruiter={() => setScreen("recruiter")}
        onGoCandidateHome={() => setScreen("candidateHome")}
        onGoPortalSelect={() => setScreen("portalSelect")}
        futuristicNav={
          screen === "candidateHome" ||
          screen === "upload" ||
          screen === "questions" ||
          screen === "mock" ||
          screen === "report" ||
          screen === "practiceagain" ||
          screen === "candidatePricing" ||
          screen === "dashboard" ||
          screen === "arialive" ||
          screen === "jobs" ||
          screen === "research" ||
          screen === "academy" ||
          screen === "documents" ||
          screen === "profile" ||
          screen === "settings" ||
          screen === "cvtailor" ||
          screen === "cveditor"
        }
        isPro={candidateIsPro}
        onOpenUpgrade={() => setUpgradeModalOpen(true)}
        showFreeBanner={!candidateIsPro}
        onBannerUpgrade={() => setUpgradeModalOpen(true)}
        monthlyInterviewCount={monthlyInterviewCount}
        monthlyInterviewLimit={candidateIsPro ? null : 3}
        onOpenSettings={() => {
          setSettingsBackScreen(screen);
          setScreen("settings");
        }}
        onManagePlan={() => setScreen("candidatePricing")}
      />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{node}</div>
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgradeClick={() => {
          setUpgradeModalOpen(false);
          setToastMessage("Coming soon! We'll notify you when payments go live.");
        }}
      />
      <Toast message={toastMessage} onDone={() => setToastMessage("")} />
    </div>
  );

  if (screen === "loading") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8f4ff, #f0f7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
        <p style={{ color: "#6c63ff", fontWeight: "700" }}>Loading...</p>
      </div>
    </div>
  );

  if (screen === "landing") {
    return (
      <LandingPage
        landingNavProps={landingNavProps}
        landingFooterProps={landingFooterProps}
        onGetStarted={() => {
          void openCandidatePortal();
        }}
        onRecruiterEntry={() => {
          setLoginAsRecruiter(true);
          setScreen("login");
        }}
      />
    );
  }
  if (screen === "pricing") {
    return (
      <>
        <Toast message={toastMessage} onDone={() => setToastMessage("")} />
        <PricingPage
          isPublic
          marketingNav={marketingNav}
          marketingFooter={marketingFooter}
          onGetStarted={() => void openCandidatePortal()}
          onProUpgrade={() => setToastMessage("Coming soon! We'll notify you when payments go live.")}
        />
      </>
    );
  }
  if (screen === "privacy") {
    return <PrivacyPage marketingNav={marketingNav} marketingFooter={marketingFooter} />;
  }
  if (screen === "terms") {
    return <TermsPage marketingNav={marketingNav} marketingFooter={marketingFooter} />;
  }
  if (screen === "cookies") {
    return <CookiePage marketingNav={marketingNav} marketingFooter={marketingFooter} />;
  }
  if (screen === "emailconfirmed") {
    return (
      <EmailConfirmedPage
        marketingNav={marketingNav}
        marketingFooter={marketingFooter}
        onEnter={() => setScreen("portalSelect")}
      />
    );
  }
  if (screen === "notfound") {
    return (
      <NotFoundPage
        marketingNav={marketingNav}
        marketingFooter={marketingFooter}
        user={user}
        onGoHome={() => {
          if (typeof window !== "undefined") window.history.replaceState(null, "", "/");
          setScreen("landing");
        }}
        onGoDashboard={() => void openCandidatePortal()}
      />
    );
  }
  if (screen === "login") return (
    <Login
      onLogin={handleLogin}
      recruiterMode={loginAsRecruiter}
      initialSignUpMode={loginInitialSignUp}
      onConsumeInitialSignUp={() => setLoginInitialSignUp(false)}
    />
  );
  if (screen === "portalSelect") {
    return (
      <PortalSelect
        user={user}
        isRecruiter={isRecruiter}
        onCandidateClick={() => openCandidatePortal()}
        onRecruiterClick={() => setScreen("recruiter")}
      />
    );
  }
  if (screen === "candidateHome") {
    return withCandidateNav(
      <CandidateHome
        user={user}
        isPro={candidateIsPro}
        onPrepare={() => setScreen("upload")}
        onResearch={() => setScreen("research")}
        onAcademy={() => setScreen("academy")}
        onDocuments={() => setScreen("documents")}
        onCvTailor={() => setScreen("cvtailor")}
        onCvEditor={() => setScreen("cveditor")}
        onPricing={() => setScreen("candidatePricing")}
        onOpenUpgrade={() => setUpgradeModalOpen(true)}
        onJobTracker={() => setScreen("jobs")}
        onAriaLive={() => setScreen("arialive")}
        onDashboard={() => setScreen("dashboard")}
        onOpenLastReport={(session) => {
          setSkipReportSave(true);
          const ans = Array.isArray(session?.answers) ? session.answers : [];
          const qs = ans.map((a) => ({
            question: a.question,
            type: a.type,
            targets: a.targets,
            reason: a.reason,
          }));
          setResults({
            interview_questions: qs,
            job_title: session.job_title || "Interview",
            job_id: session.job_id || null,
          });
          setAnswers(ans);
          setScreen("report");
        }}
        onPracticeWeakFromSession={(session) => {
          if (isMonthlyMockBlocked) {
            setToastMessage("Free plan: 3 mock interviews per calendar month (UTC). Upgrade to Pro for unlimited.");
            setUpgradeModalOpen(true);
            return;
          }
          const ans = Array.isArray(session?.answers) ? session.answers : [];
          const weak = ans.filter((a) => !a.skipped && (a.score === undefined || a.score < 7));
          const weakQuestions = weak.map((a) => ({
            question: a.question,
            type: a.type,
            targets: a.targets,
            reason: a.reason,
          }));
          if (weakQuestions.length === 0) {
            setScreen("upload");
            return;
          }
          setResults({
            interview_questions: weakQuestions,
            job_title: session.job_title || "Practice",
            job_id: session.job_id || null,
          });
          setScreen("mock");
        }}
      />
    );
  }
  if (screen === "research") {
    return withCandidateNav(
      <CompanyResearch user={user} isPro={candidateIsPro} onOpenUpgrade={() => setUpgradeModalOpen(true)} />
    );
  }
  if (screen === "academy") {
    return withCandidateNav(
      <InterviewAcademy user={user} isPro={candidateIsPro} onOpenUpgrade={() => setUpgradeModalOpen(true)} />
    );
  }
  if (screen === "arialive") {
    return withCandidateNav(<AriaLive user={user} onNavigate={setScreen} />);
  }
  if (screen === "cvtailor") {
    return withCandidateNav(<CVTailor user={user} isPro={candidateIsPro} onOpenUpgrade={() => setUpgradeModalOpen(true)} />);
  }
  if (screen === "cveditor") {
    return withCandidateNav(<CVEditor user={user} isPro={candidateIsPro} onOpenUpgrade={() => setUpgradeModalOpen(true)} />);
  }
  if (screen === "candidatePricing") {
    return withCandidateNav(
      <PricingPage
        onBack={() => setScreen("candidateHome")}
        onProUpgrade={() => setToastMessage("Coming soon! We'll notify you when payments go live.")}
      />
    );
  }
  if (screen === "upload") return withCandidateNav(
    <UploadForm
      user={user}
      isPro={candidateIsPro}
      onQuestionsGenerated={handleResults}
      onMonthlyLimit={() => {
        setToastMessage("Free plan: 3 mock interviews per month (UTC). Upgrade to Pro for unlimited.");
        setUpgradeModalOpen(true);
      }}
    />
  );
  if (screen === "profile") return withCandidateNav(
    <Profile
      user={user}
      isPro={candidateIsPro}
      onOpenUpgrade={() => setUpgradeModalOpen(true)}
      onOpenSettings={() => {
        setSettingsBackScreen("profile");
        setScreen("settings");
      }}
      onBack={() => { setProfileOnboarding(false); setScreen("upload"); }}
      onboarding={profileOnboarding}
      onCompleteOnboarding={() => { setProfileOnboarding(false); setScreen("upload"); }}
    />
  );
  if (screen === "settings") {
    return withCandidateNav(
      <CandidateSettings
        user={user}
        isPro={candidateIsPro}
        monthlyInterviewCount={monthlyInterviewCount}
        onBack={() => setScreen(settingsBackScreen)}
        onOpenProfile={() => setScreen("profile")}
        onOpenUpgrade={() => setUpgradeModalOpen(true)}
        onManagePlan={() => setScreen("candidatePricing")}
        onPrivacy={() => setScreen("privacy")}
        onTerms={() => setScreen("terms")}
        onCookies={() => setScreen("cookies")}
        onLogout={() => void supabase.auth.signOut()}
      />
    );
  }
  if (screen === "jobs") {
    return withCandidateNav(
      <JobTracker
        user={user}
        isPro={candidateIsPro}
        onOpenUpgrade={() => setUpgradeModalOpen(true)}
        onBack={() => setScreen("upload")}
      />
    );
  }
  if (screen === "documents") {
    return withCandidateNav(
      <DocumentsLibrary
        user={user}
        onBack={() => setScreen("upload")}
        isPro={candidateIsPro}
        onNavigateScreen={(name) => {
          if (name === "pricing") setUpgradeModalOpen(true);
          else setScreen(name);
        }}
      />
    );
  }
  if (screen === "recruiter") {
    return (
      <RecruiterDashboard
        user={user}
        onBack={() => setScreen("portalSelect")}
        onEnterCandidate={() => openCandidatePortal()}
      />
    );
  }
  if (screen === "questions") return withCandidateNav(
    <QuestionsList questions={results} onStartOver={() => setScreen("upload")} onStartInterview={tryEnterMock} />
  );
  if (screen === "mock") {
    return withCandidateNav(
      <MockInterview
        data={results}
        jobTitle={results?.job_title}
        onFinish={handleFinish}
        voiceReadAloud={candidateIsPro}
      />
    );
  }
  if (screen === "report") {
    return withCandidateNav(
      <InterviewReport
        answers={answers}
        jobTitle={results?.job_title}
        jobId={results?.job_id}
        cvText={results?.cv_text}
        jobDescription={results?.job_description}
        onRetry={() => setScreen("mock")}
        onRetryWeak={handleRetryWeak}
        onStartOver={handleShowPracticeAgain}
        onComplete={(s) => handleComplete(s)}
        skipSessionSave={skipReportSave}
        isPro={candidateIsPro}
        onOpenUpgrade={() => setUpgradeModalOpen(true)}
      />
    );
  }
  if (screen === "dashboard") {
    return withCandidateNav(<Dashboard isPro={candidateIsPro} onBack={() => setScreen(dashboardReturnTo)} />);
  }
  if (screen === "practiceagain") return withCandidateNav(
    <PracticeAgain score={results?.final_score} onShowDashboard={() => { setDashboardReturnTo("practiceagain"); setScreen("dashboard"); }}
      onRedoFull={tryEnterMock}
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

  return (
    <NotFoundPage
      marketingNav={marketingNav}
      marketingFooter={marketingFooter}
      user={user}
      onGoHome={() => {
        if (typeof window !== "undefined") window.history.replaceState(null, "", "/");
        setScreen("landing");
      }}
      onGoDashboard={() => void openCandidatePortal()}
    />
  );
}
