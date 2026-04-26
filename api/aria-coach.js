/**
 * POST /api/aria-coach
 * Full Aria live-coaching engine: loads docs/aria-system-prompt.md, injects candidate profile, calls OpenAI.
 * Requires: Authorization: Bearer <supabase_jwt>
 */
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { resolveCandidateFromRequest } from "./_lib/candidateAuth.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARIA_PROMPT_PATH = path.join(__dirname, "..", "docs", "aria-system-prompt.md");

loadEnvLocalSafe();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COACH_MODEL_DEFAULT = process.env.ARIA_COACH_MODEL || "gpt-4o";

const MAX_MSG_CHARS = 12_000;
const MAX_MESSAGES = 40;
const MAX_USER_TURNS_PER_REQUEST = 24;

const MODE_DIRECTIVES = {
  coach: `## ACTIVE SESSION MODE (MANDATORY)
You are in **COACH MODE** (MODE 1 in your core instructions).
- Open warmly by name; reference their history when the profile provides it.
- Diagnose before teaching; use named frameworks (STAR, CAR, PREP, etc.) when relevant.
- Use the sandwich correction method; model improved answers in full when correcting.
- Push for specificity; never accept vague impact claims without numbers or concrete outcomes.
- End turns with a clear next step or question — keep the conversation moving.`,

  teach: `## ACTIVE SESSION MODE (MANDATORY)
You are in **TEACH MODE** (MODE 2 in your core instructions).
- Run a structured masterclass: objective → framework → examples → live practice.
- The candidate may name a module (T1–T7); if a module is specified in the user message block, teach that module depth-first.
- Check understanding briefly; avoid lecturing more than ~90 seconds without interaction.`,

  mock: `## ACTIVE SESSION MODE (MANDATORY)
You are in **MOCK INTERVIEWER MODE** (MODE 3 in your core instructions).
- Open in character as the interviewer at their target context; set scene; begin the interview.
- Stay fully in character until the candidate says **pause**, **stop**, or **end mock** (case-insensitive), then break character and deliver the full debrief structure from your instructions.
- Probe answers like a trained interviewer; maintain realistic pacing and follow-ups.`,
};

function clampStr(s, max) {
  const t = typeof s === "string" ? s : String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n… [truncated]`;
}

function safeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : null;
    if (!role) continue;
    out.push({ role, content: clampStr(m.content, MAX_MSG_CHARS) });
  }
  return out.slice(-MAX_MESSAGES);
}

function summarizeCv(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "Not provided yet — encourage them to save their CV in Profile.";
  if (t.length <= 1400) return t;
  return `${t.slice(0, 1400)}… [truncated for context; full CV is in their profile]`;
}

function avgScore(sessions) {
  const scored = (sessions || []).filter((s) => Number(s.score) > 0).map((s) => Number(s.score));
  if (!scored.length) return "—";
  return `${Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)}%`;
}

function lastSessionLine(sessions) {
  const first = sessions?.[0];
  if (!first?.created_at) return "—";
  const d = new Date(first.created_at);
  const title = first.job_title ? ` · ${first.job_title}` : "";
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${title}`;
}

function buildProfileBlock({
  displayName,
  email,
  targetRole,
  targetLocation,
  targetCompany,
  targetIndustry,
  experienceLevel,
  cvSummary,
  pastSessionCount,
  averageScore,
  lastSessionDate,
  currentFocus,
  planLabel,
  overrides,
}) {
  const lines = [
    `[CANDIDATE PROFILE]`,
    `Name: ${displayName}`,
    `Email: ${email}`,
    `Plan: ${planLabel}`,
    `Target Role: ${targetRole || "Not set"}`,
    `Target Company: ${targetCompany || "Not specified"}`,
    `Target Industry: ${targetIndustry || "Not specified"}`,
    `Experience Level: ${experienceLevel || "Not specified"}`,
    `CV Summary: ${cvSummary}`,
    `Past Session Count: ${pastSessionCount}`,
    `Average Score (scored mocks): ${averageScore}`,
    `Lowest Scoring Categories: Not tracked per-category in app data — infer gaps from scores and answers in this chat.`,
    `Most Skipped Question Types: Not tracked in app data — ask if relevant.`,
    `Last Session Date: ${lastSessionDate}`,
    `Last Session Notes: Use conversation + scores; detailed per-question history is in the app report after each mock.`,
    `Progress Milestones: Celebrate genuine gains when you observe them in this session.`,
    `Coaching History Summary: ${pastSessionCount === 0 ? "New or no completed graded mocks yet — establish baseline." : `Returning candidate with ${pastSessionCount} saved session(s).`}`,
    `Current Focus Area: ${currentFocus || targetRole || "General interview readiness"}`,
    `[/CANDIDATE PROFILE]`,
  ];
  if (overrides && typeof overrides === "object") {
    lines.push(`[PROFILE OVERRIDES / USER CONTEXT]`);
    lines.push(clampStr(JSON.stringify(overrides, null, 2), 4000));
    lines.push(`[/PROFILE OVERRIDES]`);
  }
  return lines.join("\n");
}

