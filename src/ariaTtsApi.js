import { supabase } from "./supabaseClient";
import { classifyAudioResponsePrefix, isLikelyBadTtsPayload } from "./ariaTtsPayload";

/**
 * Fetch spoken audio for Aria reply text (OpenAI TTS via POST /api/aria-tts).
 * @param {string} text
 * @returns {Promise<Blob>}
 */
export async function fetchAriaSpeech(text) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const err = new Error("Sign in required.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  let res;
  try {
    res = await fetch("/api/aria-tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text }),
    });
  } catch (cause) {
    const err = new Error("Cannot reach /api/aria-tts (network error).");
    err.code = "NETWORK";
    err.cause = cause;
    throw err;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const base = typeof data?.error === "string" ? data.error : "Speech request failed";
    const pathPart = typeof data?.path === "string" && data.path ? ` — path: ${data.path}` : "";
    let msg = base + pathPart;
    if (res.status === 404 && base === "Not found") {
      msg +=
        " The process on port 8787 is probably an old API without /api/aria-tts. Quit it and run npm run dev:local again.";
    }
    const err = new Error(msg.trim());
    err.code = data?.code;
    err.status = res.status;
    throw err;
  }

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const serverSaysMpeg =
    ct.includes("audio/mpeg") || ct.includes("audio/mp3") || ct.includes("application/octet-stream");

  const ab = await res.arrayBuffer();
  if (!ab || ab.byteLength < 64) {
    const err = new Error("Speech response was empty.");
    err.code = "TTS_EMPTY";
    throw err;
  }
  const u8 = new Uint8Array(ab.slice(0, 4));
  const looksMpeg =
    (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) ||
    (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33);
  const looksJson = u8[0] === 0x7b;
  const looksHtml = u8[0] === 0x3c;

  const badPayload = looksJson || looksHtml || (!looksMpeg && !serverSaysMpeg);
  if (badPayload) {
    let detail = "Speech API did not return MP3 audio.";
    if (looksHtml) {
      detail =
        "Got a web page instead of audio. On local dev run npm run dev:local (API on port 8787) so /api/aria-tts reaches OpenAI.";
    } else if (prefix.looksJson) {
      try {
        const j = JSON.parse(new TextDecoder().decode(ab.slice(0, 4000)));
        if (typeof j.error === "string") detail = j.error;
      } catch {
        detail = "Speech API returned JSON instead of audio.";
      }
    }
    const err = new Error(detail);
    err.code = "TTS_BAD_PAYLOAD";
    throw err;
  }

  return new Blob([ab], { type: "audio/mpeg" });
}
