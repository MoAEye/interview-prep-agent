import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  btnPrimary,
  btnPrimaryHover,
  btnSecondary,
  btnSecondaryHover,
  label,
  input,
} from "./candidateUi.jsx";
import LockIcon from "./components/LockIcon.jsx";

const FH = {
  font: "'Inter', system-ui, sans-serif",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  dim: "#71717a",
};

const STATUSES = ["saved", "applied", "interview", "rejected", "offered"];

const STATUS_META = {
  saved: { label: "Saved", accent: "#a1a1aa", glow: "rgba(161,161,170,0.35)", bar: "rgba(113,113,122,0.85)" },
  applied: { label: "Applied", accent: "#c4b5fd", glow: "rgba(167,139,250,0.4)", bar: "rgba(139,92,246,0.9)" },
  interview: { label: "Interview", accent: "#34d399", glow: "rgba(52,211,153,0.35)", bar: "rgba(16,185,129,0.9)" },
  rejected: { label: "Rejected", accent: "#f87171", glow: "rgba(248,113,113,0.3)", bar: "rgba(239,68,68,0.85)" },
  offered: { label: "Offered", accent: "#fbbf24", glow: "rgba(251,191,36,0.35)", bar: "rgba(245,158,11,0.9)" },
};

const mockCard = {
  borderRadius: "14px",
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

function scoreTone(score) {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  if (score >= 40) return "#fb923c";
  return "#f87171";
}

function formatRelative(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (86400000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function escapeCsv(s) {
  const x = String(s ?? "");
  if (/[",\n]/.test(x)) return `"${x.replace(/"/g, '""')}"`;
  return x;
}

function exportJobsCsv(jobs) {
  const header = ["Company", "Title", "Status", "Job URL", "Updated"].map(escapeCsv).join(",");
  const lines = jobs.map((j) =>
    [j.company, j.title, j.status, j.job_url || "", j.updated_at].map(escapeCsv).join(",")
  );
  const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `interviewai-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
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

export default function JobTracker({ user, onBack, isPro = false, onOpenUpgrade }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ company: "", title: "", job_url: "", job_description: "", status: "saved" });
  const [saveError, setSaveError] = useState("");
  const [generating, setGenerating] = useState(null);
  const [genError, setGenError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null);
  const [attemptsByJobId, setAttemptsByJobId] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [expandedAttempts, setExpandedAttempts] = useState({});

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!user || isDemo) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("jobs").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (!cancelled) {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (!user || isDemo) return undefined;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("interview_sessions")
        .select("job_id, score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const byJob = {};
      (data || []).forEach((s) => {
        if (!s.job_id) return;
        if (!byJob[s.job_id]) byJob[s.job_id] = [];
        byJob[s.job_id].push({ score: s.score, created_at: s.created_at });
      });
      setAttemptsByJobId(byJob);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isDemo]);

  const loadJobs = async () => {
    if (!user?.id || isDemo) return;
    const { data } = await supabase.from("jobs").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    setJobs(Array.isArray(data) ? data : []);
  };

  const handleSave = async () => {
    if (isDemo) return;
    if (!form.title?.trim()) {
      setSaveError("Job title is required.");
      return;
    }
    setSaveError("");
    const row = {
      user_id: user.id,
      company: form.company || "",
      title: form.title.trim(),
      job_url: form.job_url || "",
      job_description: form.job_description || "",
      status: form.status || "saved",
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      const { error } = await supabase.from("jobs").update(row).eq("id", editingId).eq("user_id", user.id);
      if (error) {
        setSaveError(error.message);
        return;
      }
      setEditingId(null);
    } else {
      const { error } = await supabase.from("jobs").insert([row]);
      if (error) {
        setSaveError(error.message);
        return;
      }
    }
    setForm({ company: "", title: "", job_url: "", job_description: "", status: "saved" });
    setShowForm(false);
    loadJobs();
  };

  const handleStatusChange = async (jobId, newStatus) => {
    if (isDemo) return;
    await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", jobId).eq("user_id", user.id);
    loadJobs();
  };

  const startEdit = (job) => {
    setForm({
      company: job.company || "",
      title: job.title || "",
      job_url: job.job_url || "",
      job_description: job.job_description || "",
      status: job.status || "saved",
    });
    setEditingId(job.id);
    setShowForm(true);
  };

  const generateDoc = async (job, type) => {
    if (isDemo) return;
    if (!isPro) {
      onOpenUpgrade?.();
      return;
    }
    setGenerating({ jobId: job.id, type });
    setGenError("");
    setLastGenerated(null);
    try {
      const { data: profile } = await supabase.from("user_profiles").select("resume_text").eq("user_id", user.id).single();
      const cvText = profile?.resume_text || "";
      if (!cvText.trim()) {
        setGenError("Save your CV in Profile first.");
        setGenerating(null);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const endpoint = type === "cover_letter" ? "/api/generate-cover-letter" : "/api/generate-cover-note";
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cv_text: cvText,
          job_title: job.title,
          company: job.company || "",
          job_description: job.job_description || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && data?.code === "PRO_REQUIRED") onOpenUpgrade?.();
        setGenError(data?.error || "Request failed");
        setGenerating(null);
        return;
      }
      const content = type === "cover_letter" ? (data.cover_letter || "") : (data.cover_note || "");
      const { error: insertErr } = await supabase.from("documents").insert([{ user_id: user.id, job_id: job.id, doc_type: type, content }]);
      if (insertErr) {
        setGenError(insertErr.message);
        setGenerating(null);
        return;
      }
      setLastGenerated({ jobId: job.id, content, type, jobTitle: job.title });
    } catch (e) {
      setGenError(e?.message || "Something went wrong");
    }
    setGenerating(null);
  };

  const stats = useMemo(() => {
    const total = jobs.length;
    const pipeline = jobs.filter((j) => ["applied", "interview"].includes(j.status)).length;
    let attemptCount = 0;
    let bestSum = 0;
    let bestN = 0;
    jobs.forEach((j) => {
      const a = attemptsByJobId[j.id] || [];
      attemptCount += a.length;
      const best = a.length ? Math.max(...a.map((x) => Number(x.score) || 0)) : 0;
      if (a.length) {
        bestSum += best;
        bestN += 1;
      }
    });
    const avgBest = bestN ? Math.round(bestSum / bestN) : 0;
    const statusCounts = {};
    STATUSES.forEach((s) => {
      statusCounts[s] = jobs.filter((j) => (j.status || "saved") === s).length;
    });
    return { total, pipeline, attemptCount, avgBest, statusCounts };
  }, [jobs, attemptsByJobId]);

  const pipelineSegments = useMemo(() => {
    const n = stats.total || 1;
    return STATUSES.map((s) => ({
      key: s,
      pct: ((stats.statusCounts[s] || 0) / n) * 100,
      bar: STATUS_META[s].bar,
    })).filter((x) => x.pct > 0);
  }, [stats]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((j) => {
        const t = `${j.title || ""} ${j.company || ""}`.toLowerCase();
        return t.includes(q);
      });
    }
    if (filterStatus !== "all") {
      list = list.filter((j) => (j.status || "saved") === filterStatus);
    }
    list.sort((a, b) => {
      if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
    return list;
  }, [jobs, searchQuery, filterStatus, sortBy]);

  if (isDemo) {
    return (
      <div
        className="flow-dark-shell"
        style={{
          minHeight: "100vh",
          fontFamily: FH.font,
          background: "#070510",
          backgroundImage: "linear-gradient(165deg, #08060f 0%, #0a0618 42%, #000000 100%)",
          color: FH.text,
          colorScheme: "dark",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ ...mockCard, padding: "32px", textAlign: "center", maxWidth: "420px" }}>
          <p style={{ color: FH.muted, marginBottom: "16px", lineHeight: 1.55 }}>Job tracker is only available when you sign in.</p>
          <button type="button" onClick={onBack} style={btnPrimary} {...btnPrimaryHover}>
            Back
          </button>
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
        backgroundImage: "linear-gradient(165deg, #08060f 0%, #0a0618 42%, #000000 100%)",
        colorScheme: "dark",
      }}
    >
      <style>{`
        @keyframes jt-gridPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.5; } }
        .jt-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.035) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: jt-gridPulse 8s ease-in-out infinite;
        }
        .jt-title-grad {
          font-size: clamp(1.5rem, 3.5vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0;
          line-height: 1.15;
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 40%, #c4b5fd 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @media (max-width: 640px) {
          .jt-kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
      <div className="jt-page-grid" aria-hidden />

      <div style={{ position: "relative", zIndex: 2, maxWidth: "1120px", margin: "0 auto", padding: "24px 16px 80px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "transparent",
              border: "1px solid rgba(139, 92, 246, 0.28)",
              color: FH.muted,
              fontWeight: 600,
              padding: "10px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: FH.font,
            }}
            {...ghostBtn}
          >
            Back
          </button>
          <div style={{ flex: "1 1 200px" }}>
            <h1 className="jt-title-grad">Job Tracker</h1>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: FH.muted, lineHeight: 1.5 }}>
              Pipeline, prep attempts, and AI cover assets in one command center.
            </p>
            {!isPro && (
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#a78bfa", lineHeight: 1.45 }}>
                Cover letter &amp; cover note generation are Pro — upgrade to generate from your saved CV.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm({ company: "", title: "", job_url: "", job_description: "", status: "saved" });
              setSaveError("");
            }}
            style={{
              ...btnPrimary,
              padding: "12px 22px",
              borderRadius: "12px",
              fontWeight: 700,
              boxShadow: "0 8px 32px rgba(124, 58, 237, 0.45)",
            }}
            {...btnPrimaryHover}
          >
            Add job
          </button>
        </div>

        {!loading && jobs.length > 0 && (
          <>
            <div
              className="jt-kpi-row"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              {[
                ["Total roles", stats.total, "#e9d5ff"],
                ["In pipeline", stats.pipeline, "#a78bfa"],
                ["Prep attempts", stats.attemptCount, "#c4b5fd"],
                ["Avg best score", stats.avgBest || "—", stats.avgBest >= 70 ? "#34d399" : stats.avgBest >= 40 ? "#fbbf24" : "#f87171"],
              ].map(([k, v, col]) => (
                <div key={k} style={{ ...mockCard, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: FH.dim, marginBottom: "6px" }}>{k}</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: col, letterSpacing: "-0.02em" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ ...mockCard, padding: "14px 16px", marginBottom: "14px" }}>
              <SectionLabel style={{ marginBottom: "10px" }}>Pipeline mix</SectionLabel>
              <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.06)", gap: "2px" }}>
                {pipelineSegments.length === 0 ? (
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)" }} />
                ) : (
                  pipelineSegments.map((seg) => (
                    <div
                      key={seg.key}
                      title={`${STATUS_META[seg.key].label}: ${Math.round(seg.pct)}%`}
                      style={{
                        flexGrow: Math.max(seg.pct, 0.5),
                        flexBasis: 0,
                        minWidth: seg.pct > 0 ? 4 : 0,
                        background: seg.bar,
                        transition: "flex-grow 0.3s ease",
                      }}
                    />
                  ))
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "10px", fontSize: "11px", color: FH.dim }}>
                {STATUSES.map((s) => (
                  <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: STATUS_META[s].bar }} />
                    {STATUS_META[s].label} ({stats.statusCounts[s] || 0})
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        <div
          style={{
            ...mockCard,
            padding: "14px 16px",
            marginBottom: "14px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <input
            type="search"
            placeholder="Search title or company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="candidate-input"
            style={{
              flex: "1 1 200px",
              minWidth: "160px",
              padding: "10px 14px",
              borderRadius: "999px",
              fontSize: "13px",
              fontFamily: FH.font,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: FH.text,
            }}
          />
          <select
            className="candidate-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              fontFamily: FH.font,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: FH.text,
            }}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            className="candidate-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              fontFamily: FH.font,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: FH.text,
            }}
          >
            <option value="recent">Sort: Recently updated</option>
            <option value="company">Sort: Company A–Z</option>
            <option value="title">Sort: Title A–Z</option>
            <option value="status">Sort: Status</option>
          </select>
          {jobs.length > 0 && (
            <button
              type="button"
              onClick={() => exportJobsCsv(jobs)}
              style={{
                background: "transparent",
                border: "1px solid rgba(139, 92, 246, 0.35)",
                color: "#c4b5fd",
                fontWeight: 600,
                padding: "10px 16px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: FH.font,
              }}
              {...ghostBtn}
            >
              Export CSV
            </button>
          )}
        </div>

        {showForm && (
          <div style={{ ...mockCard, padding: "20px 18px", marginBottom: "16px", border: "1px solid rgba(139,92,246,0.22)" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "14px", color: FH.text, letterSpacing: "-0.02em" }}>{editingId ? "Edit job" : "New job"}</h2>
            <div style={{ display: "grid", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={{ ...label, color: FH.muted }}>Company</label>
                <input
                  className="candidate-input"
                  placeholder="Company"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  style={{
                    ...input,
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: FH.text,
                  }}
                />
              </div>
              <div>
                <label style={{ ...label, color: FH.muted }}>Job title</label>
                <input
                  className="candidate-input"
                  placeholder="Required"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  style={{
                    ...input,
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: FH.text,
                  }}
                />
              </div>
              <div>
                <label style={{ ...label, color: FH.muted }}>Job URL</label>
                <input
                  className="candidate-input"
                  placeholder="Optional"
                  value={form.job_url}
                  onChange={(e) => setForm((f) => ({ ...f, job_url: e.target.value }))}
                  style={{
                    ...input,
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: FH.text,
                  }}
                />
              </div>
              <div>
                <label style={{ ...label, color: FH.muted }}>Job description</label>
                <textarea
                  className="candidate-input"
                  placeholder="Paste description"
                  value={form.job_description}
                  onChange={(e) => setForm((f) => ({ ...f, job_description: e.target.value }))}
                  style={{ ...input, minHeight: "88px", resize: "vertical", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(139,92,246,0.2)", color: FH.text }}
                />
              </div>
              <div>
                <label style={{ ...label, color: FH.muted }}>Status</label>
                <select
                  className="candidate-input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  style={{
                    ...input,
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: FH.text,
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {saveError && <p style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{saveError}</p>}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" onClick={handleSave} style={btnPrimary} {...btnPrimaryHover}>
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setSaveError("");
                }}
                style={btnSecondary}
                {...btnSecondaryHover}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <div className="candidate-spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "#c4b5fd", fontWeight: 600 }}>Loading your pipeline…</p>
          </div>
        ) : jobs.length === 0 && !showForm ? (
          <div style={{ ...mockCard, textAlign: "center", padding: "48px 24px" }}>
            <SectionLabel style={{ justifyContent: "center", marginBottom: "12px" }}>Get started</SectionLabel>
            <p style={{ color: FH.muted, marginBottom: "20px", lineHeight: 1.6, maxWidth: "400px", margin: "0 auto 20px" }}>
              Track every application, link mocks to roles, and generate cover letters from your saved CV.
            </p>
            <button type="button" onClick={() => setShowForm(true)} style={btnPrimary} {...btnPrimaryHover}>
              Add your first job
            </button>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {filteredJobs.length === 0 && (
              <li style={{ ...mockCard, padding: "28px", textAlign: "center", color: FH.dim, fontSize: "14px" }}>No jobs match filters.</li>
            )}
            {filteredJobs.map((job) => {
              const st = job.status || "saved";
              const meta = STATUS_META[st] || STATUS_META.saved;
              const attempts = attemptsByJobId[job.id] || [];
              const showAll = expandedAttempts[job.id];
              const slice = showAll ? attempts : attempts.slice(0, 5);
              return (
                <li
                  key={job.id}
                  style={{
                    ...mockCard,
                    marginBottom: "12px",
                    padding: 0,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: `0 0 0 1px rgba(0,0,0,0.2) inset, 0 12px 40px rgba(0,0,0,0.25), 0 0 48px ${meta.glow}`,
                  }}
                >
                  <div style={{ display: "flex", borderLeft: `3px solid ${meta.accent}` }}>
                    <div style={{ flex: 1, padding: "18px 18px 16px", minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: FH.text, fontSize: "16px", letterSpacing: "-0.02em" }}>{job.title || "Untitled"}</div>
                          {job.company && <div style={{ color: FH.muted, fontSize: "13px", marginTop: "4px" }}>{job.company}</div>}
                          <div style={{ fontSize: "11px", color: FH.dim, marginTop: "8px" }}>
                            Updated {formatRelative(job.updated_at)}
                            {attempts.length > 0 && (
                              <>
                                {" · "}
                                <span style={{ color: "#a78bfa" }}>{attempts.length} prep attempt{attempts.length !== 1 ? "s" : ""}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <select
                            className="candidate-input"
                            value={st}
                            onChange={(e) => handleStatusChange(job.id, e.target.value)}
                            style={{
                              padding: "8px 12px",
                              fontSize: "12px",
                              fontWeight: 700,
                              borderRadius: "10px",
                              background: "rgba(0,0,0,0.4)",
                              border: `1px solid ${meta.accent}55`,
                              color: meta.accent,
                              fontFamily: FH.font,
                              cursor: "pointer",
                            }}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => startEdit(job)} style={{ ...btnSecondary, fontSize: "12px", padding: "8px 12px" }} {...btnSecondaryHover}>
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!!generating}
                            onClick={() => generateDoc(job, "cover_letter")}
                            title={!isPro ? "Pro feature" : undefined}
                            style={{
                              ...btnSecondary,
                              fontSize: "12px",
                              padding: "8px 12px",
                              opacity: generating ? 0.6 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                            {...btnSecondaryHover}
                          >
                            {!isPro && <LockIcon color="#a78bfa" />}
                            {generating?.jobId === job.id && generating?.type === "cover_letter" ? "…" : "Cover letter"}
                          </button>
                          <button
                            type="button"
                            disabled={!!generating}
                            onClick={() => generateDoc(job, "cover_note")}
                            title={!isPro ? "Pro feature" : undefined}
                            style={{
                              ...btnSecondary,
                              fontSize: "12px",
                              padding: "8px 12px",
                              opacity: generating ? 0.6 : 1,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                            {...btnSecondaryHover}
                          >
                            {!isPro && <LockIcon color="#a78bfa" />}
                            {generating?.jobId === job.id && generating?.type === "cover_note" ? "…" : "Cover note"}
                          </button>
                        </div>
                      </div>
                      {genError && generating?.jobId === job.id && <p style={{ color: "#f87171", fontSize: "12px", marginTop: "12px" }}>{genError}</p>}
                      {lastGenerated && lastGenerated.jobId === job.id && (
                        <div
                          style={{
                            marginTop: "14px",
                            padding: "14px",
                            background: "rgba(0,0,0,0.45)",
                            borderRadius: "12px",
                            fontSize: "13px",
                            border: "1px solid rgba(139,92,246,0.2)",
                          }}
                        >
                          <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#e9d5ff" }}>Saved to Documents — copy below</p>
                          <textarea
                            readOnly
                            value={lastGenerated.content}
                            className="candidate-input"
                            style={{
                              ...input,
                              minHeight: "80px",
                              fontSize: "12px",
                              fontFamily: "ui-monospace, monospace",
                              background: "rgba(0,0,0,0.3)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: FH.text,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(lastGenerated.content);
                            }}
                            style={{ ...btnPrimary, marginTop: "8px", fontSize: "13px", padding: "8px 16px" }}
                            {...btnPrimaryHover}
                          >
                            Copy
                          </button>
                        </div>
                      )}
                      {job.job_url && (
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "13px", color: "#a78bfa", fontWeight: 700, display: "inline-block", marginTop: "12px" }}
                        >
                          Open posting →
                        </a>
                      )}
                      {attempts.length > 0 && (
                        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <SectionLabel style={{ marginBottom: "8px" }}>Interview attempts</SectionLabel>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {slice.map((a, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "rgba(124,58,237,0.15)",
                                  color: scoreTone(Number(a.score) || 0),
                                  padding: "5px 12px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  border: "1px solid rgba(139,92,246,0.25)",
                                }}
                              >
                                {a.score ?? "—"}% · {a.created_at ? new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                              </span>
                            ))}
                            {attempts.length > 5 && (
                              <button
                                type="button"
                                onClick={() => setExpandedAttempts((prev) => ({ ...prev, [job.id]: !prev[job.id] }))}
                                style={{
                                  background: "transparent",
                                  border: "1px dashed rgba(167,139,250,0.4)",
                                  color: "#a78bfa",
                                  padding: "5px 12px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontFamily: FH.font,
                                }}
                              >
                                {showAll ? "Show less" : `+${attempts.length - 5} more`}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