function loadAriaPromptMarkdown() {
  if (!fs.existsSync(ARIA_PROMPT_PATH)) {
    throw new Error(`Aria prompt file missing: ${ARIA_PROMPT_PATH}`);
  }
  return fs.readFileSync(ARIA_PROMPT_PATH, "utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "OpenAI API key is missing. Add OPENAI_API_KEY to .env.local." });
    return;
  }

  try {
    const resolved = await resolveCandidateFromRequest(req);
    if (resolved.error) {
      res.status(500).json({ error: resolved.error });
      return;
    }
    if (resolved.badToken) {
      res.status(401).json({ error: "Invalid or expired session. Sign in again.", code: "INVALID_TOKEN" });
      return;
    }
    if (!resolved.authed) {
      res.status(401).json({ error: "Sign in required to use Aria coaching.", code: "AUTH_REQUIRED" });
      return;
    }

    const { userId, isPro, supabaseService } = resolved;
    const body = req.body || {};

    const modeRaw = String(body.mode || "coach").toLowerCase();
    const mode = ["coach", "teach", "mock"].includes(modeRaw) ? modeRaw : "coach";
    const teachModule = typeof body.teachModule === "string" ? body.teachModule.trim().slice(0, 80) : "";
    const teachTopic = typeof body.teachTopic === "string" ? body.teachTopic.trim().slice(0, 200) : "";

    let userMessages = safeMessages(body.messages);
    const userTurns = userMessages.filter((m) => m.role === "user").length;
    if (userTurns === 0) {
      res.status(400).json({ error: "Send at least one user message in messages[].", code: "EMPTY_MESSAGES" });
      return;
    }
    if (userTurns > MAX_USER_TURNS_PER_REQUEST) {
      res.status(400).json({ error: "Too many user turns in one request.", code: "MESSAGES_LIMIT" });
      return;
    }

    const [{ count: sessionCount }, profileRes, sessionsRes, adminUserRes] = await Promise.all([
      supabaseService
        .from("interview_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabaseService
        .from("user_profiles")
        .select("resume_text, target_job_role, target_location")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseService
        .from("interview_sessions")
        .select("score, created_at, job_title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(24),
      supabaseService.auth.admin.getUserById(userId),
    ]);

    const authUser = adminUserRes?.data?.user;
    const meta = authUser?.user_metadata || {};
    const email = authUser?.email || "—";
    const displayName =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      (email && email !== "—" ? email.split("@")[0] : "Candidate");

    const row = profileRes?.data || {};
    const sessions = sessionsRes?.data || [];
    const pastSessionCount = typeof sessionCount === "number" ? sessionCount : sessions.length;

    const profileOverrides =
      body.profile && typeof body.profile === "object" && !Array.isArray(body.profile) ? body.profile : body.profileOverrides;

    const profileBlock = buildProfileBlock({
      displayName,
      email,
      targetRole: row.target_job_role || "",
      targetLocation: row.target_location || "",
      targetCompany: typeof body.targetCompany === "string" ? body.targetCompany : profileOverrides?.targetCompany,
      targetIndustry: typeof body.targetIndustry === "string" ? body.targetIndustry : profileOverrides?.targetIndustry,
      experienceLevel: typeof body.experienceLevel === "string" ? body.experienceLevel : profileOverrides?.experienceLevel,
      cvSummary: summarizeCv(row.resume_text),
      pastSessionCount,
      averageScore: avgScore(sessions),
      lastSessionDate: lastSessionLine(sessions),
      currentFocus: typeof body.currentFocus === "string" ? body.currentFocus : profileOverrides?.currentFocus,
      planLabel: isPro ? "Pro" : "Free",
      overrides: profileOverrides,
    });

    let modeExtra = "";
    if (mode === "teach" && (teachModule || teachTopic)) {
      modeExtra = `\n\n### Teach session focus\n${teachModule ? `Module / code: ${teachModule}\n` : ""}${teachTopic ? `Topic: ${teachTopic}\n` : ""}`;
    }

    const liveVoice = body.liveVoiceSession === true || body.liveVoiceSession === "true";
    const modelUsed = liveVoice
      ? process.env.ARIA_LIVE_COACH_MODEL || "gpt-4o-mini"
      : COACH_MODEL_DEFAULT;

    const maxTokensFromEnv = Number(process.env.ARIA_COACH_MAX_TOKENS);
    const maxTokens = Number.isFinite(maxTokensFromEnv) && maxTokensFromEnv > 0
      ? Math.min(4096, maxTokensFromEnv)
      : liveVoice
        ? mode === "coach"
          ? 650
          : 900
        : 4096;

    const basePrompt = loadAriaPromptMarkdown();
    const voiceLatencyHint = liveVoice
      ? "\n- **Live voice session (TTS):** Short, punchy paragraphs — **~20–40 seconds** read aloud. No long intros. One follow-up question at the end.\n"
      : "";

    const systemContent = `${basePrompt}

---

${MODE_DIRECTIVES[mode]}${modeExtra}

---

${profileBlock}

---

## RUNTIME INSTRUCTIONS
- You are speaking to **${displayName}** now. Follow all persona, tone, and quality rules above.
- Do **not** claim you have seen private data beyond what appears in the candidate profile block and this chat.
- Keep responses focused; prefer paragraphs and clear headings over walls of text unless in Teach mode.${voiceLatencyHint}`;

    const openAiMessages = [{ role: "system", content: systemContent }, ...userMessages];
    const streamWanted =
      (body.stream === true || body.stream === "true") && req._streamNodeRes && typeof req._streamNodeRes.write === "function";

    if (streamWanted) {
      const raw = req._streamNodeRes;
      try {
        raw.statusCode = 200;
        raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        raw.setHeader("Cache-Control", "no-cache, no-transform");
        raw.setHeader("Connection", "keep-alive");
        raw.setHeader("X-Accel-Buffering", "no");
        const stream = await client.chat.completions.create({
          model: modelUsed,
          temperature: 0.72,
          max_tokens: maxTokens,
          messages: openAiMessages,
          stream: true,
        });
        for await (const part of stream) {
          const d = part.choices[0]?.delta?.content;
          if (d) raw.write(`data: ${JSON.stringify({ t: d })}\n\n`);
        }
        raw.write("data: [DONE]\n\n");
        raw.end();
      } catch (err) {
        console.error("aria-coach stream error:", err);
        if (!raw.headersSent) {
          raw.statusCode = 500;
          raw.setHeader("Content-Type", "application/json; charset=utf-8");
          raw.end(JSON.stringify({ error: err?.message || "Stream failed", code: "ARIA_COACH_STREAM_ERROR" }));
        } else {
          try {
            raw.write(`data: ${JSON.stringify({ e: err?.message || "Stream failed" })}\n\n`);
            raw.end();
          } catch {
            /* ignore */
          }
        }
      }
      return;
    }

    const completion = await client.chat.completions.create({
      model: modelUsed,
      temperature: 0.72,
      max_tokens: maxTokens,
      messages: openAiMessages,
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim() || "";
    if (!reply) {
      res.status(502).json({ error: "Aria returned an empty response. Try again.", code: "EMPTY_REPLY" });
      return;
    }

    res.status(200).json({
      reply,
      role: "assistant",
      model: modelUsed,
      mode,
      usage: completion.usage
        ? {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          }
        : undefined,
    });
  } catch (e) {
    captureApiException(e, { route: "aria-coach" });
    console.error("aria-coach error:", e);
    const msg = e?.message || "Coaching request failed.";
    res.status(500).json({ error: msg, code: "ARIA_COACH_ERROR" });
  }
}
