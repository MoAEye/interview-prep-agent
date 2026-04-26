/**
 * Shared by browser (App) and Node API (candidateAuth).
 * Pro may be stored as boolean, int, or string depending on source (SQL, Stripe, manual edits).
 */
export function profileProEntitlement(v) {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "t" || s === "1" || s === "yes";
  }
  return false;
}

/** app_metadata / user_metadata (JWT-linked user object from Supabase Auth). */
export function jwtProEntitlement(user) {
  if (!user || typeof user !== "object") return false;
  const app = user.app_metadata || {};
  const um = user.user_metadata || {};
  return profileProEntitlement(app.is_pro) || profileProEntitlement(um.is_pro);
}
