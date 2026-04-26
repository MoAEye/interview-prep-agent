import { createClient } from "@supabase/supabase-js";
import { profileProEntitlement, jwtProEntitlement } from "../../lib/proEntitlement.js";
import { loadEnvLocalSafe } from "./loadEnvLocalSafe.js";

/**
 * Read is_pro via PostgREST with explicit headers (same as curl). Some @supabase/supabase-js
 * setups do not attach the user JWT to data plane requests the way we expect; this matches
 * what the browser sends and avoids false "not Pro" when the row is correct in Supabase.
 * @returns {boolean | null} null = call failed (try fallbacks), false = no row / not pro, true = pro
 */
async function readUserProfileIsProFromRest(supabaseUrl, anonKey, accessToken, userId) {
  const base = String(supabaseUrl || "").replace(/\/$/, "");
  if (!base || !anonKey || !accessToken || !userId) return null;
  try {
    const url = `${base}/rest/v1/user_profiles?select=is_pro&user_id=eq.${encodeURIComponent(userId)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const rawText = await res.text();
    if (!res.ok) {
      console.error("[candidateAuth] REST user_profiles HTTP", res.status, rawText.slice(0, 200));
      return null;
    }
    let rows;
    try {
      rows = JSON.parse(rawText);
    } catch {
      return null;
    }
    if (!Array.isArray(rows)) return null;
    if (rows.length === 0) return false;
    return profileProEntitlement(rows[0]?.is_pro);
  } catch (e) {
    console.error("[candidateAuth] REST user_profiles:", e?.message || e);
    return null;
  }
}

export function loadEnvForApi() {
  loadEnvLocalSafe();
}

/**
 * Bearer JWT → Supabase user + is_pro from user_profiles (service role).
 * @returns {{ authed: false } | { authed: true, userId: string, isPro: boolean, supabaseService: import("@supabase/supabase-js").SupabaseClient } | { authed: false, error: string }}
 */
export async function resolveCandidateFromRequest(req) {
  const h = req.headers || {};
  const authHeader = h.authorization || h.Authorization || "";
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { authed: false };

  loadEnvForApi();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { authed: false, error: "Server misconfiguration." };
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user?.id) return { authed: false, badToken: true };

  const supabaseService = createClient(supabaseUrl, serviceRoleKey);

  const restPro = await readUserProfileIsProFromRest(supabaseUrl, anonKey, token, user.id);

  const { data: profile, error: profileErr } = await supabaseService
    .from("user_profiles")
    .select("is_pro")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileErr) {
    console.error("[candidateAuth] user_profiles (service role) failed:", profileErr.message || profileErr);
  }
  const servicePro = !profileErr && profile ? profileProEntitlement(profile.is_pro) : false;

  // PostgREST can return [] under RLS even when a row exists; the dashboard uses service / table editor.
  // Trust JWT-scoped REST when it says true; otherwise use service role (same source as SQL editor).
  const dbPro = restPro === true || servicePro;

  const jwtPro = jwtProEntitlement(user);
  const isPro = Boolean(dbPro || jwtPro);

  return { authed: true, userId: user.id, isPro, supabaseService };
}

/**
 * Require a valid Bearer session for paid AI routes (stops anonymous OpenAI abuse).
 * @param {any} req
 * @param {any} res
 * @param {{ requirePro?: boolean }} [options]
 * @returns {Promise<{ authed: true, userId: string, isPro: boolean, supabaseService: import("@supabase/supabase-js").SupabaseClient } | null>} null if response already sent
 */
export async function requireCandidateSession(req, res, options = {}) {
  const { requirePro = false } = options;
  const resolved = await resolveCandidateFromRequest(req);
  if (resolved.error) {
    res.status(500).json({ error: resolved.error });
    return null;
  }
  if (resolved.badToken) {
    res.status(401).json({ error: "Invalid or expired session. Sign in again." });
    return null;
  }
  if (!resolved.authed) {
    res.status(401).json({ error: "Sign in required." });
    return null;
  }
  if (requirePro && !resolved.isPro) {
    res.status(403).json({
      error: "This feature requires Pro.",
      code: "PRO_REQUIRED",
      authUserId: resolved.userId != null ? String(resolved.userId) : undefined,
    });
    return null;
  }
  return resolved;
}

/** Completed mock interviews this UTC month (interview_sessions rows). */
export async function countInterviewSessionsThisUtcMonth(supabaseService, userId) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabaseService
    .from("interview_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  if (error) return { count: 0, error };
  return { count: typeof count === "number" ? count : 0, error: null };
}

export const FREE_MONTHLY_INTERVIEW_LIMIT = 3;
export const FREE_QUESTION_COUNT = 5;
export const PRO_QUESTION_COUNT = 10;
