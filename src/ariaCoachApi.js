import { supabase } from "./supabaseClient";

/**
 * Call POST /api/aria-coach with the full Aria system prompt + injected profile.
 *
 * @param {object} opts
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} opts.messages
 * @param {'coach'|'teach'|'mock'} [opts.mode]
 * @param {string} [opts.teachModule] e.g. T1–T7 from docs/aria-system-prompt.md
 * @param {string} [opts.teachTopic]
 * @param {string} [opts.targetCompany]
 * @param {string} [opts.targetIndustry]
 * @param {string} [opts.experienceLevel] entry | mid | senior | exec
 * @param {string} [opts.currentFocus]
 * @param {Record<string, unknown>} [opts.profile] merged into [PROFILE OVERRIDES]
 * @param {Record<string, unknown>} [opts.candidateProfile] alias for opts.profile (Aria Live UI)
 * @param {boolean} [opts.liveVoiceSession] Aria Live: shorter max_tokens + concise-reply system hint
 * @returns {Promise<{ reply: string, model?: string, mode?: string, usage?: object }>}
 */
export async function sendAriaCoachMessage(opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const err = new Error("Sign in required for Aria coaching.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  let res;
  try {
    res = await fetch("/api/aria-coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(coachRequestBody(opts)),
    });
  } catch (cause) {
    const err = new Error("Cannot reach /api/aria-coach (network error).");
    err.code = "NETWORK";
    err.cause = cause;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data?.error === "string" ? data.error : "Aria request failed");
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }
  return {
    reply: data.reply || "",
    model: data.model,
    mode: data.mode,
    usage: data.usage,
  };
}

function coachRequestBody(opts) {
  const profilePayload = opts.profile ?? opts.candidateProfile;
  return {
    messages: opts.messages,
    mode: opts.mode || "coach",
    teachModule: opts.teachModule,
    teachTopic: opts.teachTopic,
    targetCompany: opts.targetCompany,
    targetIndustry: opts.targetIndustry,
    experienceLevel: opts.experienceLevel,
    currentFocus: opts.currentFocus,
    profile: profilePayload,
    liveVoiceSession: opts.liveVoiceSession === true,
  };
}

/**
 * POST /api/aria-coach with `stream: true` (SSE). Local API must attach raw Node response — see local-api-server.
 * @returns {Promise<Response>} Use {@link readAriaCoachSse} on the body.
 */
export async function fetchAriaCoachSse(opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const err = new Error("Sign in required for Aria coaching.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  let res;
  try {
    res = await fetch("/api/aria-coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ...coachRequestBody(opts), stream: true }),
    });
  } catch (cause) {
    const err = new Error("Cannot reach /api/aria-coach (network error).");
    err.code = "NETWORK";
    err.cause = cause;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(typeof data?.error === "string" ? data.error : "Aria request failed");
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }
  return res;
}

/**
 * Parse SSE from {@link fetchAriaCoachSse}. Calls onDelta(token, fullSoFar) as tokens arrive.
 * @returns {Promise<string>} Full reply text.
 */
export async function readAriaCoachSse(res, { onDelta } = {}) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("event-stream")) {
    const data = await res.json().catch(() => ({}));
    const reply = typeof data.reply === "string" ? data.reply : "";
    onDelta?.("", reply);
    return reply.trim();
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let carry = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += dec.decode(value, { stream: true });
    for (;;) {
      const ix = carry.indexOf("\n\n");
      if (ix < 0) break;
      const block = carry.slice(0, ix);
      carry = carry.slice(ix + 2);
      const line = block.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return full.trim();
      try {
        const j = JSON.parse(raw);
        if (typeof j.e === "string") throw new Error(j.e);
        if (typeof j.t === "string" && j.t) {
          full += j.t;
          onDelta?.(j.t, full);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return full.trim();
}
