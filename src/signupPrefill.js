/** Session keys for recruiter → candidate signup flow */
export const SIGNUP_PREFILL_KEY = "interviewai_signup_prefill";
export const IMPORT_SUCCESS_KEY = "interviewai_import_success";
/** Set after candidate sign-up so auth listener opens profile onboarding instead of upload */
export const POST_SIGNUP_PROFILE_KEY = "interviewai_post_signup_profile";
/** Survives Strict Mode / URL strip so “Create account” always opens sign-up */
export const OPEN_SIGNUP_SESSION_KEY = "interviewai_open_signup";

export function readSignupPrefill() {
  try {
    const raw = sessionStorage.getItem(SIGNUP_PREFILL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSignupPrefill() {
  try {
    sessionStorage.removeItem(SIGNUP_PREFILL_KEY);
  } catch (_) {}
}

export function setImportSuccessBanner() {
  try {
    sessionStorage.setItem(IMPORT_SUCCESS_KEY, "1");
  } catch (_) {}
}

/** Call before navigating to /?signup=1 (e.g. intro banner link) so signup screen opens reliably */
export function setOpenSignupIntent() {
  try {
    sessionStorage.setItem(OPEN_SIGNUP_SESSION_KEY, "1");
  } catch (_) {}
}

/** If URL has ?signup=1, store intent so React Strict Mode’s second mount still opens sign-up */
export function persistSignupIntentFromUrl() {
  try {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("signup") === "1") {
      sessionStorage.setItem(OPEN_SIGNUP_SESSION_KEY, "1");
    }
  } catch (_) {}
}

/** Clear after successful sign-in / sign-up (not when merely opening the login screen) */
export function clearOpenSignupIntent() {
  try {
    sessionStorage.removeItem(OPEN_SIGNUP_SESSION_KEY);
  } catch (_) {}
}
