import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import RecruiterNavBar from "./components/RecruiterNavBar";

function genSlug() {
  const hex = "abcdef0123456789";
  let s = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) s += hex[arr[i] % hex.length];
  return s;
}

/** Normalize JSONB `answers` from recruiter quick interview (MockInterview shape) */
function normalizeInterviewAnswers(raw) {
  if (raw == null) return [];
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p : [];
    } catch {
      arr = [];
    }
  }
  return arr.map((item, idx) => {
    if (typeof item === "string") {
      return { question: `Question ${idx + 1}`, answer: item, skipped: false, type: "" };
    }
    if (!item || typeof item !== "object") {
      return { question: `Question ${idx + 1}`, answer: "", skipped: false, type: "" };
    }
    const q = item.question || item.q || `Question ${idx + 1}`;
    const a = item.answer != null ? String(item.answer) : item.text != null ? String(item.text) : "";
    return {
      question: String(q),
      answer: a,
      skipped: !!item.skipped,
      type: item.type ? String(item.type) : "",
    };
  });
}

/** Score pill colours for shortlist table (dark / neon) */
function scoreBandPill(score) {
  const n = score != null ? Number(score) : NaN;
  if (!Number.isFinite(n)) {
    return { color: "#d4d4d8", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)", text: "—" };
  }
  const s = Math.round(n);
  if (s >= 70) return { color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", text: `${s}/100` };
  if (s >= 40) return { color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", text: `${s}/100` };
  return { color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", text: `${s}/100` };
}

function topScoreGradient(score) {
  const n = score != null ? Number(score) : NaN;
  if (!Number.isFinite(n)) return null;
  const s = Math.round(n);
  if (s >= 70) return "linear-gradient(135deg, #10b981, #34d399)";
  if (s >= 40) return "linear-gradient(135deg, #f59e0b, #d97706)";
  return "linear-gradient(135deg, #ef4444, #dc2626)";
}

const rd = {
  font: "'Inter', system-ui, sans-serif",
  card: "rgba(10,0,20,0.82)",
  border: "rgba(139,92,246,0.22)",
  borderLight: "rgba(139,92,246,0.14)",
  text: "#ffffff",
  /** Muted copy on dark (purple/black) surfaces */
  textMuted: "#b4b4c4",
  /** Muted copy on light/white panels inside recruiter UI */
  textMutedLight: "#64748b",
  textDim: "#8b8b9e",
  primary: "#7c3aed",
  lightPurple: "#a78bfa",
  accent: "linear-gradient(135deg, #7c3aed, #4f46e5)",
  success: "#10b981",
  successBg: "rgba(16,185,129,0.18)",
  inputBg: "rgba(139,92,246,0.08)",
  inputBorder: "rgba(139,92,246,0.22)",
  leftInactive: "#1a1a1a",
  /** Page backdrop when not using RecruiterPageShell (must be defined — undefined = white screen) */
  bgGradient: "linear-gradient(180deg, #030008 0%, #000000 45%, #0c0618 100%)",
};

function RecruiterPageShell({ children, padding = "0 2rem 2rem" }) {
  return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000000",
          fontFamily: rd.font,
          position: "relative",
          overflowX: "hidden",
          padding,
          boxSizing: "border-box",
          colorScheme: "dark",
        }}
      >
      <style>{`
        @keyframes rd-scanLine { 0% { transform: translateY(-100%); } 100% { transform: translateY(1000px); } }
        @keyframes rd-gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes rd-numberPulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }
        @keyframes rd-cardGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.15), 0 0 40px rgba(139,92,246,0.05); }
          50% { box-shadow: 0 0 30px rgba(139,92,246,0.3), 0 0 60px rgba(139,92,246,0.1); }
        }
        .rd-page-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .rd-title-gradient {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin: 0 0 0.35rem;
          background: linear-gradient(135deg, #ffffff 0%, #c4b5fd 40%, #7c3aed 100%);
          background-size: 200% 200%;
          animation: rd-gradientShift 4s ease infinite;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .rd-cta-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 12px;
          font-weight: 800;
          color: #fff;
          cursor: pointer;
          font-size: 0.9rem;
          background: linear-gradient(135deg, #7c3aed, #4f46e5, #7c3aed);
          background-size: 200% 200%;
          animation: rd-gradientShift 3s ease infinite;
          box-shadow: 0 0 30px rgba(124,58,237,0.5), 0 4px 20px rgba(124,58,237,0.3);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .rd-cta-btn:hover { filter: brightness(1.08); }
        .rd-cta-btn:disabled { opacity: 0.6; cursor: not-allowed; filter: none; }
        .rd-stat-chip { position: relative; overflow: hidden; }
        .rd-stat-chip::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent);
        }
        .rd-new-week-val {
          background: linear-gradient(135deg, #a78bfa, #7c3aed);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rd-numberPulse 2s ease-in-out infinite;
        }
        .rd-role-card-fut { position: relative; overflow: hidden; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .rd-role-card-fut::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(167,139,250,0.4), transparent);
          pointer-events: none;
        }
        .rd-role-card-fut::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle at top right, rgba(124,58,237,0.06), transparent 70%);
          pointer-events: none;
        }
        .rd-role-card-fut--active { animation: rd-cardGlow 4s ease-in-out infinite; }
        .rd-shortlist-row:hover { background: rgba(139,92,246,0.04) !important; }
        .rd-input:focus { outline: none; border-color: rgba(139,92,246,0.4) !important; }
      `}</style>
      <div className="rd-page-grid" aria-hidden />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 100,
          right: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 140,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <div
          style={{
            height: 2,
            width: "100%",
            background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)",
            animation: "rd-scanLine 6s linear infinite",
          }}
        />
      </div>
      <div style={{ position: "relative", zIndex: 5, width: "100%", maxWidth: "100%" }}>{children}</div>
    </div>
  );
}

