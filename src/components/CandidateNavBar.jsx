import { useState, useEffect, useRef, useCallback } from "react";
import LockIcon from "./LockIcon.jsx";

const BREAKPOINT = 768;
const MOBILE_MQ = `(max-width: ${BREAKPOINT - 1}px)`;
const transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
const font = "'Inter', system-ui, sans-serif";

const tabs = [
  { id: "prepare", label: "Prepare" },
  { id: "dashboard", label: "Dashboard" },
  { id: "arialive", label: "Aria Live", liveDot: true },
  { id: "jobs", label: "Job Tracker" },
  { id: "research", label: "Research" },
  { id: "academy", label: "Academy" },
  { id: "documents", label: "Documents", lockWhenFree: true },
];

function getInitialNarrow() {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(MOBILE_MQ).matches;
  } catch {
    return window.innerWidth < BREAKPOINT;
  }
}

/** Next calendar month start in UTC, for mock limit copy */
function nextUtcMonthResetLabel() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: 0.45, flexShrink: 0 }}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M4 9h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1h-5v-8H9v8H4a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {object} props
 * @param {() => void} [props.onGoCandidateHome] — house icon → signed-in candidate hub (greeting, stats)
 * @param {() => void} [props.onGoPortalSelect] — profile menu → recruiter/candidate portal chooser (dual-role)
 * @param {boolean} [props.futuristicNav] — dark glass header (Candidate Home + dark page below)
 */
