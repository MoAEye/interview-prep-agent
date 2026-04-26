/**
 * POST /api/aria-tts
 * OpenAI text-to-speech for Aria Live. Returns audio/mpeg.
 * Requires: Authorization: Bearer <supabase_jwt>
 * Body: { text: string }
 */
import OpenAI from "openai";
import { resolveCandidateFromRequest } from "./_lib/candidateAuth.js";
import { captureApiException } from "./_lib/sentryNode.js";
import { loadEnvLocalSafe } from "./_lib/loadEnvLocalSafe.js";

loadEnvLocalSafe();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
]);

const MAX_INPUT = 4096;

function sanitizeForSpeech(raw) {
  let t = typeof raw === "string" ? raw : String(raw ?? "");
  t = t.replace(/\[(GOOD|IMPROVE):\s*([\s\S]*?)\]/gi, (_, kind, body) => {
    const label = String(kind).toUpperCase() === "GOOD" ? "What worked. " : "To improve. ";
    return label + String(body || "").trim();
  });
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > MAX_INPUT) t = `${t.slice(0, MAX_INPUT - 3)}...`;
  return t;
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
      res.status(401).json({ error: "Sign in required.", code: "AUTH_REQUIRED" });
      return;
    }

    const body = req.body || {};
    const input = sanitizeForSpeech(body.text);
    if (!input) {
      res.status(400).json({ error: "Missing or empty text.", code: "EMPTY_TEXT" });
      return;
    }

    const voiceRaw = typeof body.voice === "string" ? body.voice.trim().toLowerCase() : "";
    const voice = ALLOWED_VOICES.has(voiceRaw) ? voiceRaw : (process.env.ARIA_TTS_VOICE || "shimmer").toLowerCase();
    const safeVoice = ALLOWED_VOICES.has(voice) ? voice : "shimmer";

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : process.env.ARIA_TTS_MODEL || "tts-1";

    const speedRaw = Number(process.env.ARIA_TTS_SPEED);
    const speed =
      Number.isFinite(speedRaw) && speedRaw >= 0.25 && speedRaw <= 4 ? speedRaw : 1.2;

    /** Richer, more natural speech (when the key supports it). Falls back via env to tts-1-hd. */
    const params = {
      model,
      voice: safeVoice,
      input,
      response_format: "mp3",
      speed,
    };
    if (String(model).includes("gpt-4o-mini-tts")) {
      params.instructions =
        process.env.ARIA_TTS_INSTRUCTIONS ||
        "You are Aria, a warm, articulate interview coach. Speak with natural conversational pacing, clear articulation, and a calm supportive tone—smooth and human, never robotic or theatrical.";
    }

    const speech = await client.audio.speech.create(params);

    let arrayBuffer;
    if (speech && typeof speech.arrayBuffer === "function") {
      arrayBuffer = await speech.arrayBuffer();
    } else {
      throw new Error("OpenAI TTS response had no arrayBuffer(); check openai package version.");
    }
    const buf = Buffer.from(arrayBuffer);
    if (!buf.length || buf.length < 32) {
      res.status(502).json({ error: "OpenAI returned empty audio.", code: "TTS_EMPTY" });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).end(buf);
  } catch (e) {
    captureApiException(e, { route: "aria-tts" });
    const msg = e?.message || "TTS failed.";
    res.status(500).json({ error: msg, code: "ARIA_TTS_ERROR" });
  }
}
