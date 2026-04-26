import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { messageForFailedApiResponse } from "./apiClientError.js";
import { jsonAuthHeaders } from "./jsonAuthHeaders.js";
import { btnPrimary, btnPrimaryHover, input } from "./candidateUi.jsx";

const FREE_RESEARCH_KEY = "interviewai_company_research_free_used";

function markFreeResearchUsed() {
  try {
    localStorage.setItem(FREE_RESEARCH_KEY, "1");
  } catch (_) {}
}

function hasUsedFreeResearch() {
  try {
    return localStorage.getItem(FREE_RESEARCH_KEY) === "1";
  } catch {
    return false;
  }
}

function stripInvisible(s) {
  return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function normalizeJobUrlInput(raw) {
  const t = stripInvisible(String(raw || "")).trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-zA-Z0-9][-a-zA-Z0-9+.]*\.[a-zA-Z]{2,}/.test(t)) return `https://${t}`;
  return t;
}

/** Strip trailing junk from pasted links (e.g. "https://…)." or trailing smart quotes). */
function trimUrlCandidate(raw) {
  return stripInvisible(String(raw || ""))
    .trim()
    .replace(/^[<[(]+/g, "")
    .replace(/[)\].,;'"»]+$/g, "")
    .trim();
}

/** Whole line is a URL, or first https?://… substring (e.g. "Apply: https://…"). */
function tryParseHttpUrlFromLine(line) {
  const t = trimUrlCandidate(line);
  if (!t) return { url: "", rest: "" };
  if (isValidJobUrl(t)) {
    return { url: normalizeJobUrlInput(t), rest: "" };
  }
  const re = /https?:\/\/[^\s<>'"{}|\\^`[\])]+/gi;
  for (const m of t.matchAll(re)) {
    const cand = trimUrlCandidate(m[0]);
    if (cand && isValidJobUrl(cand)) {
      const rest = (t.slice(0, m.index) + " " + t.slice(m.index + m[0].length)).trim();
      return { url: normalizeJobUrlInput(cand), rest };
    }
  }
  return { url: "", rest: t };
}

/**
 * URL from the dedicated field, or first line of the description (rest = prose).
 * Covers: URL-only in textarea, URL + newline + pasted JD, trailing punctuation, text + URL on same line.
 */
function parseResearchJobInputs(jobUrlField, jobDescField) {
  const fieldRaw = trimUrlCandidate(jobUrlField);
  if (fieldRaw) {
    const { url, rest } = tryParseHttpUrlFromLine(fieldRaw);
    if (url) {
      const descFromBox = stripInvisible(jobDescField).trim();
      const descTrim = [rest, descFromBox].filter(Boolean).join("\n").trim();
      return { effectiveJobUrl: url, descTrim };
    }
  }
  const t = stripInvisible(String(jobDescField || "")).trim();
  if (!t) {
    return { effectiveJobUrl: "", descTrim: "" };
  }
  const lines = t.split(/\n/).map((l) => trimUrlCandidate(l.trim())).filter(Boolean);
  if (!lines.length) {
    return { effectiveJobUrl: "", descTrim: "" };
  }
  const { url, rest } = tryParseHttpUrlFromLine(lines[0]);
  if (!url) {
    return { effectiveJobUrl: "", descTrim: t };
  }
  const descTrim = [rest, ...lines.slice(1)].filter(Boolean).join("\n").trim();
  return { effectiveJobUrl: url, descTrim };
}

/** Indeed search listing URL — not one job (fetch would be wrong even if unblocked). */
function indeedSearchResultsUrlMessage(urlString) {
  try {
    const u = new URL(normalizeJobUrlInput(trimUrlCandidate(urlString)));
    if (!/indeed\./i.test(u.hostname)) return null;
    const path = u.pathname.toLowerCase();
    if (/\/viewjob/i.test(path) || /\/pagead\/clk/i.test(path) || /\/rc\/clk/i.test(path)) return null;
    if (/\/q-[^/]+-jobs\.html$/i.test(path)) {
      return "That Indeed link is a search-results page, not one job. Open a specific listing and use its URL (usually contains “viewjob”), or paste the job description below.";
    }
    if (path === "/jobs" && u.searchParams.has("q") && !u.searchParams.get("jk")) {
      return "That Indeed link looks like search results. Open one job and paste its URL or the full posting text.";
    }
    return null;
  } catch {
    return null;
  }
}

function isValidJobUrl(s) {
  try {
    const u = new URL(normalizeJobUrlInput(trimUrlCandidate(s)));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const mockCard = {
  borderRadius: "16px",
  background: "rgba(22, 22, 29, 0.94)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const ghostBtn = {
  onMouseEnter: (e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
    e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.35)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.28)";
  },
};

function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "#71717a",
        marginBottom: "10px",
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: "4px",
          height: "12px",
          borderRadius: "2px",
          background: "linear-gradient(180deg, #a78bfa, #6d28d9)",
          boxShadow: "0 0 10px rgba(139, 92, 246, 0.45)",
        }}
      />
      <span>{children}</span>
    </div>
  );
}