export default function CandidateNavBar({
  user,
  onLogout,
  currentTab,
  onNavigate,
  showRecruiterSwitch = false,
  onSwitchToRecruiter,
  onGoCandidateHome,
  onGoPortalSelect,
  futuristicNav = false,
  isPro = false,
  onOpenUpgrade,
  showFreeBanner = false,
  onBannerUpgrade,
  monthlyInterviewCount = 0,
  monthlyInterviewLimit = null,
  onOpenSettings,
  onManagePlan,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [narrow, setNarrow] = useState(getInitialNarrow);
  const [tabHover, setTabHover] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    const onResize = () => setNarrow(window.innerWidth < BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const closeAll = useCallback(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, []);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "Candidate");
  const email = user?.email || "";

  const documentsLocked = !isPro;

  const runNav = (id) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.lockWhenFree && documentsLocked) {
      onOpenUpgrade?.();
      closeAll();
      return;
    }
    onNavigate(id);
    closeAll();
  };

  const goHome = () => {
    if (onGoCandidateHome) onGoCandidateHome();
    else onGoPortalSelect?.();
    closeAll();
  };

  const futTabStyle = (isActive, hovered) => ({
    position: "relative",
    background: "transparent",
    border: "none",
    borderBottom: isActive ? "2px solid rgba(167, 139, 250, 0.85)" : "2px solid transparent",
    padding: "10px 14px 12px",
    fontSize: "13px",
    fontWeight: isActive ? 700 : 600,
    letterSpacing: "0.02em",
    color: isActive ? "#c4b5fd" : hovered ? "#ffffff" : "#888888",
    cursor: "pointer",
    transition,
    fontFamily: font,
    boxShadow: "none",
    borderRadius: "4px 4px 0 0",
  });

  const desktopTabStyle = (t, isActive) => {
    const hovered = tabHover === t.id;
    if (futuristicNav) {
      return futTabStyle(isActive, hovered);
    }
    if (isActive) {
      return {
        background: "#f3f0ff",
        color: "#7c3aed",
        fontWeight: 600,
        border: "none",
        borderRadius: "999px",
        padding: "8px 16px",
        fontSize: "14px",
        cursor: "pointer",
        transition,
        fontFamily: font,
      };
    }
    return {
      background: hovered ? "rgba(124, 58, 237, 0.08)" : "transparent",
      color: "#374151",
      opacity: hovered ? 1 : 0.75,
      fontWeight: 500,
      border: "none",
      borderRadius: "999px",
      padding: "8px 16px",
      fontSize: "14px",
      cursor: "pointer",
      transition,
      fontFamily: font,
    };
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        fontFamily: font,
        ...(futuristicNav
          ? {
              background: "rgba(5, 2, 15, 0.85)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(124, 58, 237, 0.15)",
              boxShadow: "none",
            }
          : {
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              borderBottom: "1px solid #e5e7eb",
            }),
      }}
    >
      <style>{`
        @keyframes cnav-live-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .cnav-tabs-row {
          display: none;
          align-items: center;
          gap: 4px;
          flex: 1 1 0;
          min-width: 0;
          justify-content: center;
          flex-wrap: wrap;
        }
        .cnav-burger-wrap {
          display: none;
          flex: 1 1 0;
          min-width: 0;
        }
        @media (min-width: ${BREAKPOINT}px) {
          .cnav-tabs-row { display: flex !important; }
          .cnav-burger-wrap { display: none !important; }
        }
        @media (max-width: ${BREAKPOINT - 1}px) {
          .cnav-tabs-row { display: none !important; }
          .cnav-burger-wrap { display: flex !important; flex: 1 1 0; min-width: 0; }
        }
      `}</style>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 16px",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "nowrap",
          boxSizing: "border-box",
        }}
      >
        {futuristicNav ? (
          <button
            type="button"
            aria-label="Home — candidate dashboard"
            onClick={goHome}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "4px 0",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1px solid rgba(167, 139, 250, 0.45)",
                background: "rgba(124, 58, 237, 0.18)",
                color: "#e9d5ff",
                fontWeight: 800,
                fontSize: "11px",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(124, 58, 237, 0.2)",
              }}
            >
              iA
            </span>
            <span
              style={{
                fontWeight: 900,
                fontSize: "16px",
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #ffffff, #a78bfa)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              InterviewAI
            </span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Home — candidate dashboard"
            onClick={goHome}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              border: "none",
              borderRadius: "10px",
              background: "transparent",
              color: "#374151",
              cursor: "pointer",
              transition,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#7c3aed";
              e.currentTarget.style.background = "rgba(124, 58, 237, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#374151";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <HomeIcon />
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
          {!futuristicNav ? (
            <span style={{ fontWeight: 800, fontSize: "16px", color: "#1a1a1a", letterSpacing: "-0.02em" }}>InterviewAI</span>
          ) : null}
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: futuristicNav ? "#d4d4d8" : "#ffffff",
              background: futuristicNav ? "transparent" : "#7c3aed",
              padding: "4px 10px",
              borderRadius: "999px",
              border: futuristicNav ? "1px solid rgba(255,255,255,0.22)" : "none",
            }}
          >
            Candidate
          </span>
          <button
            type="button"
            onClick={() => onOpenUpgrade?.()}
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: isPro ? "#ffffff" : futuristicNav ? "#d1d5db" : "#4b5563",
              background: isPro ? "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)" : futuristicNav ? "rgba(255,255,255,0.08)" : "#e5e7eb",
              padding: "4px 10px",
              borderRadius: "999px",
              border: futuristicNav && !isPro ? "1px solid rgba(139,92,246,0.25)" : "none",
              cursor: "pointer",
              boxShadow: isPro ? "0 0 16px rgba(124, 58, 237, 0.35)" : "none",
            }}
          >
            {isPro ? "Pro" : "Free"}
          </button>
        </div>

        <nav
          className="cnav-tabs-row"
          aria-label="Candidate sections"
          onMouseLeave={() => setTabHover(null)}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => runNav(t.id)}
              style={desktopTabStyle(t, currentTab != null && currentTab === t.id)}
              onMouseEnter={() => setTabHover(t.id)}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {t.liveDot ? (
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#ef4444",
                      flexShrink: 0,
                      animation: "cnav-live-pulse 1.5s ease-in-out infinite",
                    }}
                  />
                ) : null}
                {t.label}
                {t.lockWhenFree && documentsLocked ? <LockIcon size={12} color={futuristicNav ? "#a78bfa" : "#9ca3af"} /> : null}
              </span>
            </button>
          ))}
        </nav>

        <div className="cnav-burger-wrap" aria-hidden="true" />

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexShrink: 0 }}>
          {narrow && (
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = futuristicNav ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ width: "18px", height: "2px", background: futuristicNav ? "#e4e4e7" : "#374151", borderRadius: "1px" }} />
              <span style={{ width: "18px", height: "2px", background: futuristicNav ? "#e4e4e7" : "#374151", borderRadius: "1px" }} />
              <span style={{ width: "18px", height: "2px", background: futuristicNav ? "#e4e4e7" : "#374151", borderRadius: "1px" }} />
            </button>
          )}

          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((p) => !p)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: futuristicNav ? "2px solid rgba(167, 139, 250, 0.45)" : "2px solid #e5e7eb",
                background: "#7c3aed",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                transition,
                fontFamily: font,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(124, 58, 237, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {(displayName || "?").slice(0, 1).toUpperCase()}
            </button>

            {profileOpen && (() => {
              const dark = futuristicNav;
              const panelBg = dark ? "rgba(14, 10, 28, 0.98)" : "#ffffff";
              const border = dark ? "1px solid rgba(139, 92, 246, 0.35)" : "1px solid #e5e7eb";
              const text = dark ? "#f4f4f5" : "#111827";
              const sub = dark ? "#a1a1aa" : "#6b7280";
              const hoverRow = dark ? "rgba(124, 58, 237, 0.16)" : "rgba(124, 58, 237, 0.08)";
              const iconBg = dark ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.1)";
              const iconColor = dark ? "#c4b5fd" : "#7c3aed";
              const parts = displayName.trim().split(/\s+/).filter(Boolean);
              const initials =
                parts.length >= 2
                  ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                  : (displayName.slice(0, 2) || "?").toUpperCase();
              const used = Math.max(0, Number(monthlyInterviewCount) || 0);
              const limit = monthlyInterviewLimit;
              const barPct = limit != null && limit > 0 ? Math.min(100, (used / limit) * 100) : 100;

              const menuRow = (Icon, label, onClick, opts = {}) => (
                <button
                  type="button"
                  onClick={onClick}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: "12px",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    background: "transparent",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontFamily: font,
                    transition,
                    color: opts.accent || text,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = hoverRow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: iconBg,
                      color: iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon />
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: "14px" }}>{label}</span>
                  <IconChevron />
                </button>
              );

              const openPlan = () => {
                if (isPro) onManagePlan?.();
                else onOpenUpgrade?.();
                closeAll();
              };

              return (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 10px)",
                    width: "min(340px, calc(100vw - 24px))",
                    zIndex: 300,
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: -6,
                      right: 14,
                      width: 0,
                      height: 0,
                      borderLeft: "7px solid transparent",
                      borderRight: "7px solid transparent",
                      borderBottom: `7px solid ${panelBg}`,
                      filter: dark ? "drop-shadow(0 -1px 0 rgba(139,92,246,0.25))" : undefined,
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      background: panelBg,
                      borderRadius: "16px",
                      border,
                      boxShadow: dark
                        ? "0 24px 64px rgba(0,0,0,0.55), 0 0 48px rgba(124, 58, 237, 0.1)"
                        : "0 16px 48px rgba(0,0,0,0.12)",
                      backdropFilter: dark ? "blur(18px)" : undefined,
                      WebkitBackdropFilter: dark ? "blur(18px)" : undefined,
                      padding: "14px 10px 10px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px", padding: "4px 8px 14px", borderBottom: dark ? "1px solid rgba(139,92,246,0.12)" : "1px solid #f0f0f0" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: dark ? "0 0 0 2px rgba(167,139,250,0.35), 0 8px 24px rgba(124,58,237,0.35)" : "0 0 0 2px #e9d5ff",
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, color: text, fontSize: "15px", letterSpacing: "-0.02em", lineHeight: 1.25 }}>{displayName}</div>
                        <div style={{ fontSize: "12px", color: sub, marginTop: "3px", wordBreak: "break-all", lineHeight: 1.35 }}>{email}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              background: isPro ? "linear-gradient(135deg, #7c3aed, #2563eb)" : dark ? "rgba(255,255,255,0.1)" : "#e5e7eb",
                              color: "#fff",
                              boxShadow: isPro ? "0 0 12px rgba(124,58,237,0.35)" : "none",
                            }}
                          >
                            {isPro ? "Pro" : "Free"}
                          </span>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.07em",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              border: dark ? "1px solid rgba(167,139,250,0.35)" : "1px solid #d8b4fe",
                              color: dark ? "#e9d5ff" : "#7c3aed",
                              background: "transparent",
                            }}
                          >
                            Candidate
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        margin: "12px 8px",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        background: dark ? "rgba(124, 58, 237, 0.08)" : "rgba(124, 58, 237, 0.06)",
                        border: dark ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid rgba(124, 58, 237, 0.12)",
                      }}
                    >
                      <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: sub, marginBottom: "8px" }}>
                        Mock interviews this month
                      </div>
                      {limit != null ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                            <span style={{ fontSize: "22px", fontWeight: 800, color: text, letterSpacing: "-0.03em" }}>
                              {used} <span style={{ fontSize: "14px", fontWeight: 600, color: sub }}>of {limit}</span>
                            </span>
                          </div>
                          <div style={{ height: "6px", borderRadius: "999px", background: dark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${barPct}%`,
                                height: "100%",
                                borderRadius: "999px",
                                background: "linear-gradient(90deg, #14b8a6, #7c3aed)",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <div style={{ fontSize: "10px", color: sub, marginTop: "8px", lineHeight: 1.4 }}>
                            Resets {nextUtcMonthResetLabel()} (UTC)
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "20px" }} aria-hidden>✓</span>
                          <span style={{ fontSize: "14px", fontWeight: 600, color: dark ? "#86efac" : "#15803d" }}>Unlimited practice</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "4px 4px 6px" }}>
                      {menuRow(IconUser, "Profile & CV", () => runNav("profile"))}
                      {onOpenSettings
                        ? menuRow(IconGear, "Settings", () => {
                            onOpenSettings();
                            closeAll();
                          })
                        : null}
                      {menuRow(IconCard, "Plan & billing", openPlan)}
                      {onGoPortalSelect
                        ? menuRow(IconBriefcase, "Portal menu…", () => {
                            onGoPortalSelect();
                            closeAll();
                          })
                        : null}
                      {showRecruiterSwitch && onSwitchToRecruiter
                        ? menuRow(
                            IconBriefcase,
                            "Switch to Recruiter portal",
                            () => {
                              onSwitchToRecruiter();
                              closeAll();
                            },
                            { accent: "#2dd4bf" }
                          )
                        : null}
                      {menuRow(IconHelp, "Help", () => {
                        if (typeof window !== "undefined") window.location.href = "mailto:privacy@interviewai.app";
                        closeAll();
                      })}
                    </div>

                    <div style={{ padding: "6px 8px 4px" }}>
                      <button
                        type="button"
                        onClick={openPlan}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          border: "none",
                          fontWeight: 700,
                          fontSize: "14px",
                          cursor: "pointer",
                          fontFamily: font,
                          color: "#fff",
                          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
                          boxShadow: "0 8px 28px rgba(124, 58, 237, 0.45)",
                          transition,
                        }}
                      >
                        {isPro ? "Manage plan" : "Upgrade to Pro"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          closeAll();
                        }}
                        style={{
                          width: "100%",
                          marginTop: "8px",
                          padding: "10px 16px",
                          borderRadius: "12px",
                          border: dark ? "1px solid rgba(248,113,113,0.28)" : "1px solid #fecaca",
                          background: dark ? "rgba(127,29,29,0.32)" : "rgba(254,226,226,0.6)",
                          fontWeight: 700,
                          fontSize: "13px",
                          color: dark ? "#fca5a5" : "#b91c1c",
                          cursor: "pointer",
                          fontFamily: font,
                          transition,
                        }}
                      >
                        Log out
                      </button>
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: "10px",
                          color: sub,
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Signed in securely
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {narrow && mobileOpen && (
        <div
          style={{
            borderTop: futuristicNav ? "1px solid rgba(124,58,237,0.15)" : "1px solid #e5e7eb",
            padding: "16px",
            background: futuristicNav ? "rgba(5,2,15,0.97)" : "#fafafa",
            backdropFilter: futuristicNav ? "blur(16px)" : undefined,
            WebkitBackdropFilter: futuristicNav ? "blur(16px)" : undefined,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {tabs.map((t) => {
              const active = currentTab != null && currentTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => runNav(t.id)}
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    textAlign: "center",
                    padding: "12px 16px",
                    borderRadius: "999px",
                    border: futuristicNav && active ? "1px solid rgba(167,139,250,0.35)" : "none",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition,
                    fontFamily: font,
                    background: futuristicNav
                      ? active
                        ? "rgba(124,58,237,0.22)"
                        : "rgba(255,255,255,0.06)"
                      : active
                        ? "#f3f0ff"
                        : "#ffffff",
                    color: futuristicNav ? (active ? "#e9d5ff" : "#d1d5db") : active ? "#7c3aed" : "#374151",
                    boxShadow: active ? "none" : futuristicNav ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {t.liveDot ? (
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#ef4444",
                        flexShrink: 0,
                        animation: "cnav-live-pulse 1.5s ease-in-out infinite",
                      }}
                    />
                  ) : null}
                  {t.label}
                  {t.lockWhenFree && documentsLocked ? <LockIcon size={14} color={futuristicNav ? "#a78bfa" : "#9ca3af"} /> : null}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => runNav("profile")}
              style={{
                marginTop: "8px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: futuristicNav ? "1px solid rgba(139,92,246,0.25)" : "1px solid #e5e7eb",
                background: futuristicNav ? "rgba(255,255,255,0.06)" : "#ffffff",
                fontWeight: 600,
                color: futuristicNav ? "#e4e4e7" : "#374151",
                cursor: "pointer",
                transition,
                fontFamily: font,
              }}
            >
              Profile &amp; CV
            </button>
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  closeAll();
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: futuristicNav ? "1px solid rgba(139,92,246,0.25)" : "1px solid #e5e7eb",
                  background: futuristicNav ? "rgba(255,255,255,0.06)" : "#ffffff",
                  fontWeight: 600,
                  color: futuristicNav ? "#e4e4e7" : "#374151",
                  cursor: "pointer",
                  transition,
                  fontFamily: font,
                }}
              >
                Settings
              </button>
            )}
            {onGoPortalSelect && (
              <button
                type="button"
                onClick={() => {
                  onGoPortalSelect();
                  closeAll();
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: futuristicNav ? "1px solid rgba(139,92,246,0.25)" : "1px solid #e5e7eb",
                  background: futuristicNav ? "rgba(255,255,255,0.06)" : "#ffffff",
                  fontWeight: 600,
                  color: futuristicNav ? "#9ca3af" : "#6b7280",
                  cursor: "pointer",
                  transition,
                  fontFamily: font,
                }}
              >
                Portal menu…
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onLogout();
                closeAll();
              }}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border: futuristicNav ? "1px solid rgba(248,113,113,0.25)" : "none",
                background: futuristicNav ? "rgba(127,29,29,0.35)" : "rgba(254,226,226,0.6)",
                fontWeight: 700,
                color: futuristicNav ? "#fca5a5" : "#b91c1c",
                cursor: "pointer",
                transition,
                fontFamily: font,
              }}
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {showFreeBanner && !isPro && (
        <div
          style={{
            background: futuristicNav
              ? "linear-gradient(90deg, rgba(124,58,237,0.12), rgba(45,212,191,0.06))"
              : "linear-gradient(90deg, rgba(124,58,237,0.06), rgba(99,102,241,0.05))",
            borderTop: futuristicNav ? "1px solid rgba(124,58,237,0.15)" : "1px solid rgba(124,58,237,0.08)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
            fontFamily: font,
            fontSize: "13px",
            color: futuristicNav ? "#c4b5fd" : "#6b7280",
          }}
        >
          <span>You&apos;re on the free plan · 3 interviews/month included</span>
          <button
            type="button"
            onClick={() => onBannerUpgrade?.()}
            style={{
              background: "none",
              border: "none",
              color: "#7c3aed",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "13px",
              padding: "4px 8px",
            }}
          >
            Upgrade to Pro →
          </button>
        </div>
      )}
    </header>
  );
}