function formatRelativeTime(iso) {
  if (!iso) return { rel: "—", full: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { rel: "—", full: "" };
  const full = d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return { rel: "Just now", full };
  const min = Math.floor(sec / 60);
  if (min < 60) return { rel: `${min} min ago`, full };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { rel: `${hr} hour${hr !== 1 ? "s" : ""} ago`, full };
  const day = Math.floor(hr / 24);
  if (day < 14) return { rel: `${day} day${day !== 1 ? "s" : ""} ago`, full };
  const week = Math.floor(day / 7);
  if (week < 8) return { rel: `${week} week${week !== 1 ? "s" : ""} ago`, full };
  return { rel: d.toLocaleDateString(), full };
}

export default function RecruiterDashboard({ user, onBack, onEnterCandidate }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saveError, setSaveError] = useState("");
  const [creating, setCreating] = useState(false);
  const [shortlistRoleId, setShortlistRoleId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [viewingCv, setViewingCv] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleStats, setRoleStats] = useState({}); // { roleId: { total, new, topScore } }
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [settingsRoleId, setSettingsRoleId] = useState(null);
  const [shortlistThresholdInput, setShortlistThresholdInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [rolesError, setRolesError] = useState("");
  const [candidatesError, setCandidatesError] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [roleSort, setRoleSort] = useState("newest"); // newest | candidates | alpha
  const [deletingRoleId, setDeletingRoleId] = useState(null);

  const isDemo = user?.id === "demo";

  const STATUS_OPTIONS = [
    { value: "reviewing", label: "Reviewing" },
    { value: "contact", label: "Contact" },
    { value: "interview_scheduled", label: "Interview scheduled" },
    { value: "rejected", label: "Rejected" },
    { value: "hired", label: "Hired" },
  ];
  const NEW_DAYS = 7;

  useEffect(() => {
    if (!user || isDemo) return;
    setRolesError("");
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("recruiter_roles")
        .select("id, title, description, share_slug, shortlist_min_score, created_at")
        .eq("recruiter_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setRolesError(error.message || "Failed to load roles. Check your connection and that this app uses the same Supabase project as your data.");
        setRoles([]);
      } else {
        setRoles(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    })();
  }, [user?.id, isDemo]);

  useEffect(() => {
    if (!shortlistRoleId || !user || isDemo) return;
    setCandidatesLoading(true);
    setCandidatesError("");
    (async () => {
      const { data, error } = await supabase
        .from("recruiter_candidates")
        .select("id, candidate_name, candidate_email, candidate_cv, score, status, created_at, answers")
        .eq("role_id", shortlistRoleId)
        .order("score", { ascending: false, nullsFirst: false });
      if (error) {
        setCandidatesError(error.message || "Failed to load candidates.");
        setCandidates([]);
      } else {
        setCandidates(Array.isArray(data) ? data : []);
      }
      setCandidatesLoading(false);
    })();
  }, [shortlistRoleId, user?.id, isDemo]);

  useEffect(() => {
    setCandidateSearch("");
  }, [shortlistRoleId]);

  useEffect(() => {
    if (!user || isDemo) return;
    if (roles.length === 0) {
      setRoleStats({});
      return;
    }
    const roleIds = roles.map((r) => r.id);
    (async () => {
      const { data } = await supabase
        .from("recruiter_candidates")
        .select("role_id, created_at, score")
        .in("role_id", roleIds);
      const now = Date.now();
      const cutoff = now - NEW_DAYS * 24 * 60 * 60 * 1000;
      const stats = {};
      (data || []).forEach((row) => {
        if (!stats[row.role_id]) stats[row.role_id] = { total: 0, new: 0, topScore: null, scoreSum: 0, scoreCount: 0 };
        stats[row.role_id].total += 1;
        if (new Date(row.created_at).getTime() >= cutoff) stats[row.role_id].new += 1;
        const s = row.score != null ? Number(row.score) : null;
        if (typeof s === "number" && !Number.isNaN(s)) {
          stats[row.role_id].scoreSum += s;
          stats[row.role_id].scoreCount += 1;
          if (stats[row.role_id].topScore == null || s > stats[row.role_id].topScore) stats[row.role_id].topScore = s;
        }
      });
      setRoleStats(stats);
    })();
  }, [user?.id, isDemo, roles.length]);

  const loadRoles = async () => {
    if (!user?.id || isDemo) return;
    const { data } = await supabase
      .from("recruiter_roles")
      .select("id, title, description, share_slug, shortlist_min_score, created_at")
      .eq("recruiter_id", user.id)
      .order("created_at", { ascending: false });
    setRoles(Array.isArray(data) ? data : []);
  };

  const openRoleSettings = (r) => {
    setSettingsRoleId(r.id);
    setShortlistThresholdInput(r.shortlist_min_score != null ? String(r.shortlist_min_score) : "");
  };

  const saveRoleSettings = async () => {
    if (!settingsRoleId) return;
    setSavingSettings(true);
    const val = shortlistThresholdInput.trim() === "" ? null : Math.min(100, Math.max(0, parseInt(shortlistThresholdInput, 10) || 0));
    const { error } = await supabase.from("recruiter_roles").update({ shortlist_min_score: val }).eq("id", settingsRoleId).eq("recruiter_id", user.id);
    if (!error) {
      setRoles((prev) => prev.map((r) => (r.id === settingsRoleId ? { ...r, shortlist_min_score: val } : r)));
      setSettingsRoleId(null);
    }
    setSavingSettings(false);
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    const { error } = await supabase.from("recruiter_candidates").update({ status: newStatus }).eq("id", candidateId);
    if (!error) setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c)));
  };

  const handleDuplicateRole = async (r) => {
    if (isDemo || !user?.id) return;
    setDuplicatingId(r.id);
    const slug = genSlug();
    const base = window.location.origin;
    const { data: currentUser } = await supabase.auth.getUser();
    const recruiterId = currentUser?.data?.user?.id ?? user?.id;
    try {
      const { error } = await supabase.from("recruiter_roles").insert([
        { recruiter_id: recruiterId, title: r.title, description: r.description || "", share_slug: slug, shortlist_min_score: r.shortlist_min_score ?? null },
      ]);
      if (error) return;
      await loadRoles();
    } finally {
      setDuplicatingId(null);
    }
  };

  const getShareMessage = (title, url) =>
    `Hi,\n\nI'd like to invite you to complete a short interview for the ${title} role. It takes about 10 minutes.\n\nUse this link: ${url}\n\nBest regards`;

  const copyShareMessage = (title, url) => {
    navigator.clipboard.writeText(getShareMessage(title, url));
  };

  const shareLink = async (title, url) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Interview: ${title}`, text: `Complete your interview for ${title}: ${url}`, url });
        return;
      } catch (_) {}
    }
    navigator.clipboard.writeText(url);
  };

  const getEmailSubject = (title) => `Interview for ${title} – next steps`;
  const getEmailBody = (title, url) =>
    `Hi,\n\nThank you for applying. Please complete this short interview (about 10 minutes) at your convenience:\n\n${url}\n\nWe look forward to your response.\n\nBest regards`;

  const openEmailToCandidates = (title, url) => {
    const subject = encodeURIComponent(getEmailSubject(title));
    const body = encodeURIComponent(getEmailBody(title, url));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleDeleteRole = async (r) => {
    if (isDemo || !user?.id) return;
    if (!window.confirm("Are you sure you want to delete this role? This cannot be undone.")) return;
    setDeletingRoleId(r.id);
    const { error } = await supabase.from("recruiter_roles").delete().eq("id", r.id).eq("recruiter_id", user.id);
    if (!error) {
      if (shortlistRoleId === r.id) setShortlistRoleId(null);
      await loadRoles();
    }
    setDeletingRoleId(null);
  };

  const handleCreateRole = async () => {
    if (isDemo || !user?.id) return;
    const title = (form.title || "").trim();
    if (!title) {
      setSaveError("Role title is required.");
      return;
    }
    setSaveError("");
    setCreating(true);
    const description = (form.description || "").trim();
    const base = window.location.origin;
    const slug = genSlug();

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const recruiterId = currentUser?.id ?? user?.id;
    if (!recruiterId) {
      setSaveError("Session expired. Please sign in again.");
      setCreating(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("recruiter_roles")
        .insert([{ recruiter_id: recruiterId, title, description, share_slug: slug }]);
      if (error) {
        setSaveError(error.message || "Could not save role. Try again.");
        setCreating(false);
        return;
      }
      setForm({ title: "", description: "" });
      setShowForm(false);
      loadRoles();
    } catch (err) {
      setSaveError(err?.message || "Could not save. Try again.");
    }
    setCreating(false);
  };

  const roleSearchQ = (roleSearch || "").trim().toLowerCase();
  const filteredRoles = [...roles]
    .filter(
      (r) =>
        !roleSearchQ ||
        (r.title || "").toLowerCase().includes(roleSearchQ) ||
        (r.description || "").toLowerCase().includes(roleSearchQ)
    )
    .sort((a, b) => {
      if (roleSort === "alpha") return (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
      if (roleSort === "candidates") {
        const ta = roleStats[a.id]?.total ?? 0;
        const tb = roleStats[b.id]?.total ?? 0;
        if (tb !== ta) return tb - ta;
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const dashAgg = roles.reduce(
    (acc, r) => {
      const s = roleStats[r.id];
      if (s) {
        acc.totalCandidates += s.total;
        acc.newThisWeek += s.new;
        acc.scoreSum += s.scoreSum ?? 0;
        acc.scoreCount += s.scoreCount ?? 0;
      }
      return acc;
    },
    { totalCandidates: 0, newThisWeek: 0, scoreSum: 0, scoreCount: 0 }
  );
  const globalAvg = dashAgg.scoreCount > 0 ? Math.round(dashAgg.scoreSum / dashAgg.scoreCount) : null;

  const chipBase = {
    background: "rgba(12,6,26,0.88)",
    border: "1px solid rgba(139,92,246,0.28)",
    borderRadius: "16px",
    padding: "20px 22px",
    flex: "1 1 120px",
    minWidth: "100px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    boxShadow: "0 4px 28px rgba(0,0,0,0.35)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const recruiterNav = (
    <RecruiterNavBar
      user={user}
      currentTab="roles"
      onCandidateArea={onEnterCandidate ?? onBack}
      onGoPortalSelect={onBack}
      onLogout={() => supabase.auth.signOut()}
    />
  );

  if (isDemo) {
    return (
      <RecruiterPageShell padding="0 0 2rem">
        {recruiterNav}
        <div style={{ maxWidth: "560px", margin: "0 auto", padding: "0 1.5rem" }}>
          <div
            style={{
              background: rd.card,
              borderRadius: "20px",
              padding: "1.5rem",
              border: `1px solid ${rd.border}`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <p style={{ color: rd.textMuted, marginBottom: "1rem", fontSize: "0.95rem" }}>Recruiter portal is only available when you sign in.</p>
            <button type="button" className="rd-cta-btn" onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      </RecruiterPageShell>
    );
  }

  if (shortlistRoleId) {
    const role = roles.find((r) => r.id === shortlistRoleId);
    const minScore = role?.shortlist_min_score;
    let filteredCandidates =
      statusFilter === "all"
        ? candidates
        : candidates.filter((c) => (c.status || "reviewing") === statusFilter);
    const search = (candidateSearch || "").trim().toLowerCase();
    if (search) filteredCandidates = filteredCandidates.filter((c) => (c.candidate_name || "").toLowerCase().includes(search) || (c.candidate_email || "").toLowerCase().includes(search));

    const sortedFiltered = [...filteredCandidates].sort((a, b) => {
      const sa = a.score != null && Number.isFinite(Number(a.score)) ? Number(a.score) : -1;
      const sb = b.score != null && Number.isFinite(Number(b.score)) ? Number(b.score) : -1;
      return sb - sa;
    });
    const meetsThreshold = (c) => (c.score != null ? Number(c.score) : 0) >= minScore;
    const aboveList = minScore != null ? sortedFiltered.filter(meetsThreshold) : sortedFiltered;
    const belowList = minScore != null ? sortedFiltered.filter((c) => !meetsThreshold(c)) : [];

    const shareUrl = role?.share_slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${role.share_slug}` : "";

    let rankCounter = 1;
    const shortlistTableRows = [];
    const pushRow = (c, rowOpacity) => {
      const rank = rankCounter;
      rankCounter += 1;
      const reportRows = normalizeInterviewAnswers(c.answers);
      const hasQa = reportRows.length > 0;
      const pill = scoreBandPill(c.score);
      const t = formatRelativeTime(c.created_at);
      const emailStr = c.candidate_email || "—";
      shortlistTableRows.push(
        <tr
          key={c.id}
          className="rd-shortlist-row"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: "transparent",
            opacity: rowOpacity,
            transition: "background 0.15s ease",
          }}
        >
          <td style={{ padding: "0.45rem 0.35rem", width: "44px", verticalAlign: "middle", textAlign: "center" }}>
            <div
              style={{
                width: rank === 1 ? 36 : 30,
                height: rank === 1 ? 36 : 30,
                borderRadius: "50%",
                margin: "0 auto",
                background: rank === 1 ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(139,92,246,0.08)",
                border: rank === 1 ? "none" : "1px solid rgba(139,92,246,0.15)",
                boxShadow: rank === 1 ? "0 0 12px rgba(124,58,237,0.4)" : "none",
                color: rank === 1 ? "#fff" : rd.textMuted,
                fontWeight: "800",
                fontSize: rank === 1 ? "0.95rem" : "0.8rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {rank}
            </div>
          </td>
          <td style={{ padding: "0.45rem 0.5rem", fontSize: "0.82rem", fontWeight: "600", color: rd.text, verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.candidate_name || ""}>
            {c.candidate_name || "—"}
          </td>
          <td
            style={{ padding: "0.45rem 0.5rem", fontSize: "0.78rem", color: rd.textMuted, verticalAlign: "middle", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title={emailStr}
          >
            {emailStr}
          </td>
          <td style={{ padding: "0.45rem 0.4rem", verticalAlign: "middle", whiteSpace: "nowrap" }}>
            <span
              style={{
                display: "inline-block",
                fontWeight: "800",
                fontSize: "0.78rem",
                padding: "0.2rem 0.45rem",
                borderRadius: "8px",
                color: pill.color,
                background: pill.background,
                border: pill.border,
              }}
            >
              {pill.text}
            </span>
          </td>
          <td style={{ padding: "0.35rem 0.35rem", verticalAlign: "middle", width: "92px" }}>
            <select
              value={c.status || "reviewing"}
              onChange={(e) => handleStatusChange(c.id, e.target.value)}
              className="rd-input"
              style={{
                padding: "0.25rem 0.35rem",
                borderRadius: "8px",
                border: `1px solid ${rd.inputBorder}`,
                background: rd.inputBg,
                fontSize: "0.72rem",
                color: rd.text,
                cursor: "pointer",
                width: "100%",
                minWidth: 0,
                maxWidth: "88px",
                boxSizing: "border-box",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </td>
          <td style={{ padding: "0.45rem 0.4rem", fontSize: "0.75rem", color: rd.textMuted, verticalAlign: "middle", whiteSpace: "nowrap" }} title={t.full || undefined}>
            {t.rel}
          </td>
          <td style={{ padding: "0.4rem 0.35rem", verticalAlign: "middle", width: "96px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "stretch" }}>
              <button
                type="button"
                onClick={() =>
                  setViewingReport({
                    name: c.candidate_name || "Candidate",
                    score: c.score,
                    rows: reportRows,
                  })
                }
                style={{
                  padding: "0.28rem 0.4rem",
                  background: hasQa ? rd.primary : "rgba(139,92,246,0.1)",
                  color: hasQa ? "white" : rd.textMuted,
                  border: hasQa ? "none" : `1px solid ${rd.border}`,
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                Report
              </button>
              {c.candidate_cv ? (
                <button
                  type="button"
                  onClick={() => setViewingCv({ name: c.candidate_name || "Candidate", cv: c.candidate_cv })}
                  style={{
                    padding: "0.28rem 0.4rem",
                    background: rd.borderLight,
                    color: rd.primary,
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  CV
                </button>
              ) : (
                <span style={{ color: rd.textMuted, fontSize: "0.68rem", textAlign: "center" }}>No CV</span>
              )}
            </div>
          </td>
        </tr>
      );
    };

    if (minScore == null) {
      sortedFiltered.forEach((c) => pushRow(c, 1));
    } else {
      aboveList.forEach((c) => pushRow(c, 1));
      if (belowList.length > 0) {
        shortlistTableRows.push(
          <tr key="__shortlist-divider">
            <td
              colSpan={7}
              style={{
                padding: "0.55rem 0.75rem",
                background: "rgba(139,92,246,0.06)",
                borderTop: "1px solid rgba(139,92,246,0.2)",
                borderBottom: "1px solid rgba(139,92,246,0.2)",
                fontSize: "0.78rem",
                fontWeight: "600",
                color: rd.textMuted,
                textAlign: "center",
              }}
            >
              Below minimum score ({minScore} pts)
            </td>
          </tr>
        );
        belowList.forEach((c) => pushRow(c, 0.72));
      }
    }

    return (
      <RecruiterPageShell padding="0 0 2rem">
        <style>{`
          .rd-shortlist-row:hover { background: rgba(139,92,246,0.07) !important; }
          .rd-gbtn:hover { filter: brightness(1.05); box-shadow: 0 4px 14px rgba(124,58,237,0.2) !important; }
        `}</style>
        {recruiterNav}
        <div style={{ maxWidth: "960px", margin: "0 auto", width: "100%", padding: "0 1.5rem", boxSizing: "border-box" }}>
          <button
            type="button"
            className="rd-gbtn"
            onClick={() => setShortlistRoleId(null)}
            style={{
              background: "rgba(15,8,28,0.9)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${rd.border}`,
              borderRadius: "12px",
              padding: "0.5rem 1.1rem",
              color: rd.lightPurple,
              fontWeight: "700",
              cursor: "pointer",
              marginBottom: "1.25rem",
              fontSize: "0.88rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
              transition: "box-shadow 0.15s ease, background 0.15s ease",
            }}
          >
            ← Back to roles
          </button>
          <h1 style={{ fontSize: "1.35rem", fontWeight: "700", color: rd.text, marginBottom: "0.35rem" }}>Shortlist: {role?.title || "Role"}</h1>
          <p style={{ color: rd.textMuted, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Candidates ranked by interview score (out of 100)</p>
          {role?.share_slug && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button onClick={() => shareLink(role.title, `${window.location.origin}/r/${role.share_slug}`)} style={{ padding: "0.45rem 0.9rem", background: "white", color: rd.primary, border: `1px solid ${rd.border}`, borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}>Share link</button>
              <button onClick={() => openEmailToCandidates(role.title, `${window.location.origin}/r/${role.share_slug}`)} style={{ padding: "0.45rem 0.9rem", background: rd.accent, color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}>Email candidates</button>
            </div>
          )}
          {candidatesError && (
            <div style={{ marginBottom: "1rem", padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#b91c1c", fontSize: "0.9rem" }}>{candidatesError}</div>
          )}
          {candidatesLoading ? (
            <p style={{ color: rd.textMuted }}>Loading…</p>
          ) : candidates.length === 0 ? (
            <div style={{ textAlign: "center", background: rd.card, backdropFilter: "blur(12px)", padding: "2rem 1.5rem", borderRadius: "16px", border: `1px solid ${rd.border}`, boxShadow: "0 4px 28px rgba(0,0,0,0.35)" }}>
              <p style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: "600", color: rd.text }}>No candidates yet — share your role link to get started</p>
              {shareUrl ? (
                <div style={{ marginBottom: "0.75rem" }}>
                  <code style={{ display: "block", fontSize: "0.85rem", color: "#64748b", wordBreak: "break-all", padding: "0.65rem 1rem", background: "#f8fafc", borderRadius: "10px", border: `1px solid ${rd.border}` }}>{shareUrl}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    style={{ marginTop: "0.65rem", padding: "0.45rem 1rem", background: rd.borderLight, color: rd.primary, border: `1px solid ${rd.border}`, borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}
                  >
                    Copy link
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <input type="search" value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} placeholder="Search by name or email…" style={{ padding: "0.45rem 0.85rem", borderRadius: "10px", border: `2px solid ${rd.border}`, background: rd.card, color: rd.text, fontSize: "0.9rem", minWidth: "180px", boxSizing: "border-box" }} />
                <span style={{ fontSize: "0.85rem", color: rd.textMuted, fontWeight: "600" }}>Status:</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "0.4rem 0.75rem", borderRadius: "10px", border: `2px solid ${rd.border}`, background: rd.card, color: rd.text, fontSize: "0.9rem", fontWeight: "500", cursor: "pointer" }}>
                  <option value="all">All</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: rd.text, marginBottom: "0.35rem" }}>Candidates</h2>
                {minScore != null && (
                  <p style={{ fontSize: "0.82rem", color: rd.textMuted, marginBottom: "0.65rem" }}>
                    Shortlist threshold: <strong>{minScore}</strong> pts. Rows below the divider scored lower.
                  </p>
                )}
                <div style={{ background: rd.card, borderRadius: "16px", overflow: "hidden", border: `1px solid ${rd.border}`, boxShadow: "0 4px 20px rgba(108,99,255,0.08)", width: "100%" }}>
                  <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                    <colgroup>
                      <col style={{ width: "48px" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "72px" }} />
                      <col style={{ width: "96px" }} />
                      <col style={{ width: "88px" }} />
                      <col style={{ width: "100px" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "rgba(35,25,58,0.95)", borderBottom: `1px solid ${rd.border}` }}>
                        <th style={{ textAlign: "center", padding: "0.5rem 0.25rem", fontWeight: "700", color: "#e4e4e7", fontSize: "0.72rem" }}>#</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.35rem", fontWeight: "700", color: "#e4e4e7", fontSize: "0.72rem" }}>Name</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.35rem", fontWeight: "700", color: "#e4e4e7", fontSize: "0.72rem" }}>Email</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.25rem", fontWeight: "700", color: "#e4e4e7", fontSize: "0.72rem" }}>Score</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.25rem", fontWeight: "700", color: "#e4e4e7", fontSize: "0.72rem" }}>Status</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.25rem", fontWeight: "700", color: "#e4e4e7", fontSize: "0.72rem" }}>Submitted</th>
                        <th style={{ textAlign: "left", padding: "0.5rem 0.25rem", fontWeight: "700", color: "#e4e4e7", fontSize: "0.72rem" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>{shortlistTableRows}</tbody>
                  </table>
                </div>
                {sortedFiltered.length === 0 && (
                  <p style={{ marginTop: "0.75rem", fontSize: "0.88rem", color: rd.textMuted }}>No candidates match your search or filters.</p>
                )}
              </div>
            </>
          )}
        </div>
        {viewingCv && (
          <div onClick={() => setViewingCv(null)} style={{ position: "fixed", inset: 0, background: "rgba(108,99,255,0.15)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: rd.card, borderRadius: "20px", maxWidth: "560px", width: "100%", maxHeight: "80vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(108,99,255,0.2)", border: `1px solid ${rd.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${rd.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: rd.text, margin: 0 }}>CV — {viewingCv.name}</h2>
                <button type="button" onClick={() => setViewingCv(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", color: rd.textMuted, cursor: "pointer", padding: "0.25rem", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1, whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.6, color: rd.text }}>{viewingCv.cv}</div>
            </div>
          </div>
        )}
        {viewingReport && (
          <div onClick={() => setViewingReport(null)} style={{ position: "fixed", inset: 0, background: "rgba(108,99,255,0.15)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: rd.card, borderRadius: "20px", maxWidth: "640px", width: "100%", maxHeight: "85vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(108,99,255,0.2)", border: `1px solid ${rd.border}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${rd.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: rd.text, margin: "0 0 0.25rem" }}>Interview report — {viewingReport.name}</h2>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: rd.textMuted }}>
                    Quick interview · Score {viewingReport.score != null ? `${viewingReport.score}/100` : "—"}
                  </p>
                </div>
                <button type="button" onClick={() => setViewingReport(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", color: rd.textMuted, cursor: "pointer", padding: "0.25rem", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: "1rem 1.25rem 1.25rem", overflowY: "auto", flex: 1 }}>
                {viewingReport.rows.length === 0 ? (
                  <div style={{ padding: "0.5rem 0", color: rd.text, fontSize: "0.95rem", lineHeight: 1.65 }}>
                    <p style={{ margin: "0 0 0.75rem" }}>No question-and-answer data is stored for this candidate.</p>
                    <p style={{ margin: "0 0 0.75rem", color: rd.textMuted, fontSize: "0.9rem" }}>Common reasons:</p>
                    <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.25rem", color: rd.textMuted, fontSize: "0.9rem" }}>
                      <li>They applied <strong>before</strong> the app saved interview answers to the database.</li>
                      <li>You’re viewing an older build (e.g. only <code>vite</code> on port <strong>5173</strong>) — use <code>npm run start</code> and <strong>localhost:3000</strong> for the latest recruiter UI and data.</li>
                    </ul>
                    <p style={{ margin: 0, color: rd.textMuted, fontSize: "0.9rem" }}>New submissions through the recruiter link will show full Q&amp;A here.</p>
                  </div>
                ) : (
                  viewingReport.rows.map((row, i) => (
                    <div key={i} style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: i < viewingReport.rows.length - 1 ? `1px solid ${rd.border}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "800", color: rd.primary, background: rd.borderLight, padding: "0.2rem 0.5rem", borderRadius: "6px" }}>Q{i + 1}</span>
                        {row.type ? (
                          <span style={{ fontSize: "0.72rem", fontWeight: "600", color: rd.textMuted, background: "#f1f5f9", padding: "0.2rem 0.45rem", borderRadius: "6px" }}>{row.type}</span>
                        ) : null}
                        {row.skipped ? (
                          <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "#b45309", background: "#fef3c7", padding: "0.2rem 0.45rem", borderRadius: "6px" }}>Skipped</span>
                        ) : null}
                      </div>
                      <p style={{ margin: "0 0 0.6rem", fontSize: "0.95rem", fontWeight: "600", color: rd.text, lineHeight: 1.5 }}>{row.question}</p>
                      <p style={{ margin: 0, fontSize: "0.9rem", color: rd.textMuted, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                        {row.skipped ? <span style={{ fontStyle: "italic" }}>No answer (skipped or time ran out)</span> : row.answer ? row.answer : <span style={{ fontStyle: "italic" }}>No written answer</span>}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </RecruiterPageShell>
    );
  }

  return (
    <RecruiterPageShell padding="0 0 2rem">
      <style>{`
        @keyframes rd-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.9; } }
        .rd-skel { animation: rd-pulse 1.15s ease-in-out infinite; background: rgba(139,92,246,0.15); border-radius: 8px; }
        .rd-role-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .rd-role-card:hover { box-shadow: 0 12px 40px rgba(124,58,237,0.18); transform: translateY(-2px); }
        .rd-gbtn:hover { filter: brightness(1.06); box-shadow: 0 2px 12px rgba(124,58,237,0.15); }
        .rd-gbtn-primary:hover { background: rgba(124,58,237,0.22) !important; }
        .rd-gbtn-danger:hover { background: rgba(185,28,28,0.22) !important; }
        .rd-cta:hover { filter: brightness(1.06); box-shadow: 0 6px 24px rgba(108,99,255,0.45) !important; }
      `}</style>
      {recruiterNav}
      <div style={{ maxWidth: "960px", margin: "0 auto", width: "100%", padding: "0 1.5rem", boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <h1 className="rd-title-gradient" style={{ fontSize: "1.65rem", margin: "0 0 0.35rem", letterSpacing: "-0.02em" }}>Your Roles</h1>
            <p style={{ color: rd.textMuted, fontSize: "0.95rem", margin: 0 }}>Manage your open roles and review candidates</p>
          </div>
          {!showForm && (
            <button
              type="button"
              className="rd-cta"
              onClick={() => setShowForm(true)}
              style={{
                padding: "0.65rem 1.35rem",
                background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.9rem",
                boxShadow: "0 4px 18px rgba(108,99,255,0.35)",
                transition: "filter 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              + Create Role
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "1.35rem" }}>
          {[
            { label: "Total Roles", value: roles.length, pulse: false },
            { label: "Total Candidates", value: dashAgg.totalCandidates, pulse: false },
            { label: "New This Week", value: dashAgg.newThisWeek, pulse: true },
            { label: "Avg Score", value: globalAvg != null ? globalAvg : "—", pulse: false },
          ].map((c) => (
            <div key={c.label} className="rd-stat-chip" style={chipBase}>
              <div style={{ fontSize: "0.72rem", fontWeight: "600", color: rd.textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>{c.label}</div>
              <div
                className={c.pulse ? "rd-new-week-val" : undefined}
                style={{ fontSize: "1.35rem", fontWeight: "800", color: c.pulse ? undefined : rd.text, lineHeight: 1.2 }}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ background: rd.card, backdropFilter: "blur(14px)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: `1px solid ${rd.border}`, boxShadow: "0 4px 28px rgba(0,0,0,0.35)" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: rd.text, marginBottom: "1rem" }}>Create role</h2>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", color: rd.textMuted, marginBottom: "0.35rem", fontSize: "0.85rem" }}>Role title</label>
              <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Junior Developer" style={{ width: "100%", padding: "0.6rem 0.8rem", border: `2px solid ${rd.inputBorder}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box", background: rd.inputBg, color: rd.text }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", color: rd.textMuted, marginBottom: "0.35rem", fontSize: "0.85rem" }}>Description (used to generate interview questions)</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Paste job description or key requirements..." style={{ width: "100%", minHeight: "100px", padding: "0.6rem 0.8rem", border: `2px solid ${rd.inputBorder}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box", resize: "vertical", background: rd.inputBg, color: rd.text }} />
            </div>
            {saveError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#b91c1c", fontSize: "0.9rem" }}>{saveError}</div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={handleCreateRole} disabled={creating} style={{ padding: "0.55rem 1.1rem", background: creating ? "#94a3b8" : "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "12px", fontWeight: "600", cursor: creating ? "not-allowed" : "pointer", fontSize: "0.9rem", boxShadow: creating ? "none" : "0 4px 15px rgba(108,99,255,0.25)" }}>
                {creating ? "Creating…" : "Create & get link"}
              </button>
              <button onClick={() => { setShowForm(false); setSaveError(""); }} disabled={creating} style={{ padding: "0.55rem 1.1rem", background: "rgba(255,255,255,0.06)", color: rd.textMuted, border: `2px solid ${rd.border}`, borderRadius: "12px", cursor: creating ? "not-allowed" : "pointer", fontSize: "0.9rem", fontWeight: "600" }}>Cancel</button>
            </div>
          </div>
        )}

        {rolesError && (
          <div style={{ marginBottom: "1rem", padding: "1rem 1.25rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#b91c1c", fontSize: "0.9rem" }}>
            {rolesError}
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#991b1b" }}>Use the same URL (e.g. localhost:3000) for both creating roles and viewing the recruiter dashboard, and sign in with the same email you used when creating roles.</p>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rd-role-card" style={{ background: rd.card, backdropFilter: "blur(12px)", borderRadius: "16px", padding: "1.25rem 1.35rem", border: `1px solid ${rd.border}`, borderLeft: "3px solid rgba(139,92,246,0.35)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
                <div className="rd-skel" style={{ height: "18px", width: "45%", marginBottom: "12px" }} />
                <div className="rd-skel" style={{ height: "12px", width: "70%", marginBottom: "16px" }} />
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div className="rd-skel" style={{ height: "14px", flex: 1 }} />
                  <div className="rd-skel" style={{ height: "14px", flex: 1 }} />
                </div>
                <div className="rd-skel" style={{ height: "12px", width: "40%", marginBottom: "14px" }} />
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <div className="rd-skel" style={{ height: "32px", width: "100px" }} />
                  <div className="rd-skel" style={{ height: "32px", width: "88px" }} />
                  <div className="rd-skel" style={{ height: "32px", width: "88px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : roles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1.5rem", background: rd.card, backdropFilter: "blur(14px)", borderRadius: "20px", border: `1px solid ${rd.border}`, boxShadow: "0 8px 36px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.85 }}>📋</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: rd.text, margin: "0 0 0.65rem" }}>No roles yet</h2>
            <p style={{ color: rd.textMuted, fontSize: "0.95rem", maxWidth: "420px", margin: "0 auto 1.5rem", lineHeight: 1.55 }}>
              Create your first role and share the link with candidates to start collecting interview responses
            </p>
            <button
              type="button"
              className="rd-cta"
              onClick={() => setShowForm(true)}
              style={{
                padding: "0.65rem 1.35rem",
                background: "linear-gradient(135deg, #6c63ff, #4ecdc4)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "0.9rem",
                boxShadow: "0 4px 18px rgba(108,99,255,0.35)",
              }}
            >
              + Create Role
            </button>
            <p style={{ fontSize: "0.82rem", color: rd.textMuted, margin: "1.25rem 0 0", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
              If you had roles before, sign in with the same email and open the same URL (e.g. <strong>localhost:3000</strong> with <code>npm run start</code>).
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1.1rem" }}>
              <input
                type="search"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search roles…"
                style={{
                  flex: "1 1 220px",
                  maxWidth: "320px",
                  padding: "0.55rem 1rem",
                  borderRadius: "12px",
                  border: `1px solid ${rd.inputBorder}`,
                  background: rd.inputBg,
                  backdropFilter: "blur(8px)",
                  color: rd.text,
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <select
                value={roleSort}
                onChange={(e) => setRoleSort(e.target.value)}
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "12px",
                  border: `1px solid ${rd.inputBorder}`,
                  background: rd.inputBg,
                  color: rd.text,
                  fontSize: "0.88rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                <option value="newest">Newest first</option>
                <option value="candidates">Most candidates</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredRoles.map((r) => {
                const stats = roleStats[r.id] || { total: 0, new: 0, topScore: null, scoreSum: 0, scoreCount: 0 };
                const url = `${window.location.origin}/r/${r.share_slug}`;
                const slugPath = `/r/${r.share_slug}`;
                const createdStr = r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
                const roleAvg = stats.scoreCount > 0 ? Math.round(stats.scoreSum / stats.scoreCount) : null;
                const hasApplicants = stats.total > 0;
                return (
                  <div
                    key={r.id}
                    className={`rd-role-card rd-role-card-fut${stats.new > 0 ? " rd-role-card-fut--active" : ""}`}
                    style={{
                      background: rd.card,
                      backdropFilter: "blur(14px)",
                      borderRadius: "16px",
                      padding: "1.2rem 1.35rem",
                      border: `1px solid ${rd.border}`,
                      borderLeft: `3px solid ${stats.new > 0 ? rd.primary : "rgba(139,92,246,0.25)"}`,
                      boxShadow: "0 4px 28px rgba(0,0,0,0.32)",
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "800", color: rd.text, maxWidth: "100%" }}>{r.title}</h3>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          padding: "0.25rem 0.65rem",
                          borderRadius: "999px",
                          flexShrink: 0,
                          ...(hasApplicants
                            ? { background: rd.successBg, color: rd.success }
                            : { background: "rgba(139,92,246,0.1)", color: "#c4b5fd" }),
                        }}
                      >
                        {hasApplicants ? "Active" : "No applicants"}
                      </span>
                    </div>

                    {stats.total === 0 ? (
                      <div style={{ marginBottom: "1rem" }}>
                        <p style={{ margin: "0 0 0.4rem", fontSize: "0.9rem", color: rd.textMuted, fontStyle: "italic" }}>No candidates yet — share your link to get started</p>
                        <div style={{ fontSize: "0.78rem", color: rd.textMuted }}>📅 Created {createdStr}</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginBottom: "1rem", alignItems: "flex-start" }}>
                        <div style={{ flex: "1 1 160px", minWidth: "140px" }}>
                          <div style={{ fontSize: "0.88rem", color: rd.text, marginBottom: "0.35rem" }}>
                            <span aria-hidden>👤</span> {stats.total} candidate{stats.total !== 1 ? "s" : ""}
                          </div>
                          {stats.new > 0 && (
                            <div style={{ fontSize: "0.85rem", fontWeight: "700", color: rd.primary, marginBottom: "0.35rem" }}>
                              🆕 {stats.new} new
                            </div>
                          )}
                          <div style={{ fontSize: "0.78rem", color: rd.textMuted }}>📅 Created {createdStr}</div>
                          {r.shortlist_min_score != null && (
                            <div style={{ fontSize: "0.72rem", color: rd.textMuted, marginTop: "0.35rem" }}>Shortlist ≥ {r.shortlist_min_score}</div>
                          )}
                        </div>
                        <div style={{ flex: "0 1 140px", textAlign: "left" }}>
                          {stats.topScore != null && (
                            <div style={{ display: "inline-block", background: rd.borderLight, color: rd.primary, fontWeight: "800", fontSize: "0.9rem", padding: "0.35rem 0.75rem", borderRadius: "10px", marginBottom: "0.35rem" }}>{stats.topScore} pts</div>
                          )}
                          {roleAvg != null && <div style={{ fontSize: "0.8rem", color: rd.textMuted }}>Avg score: {roleAvg}</div>}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: "0.8rem", color: rd.textMuted, marginBottom: "0.85rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontFamily: "ui-monospace, monospace", color: "#94a3b8" }}>{slugPath}</span>
                      <button
                        type="button"
                        className="rd-gbtn"
                        title="Copy full link"
                        onClick={() => navigator.clipboard.writeText(url)}
                        style={{ padding: "0.2rem 0.45rem", background: "rgba(139,92,246,0.12)", border: `1px solid ${rd.border}`, borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, color: rd.lightPurple }}
                      >
                        📋
                      </button>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.45rem", paddingTop: "0.35rem", borderTop: `1px solid ${rd.borderLight}` }}>
                      <button
                        type="button"
                        className="rd-gbtn rd-gbtn-primary"
                        onClick={() => setShortlistRoleId(r.id)}
                        style={{ padding: "0.45rem 0.85rem", background: "rgba(108,99,255,0.1)", color: rd.primary, border: `1px solid ${rd.border}`, borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "0.8rem" }}
                      >
                        📊 View Shortlist
                      </button>
                      <button
                        type="button"
                        className="rd-gbtn"
                        onClick={() => navigator.clipboard.writeText(url)}
                        style={{ padding: "0.45rem 0.75rem", background: "rgba(139,92,246,0.1)", color: rd.textMuted, border: `1px solid ${rd.border}`, borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "0.8rem" }}
                      >
                        🔗 Copy Link
                      </button>
                      <button
                        type="button"
                        className="rd-gbtn"
                        onClick={() => handleDuplicateRole(r)}
                        disabled={duplicatingId === r.id}
                        style={{ padding: "0.45rem 0.75rem", background: "rgba(139,92,246,0.1)", color: rd.textMuted, border: `1px solid ${rd.border}`, borderRadius: "10px", fontWeight: "600", cursor: duplicatingId === r.id ? "wait" : "pointer", fontSize: "0.8rem" }}
                      >
                        {duplicatingId === r.id ? "…" : "📄 Duplicate"}
                      </button>
                      <button
                        type="button"
                        className="rd-gbtn"
                        onClick={() => openRoleSettings(r)}
                        style={{ padding: "0.45rem 0.75rem", background: "rgba(139,92,246,0.1)", color: rd.textMuted, border: `1px solid ${rd.border}`, borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "0.8rem" }}
                      >
                        ⚙ Settings
                      </button>
                      <span style={{ flex: "1 1 8px", minWidth: "8px" }} />
                      <button
                        type="button"
                        className="rd-gbtn rd-gbtn-danger"
                        onClick={() => handleDeleteRole(r)}
                        disabled={deletingRoleId === r.id}
                        style={{ padding: "0.45rem 0.75rem", background: "rgba(254,242,242,0.9)", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "10px", fontWeight: "700", cursor: deletingRoleId === r.id ? "wait" : "pointer", fontSize: "0.8rem" }}
                      >
                        {deletingRoleId === r.id ? "…" : "🗑 Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {roleSearchQ && filteredRoles.length === 0 && (
              <p style={{ marginTop: "0.85rem", color: rd.textMuted, fontSize: "0.9rem" }}>No roles match your search. Try a different term or clear the search.</p>
            )}
          </>
        )}
        {settingsRoleId && (() => {
          const r = roles.find((x) => x.id === settingsRoleId);
          if (!r) return null;
          return (
            <div onClick={() => setSettingsRoleId(null)} style={{ position: "fixed", inset: 0, background: "rgba(108,99,255,0.15)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: rd.card, borderRadius: "20px", padding: "1.5rem", maxWidth: "400px", width: "100%", boxShadow: "0 20px 60px rgba(108,99,255,0.2)", border: `1px solid ${rd.border}` }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", color: rd.text }}>Settings — {r.title}</h3>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontWeight: "600", color: rd.textMuted, marginBottom: "0.35rem", fontSize: "0.85rem" }}>Shortlist minimum score (0–100)</label>
                  <input type="number" min={0} max={100} value={shortlistThresholdInput} onChange={(e) => setShortlistThresholdInput(e.target.value)} placeholder="e.g. 60 (leave empty for no threshold)" style={{ width: "100%", padding: "0.6rem 0.8rem", border: `2px solid ${rd.inputBorder}`, borderRadius: "10px", fontSize: "0.95rem", boxSizing: "border-box", background: rd.inputBg, color: rd.text }} />
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: rd.textMuted }}>Candidates at or above this score will be marked as meeting the shortlist.</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={saveRoleSettings} disabled={savingSettings} style={{ padding: "0.5rem 1rem", background: "linear-gradient(135deg, #6c63ff, #4ecdc4)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: savingSettings ? "wait" : "pointer", fontSize: "0.9rem" }}>{savingSettings ? "Saving…" : "Save"}</button>
                  <button onClick={() => setSettingsRoleId(null)} style={{ padding: "0.5rem 1rem", background: "rgba(255,255,255,0.08)", color: rd.textMuted, border: `2px solid ${rd.border}`, borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "0.9rem" }}>Cancel</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </RecruiterPageShell>
  );
}