function FieldShell({ children, style }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "12px",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(139, 92, 246, 0.15)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ResultBlock({ title, children }) {
  return (
    <div
      style={{
        ...mockCard,
        padding: "20px 22px",
        borderLeft: "3px solid #8b5cf6",
        boxShadow: "0 0 0 1px rgba(139,92,246,0.08) inset, 0 16px 48px rgba(0,0,0,0.35)",
      }}
    >
      <SectionLabel style={{ marginBottom: "14px" }}>{title}</SectionLabel>
      <div style={{ fontSize: "14px", lineHeight: 1.6, color: "#d4d4d8" }}>{children}</div>
    </div>
  );
}

export default function CompanyResearch({ user, isPro, onOpenUpgrade }) {
  const [company, setCompany] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cvText, setCvText] = useState("");
  const [cvOpen, setCvOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const isDemo = user?.id === "demo";

  const blocked = !isPro && hasUsedFreeResearch();
  const { effectiveJobUrl, descTrim } = parseResearchJobInputs(jobUrl, jobDescription);
  const hasValidUrl = Boolean(effectiveJobUrl);
  const jdLen = descTrim.length;
  const urlStructuralWarning = effectiveJobUrl ? indeedSearchResultsUrlMessage(effectiveJobUrl) : null;
  let jdHint = "Paste the full posting for best results";
  if (hasValidUrl) {
    jdHint = urlStructuralWarning
      ? "Search-style Indeed links can’t be fetched — open one job or paste the posting"
      : "We’ll try to fetch this page — Indeed/LinkedIn often block bots; paste text if it fails";
  } else if (jdLen >= 20) {
    jdHint = "Good length for a solid briefing";
  } else if (jdLen > 0) {
    jdHint = `${Math.max(0, 20 - jdLen)} more characters recommended`;
  }

  useEffect(() => {
    if (!user?.id || isDemo) return;
    (async () => {
      const { data } = await supabase.from("user_profiles").select("resume_text").eq("user_id", user.id).single();
      if (data?.resume_text) {
        setCvText(data.resume_text);
        setCvOpen(true);
      }
    })();
  }, [user?.id, isDemo]);

  const submit = async () => {
    setError("");
    setResult(null);
    if (isDemo) {
      setError("Sign in to run company research.");
      return;
    }
    if (blocked) {
      onOpenUpgrade?.();
      return;
    }
    const name = company.trim();
    if (!name) {
      setError("Enter a company name.");
      return;
    }
    const parsed = parseResearchJobInputs(jobUrl, jobDescription);
    const descPayload = parsed.descTrim;
    const urlOk = Boolean(parsed.effectiveJobUrl);
    const sendUrl = parsed.effectiveJobUrl;
    const submitUrlWarning = sendUrl ? indeedSearchResultsUrlMessage(sendUrl) : null;
    const descOk = descPayload.length >= 20;
    if (!urlOk && !descOk) {
      setError(
        "Add a working job link (Job posting URL field, or a line that contains https://…), or paste the job description (about 20+ characters)."
      );
      return;
    }
    if (submitUrlWarning && !descOk) {
      setError(submitUrlWarning);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/company-research", {
        method: "POST",
        headers: await jsonAuthHeaders(),
        body: JSON.stringify({
          companyName: name,
          jobUrl: urlOk ? sendUrl : undefined,
          jobDescription: descPayload,
          cvText: cvText.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(messageForFailedApiResponse(res, data));
        setLoading(false);
        return;
      }
      if (!isPro) markFreeResearchUsed();
      setResult(data);
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const clearForm = () => {
    setCompany("");
    setJobUrl("");
    setJobDescription("");
    setError("");
    setResult(null);
    if (!user?.id || isDemo) {
      setCvText("");
      setCvOpen(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from("user_profiles").select("resume_text").eq("user_id", user.id).single();
      setCvText(data?.resume_text || "");
      setCvOpen(!!data?.resume_text);
    })();
  };

  const co = result?.companyOverview || {};
  const ra = result?.roleAnalysis || {};
  const ip = result?.interviewPrep || {};
  const si = result?.salaryInsights || {};
  const cm = result?.cvMatch;

  return (
    <div
      className="flow-dark-shell"
      style={{
        minHeight: "100vh",
        fontFamily: FH.font,
        color: FH.text,
        position: "relative",
        boxSizing: "border-box",
        background: "#070510",
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 85% -10%, rgba(91, 33, 182, 0.35) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 0% 100%, rgba(30, 27, 75, 0.5) 0%, transparent 45%),
          linear-gradient(165deg, #08060f 0%, #0a0618 42%, #000000 100%)
        `,
        colorScheme: "dark",
      }}
    >
      <style>{`
        @keyframes cr-gridPulse { 0%, 100% { opacity: 0.32; } 50% { opacity: 0.48; } }
        .cr-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.034) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.034) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: cr-gridPulse 8s ease-in-out infinite;
        }
        .cr-title-grad {
          font-size: clamp(1.65rem, 4vw, 2.25rem);
          font-weight: 800;
          letter-spacing: -0.035em;
          margin: 0;
          line-height: 1.12;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 38%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 960px) {
          .cr-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
        }
      `}</style>
      <div className="cr-page-grid" aria-hidden />

      <div style={{ position: "relative", zIndex: 2, maxWidth: "1120px", margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 className="cr-title-grad">Company Research</h1>
          <p style={{ margin: "12px 0 0", fontSize: "15px", color: FH.muted, lineHeight: 1.6, maxWidth: "640px" }}>
            AI briefing on culture, role fit, and interview angles. Paste a <strong style={{ color: "#e4e4e7", fontWeight: 600 }}>single job posting URL</strong> or the full description. Indeed and LinkedIn often block server fetches — use a direct “view job” link or paste the text.
          </p>
          {!isPro && !blocked && (
            <span
              style={{
                display: "inline-flex",
                marginTop: "14px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#c4b5fd",
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(167, 139, 250, 0.35)",
                background: "rgba(124, 58, 237, 0.12)",
              }}
            >
              Free includes 1 research — Pro unlimited
            </span>
          )}
        </div>

        {blocked && (
          <div
            style={{
              ...mockCard,
              marginBottom: "20px",
              padding: "20px 22px",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              background: "rgba(69, 10, 10, 0.45)",
            }}
          >
            <p style={{ margin: 0, color: "#fecaca", lineHeight: 1.55, fontSize: "14px" }}>
              You&apos;ve used your free company research. Upgrade to Pro for unlimited briefings.
            </p>
            <button type="button" style={{ ...btnPrimary, marginTop: "14px", borderRadius: "12px", fontWeight: 700 }} {...btnPrimaryHover} onClick={() => onOpenUpgrade?.()}>
              Upgrade to Pro
            </button>
          </div>
        )}

        <div className="cr-layout">
          <div>
            <div
              style={{
                ...mockCard,
                padding: "24px 22px 22px",
                border: "1px solid rgba(139, 92, 246, 0.18)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 24px 64px rgba(0,0,0,0.45), 0 0 100px rgba(124, 58, 237, 0.08)",
              }}
            >
              <SectionLabel>Company</SectionLabel>
              <FieldShell style={{ marginBottom: "20px" }}>
                <input
                  className="candidate-input"
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    border: "none",
                    background: "transparent",
                    color: FH.text,
                    fontSize: "15px",
                    fontWeight: 600,
                    padding: 0,
                    outline: "none",
                  }}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </FieldShell>

              <SectionLabel>Job posting URL</SectionLabel>
              <FieldShell style={{ marginBottom: "16px" }}>
                <input
                  className="candidate-input"
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    border: "none",
                    background: "transparent",
                    color: FH.text,
                    fontSize: "14px",
                    padding: 0,
                    outline: "none",
                  }}
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://careers.example.com/jobs/…"
                  inputMode="url"
                  autoComplete="url"
                />
              </FieldShell>
              {urlStructuralWarning && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(251, 191, 36, 0.35)",
                    background: "rgba(120, 53, 15, 0.25)",
                    fontSize: "13px",
                    lineHeight: 1.55,
                    color: "#fde68a",
                  }}
                >
                  {jdLen >= 20
                    ? "That Indeed URL looks like search results — we’ll use your pasted description and skip fetching the link."
                    : urlStructuralWarning}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
                <SectionLabel style={{ marginBottom: 0 }}>Job description</SectionLabel>
                <span style={{ fontSize: "11px", fontWeight: 600, color: jdLen >= 20 ? "#86efac" : hasValidUrl ? "#a78bfa" : FH.dim }}>{jdHint}</span>
              </div>
              <FieldShell style={{ marginBottom: "10px" }}>
                <textarea
                  className="candidate-input"
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    border: "none",
                    background: "transparent",
                    color: FH.text,
                    minHeight: "160px",
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    lineHeight: 1.55,
                    padding: 0,
                    outline: "none",
                  }}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Optional if you used the URL field — or put the link on the first line here, then the posting below…"
                />
              </FieldShell>
              <p style={{ margin: "0 0 20px", fontSize: "12px", color: FH.dim, lineHeight: 1.5 }}>
                Indeed/LinkedIn often return a bot wall to our servers — if fetch fails, paste the posting here. For Indeed, open the job (not the search page) and copy from there.
              </p>

              <button
                type="button"
                onClick={() => setCvOpen((o) => !o)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  marginBottom: cvOpen ? "12px" : "20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(139, 92, 246, 0.22)",
                  background: "rgba(124, 58, 237, 0.08)",
                  color: "#e9d5ff",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: FH.font,
                }}
              >
                <span>Your CV (optional — powers match score)</span>
                <span style={{ color: "#a78bfa", fontSize: "12px" }}>{cvOpen ? "Hide" : cvText.trim() ? "Edit" : "Add"}</span>
              </button>
              {cvOpen && (
                <FieldShell style={{ marginBottom: "22px" }}>
                  <textarea
                    className="candidate-input"
                    style={{
                      ...input,
                      width: "100%",
                      boxSizing: "border-box",
                      border: "none",
                      background: "transparent",
                      color: FH.text,
                      minHeight: "120px",
                      resize: "vertical",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      lineHeight: 1.55,
                      padding: 0,
                      outline: "none",
                    }}
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    placeholder="Pre-filled from Profile when available — tweak for this role if you like."
                  />
                </FieldShell>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  style={{
                    ...btnPrimary,
                    padding: "14px 26px",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "15px",
                    boxShadow: "0 8px 36px rgba(124, 58, 237, 0.5)",
                    opacity: blocked ? 0.5 : 1,
                  }}
                  {...btnPrimaryHover}
                  onClick={submit}
                  disabled={loading || blocked}
                >
                  {loading ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                      <span
                        className="candidate-spinner"
                        style={{
                          width: "18px",
                          height: "18px",
                          border: "2px solid rgba(255,255,255,0.35)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Generating briefing…
                    </span>
                  ) : (
                    "Generate briefing →"
                  )}
                </button>
                <button
                  type="button"
                  onClick={clearForm}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(139, 92, 246, 0.28)",
                    color: FH.muted,
                    fontWeight: 600,
                    padding: "12px 20px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontFamily: FH.font,
                  }}
                  {...ghostBtn}
                >
                  Reset form
                </button>
                <span style={{ fontSize: "12px", color: FH.dim, marginLeft: "auto" }}>Est. ~30s</span>
              </div>
              {error ? <p style={{ color: "#f87171", marginTop: "16px", marginBottom: 0, fontSize: "14px", lineHeight: 1.5 }}>{error}</p> : null}
            </div>

            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "20px" }}>
                <ResultBlock title="Company overview">
                  <p style={{ margin: "0 0 10px" }}>
                    <strong style={{ color: FH.text }}>What they do:</strong> {co.whatTheyDo}
                  </p>
                  <p style={{ margin: "0 0 10px" }}>
                    <strong style={{ color: FH.text }}>Industry &amp; size:</strong> {co.industryAndSize}
                  </p>
                  <p style={{ margin: "0 0 10px" }}>
                    <strong style={{ color: FH.text }}>Founded / HQ:</strong> {co.foundedAndHq}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: FH.text }}>Mission &amp; values:</strong> {co.missionValues}
                  </p>
                </ResultBlock>

                <ResultBlock title="Role analysis">
                  <p style={{ margin: "0 0 12px" }}>{ra.whatRoleIsAbout}</p>
                  <p style={{ fontWeight: 700, color: "#e9d5ff", marginBottom: "8px" }}>Key skills</p>
                  <ul style={{ paddingLeft: "20px", margin: "0 0 12px" }}>
                    {(ra.keySkills || []).map((x) => (
                      <li key={x} style={{ marginBottom: "4px" }}>
                        {x}
                      </li>
                    ))}
                  </ul>
                  <p style={{ margin: "0 0 8px" }}>
                    <strong style={{ color: FH.text }}>Seniority:</strong> {ra.seniority}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: FH.text }}>Likely team:</strong> {ra.likelyTeamStructure}
                  </p>
                </ResultBlock>

                <ResultBlock title="Interview prep">
                  <p style={{ fontWeight: 700, color: "#e9d5ff", marginBottom: "10px" }}>Likely questions</p>
                  <ol style={{ paddingLeft: "20px", margin: "0 0 14px" }}>
                    {(ip.likelyQuestions || []).slice(0, 8).map((x) => (
                      <li key={x} style={{ marginBottom: "6px" }}>
                        {x}
                      </li>
                    ))}
                  </ol>
                  <p style={{ margin: "0 0 12px" }}>
                    <strong style={{ color: FH.text }}>What they care about:</strong> {ip.whatTheyCareAbout}
                  </p>
                  <p style={{ fontWeight: 700, color: "#e9d5ff", marginBottom: "8px" }}>Red flags to avoid</p>
                  <ul style={{ paddingLeft: "20px", margin: "0 0 12px" }}>
                    {(ip.redFlagsToAvoid || []).map((x) => (
                      <li key={x} style={{ marginBottom: "4px" }}>
                        {x}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontWeight: 700, color: "#e9d5ff", marginBottom: "8px" }}>Questions you should ask</p>
                  <ul style={{ paddingLeft: "20px", margin: 0 }}>
                    {(ip.questionsToAskThem || []).map((x) => (
                      <li key={x} style={{ marginBottom: "4px" }}>
                        {x}
                      </li>
                    ))}
                  </ul>
                </ResultBlock>

                <ResultBlock title="Salary insights">
                  <p style={{ margin: "0 0 10px" }}>
                    <strong style={{ color: FH.text }}>Typical range:</strong> {si.typicalRange}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: FH.text }}>Negotiation:</strong> {si.negotiationTips}
                  </p>
                </ResultBlock>

                {cm && (
                  <ResultBlock title="Your CV match">
                    <p style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 800, color: "#c4b5fd", margin: "0 0 14px", letterSpacing: "-0.03em" }}>{cm.matchPercent}%</p>
                    <p style={{ fontWeight: 700, color: "#e9d5ff", marginBottom: "8px" }}>Top strengths</p>
                    <ul style={{ paddingLeft: "20px", margin: "0 0 14px" }}>
                      {(cm.topStrengths || []).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    <p style={{ fontWeight: 700, color: "#e9d5ff", marginBottom: "8px" }}>Gaps to address</p>
                    <ul style={{ paddingLeft: "20px", margin: "0 0 14px" }}>
                      {(cm.topGaps || []).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    <p style={{ margin: 0 }}>{cm.positioningLine}</p>
                  </ResultBlock>
                )}

                {result.disclaimer && (
                  <p style={{ fontSize: "12px", fontStyle: "italic", color: FH.dim, margin: "4px 0 0", lineHeight: 1.5 }}>{result.disclaimer}</p>
                )}
              </div>
            )}
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ ...mockCard, padding: "18px 16px" }}>
              <SectionLabel style={{ marginBottom: "12px" }}>What you&apos;ll get</SectionLabel>
              <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: "13px", color: FH.muted, lineHeight: 1.65 }}>
                <li style={{ marginBottom: "8px" }}>Company snapshot &amp; culture cues</li>
                <li style={{ marginBottom: "8px" }}>Role breakdown &amp; key skills</li>
                <li style={{ marginBottom: "8px" }}>Interview questions &amp; red flags</li>
                <li style={{ marginBottom: "8px" }}>Salary context &amp; negotiation tips</li>
                <li>Works with a public job URL or pasted text</li>
              </ul>
            </div>
            <div
              style={{
                ...mockCard,
                padding: "16px",
                background: "rgba(124, 58, 237, 0.1)",
                border: "1px solid rgba(167, 139, 250, 0.25)",
              }}
            >
              <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.55, color: "#d4d4d8" }}>
                <strong style={{ color: "#e9d5ff" }}>Pro tip:</strong> Prefer the employer&apos;s careers URL; LinkedIn sometimes needs you to paste the description if our fetch is blocked.
              </p>
            </div>
            <div style={{ ...mockCard, padding: "16px" }}>
              <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: FH.dim, marginBottom: "10px" }}>
                After you run
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: FH.muted, lineHeight: 1.55 }}>
                Use <strong style={{ color: FH.text }}>Prepare</strong> to drill questions, or <strong style={{ color: FH.text }}>Job Tracker</strong> to link this role to your pipeline.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
