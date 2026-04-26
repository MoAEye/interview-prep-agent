import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import LockIcon from "./components/LockIcon.jsx";
import { btnPrimary, btnPrimaryHover, input } from "./candidateUi.jsx";

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

const ghostOutline = {
  border: "1px solid rgba(139, 92, 246, 0.35)",
  background: "rgba(0,0,0,0.25)",
  color: "#e4e4e7",
  fontWeight: 600,
  fontSize: "13px",
  padding: "8px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontFamily: FH.font,
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

function formatRelative(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

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
        marginBottom: "12px",
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

function IconCv() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l1.09 6.26L18 9l-4.91.74L12 16l-1.09-6.26L6 9l4.91-.74L12 2z" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 21h18M5 21V7l8-4v18M13 21V11h5v10" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TOOLS = [
  { key: "cveditor", title: "CV Editor", blurb: "Polish your profile text and structure.", Icon: IconCv, pro: true },
  { key: "cvtailor", title: "CV Tailor", blurb: "Align your CV to a specific posting.", Icon: IconSpark, pro: true },
  { key: "academy", title: "Interview Academy", blurb: "Micro-lessons and practice prompts.", Icon: IconBook, pro: true },
  { key: "research", title: "Company research", blurb: "Briefings from a job URL or paste-in.", Icon: IconBuilding, pro: false },
];

export default function DocumentsLibrary({ user, onBack, onNavigateScreen, isPro = false }) {
  const [docs, setDocs] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("recent");

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: jobs } = await supabase.from("jobs").select("id, title, company").eq("user_id", user.id);
      if (cancelled) return;
      const map = {};
      (jobs || []).forEach((j) => {
        map[j.id] = j;
      });
      setJobsById(map);
      const { data: list } = await supabase.from("documents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (cancelled) return;
      setDocs(Array.isArray(list) ? list : []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemo]);

  const jobLabel = (doc) => {
    const j = jobsById[doc.job_id];
    if (!j) return "Unknown job";
    return j.company ? `${j.title} @ ${j.company}` : j.title;
  };

  const coverLetterCount = useMemo(() => docs.filter((d) => d.doc_type === "cover_letter").length, [docs]);
  const lastEdited = useMemo(() => {
    if (!docs.length) return null;
    const t = Math.max(...docs.map((d) => new Date(d.created_at || 0).getTime()));
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }, [docs]);

  const filteredDocs = useMemo(() => {
    let list = [...docs];
    if (typeFilter !== "all") list = list.filter((d) => d.doc_type === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        const label = jobLabel(d).toLowerCase();
        const content = (d.content || "").toLowerCase();
        return label.includes(q) || content.includes(q);
      });
    }
    list.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return sortOrder === "recent" ? tb - ta : ta - tb;
    });
    return list;
  }, [docs, search, typeFilter, sortOrder, jobsById]);

  const shell = (
    <>
      <style>{`
        @keyframes doc-gridPulse { 0%, 100% { opacity: 0.32; } 50% { opacity: 0.48; } }
        .doc-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.034) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.034) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: doc-gridPulse 8s ease-in-out infinite;
        }
        .doc-title-grad {
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
      `}</style>
      <div className="doc-page-grid" aria-hidden />
    </>
  );

  const goTool = (t) => {
    if (t.pro && !isPro) onNavigateScreen("pricing");
    else onNavigateScreen(t.key);
  };

  if (isDemo) {
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
        {shell}
        <div style={{ position: "relative", zIndex: 2, maxWidth: "560px", margin: "0 auto", padding: "48px 16px" }}>
          <div
            style={{
              ...mockCard,
              padding: "28px 24px",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 24px 64px rgba(0,0,0,0.45)",
            }}
          >
            <p style={{ margin: "0 0 16px", fontSize: "15px", color: FH.muted, lineHeight: 1.55 }}>Documents are only available when you sign in.</p>
            <button type="button" onClick={onBack} style={{ ...btnPrimary, borderRadius: "12px", fontWeight: 700 }} {...btnPrimaryHover}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      {shell}
      <div style={{ position: "relative", zIndex: 2, maxWidth: "1120px", margin: "0 auto", padding: "24px 16px 80px" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div style={{ minWidth: "min(100%, 320px)" }}>
            <h1 className="doc-title-grad">Documents</h1>
            <p style={{ margin: "12px 0 0", fontSize: "15px", color: FH.muted, lineHeight: 1.6, maxWidth: "520px" }}>
              CV tools, cover letters, and notes saved from Job Tracker — search, filter, and copy in one place.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            {[
              { label: `${docs.length} saved`, sub: "total" },
              { label: `${coverLetterCount} letters`, sub: "cover" },
              { label: lastEdited ? formatRelative(lastEdited) : "—", sub: "last edit" },
            ].map((k) => (
              <div
                key={k.sub}
                style={{
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(139, 92, 246, 0.22)",
                  background: "rgba(0,0,0,0.35)",
                  minWidth: "100px",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 800, color: FH.text }}>{k.label}</div>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: FH.dim, marginTop: "2px" }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </header>

        {typeof onNavigateScreen === "function" && (
          <>
            <SectionLabel>Quick tools</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "16px",
                marginBottom: "36px",
              }}
            >
              {TOOLS.map((t) => {
                const Icon = t.Icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    className="candidate-card-hover"
                    onClick={() => goTool(t)}
                    style={{
                      ...mockCard,
                      padding: "20px 18px",
                      border: "1px solid rgba(139, 92, 246, 0.18)",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 16px 48px rgba(0,0,0,0.4), 0 0 80px rgba(124, 58, 237, 0.06)",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <Icon />
                      {t.pro && !isPro ? <LockIcon size={16} color="#a78bfa" /> : null}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: FH.text, lineHeight: 1.3 }}>{t.title}</div>
                    <p style={{ margin: 0, fontSize: "13px", color: FH.dim, lineHeight: 1.45 }}>{t.blurb}</p>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#c4b5fd", marginTop: "4px" }}>Open →</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <SectionLabel>Cover letters &amp; notes</SectionLabel>

        {!loading && docs.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <input
              className="candidate-input"
              type="search"
              placeholder="Search by job or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                ...input,
                flex: "1 1 200px",
                minWidth: "180px",
                maxWidth: "320px",
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "14px",
              }}
            />
            <select
              className="candidate-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                ...input,
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="all">All types</option>
              <option value="cover_letter">Cover letters</option>
              <option value="cover_note">Cover notes</option>
            </select>
            <select
              className="candidate-input"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{
                ...input,
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="recent">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        )}

        {loading ? (
          <p style={{ margin: 0, fontSize: "14px", color: FH.dim }}>Loading…</p>
        ) : docs.length === 0 ? (
          <div
            style={{
              ...mockCard,
              textAlign: "center",
              padding: "40px 24px",
              border: "1px solid rgba(139, 92, 246, 0.18)",
            }}
          >
            <p style={{ margin: "0 0 20px", fontSize: "15px", color: FH.muted, lineHeight: 1.55 }}>
              No documents yet. Open <strong style={{ color: "#e4e4e7" }}>Job Tracker</strong>, pick a role, and generate a cover letter or note to save it here.
            </p>
            <button
              type="button"
              onClick={() => (typeof onNavigateScreen === "function" ? onNavigateScreen("jobs") : onBack())}
              style={{ ...btnPrimary, borderRadius: "12px", fontWeight: 700, boxShadow: "0 0 24px rgba(124, 58, 237, 0.25)" }}
              {...btnPrimaryHover}
            >
              Go to Job Tracker
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ ...mockCard, padding: "28px 20px", border: "1px solid rgba(139, 92, 246, 0.15)" }}>
            <p style={{ margin: 0, fontSize: "14px", color: FH.muted }}>No matches for this search or filter.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredDocs.map((doc) => {
              const isLetter = doc.doc_type === "cover_letter";
              const accent = isLetter ? "#2dd4bf" : "#a78bfa";
              const expanded = expandedId === doc.id;
              return (
                <li
                  key={doc.id}
                  className="candidate-card-hover"
                  style={{
                    ...mockCard,
                    padding: 0,
                    overflow: "hidden",
                    border: "1px solid rgba(139, 92, 246, 0.16)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 12px 40px rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      flexWrap: "wrap",
                      gap: 0,
                    }}
                  >
                    <div style={{ width: "4px", flexShrink: 0, background: accent, boxShadow: `0 0 16px ${accent}55` }} aria-hidden />
                    <div
                      style={{
                        flex: "1 1 240px",
                        padding: "16px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "14px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "15px", color: FH.text }}>{isLetter ? "Cover letter" : "Cover note"}</div>
                        <div style={{ color: FH.muted, fontSize: "14px", marginTop: "4px", lineHeight: 1.4 }}>{jobLabel(doc)}</div>
                        <div style={{ color: FH.dim, fontSize: "12px", marginTop: "6px" }}>
                          {doc.created_at
                            ? new Date(doc.created_at).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : doc.id)}
                          style={{ ...ghostOutline }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(167, 139, 250, 0.55)";
                            e.currentTarget.style.background = "rgba(124, 58, 237, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.35)";
                            e.currentTarget.style.background = "rgba(0,0,0,0.25)";
                          }}
                        >
                          {expanded ? "Hide" : "Preview"}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(doc.content || "")}
                          style={{
                            ...ghostOutline,
                            borderColor: "rgba(45, 212, 191, 0.35)",
                            color: "#5eead4",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(45, 212, 191, 0.12)";
                            e.currentTarget.style.borderColor = "rgba(45, 212, 191, 0.5)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(0,0,0,0.25)";
                            e.currentTarget.style.borderColor = "rgba(45, 212, 191, 0.35)";
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  {expanded && (
                    <div
                      style={{
                        margin: "0 18px 18px",
                        padding: "16px",
                        background: "rgba(0,0,0,0.45)",
                        borderRadius: "12px",
                        border: "1px solid rgba(139, 92, 246, 0.12)",
                        fontSize: "13px",
                        whiteSpace: "pre-wrap",
                        maxHeight: "320px",
                        overflowY: "auto",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        color: "#d4d4d8",
                        lineHeight: 1.55,
                      }}
                    >
                      {doc.content || ""}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
