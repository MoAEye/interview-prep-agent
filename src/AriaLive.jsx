import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { sendAriaCoachMessage, fetchAriaCoachSse, readAriaCoachSse } from "./ariaCoachApi.js";
import { fetchAriaSpeech } from "./ariaTtsApi.js";
import { PulseBeams } from "./components/ui/pulse-beams.jsx";
import { ARIA_PULSE_BEAMS, ARIA_PULSE_GRADIENT } from "./ariaLiveBeams.js";
import { AriaVoiceOrb } from "./components/AriaVoiceOrb.jsx";

const BP = 768;

const MODE_LABELS = { coach: "COACH MODE", teach: "TEACH MODE", mock: "MOCK INTERVIEWER MODE" };

const FOCUS_OPTIONS = [
  { id: "general", label: "General coaching", desc: "Warm-up, strengths, and overall interview readiness." },
  { id: "star", label: "STAR & stories", desc: "Tight behavioral answers with clear situation → result." },
  { id: "weak_area", label: "Weakest area", desc: "Lean on your profile: recent low scores and gaps." },
  { id: "mock_warmup", label: "Mock interview sprint", desc: "Fast Q&A before a real loop or panel." },
];

const LOCAL_API_HINT =
  "Cannot reach the local API (Vite proxies /api to port 8787). Run npm run dev:local to start Vite and the API together, or run npm run api:local in a second terminal while Vite is on :5173. Ensure OPENAI_API_KEY is set in .env.local.";

function isLocalHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function ariaCoachErrorMessage(err) {
  const code = err && typeof err === "object" ? err.code : undefined;
  const status = err && typeof err === "object" ? err.status : undefined;
  const msg = err && typeof err === "object" && typeof err.message === "string" ? err.message : "";
  const local = isLocalHost();

  if (code === "AUTH_REQUIRED") return "Please sign in to use Aria Live.";

  if (code === "NETWORK") {
    if (import.meta.env.DEV || local) return LOCAL_API_HINT;
    return "Aria is having trouble connecting. Please try again.";
  }

  if (status === 401 || status === 403) {
    return "Session expired or not authorized. Try signing out and back in.";
  }

  if ((import.meta.env.DEV || local) && msg && msg !== "Aria request failed") return msg;

  if (local) {
    return "Aria is having trouble connecting. Please try again. If you're on a local dev server, run npm run dev:local or npm run api:local (API on port 8787) and ensure OPENAI_API_KEY is set in .env.local.";
  }

  return "Aria is having trouble connecting. Please try again.";
}

function formatTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Persist ended session — requires `supabase/aria-live-sessions.sql` run in the project. */
async function saveAriaLiveSessionToSupabase({
  userId,
  durationSeconds,
  focusId,
  sessionMode,
  topics,
  messages,
}) {
  const transcript = messages
    .filter((m) => m?.content && String(m.content).trim())
    .map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
  const userMsgs = messages.filter((m) => m.role === "user").length;
  const lastAria = [...messages].reverse().find((m) => m.role === "aria" && String(m.content || "").trim());
  const modeLabel = MODE_LABELS[sessionMode] || sessionMode || "Live";
  let summary = "";
  if (lastAria?.content) {
    const t = String(lastAria.content).replace(/\s+/g, " ").trim();
    const sentence = t.match(/^.{1,320}?([.!?])(\s|$)/);
    const pick = sentence ? sentence[0].trim() : t;
    summary = pick.length > 200 ? `${pick.slice(0, 200).replace(/\s+\S*$/, "")}…` : pick;
  } else if (topics?.length) {
    summary = `${modeLabel} · ${topics.join(", ")}`;
  } else {
    summary = `${modeLabel} · Aria Live session`;
  }
  const { error } = await supabase.from("aria_live_sessions").insert({
    user_id: userId,
    duration_seconds: Math.max(0, Math.round(durationSeconds || 0)),
    focus_id: focusId || null,
    session_mode: sessionMode || null,
    topics: topics || [],
    message_count: userMsgs,
    summary,
    transcript,
  });
  if (error) console.warn("[AriaLive] Could not save session (run supabase/aria-live-sessions.sql if missing):", error.message || error);
  return !error;
}

function parseFeedbackParts(text) {
  if (!text || typeof text !== "string") return [{ type: "text", content: text || "" }];
  const parts = [];
  let remaining = text;
  const re = /\[(GOOD|IMPROVE):\s*([\s\S]*?)\]/gi;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: m[1].toLowerCase() === "good" ? "good" : "improve", content: (m[2] || "").trim() });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts.length ? parts : [{ type: "text", content: text }];
}

const TOPIC_KEYWORDS = [
  { k: ["STAR", "star method"], label: "STAR method" },
  { k: ["result", "impact", "metric"], label: "Quantifying impact" },
  { k: ["structure", "framework"], label: "Answer structure" },
  { k: ["confidence", "pace", "pause"], label: "Delivery & confidence" },
  { k: ["weakness", "failure"], label: "Tough questions" },
  { k: ["question", "ask them"], label: "Questions for them" },
];

/** Topic ticks when those keywords appear in what you or Aria said — not a strict “finish this lesson” order. */
function deriveTopicsFromSessionMessages(messages) {
  const found = new Set();
  messages.forEach((m) => {
    if (!m?.content || (m.role !== "aria" && m.role !== "user")) return;
    const c = String(m.content).toLowerCase();
    TOPIC_KEYWORDS.forEach(({ k, label }) => {
      if (k.some((word) => c.includes(word.toLowerCase()))) found.add(label);
    });
  });
  return Array.from(found);
}

function barColor(pct) {
  if (pct < 40) return "#ef4444";
  if (pct < 70) return "#f59e0b";
  return "#22c55e";
}

/** Softer violet meters for “estimate” — avoids all-red bars when profile avg is low. */
function livePulseMeterStyle(pct) {
  const p = Math.min(100, Math.max(0, Number(pct) || 0));
  const fill = p >= 55 ? "#a78bfa" : p >= 35 ? "#8b5cf6" : "#6d28d9";
  return { fill, widthPct: Math.max(p, 14) };
}

function textForAriaTts(raw) {
  let t = typeof raw === "string" ? raw : "";
  t = t.replace(/\[(GOOD|IMPROVE):\s*([\s\S]*?)\]/gi, (_, kind, body) => {
    const label = String(kind).toUpperCase() === "GOOD" ? "What worked. " : "To improve. ";
    return label + String(body || "").trim();
  });
  t = t.replace(/\s+/g, " ").trim();
  /** Shorter TTS input = faster OpenAI speech generation (subtitle still shows full reply in chat). */
  const max = 2000;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const i = cut.lastIndexOf(" ");
  return i > max * 0.55 ? `${cut.slice(0, i)}…` : `${cut}…`;
}

/** Speakable slices from a streaming reply so TTS can start before the model finishes. */
function tryExtractStreamTtsSegment(buffer, startIdx) {
  const rest = buffer.slice(startIdx);
  if (!rest.trim()) return null;
  const sent = rest.match(/^([\s\S]{10,}?[.!?])(?:\s+|$)/);
  if (sent) {
    return { text: sent[1].trim(), advance: sent[0].length };
  }
  if (startIdx === 0 && rest.length >= 92) {
    const cap = rest.slice(0, 132);
    const sp = cap.lastIndexOf(" ");
    if (sp >= 72) {
      return { text: rest.slice(0, sp).trim(), advance: sp + 1 };
    }
  }
  return null;
}

/** Extra playback speed on top of OpenAI `speed` (kept subtle to avoid chipmunk effect). */
const ARIA_TTS_PLAYBACK_RATE = 1.06;

/** Reused so resume() survives across gestures (helps some autoplay policies). */
let ariaUnlockAudioContext = null;

/** Synchronous part of audio unlock — call inside the same user click/tap as play() when possible. */
function primeAudioFromUserGesture() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ariaUnlockAudioContext || ariaUnlockAudioContext.state === "closed") {
      ariaUnlockAudioContext = new AC();
    }
    void ariaUnlockAudioContext.resume();
    const o = ariaUnlockAudioContext.createOscillator();
    const g = ariaUnlockAudioContext.createGain();
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ariaUnlockAudioContext.destination);
    o.start();
    o.stop(ariaUnlockAudioContext.currentTime + 0.05);
  } catch {
    /* ignore */
  }
}

/** Unlocks autoplay policies so TTS can play (call from a click handler). */
async function unlockBrowserAudio() {
  primeAudioFromUserGesture();
  try {
    if (ariaUnlockAudioContext) await ariaUnlockAudioContext.resume();
  } catch {
    /* ignore */
  }
}

/**
 * Detached `new Audio()` is often silent on iOS/Safari; a body-mounted `<audio>` respects user-gesture playback.
 */
function createAriaTtsAudioElement() {
  const el = document.createElement("audio");
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
  el.setAttribute("preload", "auto");
  el.volume = 1;
  el.style.cssText =
    "position:fixed;width:0;height:0;left:0;top:0;opacity:0;pointer-events:none;z-index:-1;clip:rect(0,0,0,0)";
  document.body.appendChild(el);
  return el;
}

function waitAudioCanPlay(el) {
  if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onOk = () => {
      el.removeEventListener("canplay", onOk);
      el.removeEventListener("error", onBad);
      resolve();
    };
    const onBad = () => {
      el.removeEventListener("canplay", onOk);
      el.removeEventListener("error", onBad);
      reject(new Error("audio load error"));
    };
    el.addEventListener("canplay", onOk, { once: true });
    el.addEventListener("error", onBad, { once: true });
    try {
      el.load();
    } catch {
      onBad();
    }
  });
}

export default function AriaLive({ user, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isAriaTyping, setIsAriaTyping] = useState(false);
  const [sessionMode, setSessionMode] = useState("coach");
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn] = useState(true);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [modeSwitcherOpen, setModeSwitcherOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [openingDone, setOpeningDone] = useState(false);
  const [voiceOutputOn, setVoiceOutputOn] = useState(true);
  const [ttsNeedTap, setTtsNeedTap] = useState(false);
  const [ttsRetryNonce, setTtsRetryNonce] = useState(0);
  const [speechInterim, setSpeechInterim] = useState("");
  /** Queued finals + interim, shown after `input` in the textarea (live dictation). */
  const [speechTail, setSpeechTail] = useState("");
  const [speechMicError, setSpeechMicError] = useState("");
  const [ariaTtsError, setAriaTtsError] = useState("");
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  /** lobby → focus → live → recap */
  const [ariaPhase, setAriaPhase] = useState("lobby");
  const [sessionFocusId, setSessionFocusId] = useState("general");
  const [recapSessionSeconds, setRecapSessionSeconds] = useState(0);

  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);
  const inputRef = useRef(null);
  /** Latest committed textarea text (without live speech tail) for voice flush merge. */
  const inputStateRef = useRef("");
  const openingRef = useRef(false);
  const [inputFocused, setInputFocused] = useState(false);
  const currentAudioRef = useRef(null);
  const ttsBufferSourceRef = useRef(null);
  const objectUrlRef = useRef(null);
  const ariaTtsGenRef = useRef(0);
  const isTtsPlayingRef = useRef(false);
  const lastSpokenAriaKeyRef = useRef(null);
  const isAriaTypingRef = useRef(false);
  const shouldListenRef = useRef(false);
  const recognitionRef = useRef(null);
  const voiceQueueRef = useRef("");
  const voiceFlushTimerRef = useRef(null);
  const didUnlockOnSpeechRef = useRef(false);
  /** When fetch succeeded but play() was blocked — replay from a real click (gesture). */
  const pendingTtsRef = useRef(null);
  const voiceOutputOnRef = useRef(true);
  const streamingReplyKeyRef = useRef(null);
  const ttsStreamOffsetRef = useRef(0);
  const ttsChainRef = useRef(Promise.resolve());

  const speechSupported = useMemo(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  const stopAriaSpeech = useCallback(() => {
    try {
      const src = ttsBufferSourceRef.current;
      if (src) {
        try {
          src.stop(0);
        } catch {
          /* ignore */
        }
        ttsBufferSourceRef.current = null;
      }
    } catch {
      /* ignore */
    }
    isTtsPlayingRef.current = false;
    setIsTtsPlaying(false);
    const a = currentAudioRef.current;
    if (a) {
      try {
        a.pause();
        a.removeAttribute("src");
      } catch {
        /* ignore */
      }
      try {
        a.remove();
      } catch {
        /* ignore */
      }
      currentAudioRef.current = null;
    }
    const u = objectUrlRef.current;
    if (u) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* ignore */
      }
      objectUrlRef.current = null;
    }
  }, []);

  /**
   * Play MP3 bytes: HTML5 Audio first (often more reliable after autoplay rules), then Web Audio.
   */
  const playAriaTtsBlob = useCallback(async (blob, key, gen) => {
    const releasePlaying = () => {
      if (gen !== ariaTtsGenRef.current) return;
      isTtsPlayingRef.current = false;
      setIsTtsPlaying(false);
    };

    let buf;
    try {
      buf = await blob.arrayBuffer();
    } catch {
      return false;
    }
    if (gen !== ariaTtsGenRef.current) return false;
    if (!buf || buf.byteLength < 32) return false;

    const tryHtml = async () => {
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      objectUrlRef.current = url;
      const audio = createAriaTtsAudioElement();
      audio.src = url;
      try {
        audio.playbackRate = ARIA_TTS_PLAYBACK_RATE;
      } catch {
        /* ignore */
      }
      currentAudioRef.current = audio;
      isTtsPlayingRef.current = true;
      setIsTtsPlaying(true);

      /** `audio.play()` resolves when playback *starts* — streaming TTS must wait until `ended` or voices overlap. */
      return await new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        const cleanupUrl = () => {
          try {
            URL.revokeObjectURL(url);
          } catch {
            /* ignore */
          }
          if (objectUrlRef.current === url) objectUrlRef.current = null;
        };

        audio.onended = () => {
          cleanupUrl();
          try {
            audio.remove();
          } catch {
            /* ignore */
          }
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
          releasePlaying();
          finish(true);
        };

        audio.onerror = () => {
          releasePlaying();
          cleanupUrl();
          try {
            audio.remove();
          } catch {
            /* ignore */
          }
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
          finish(false);
        };

        void (async () => {
          try {
            if (gen !== ariaTtsGenRef.current) throw new Error("stale");
            await waitAudioCanPlay(audio);
            if (gen !== ariaTtsGenRef.current) throw new Error("stale");
            await audio.play();
            if (gen !== ariaTtsGenRef.current) throw new Error("stale");
            lastSpokenAriaKeyRef.current = key;
            setTtsNeedTap(false);
          } catch {
            releasePlaying();
            cleanupUrl();
            try {
              audio.remove();
            } catch {
              /* ignore */
            }
            if (currentAudioRef.current === audio) currentAudioRef.current = null;
            finish(false);
          }
        })();
      });
    };

    const tryWebAudio = async () => {
      const ctx = ariaUnlockAudioContext;
      if (!ctx || ctx.state === "closed") return false;
      try {
        await ctx.resume();
        if (gen !== ariaTtsGenRef.current) return false;
        const audioBuffer = await ctx.decodeAudioData(buf.slice(0));
        if (gen !== ariaTtsGenRef.current) return false;
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        try {
          source.playbackRate.value = ARIA_TTS_PLAYBACK_RATE;
        } catch {
          /* ignore */
        }
        const gain = ctx.createGain();
        gain.gain.value = 1;
        source.connect(gain);
        gain.connect(ctx.destination);
        ttsBufferSourceRef.current = source;
        isTtsPlayingRef.current = true;
        setIsTtsPlaying(true);

        return await new Promise((resolve) => {
          let settled = false;
          const finish = (ok) => {
            if (settled) return;
            settled = true;
            resolve(ok);
          };
          source.onended = () => {
            ttsBufferSourceRef.current = null;
            releasePlaying();
            finish(true);
          };
          try {
            source.start(0);
            lastSpokenAriaKeyRef.current = key;
            setTtsNeedTap(false);
          } catch {
            ttsBufferSourceRef.current = null;
            releasePlaying();
            finish(false);
          }
        });
      } catch {
        ttsBufferSourceRef.current = null;
        releasePlaying();
        return false;
      }
    };

    if (await tryHtml()) return true;
    await unlockBrowserAudio();
    if (gen !== ariaTtsGenRef.current) return false;
    if (await tryWebAudio()) return true;
    return false;
  }, []);

  useEffect(() => {
    voiceOutputOnRef.current = voiceOutputOn;
  }, [voiceOutputOn]);

  const enqueueStreamTts = useCallback(
    (plainText) => {
      const seg = textForAriaTts(plainText);
      if (!seg.trim()) return;
      const key = streamingReplyKeyRef.current;
      if (key == null) return;
      ttsChainRef.current = ttsChainRef.current.then(async () => {
        if (streamingReplyKeyRef.current !== key) return;
        try {
          const gen = ++ariaTtsGenRef.current;
          const blob = await fetchAriaSpeech(seg);
          if (streamingReplyKeyRef.current !== key) return;
          await playAriaTtsBlob(blob, key, gen);
        } catch {
          /* ignore failed chunk */
        }
      });
    },
    [playAriaTtsBlob]
  );

  const drainStreamTtsFromBuffer = useCallback(
    (full) => {
      if (!voiceOutputOnRef.current) return;
      let guard = 0;
      while (guard++ < 40) {
        const hit = tryExtractStreamTtsSegment(full, ttsStreamOffsetRef.current);
        if (!hit) break;
        ttsStreamOffsetRef.current += hit.advance;
        enqueueStreamTts(hit.text);
      }
    },
    [enqueueStreamTts]
  );

  const runStreamingCoachReply = useCallback(
    async (historyForApi, replyTs) => {
      let uiRaf = null;
      let pendingUi = null;
      const flushUi = () => {
        uiRaf = null;
        if (pendingUi == null) return;
        const acc = pendingUi;
        pendingUi = null;
        setMessages((prev) => prev.map((m) => (m.timestamp === replyTs ? { ...m, content: acc } : m)));
      };
      try {
        const res = await fetchAriaCoachSse({
          messages: historyForApi,
          mode: sessionMode,
          candidateProfile: candidateProfile || undefined,
          liveVoiceSession: true,
        });
        const fullText = await readAriaCoachSse(res, {
          onDelta(_t, accum) {
            drainStreamTtsFromBuffer(accum);
            pendingUi = accum;
            if (uiRaf == null) uiRaf = requestAnimationFrame(flushUi);
          },
        });
        if (uiRaf != null) cancelAnimationFrame(uiRaf);
        setMessages((prev) => prev.map((m) => (m.timestamp === replyTs ? { ...m, content: fullText } : m)));
        const tail = fullText.slice(ttsStreamOffsetRef.current).trim();
        if (tail) enqueueStreamTts(tail);
        await ttsChainRef.current;
        streamingReplyKeyRef.current = null;
        return fullText;
      } catch (e) {
        streamingReplyKeyRef.current = null;
        if (uiRaf != null) cancelAnimationFrame(uiRaf);
        throw e;
      }
    },
    [sessionMode, candidateProfile, drainStreamTtsFromBuffer, enqueueStreamTts]
  );

  useEffect(() => {
    return () => {
      ariaTtsGenRef.current += 1;
      streamingReplyKeyRef.current = null;
      stopAriaSpeech();
    };
  }, [stopAriaSpeech]);

  useEffect(() => {
    isAriaTypingRef.current = isAriaTyping;
  }, [isAriaTyping]);

  useEffect(() => {
    shouldListenRef.current = !isMuted && !isAriaTyping && !isTtsPlaying && speechSupported;
  }, [isMuted, isAriaTyping, isTtsPlaying, speechSupported]);

  useEffect(() => {
    if (!voiceOutputOn) {
      stopAriaSpeech();
      lastSpokenAriaKeyRef.current = null;
      pendingTtsRef.current = null;
      setAriaTtsError("");
      return;
    }
    const last = [...messages].reverse().find((m) => m.role === "aria");
    if (!last?.content?.trim()) return;
    const key = last.timestamp;
    if (lastSpokenAriaKeyRef.current === key) return;
    const activeStreamKey = streamingReplyKeyRef.current;
    if (activeStreamKey != null && key === activeStreamKey) return;

    const text = textForAriaTts(last.content);
    if (!text) return;

    const gen = ++ariaTtsGenRef.current;
    stopAriaSpeech();

    void (async () => {
      try {
        setAriaTtsError("");
        const blob = await fetchAriaSpeech(text);
        if (gen !== ariaTtsGenRef.current) return;
        const ok = await playAriaTtsBlob(blob, key, gen);
        if (gen !== ariaTtsGenRef.current) return;
        if (!ok) {
          pendingTtsRef.current = { blob, key };
          lastSpokenAriaKeyRef.current = null;
          setTtsNeedTap(true);
        } else {
          pendingTtsRef.current = null;
        }
      } catch (e) {
        if (gen !== ariaTtsGenRef.current) return;
        pendingTtsRef.current = null;
        lastSpokenAriaKeyRef.current = null;
        setTtsNeedTap(true);
        setAriaTtsError(typeof e?.message === "string" ? e.message : "Speech failed.");
      }
    })();
  }, [messages, voiceOutputOn, stopAriaSpeech, ttsRetryNonce, playAriaTtsBlob]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    inputStateRef.current = input;
  }, [input]);

  const composedInput = useMemo(() => {
    const tail = speechTail.trim();
    if (!tail) return input;
    const base = input.replace(/\s+$/, "");
    return base ? `${base} ${tail}` : tail;
  }, [input, speechTail]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "You");
  const userInitial = (displayName || "?").slice(0, 1).toUpperCase();

  const sessionFocusLabel = useMemo(() => {
    const f = FOCUS_OPTIONS.find((o) => o.id === sessionFocusId);
    return f?.label || "General coaching";
  }, [sessionFocusId]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BP - 1}px)`);
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const sendToApi = useCallback(
    async (historyForApi) => {
      return sendAriaCoachMessage({
        messages: historyForApi,
        mode: sessionMode,
        candidateProfile: candidateProfile || undefined,
        liveVoiceSession: true,
      });
    },
    [sessionMode, candidateProfile]
  );

  const sendUserText = useCallback(
    async (rawText) => {
      const t = String(rawText || "").trim();
      if (!t || isAriaTypingRef.current) return;
      stopAriaSpeech();
      voiceQueueRef.current = "";
      setSpeechTail("");
      const userMessage = { role: "user", content: t, timestamp: Date.now() };
      const history = [...messagesRef.current, userMessage].map((m) => ({
        role: m.role === "aria" ? "assistant" : "user",
        content: m.content,
      }));
      setInput("");
      setSpeechInterim("");
      setSpeechTail("");
      setIsAriaTyping(true);
      setConnectionError("");

      if (voiceOutputOn) {
        const replyTs = Date.now();
        streamingReplyKeyRef.current = replyTs;
        ttsStreamOffsetRef.current = 0;
        lastSpokenAriaKeyRef.current = replyTs;
        ttsChainRef.current = Promise.resolve();
        setMessages((prev) => [...prev, userMessage, { role: "aria", content: "", timestamp: replyTs }]);
        try {
          await runStreamingCoachReply(history, replyTs);
        } catch (e) {
          lastSpokenAriaKeyRef.current = null;
          setMessages((prev) => prev.filter((m) => !(m.role === "aria" && m.timestamp === replyTs)));
          setConnectionError(ariaCoachErrorMessage(e));
        } finally {
          setIsAriaTyping(false);
        }
        return;
      }

      setMessages((prev) => [...prev, userMessage]);
      try {
        const response = await sendToApi(history);
        const ariaMessage = { role: "aria", content: response.reply || "", timestamp: Date.now() };
        setMessages((prev) => [...prev, ariaMessage]);
      } catch (e) {
        setConnectionError(ariaCoachErrorMessage(e));
      } finally {
        setIsAriaTyping(false);
      }
    },
    [voiceOutputOn, runStreamingCoachReply, sendToApi, stopAriaSpeech]
  );

  const sendUserTextRef = useRef(sendUserText);
  useEffect(() => {
    sendUserTextRef.current = sendUserText;
  }, [sendUserText]);

  useEffect(() => {
    if (!speechSupported || typeof window === "undefined") return undefined;

    let cancelled = false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    recognitionRef.current = r;
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-GB";
    r.maxAlternatives = 1;

    const flushVoice = () => {
      const queued = voiceQueueRef.current.trim();
      voiceQueueRef.current = "";
      setSpeechInterim("");
      setSpeechTail("");
      if (!queued || isAriaTypingRef.current || isTtsPlayingRef.current) return;
      const base = String(inputStateRef.current || "").trim();
      const combined = base ? `${base} ${queued}` : queued;
      void sendUserTextRef.current(combined);
    };

    /** Pause after last *final* chunk before auto-send (~1.5–2s feels natural; lower values cut you off mid-thought). */
    const VOICE_END_MS = 1850;
    const scheduleFlush = () => {
      window.clearTimeout(voiceFlushTimerRef.current);
      voiceFlushTimerRef.current = window.setTimeout(flushVoice, VOICE_END_MS);
    };

    r.onresult = (event) => {
      if (!didUnlockOnSpeechRef.current) {
        didUnlockOnSpeechRef.current = true;
        void unlockBrowserAudio();
      }
      if (!shouldListenRef.current) return;
      let interim = "";
      let finals = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finals += piece;
        else interim += piece;
      }
      if (interim) {
        setSpeechInterim(interim.trim());
      } else if (!finals) {
        setSpeechInterim("");
      }

      if (finals.trim()) {
        const f = finals.trim();
        voiceQueueRef.current = voiceQueueRef.current ? `${voiceQueueRef.current} ${f}` : f;
        setSpeechInterim("");
        scheduleFlush();
      }

      const q = String(voiceQueueRef.current || "").trim();
      const im = interim.trim();
      setSpeechTail([q, im].filter(Boolean).join(" "));
    };

    r.onerror = (ev) => {
      if (ev.error === "not-allowed") {
        setSpeechMicError("Microphone blocked — allow access in the browser address bar.");
      } else if (ev.error !== "no-speech" && ev.error !== "aborted") {
        setSpeechMicError("");
      }
    };

    r.onend = () => {
      if (cancelled || !shouldListenRef.current) return;
      try {
        r.start();
      } catch {
        /* already running */
      }
    };

    const tick = () => {
      if (cancelled) return;
      if (shouldListenRef.current) {
        try {
          r.start();
        } catch {
          /* ignore */
        }
      } else {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
    };

    tick();
    const iv = window.setInterval(tick, 500);

    return () => {
      cancelled = true;
      window.clearInterval(iv);
      window.clearTimeout(voiceFlushTimerRef.current);
      voiceQueueRef.current = "";
      setSpeechTail("");
      recognitionRef.current = null;
      try {
        r.onend = null;
        r.stop();
      } catch {
        /* ignore */
      }
    };
  }, [speechSupported]);

  const sendOpeningMessage = useCallback(async () => {
    if (!candidateProfile || openingRef.current) return;
    openingRef.current = true;
    setIsAriaTyping(true);
    setConnectionError("");
    const modeLine = MODE_LABELS[sessionMode] || sessionMode;
    const userContent = `[SESSION START — ${modeLine}]

Session focus (prioritise this): ${sessionFocusLabel}
Mode: ${modeLine}

The candidate has just entered the live session after choosing focus and mode.
Greet them warmly and personally by name using their profile data. In 3-4 sentences:
1. Acknowledge their chosen focus (${sessionFocusLabel}) and mode briefly.
2. Reference something specific from their history (sessions count, avg score, or last weak area).
3. Explain what you will do together in this mode, then ask one sharp opening question
   aligned with their focus and weakest area when relevant.
Keep it warm, direct and human. Do not use bullet points. Do not say you are an AI.`;
    if (voiceOutputOn) {
      const replyTs = Date.now();
      streamingReplyKeyRef.current = replyTs;
      ttsStreamOffsetRef.current = 0;
      lastSpokenAriaKeyRef.current = replyTs;
      ttsChainRef.current = Promise.resolve();
      setMessages([{ role: "aria", content: "", timestamp: replyTs }]);
      try {
        await runStreamingCoachReply([{ role: "user", content: userContent }], replyTs);
      } catch (e) {
        lastSpokenAriaKeyRef.current = null;
        setMessages([]);
        setConnectionError(ariaCoachErrorMessage(e));
      } finally {
        setIsAriaTyping(false);
        setOpeningDone(true);
      }
      return;
    }

    try {
      const response = await sendToApi([{ role: "user", content: userContent }]);
      const reply = response.reply || "";
      setMessages([{ role: "aria", content: reply, timestamp: Date.now() }]);
    } catch (e) {
      setConnectionError(ariaCoachErrorMessage(e));
    } finally {
      setIsAriaTyping(false);
      setOpeningDone(true);
    }
  }, [candidateProfile, sendToApi, voiceOutputOn, runStreamingCoachReply, sessionFocusLabel, sessionMode]);

  useEffect(() => {
    if (!user?.id || user.id === "demo") return;

    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      const metaEarly = user.user_metadata || {};
      const fullNameEarly =
        (typeof metaEarly.full_name === "string" && metaEarly.full_name.trim()) ||
        (typeof metaEarly.name === "string" && metaEarly.name.trim()) ||
        (user.email ? user.email.split("@")[0] : "there");
      try {
        const [{ data: prof, error: pErr }, countRes, recentRes, scoredRes] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("resume_text, target_job_role, target_location, is_pro")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase.from("interview_sessions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase
            .from("interview_sessions")
            .select("score, created_at, job_title")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase.from("interview_sessions").select("score, job_title").eq("user_id", user.id),
        ]);

        if (cancelled) return;

        if (pErr && pErr.code !== "PGRST116") {
          setCandidateProfile({
            full_name: fullNameEarly,
            target_role: "",
            target_company: "",
            target_industry: "",
            experience_level: "",
            total_sessions: 0,
            avg_score: null,
            weakestArea: "General",
            has_cv: false,
            recentSessions: [],
            is_pro: false,
          });
          setProfileLoading(false);
          return;
        }

        const row = prof || {};
        const sessionsList = Array.isArray(scoredRes.data) ? scoredRes.data : [];
        const scored = sessionsList.filter((s) => Number(s.score) > 0);
        const avg =
          scored.length > 0 ? Math.round(scored.reduce((a, b) => a + Number(b.score), 0) / scored.length) : null;
        const total = typeof countRes.count === "number" ? countRes.count : sessionsList.length;
        const recent = Array.isArray(recentRes.data) ? recentRes.data : [];
        let weakestArea = "General";
        if (recent.length) {
          const lowest = recent.reduce((best, s) => {
            const sc = Number(s.score) || 0;
            if (!best || sc < best.sc) return { sc, title: s.job_title || "Session" };
            return best;
          }, null);
          if (lowest && lowest.sc < 60 && lowest.sc > 0) weakestArea = `${lowest.title} (scores)`;
        }

        setCandidateProfile({
          full_name: fullNameEarly,
          target_role: row.target_job_role || "",
          target_company: row.target_location || "",
          target_industry: "",
          experience_level: "",
          total_sessions: total,
          avg_score: avg,
          weakestArea,
          has_cv: Boolean((row.resume_text || "").trim()),
          recentSessions: recent,
          is_pro: row.is_pro === true,
        });
      } catch {
        if (!cancelled) {
          setCandidateProfile({
            full_name: fullNameEarly,
            target_role: "",
            target_company: "",
            target_industry: "",
            experience_level: "",
            total_sessions: 0,
            avg_score: null,
            weakestArea: "General",
            has_cv: false,
            recentSessions: [],
            is_pro: false,
          });
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, user?.user_metadata]);

  useEffect(() => {
    if (ariaPhase !== "live") return;
    if (!profileLoading && candidateProfile && !openingDone && !openingRef.current) {
      void sendOpeningMessage();
    }
  }, [ariaPhase, profileLoading, candidateProfile, openingDone, sendOpeningMessage]);

  useEffect(() => {
    if (!sessionStarted || ariaPhase !== "live") return;
    const id = window.setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [sessionStarted, ariaPhase]);

  const enterLiveSession = useCallback(() => {
    openingRef.current = false;
    setOpeningDone(false);
    setSessionSeconds(0);
    setSessionStarted(true);
    setAriaPhase("live");
  }, []);

  const quickStartLive = useCallback(() => {
    setSessionFocusId("general");
    setSessionMode("coach");
    openingRef.current = false;
    setOpeningDone(false);
    setSessionSeconds(0);
    setSessionStarted(true);
    setAriaPhase("live");
  }, []);

  const startNewSessionFromRecap = useCallback(() => {
    stopAriaSpeech();
    setMessages([]);
    setOpeningDone(false);
    openingRef.current = false;
    setSessionSeconds(0);
    setSessionStarted(false);
    setRecapSessionSeconds(0);
    setConnectionError("");
    setInput("");
    setSpeechInterim("");
    setSpeechTail("");
    setAriaPhase("lobby");
  }, [stopAriaSpeech]);

  const confirmEndToRecap = useCallback(() => {
    setEndModalOpen(false);
    stopAriaSpeech();
    const snapMessages = [...messagesRef.current];
    const dur = sessionSeconds;
    const focusId = sessionFocusId;
    const mode = sessionMode;
    const topicList = deriveTopicsFromSessionMessages(snapMessages);
    const uid = user?.id;
    setRecapSessionSeconds(dur);
    setSessionStarted(false);
    setAriaPhase("recap");
    if (uid && uid !== "demo") {
      void saveAriaLiveSessionToSupabase({
        userId: uid,
        durationSeconds: dur,
        focusId,
        sessionMode: mode,
        topics: topicList,
        messages: snapMessages,
      });
    }
  }, [stopAriaSpeech, sessionSeconds, sessionFocusId, sessionMode, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAriaTyping]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const line = 22;
    const maxH = line * 4;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [composedInput]);

  const { lastAriaText, lastAriaSubKey } = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "aria");
    const t = last?.content || "";
    return {
      lastAriaText: t.length > 180 ? `${t.slice(0, 180)}…` : t,
      lastAriaSubKey: last?.timestamp ?? messages.length,
    };
  }, [messages]);

  const topics = useMemo(() => deriveTopicsFromSessionMessages(messages), [messages]);

  const voiceOrbState = useMemo(() => {
    if (isMuted) return "muted";
    if (isAriaTyping || isTtsPlaying) return "speaking";
    if (speechInterim && speechInterim.trim()) return "user";
    return "listening";
  }, [isMuted, isAriaTyping, isTtsPlaying, speechInterim]);
  const voiceOrbBarsActive = isAriaTyping || isTtsPlaying;

  const scoreBaseline = candidateProfile?.avg_score != null ? Math.max(0, Math.min(100, candidateProfile.avg_score)) : 50;
  const dimScores = useMemo(
    () => ({
      structure: Math.round(scoreBaseline * 0.95),
      relevance: Math.round(scoreBaseline * 1.02),
      depth: Math.round(scoreBaseline * 0.9),
      confidence: Math.round(scoreBaseline * 0.93),
    }),
    [scoreBaseline]
  );

  const handleSend = async () => {
    await sendUserText(composedInput);
  };

  const onComposerChange = (e) => {
    const v = e.target.value;
    const tail = speechTail.trim();
    if (!tail) {
      setInput(v);
      return;
    }
    if (v === tail || v.endsWith(` ${tail}`)) {
      const base = v === tail ? "" : v.slice(0, v.length - tail.length).replace(/\s+$/, "");
      setInput(base);
      return;
    }
    if (v.endsWith(tail)) {
      const base = v.slice(0, v.length - tail.length).replace(/\s+$/, "");
      setInput(base);
      return;
    }
    setInput(v);
    voiceQueueRef.current = "";
    setSpeechTail("");
    setSpeechInterim("");
    window.clearTimeout(voiceFlushTimerRef.current);
  };

  const switchMode = async (next) => {
    setSessionMode(next);
    setModeSwitcherOpen(false);
    const switchText = `User has switched to ${next.toUpperCase()} mode. Acknowledge the switch and adapt your coaching style accordingly.`;
    const userMessage = { role: "user", content: switchText, timestamp: Date.now() };
    const snapshot = [...messagesRef.current, userMessage];
    messagesRef.current = snapshot;
    setMessages(snapshot);

    setIsAriaTyping(true);
    setConnectionError("");
    try {
      const apiHist = snapshot.map((m) => ({
        role: m.role === "aria" ? "assistant" : "user",
        content: m.content,
      }));
      const response = await sendAriaCoachMessage({
        messages: apiHist,
        mode: next,
        candidateProfile: candidateProfile || undefined,
        liveVoiceSession: true,
      });
      const ariaMessage = { role: "aria", content: response.reply || "", timestamp: Date.now() };
      setMessages((prev) => [...prev, ariaMessage]);
    } catch (e) {
      setConnectionError(ariaCoachErrorMessage(e));
    } finally {
      setIsAriaTyping(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const subtitleVisible = messages.some((m) => m.role === "aria");

  if (!user?.id || user.id === "demo") return null;

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col bg-[#020617]">
      <PulseBeams
        beams={ARIA_PULSE_BEAMS}
        gradientColors={ARIA_PULSE_GRADIENT}
        className="h-full min-h-0 w-full flex-1 text-zinc-100 antialiased"
      >
    <div
      style={{
        color: "#e5e5e5",
        fontFamily: "'Inter', system-ui, sans-serif",
        minHeight: "100%",
        colorScheme: "dark",
      }}
        className="flex h-full min-h-0 flex-1 flex-col"
    >
      <style>{`
        @keyframes aria-breathe { 0%, 100% { box-shadow: 0 0 40px rgba(124,58,237,.15); } 50% { box-shadow: 0 0 80px rgba(124,58,237,.3); } }
        @keyframes ariaPulse { 0%, 100% { box-shadow: 0 0 40px rgba(124,58,237,.3); } 50% { box-shadow: 0 0 80px rgba(124,58,237,.6); } }
        @keyframes barWave { 0%, 100% { height: 4px; } 50% { height: 28px; } }
        @keyframes aria-scan { 0% { top: -2px; } 100% { top: 100%; } }
        @keyframes aria-wave { 0%, 100% { height: 3px; } 50% { height: 18px; } }
        @keyframes aria-dot { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes aria-msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes aria-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes aria-pulse-dot { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes aria-orb-bar { 0%, 100% { height: 6px; } 50% { height: 26px; } }
        .aria-live-input::placeholder { color: #222; }
      `}</style>

        {profileLoading && ariaPhase === "lobby" ? (
          <div className="flex flex-1 items-center justify-center px-4 py-16">
            <div
              className="h-48 w-full max-w-md rounded-2xl border border-violet-500/20"
              style={{
                background: "linear-gradient(90deg, rgba(124,58,237,.08) 25%, rgba(124,58,237,.15) 50%, rgba(124,58,237,.08) 75%)",
                backgroundSize: "200% 100%",
                animation: "aria-shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ) : ariaPhase === "lobby" ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950/55 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">Aria Live</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Welcome back, {displayName}</h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Pick a focus, then start when you&apos;re ready. Voice and chat stay in sync on a single stage.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Sessions</div>
                  <div className="mt-1 text-lg font-semibold text-violet-200">{candidateProfile?.total_sessions ?? 0}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Avg score</div>
                  <div className="mt-1 text-lg font-semibold text-violet-200">
                    {candidateProfile?.avg_score != null ? `${candidateProfile.avg_score}%` : "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Profile focus</div>
                  <div className="mt-1 text-sm font-medium leading-snug text-zinc-200">{candidateProfile?.weakestArea || "General"}</div>
                </div>
              </div>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => setAriaPhase("focus")}
                  className="rounded-xl bg-gradient-to-r from-cyan-500/90 to-violet-600/90 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110"
                >
                  Choose session focus
                </button>
                <button
                  type="button"
                  onClick={() => void unlockBrowserAudio().then(() => quickStartLive())}
                  disabled={!candidateProfile}
                  className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Quick start
                </button>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.("dashboard")}
                className="mt-6 w-full text-center text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        ) : ariaPhase === "focus" ? (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950/55 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">Focus phase</p>
              <h2 className="mt-2 text-xl font-semibold text-white">What are we working on?</h2>
              <p className="mt-2 text-sm text-zinc-400">Aria will open the session aligned with this goal.</p>
              <div className="mt-6 flex flex-col gap-2">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSessionFocusId(opt.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      sessionFocusId === opt.id
                        ? "border-violet-400/50 bg-violet-500/15"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <div className="text-sm font-semibold text-zinc-100">{opt.label}</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-500">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-8">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Session mode</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { id: "coach", title: "Coach", desc: "Targeted feedback" },
                    { id: "teach", title: "Teach", desc: "Structured skills" },
                    { id: "mock", title: "Mock", desc: "Full simulation" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSessionMode(m.id)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        sessionMode === m.id
                          ? "border-violet-400/50 bg-violet-500/15"
                          : "border-white/10 bg-white/[0.03] hover:border-white/18"
                      }`}
                    >
                      <div className="text-xs font-bold text-zinc-100">{m.title}</div>
                      <div className="text-[10px] text-zinc-500">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void unlockBrowserAudio().then(() => enterLiveSession())}
                  disabled={!candidateProfile}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500/90 to-violet-600/90 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Start live session
                </button>
                <button
                  type="button"
                  onClick={() => setAriaPhase("lobby")}
                  className="rounded-xl border border-white/12 px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-white/[0.05]"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        ) : ariaPhase === "recap" ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950/55 p-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">Session recap</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Nice work</h2>
              <p className="mt-3 text-sm text-zinc-400">
                You were live for <span className="font-mono text-zinc-200">{formatTimer(recapSessionSeconds)}</span>
                {" · "}
                <span className="text-zinc-200">{messages.filter((m) => m.role === "user").length}</span> messages from you
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                A summary of this session is saved to your <span className="text-zinc-300">Dashboard</span> under{" "}
                <span className="text-zinc-400">Aria Live sessions</span>.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Focus was <span className="text-zinc-300">{sessionFocusLabel}</span> · {MODE_LABELS[sessionMode] || sessionMode}
              </p>
              {topics.length ? (
                <p className="mt-4 text-xs text-zinc-400">
                  Topics touched: <span className="text-zinc-200">{topics.join(", ")}</span>
                </p>
              ) : null}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => startNewSessionFromRecap()}
                  className="rounded-xl bg-gradient-to-r from-cyan-500/90 to-violet-600/90 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:brightness-110"
                >
                  New session
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("dashboard")}
                  className="rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/[0.09]"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : ariaPhase === "live" ? (
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: narrow ? "1fr" : "1fr minmax(320px, 400px)",
          gridTemplateRows: "1fr",
          height: "100%",
          maxWidth: "100%",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* LEFT — video */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: narrow ? "16px" : "24px",
            paddingTop: narrow ? 20 : 24,
            paddingBottom: narrow ? 20 : 24,
            minHeight: 0,
            overflowY: "auto",
            background: "#020617",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {profileLoading ? (
            <div
              style={{
                width: "100%",
                maxWidth: 640,
                aspectRatio: "16 / 9",
                borderRadius: 20,
                background: "linear-gradient(90deg, rgba(124,58,237,.08) 25%, rgba(124,58,237,.15) 50%, rgba(124,58,237,.08) 75%)",
                backgroundSize: "200% 100%",
                animation: "aria-shimmer 1.5s ease-in-out infinite",
                border: "1px solid rgba(124,58,237,.2)",
              }}
            />
          ) : (
            <>
              <div
                className="relative w-full max-w-[680px] rounded-2xl ring-1 ring-white/[0.07]"
                style={{
                  aspectRatio: "16 / 9",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.03) inset, 0 20px 64px rgba(0,0,0,0.55), 0 0 80px rgba(91,33,182,0.08)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
                  style={{
                    background: "linear-gradient(168deg, #121214 0%, #0c0c0e 45%, #101012 100%)",
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: "radial-gradient(ellipse 75% 50% at 50% 36%, rgba(124,58,237,0.1), transparent 58%)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.28]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
                      backgroundSize: "32px 32px",
                      maskImage: "radial-gradient(ellipse 72% 58% at 50% 44%, black 12%, transparent 72%)",
                      WebkitMaskImage: "radial-gradient(ellipse 72% 58% at 50% 44%, black 12%, transparent 72%)",
                    }}
                  />
                </div>

                <div
                  className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center px-2 py-6"
                  style={{ overflow: "visible" }}
                >
                  <AriaVoiceOrb
                    letter="A"
                    name="Aria"
                    state={voiceOrbState}
                    barsActive={voiceOrbBarsActive}
                  />
                </div>

                <div
                  className="absolute left-3 top-3 z-[4] flex items-center gap-2 rounded-full border border-white/[0.08] bg-zinc-950/70 px-2.5 py-1.5 backdrop-blur-md"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-red-500"
                      style={{ animation: "aria-pulse-dot 1.5s ease-in-out infinite" }}
                    />
                    Live
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Studio</span>
                </div>
                <div
                  className="absolute right-3 top-3 z-[4] rounded-full border border-white/[0.08] bg-zinc-950/70 px-3 py-1.5 font-mono text-[11px] font-semibold tabular-nums text-zinc-300 backdrop-blur-md"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                >
                  {formatTimer(sessionSeconds)}
                </div>

                {subtitleVisible ? (
                  <div
                    className="absolute bottom-14 left-4 right-4 z-[4] rounded-xl border border-white/8 bg-black/55 px-4 py-3 text-center text-[13px] leading-relaxed text-zinc-200 backdrop-blur-xl"
                    style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }}
                  >
                    <span
                      key={lastAriaSubKey}
                      style={{ display: "block", transition: "opacity .3s ease", opacity: lastAriaText ? 1 : 0 }}
                    >
                      {lastAriaText}
                    </span>
                  </div>
                ) : null}

                <div
                  className="absolute bottom-3 left-1/2 z-[4] flex -translate-x-1/2 items-center gap-2 rounded-full border border-violet-500/20 bg-black/50 px-4 py-2 backdrop-blur-md"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                >
                  <div className="flex h-5 items-end gap-0.5">
                    {[0, 0.1, 0.2, 0.3, 0.15].map((d, i) => (
                      <div
                        key={i}
                        style={{
                          width: 3,
                          borderRadius: 2,
                          background: isAriaTyping || isTtsPlaying ? "#22d3ee" : "#71717a",
                          animation: isAriaTyping || isTtsPlaying ? `aria-wave 0.6s ease-in-out infinite ${d}s` : "none",
                          height: isAriaTyping || isTtsPlaying ? undefined : 4,
                          minHeight: 4,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-300">
                    {isAriaTyping || isTtsPlaying
                      ? "Aria is speaking"
                      : isMuted
                        ? "Mic off — tap mic to talk"
                        : speechInterim
                          ? "Listening to you"
                          : "Ready for you"}
                  </span>
                </div>
                {speechInterim && !isMuted ? (
                  <div
                    className="absolute bottom-[3.25rem] left-1/2 z-[4] max-w-[min(92%,480px)] -translate-x-1/2 rounded-lg border border-cyan-500/15 bg-black/50 px-3 py-2 text-center text-xs text-zinc-200 backdrop-blur-md"
                    style={{ pointerEvents: "none" }}
                  >
                    {speechInterim}
                  </div>
                ) : null}

                <div
                  className="absolute bottom-[5.25rem] right-4 z-[4] flex w-[118px] flex-col items-center justify-center rounded-2xl border border-white/12 bg-black/55 py-3 backdrop-blur-xl"
                  style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-lg shadow-violet-900/40 ring-2 ring-white/10"
                    style={{
                      background: "linear-gradient(145deg, #8b5cf6 0%, #4f46e5 100%)",
                    }}
                  >
                    {userInitial}
                  </div>
                  <span className="mt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">You</span>
                </div>
              </div>

              <div className="mt-5 flex w-full max-w-[680px] flex-col items-center">
                <div
                  className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-zinc-950/65 px-3 py-2.5 backdrop-blur-xl sm:gap-3"
                  style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }}
                >
                  {[
                    {
                      key: "mute",
                      onClick: async () => {
                        if (isMuted) await unlockBrowserAudio();
                        setIsMuted((m) => !m);
                      },
                      style: {
                        border: isMuted ? "1px solid rgba(239,68,68,.45)" : "1px solid rgba(255,255,255,.1)",
                      },
                      children: isMuted ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth="2"><path d="M12 19v-8M5 11v2a7 7 0 007 7M19 11v2a7 7 0 01-7 7M12 5v4M5 9v6M19 9v6" /><path d="M3 3l18 18" /></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" /></svg>
                      ),
                    },
                    {
                      key: "cam",
                      onClick: () => {},
                      style: { border: "1px solid rgba(255,255,255,.1)", opacity: cameraOn ? 1 : 0.45 },
                      children: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                      ),
                    },
                    {
                      key: "speaker",
                      onClick: async () => {
                        if (!voiceOutputOn) {
                          await unlockBrowserAudio();
                          setVoiceOutputOn(true);
                          setTtsRetryNonce((n) => n + 1);
                        } else {
                          setVoiceOutputOn(false);
                          setTtsNeedTap(false);
                        }
                      },
                      style: {
                        border: voiceOutputOn ? "1px solid rgba(167,139,250,.45)" : "1px solid rgba(255,255,255,.1)",
                        background: voiceOutputOn ? "rgba(124,58,237,.14)" : "rgba(255,255,255,.05)",
                        boxShadow: voiceOutputOn ? "0 0 0 2px rgba(124,58,237,0.2)" : undefined,
                      },
                      children: voiceOutputOn ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4V5z" />
                          <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a9 9 0 010 14.14" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 5L6 9H2v6h4l5 4V5z" />
                          <path d="M23 9l-6 6M17 9l6 6" />
                        </svg>
                      ),
                    },
                  ].map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={b.onClick}
                      title={b.key === "mute" ? "Microphone" : b.key === "cam" ? "Camera" : "Speaker"}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: "rgba(24,24,27,0.9)",
                        ...b.style,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all .2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = "brightness(1.08)";
                        e.currentTarget.style.transform = "scale(1.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = "none";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {b.children}
                    </button>
                  ))}
                  <span className="mx-0.5 hidden h-9 w-px shrink-0 bg-white/10 sm:block" role="separator" aria-hidden />
                  {[
                    {
                      key: "end",
                      onClick: () => setEndModalOpen(true),
                      style: { border: "1px solid rgba(248,113,113,.35)", background: "rgba(220,38,38,.18)" },
                      title: "End session",
                      children: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2"><path d="M10.68 13.31a16 16 0 003.93 3.93l2.85-2.85a2 2 0 002.12-.42 16 16 0 005.1-5.1 2 2 0 000-2.83l-2.36-2.36a2 2 0 00-2.83 0 16 16 0 00-5.1 5.1 2 2 0 00-.42 2.12l-2.85 2.85zM5.41 3.09L3 5.5" /><path d="M9.88 9.88a16 16 0 003.93 3.93M2 2l20 20" /></svg>
                      ),
                    },
                    {
                      key: "notes",
                      onClick: () => {},
                      style: { border: "1px solid rgba(255,255,255,.1)" },
                      title: "Notes",
                      children: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2">
                          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      ),
                    },
                    {
                      key: "mode",
                      onClick: () => setModeSwitcherOpen(true),
                      style: { border: "1px solid rgba(124,58,237,.35)", background: "rgba(124,58,237,.12)" },
                      title: "Session mode",
                      children: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                        </svg>
                      ),
                    },
                  ].map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={b.onClick}
                      title={b.title}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: "rgba(24,24,27,0.9)",
                        ...b.style,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all .2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = "brightness(1.08)";
                        e.currentTarget.style.transform = "scale(1.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = "none";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      {b.children}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEndModalOpen(true)}
                  className="mt-3 text-[12px] font-semibold text-red-400/95 underline-offset-4 transition hover:text-red-300 hover:underline"
                  style={{ fontFamily: "inherit", background: "none", border: "none", cursor: "pointer" }}
                >
                  End session
                </button>
              </div>
              {voiceOutputOn && ttsNeedTap ? (
                <button
                  type="button"
                  onClick={() => {
                    primeAudioFromUserGesture();
                    const p = pendingTtsRef.current;
                    if (p?.blob) {
                      const gen = ++ariaTtsGenRef.current;
                      stopAriaSpeech();
                      const url = URL.createObjectURL(p.blob);
                      const audio = createAriaTtsAudioElement();
                      audio.src = url;
                      try {
                        audio.playbackRate = ARIA_TTS_PLAYBACK_RATE;
                      } catch {
                        /* ignore */
                      }
                      currentAudioRef.current = audio;
                      objectUrlRef.current = url;
                      isTtsPlayingRef.current = true;
                      setIsTtsPlaying(true);
                      audio.onended = () => {
                        try {
                          URL.revokeObjectURL(url);
                        } catch {
                          /* ignore */
                        }
                        if (objectUrlRef.current === url) objectUrlRef.current = null;
                        try {
                          audio.remove();
                        } catch {
                          /* ignore */
                        }
                        if (currentAudioRef.current === audio) currentAudioRef.current = null;
                        if (gen === ariaTtsGenRef.current) {
                          isTtsPlayingRef.current = false;
                          setIsTtsPlaying(false);
                        }
                      };
                      void waitAudioCanPlay(audio)
                        .then(() => audio.play())
                        .then(() => {
                          if (gen !== ariaTtsGenRef.current) return;
                          lastSpokenAriaKeyRef.current = p.key;
                          pendingTtsRef.current = null;
                          setTtsNeedTap(false);
                          setAriaTtsError("");
                        })
                        .catch(() => {
                          try {
                            URL.revokeObjectURL(url);
                          } catch {
                            /* ignore */
                          }
                          objectUrlRef.current = null;
                          try {
                            audio.remove();
                          } catch {
                            /* ignore */
                          }
                          currentAudioRef.current = null;
                          isTtsPlayingRef.current = false;
                          setIsTtsPlaying(false);
                          void (async () => {
                            await unlockBrowserAudio();
                            if (gen !== ariaTtsGenRef.current) return;
                            const ok = await playAriaTtsBlob(p.blob, p.key, gen);
                            if (ok) {
                              pendingTtsRef.current = null;
                              setAriaTtsError("");
                            } else {
                              pendingTtsRef.current = p;
                              setTtsNeedTap(true);
                            }
                          })();
                        });
                    } else {
                      void unlockBrowserAudio().then(() => setTtsRetryNonce((n) => n + 1));
                    }
                  }}
                  style={{
                    marginTop: 14,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "1px solid rgba(167,139,250,.45)",
                    background: "rgba(124,58,237,.2)",
                    color: "#e9d5ff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Tap to play Aria&apos;s voice (browser audio unlock)
                </button>
              ) : null}
              {ariaTtsError ? (
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#fbbf24", textAlign: "center", maxWidth: 520, padding: "0 12px" }}>{ariaTtsError}</p>
              ) : null}
              {speechMicError ? (
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#f87171", textAlign: "center", maxWidth: 520, padding: "0 12px" }}>{speechMicError}</p>
              ) : null}
              {!speechSupported ? (
                <p style={{ marginTop: 8, marginBottom: 0, fontSize: 11, color: "#737373", textAlign: "center", maxWidth: 520, padding: "0 12px" }}>
                  Voice input needs Chrome or Edge (Web Speech API). You can still type in the panel.
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* RIGHT — panel */}
        <div
          className="border-white/[0.06] bg-[#121214]/92"
          style={{
            borderLeft: narrow ? "none" : "1px solid rgba(255,255,255,0.06)",
            borderTop: narrow ? "1px solid rgba(255,255,255,0.06)" : "none",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            height: narrow ? "auto" : "100%",
            maxHeight: narrow ? "min(70vh, 640px)" : "100%",
            minHeight: narrow ? 400 : 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            className="border-b border-white/[0.06] px-5 pb-5 pt-5"
            style={{ flexShrink: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)" }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setModeSwitcherOpen(true)}
                className="rounded-full border border-violet-500/35 bg-violet-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-200 transition hover:bg-violet-500/25"
                style={{ fontFamily: "inherit" }}
              >
                {MODE_LABELS[sessionMode] || "COACH MODE"}
              </button>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-zinc-500">
                {sessionFocusLabel}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-[17px] font-semibold tracking-tight text-white">Aria</div>
              <div className="mt-1 text-[12px] leading-snug text-zinc-500">
                {isTtsPlaying
                  ? "Playing Aria's voice…"
                  : isAriaTyping
                    ? "Analysing your history…"
                    : "Ready when you are."}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Sessions", candidateProfile?.total_sessions ?? 0],
                ["Avg score", candidateProfile?.avg_score != null ? `${candidateProfile.avg_score}%` : "—"],
                ["Focus", candidateProfile?.weakestArea || "General"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2"
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{k}</div>
                  <div className="mt-0.5 truncate text-[13px] font-semibold text-zinc-100">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
          <div className="border-b border-white/[0.05] bg-black/20 px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" style={{ animation: "aria-pulse-dot 1.2s ease-in-out infinite" }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">Aria remembers</span>
            </div>
            {!candidateProfile ? (
              <p style={{ margin: 0, fontSize: 12, color: "#52525b", fontStyle: "italic" }}>Tell me about yourself to get started</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {[
                  candidateProfile.avg_score != null &&
                    `Avg score: ${candidateProfile.avg_score}% across ${candidateProfile.total_sessions ?? 0} sessions`,
                  candidateProfile.target_role && `Target role: ${candidateProfile.target_role}`,
                  candidateProfile.target_company && `Target company: ${candidateProfile.target_company}`,
                  candidateProfile.experience_level && `Experience level: ${candidateProfile.experience_level}`,
                  candidateProfile.weakestArea && `Focus area: ${candidateProfile.weakestArea}`,
                ]
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((line, i) => (
                    <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "#a3a3a3", marginBottom: 8 }}>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c3aed", marginTop: 5, flexShrink: 0 }} />
                      {line}
                    </li>
                  ))}
                {candidateProfile &&
                  !candidateProfile.target_role &&
                  candidateProfile.avg_score == null &&
                  !(candidateProfile.total_sessions > 0) && (
                    <li style={{ fontSize: 12, color: "#52525b", fontStyle: "italic" }}>Tell me about yourself to get started</li>
                  )}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => setProgressOpen((o) => !o)}
            style={{
              textAlign: "left",
              padding: "12px 16px",
              border: "none",
              borderBottom: "1px solid rgba(124,58,237,.08)",
              background: "rgba(8,3,18,.4)",
              color: "#a78bfa",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Session progress {progressOpen ? "▴" : "▾"}
          </button>
          {progressOpen ? (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(124,58,237,.08)", background: "rgba(8,3,18,.5)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", marginBottom: 4 }}>Topics touched this session</div>
              <p style={{ margin: "0 0 10px", fontSize: 10, lineHeight: 1.45, color: "#52525b" }}>
                A check appears when you or Aria mention this area (keywords). It isn’t a fixed order — skip ahead anytime.
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {TOPIC_KEYWORDS.map(({ label }) => {
                  const done = topics.includes(label);
                  return (
                    <li
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 12,
                        fontWeight: done ? 600 : 500,
                        color: done ? "#86efac" : "#52525b",
                        marginBottom: 8,
                        padding: "4px 0",
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 800,
                          background: done ? "rgba(34,197,94,0.2)" : "rgba(63,63,70,0.5)",
                          border: done ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(82,82,91,0.8)",
                          color: done ? "#86efac" : "#52525b",
                        }}
                        aria-hidden
                      >
                        {done ? "✓" : ""}
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ul>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a1a1aa", margin: "16px 0 6px" }}>Session pulse (rough)</div>
              <p style={{ margin: "0 0 10px", fontSize: 10, lineHeight: 1.45, color: "#52525b" }}>
                Illustrative only — shaped by your profile average, not a grade for this chat.
              </p>
              {["structure", "relevance", "depth", "confidence"].map((key) => {
                const pct = dimScores[key];
                const { fill, widthPct } = livePulseMeterStyle(pct);
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#a1a1aa", textTransform: "capitalize", marginBottom: 4 }}>
                      <span>{key}</span>
                      <span style={{ color: "#c4b5fd", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{pct}</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden",
                        border: "1px solid rgba(139,92,246,0.15)",
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${fill}, #a78bfa)`,
                          borderRadius: 999,
                          minWidth: 4,
                          transition: "width 0.35s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 px-4 py-4 pb-6">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Transcript</span>
              <span className="text-[10px] tabular-nums text-zinc-600">{messages.length} messages</span>
            </div>
            {connectionError ? (
              <div className="shrink-0 rounded-xl border border-red-500/20 bg-red-950/30 px-3 py-2.5 text-[13px] text-red-200">
                {connectionError}
              </div>
            ) : null}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className="flex max-w-full"
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: m.role === "user" ? "92%" : "100%",
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  gap: 10,
                  animation: "aria-msgIn .25s ease both",
                }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm ring-1 ring-white/10"
                  style={{
                    background: m.role === "aria" ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,.08)",
                    color: m.role === "aria" ? "#fff" : "#a1a1aa",
                  }}
                >
                  {m.role === "aria" ? "A" : userInitial}
                </div>
                <div
                  className={
                    m.role === "aria"
                      ? "rounded-2xl rounded-tl-md border border-violet-500/15 bg-violet-950/25 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-200"
                      : "rounded-2xl rounded-tr-md border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-200"
                  }
                >
                  {m.role === "aria"
                    ? parseFeedbackParts(m.content).map((part, pi) => {
                        if (part.type === "text") return <span key={pi}>{part.content}</span>;
                        if (part.type === "good")
                          return (
                            <div
                              key={pi}
                              style={{
                                marginTop: 8,
                                background: "rgba(16,185,129,.05)",
                                border: "1px solid rgba(16,185,129,.12)",
                                borderLeft: "2px solid #10b981",
                                borderRadius: 10,
                                padding: "10px 14px",
                              }}
                            >
                              <div style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 800, color: "#10b981", marginBottom: 4 }}>What worked</div>
                              <div style={{ fontSize: 12, color: "#a3a3a3" }}>{part.content}</div>
                            </div>
                          );
                        return (
                          <div
                            key={pi}
                            style={{
                              marginTop: 8,
                              background: "rgba(245,158,11,.05)",
                              border: "1px solid rgba(245,158,11,.12)",
                              borderLeft: "2px solid #f59e0b",
                              borderRadius: 10,
                              padding: "10px 14px",
                            }}
                          >
                            <div style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 800, color: "#f59e0b", marginBottom: 4 }}>To improve</div>
                            <div style={{ fontSize: 12, color: "#a3a3a3" }}>{part.content}</div>
                          </div>
                        );
                      })
                    : m.content}
                </div>
              </div>
            ))}
            {isAriaTyping ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center", animation: "aria-msgIn .25s ease both" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  A
                </div>
                <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "rgba(124,58,237,.07)", borderRadius: 14, border: "1px solid rgba(124,58,237,.12)" }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#7c3aed",
                        animation: `aria-dot 1s ease-in-out infinite ${d}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
          </div>

          <div style={{ flexShrink: 0, padding: 16, borderTop: "1px solid rgba(124,58,237,.08)" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                background: "rgba(8,3,18,.8)",
                border: `1px solid ${inputFocused ? "rgba(124,58,237,.4)" : "rgba(124,58,237,.15)"}`,
                borderRadius: 14,
                padding: "10px 12px 10px 16px",
                transition: "border-color .2s",
              }}
            >
              <textarea
                ref={inputRef}
                value={composedInput}
                onChange={onComposerChange}
                onKeyDown={onKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Type your answer or ask Aria anything..."
                spellCheck
                aria-label="Message to Aria — speech also appears here while you talk"
                rows={1}
                className="aria-live-input"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#d4d4d8",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "none",
                  minHeight: 22,
                  maxHeight: 88,
                  lineHeight: "22px",
                }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!composedInput.trim() || isAriaTyping}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(124,58,237,.2)",
                  border: "1px solid rgba(124,58,237,.3)",
                  cursor: !composedInput.trim() || isAriaTyping ? "not-allowed" : "pointer",
                  opacity: !composedInput.trim() || isAriaTyping ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#52525b", textAlign: "center", margin: "6px 0 0" }}>
              Press Enter to send · Shift+Enter for new line · speech fills this box while you talk
            </p>
          </div>
        </div>
      </div>
        ) : null}

      {modeSwitcherOpen ? (
        <button
          type="button"
          aria-label="Close mode switcher"
          onClick={() => setModeSwitcherOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            border: "none",
            zIndex: 200,
            cursor: "pointer",
          }}
        />
      ) : null}
      {modeSwitcherOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="aria-mode-title"
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(300px, 92vw)",
            background: "rgba(8,3,18,.97)",
            border: "1px solid rgba(124,58,237,.25)",
            borderRadius: 16,
            padding: 20,
            zIndex: 210,
            boxShadow: "0 24px 64px rgba(0,0,0,.6)",
          }}
        >
          <h2 id="aria-mode-title" style={{ margin: "0 0 16px", fontSize: 14, color: "#fff", fontWeight: 700 }}>
            Switch session mode
          </h2>
          {[
            { id: "coach", title: "Coach Mode", desc: "Reviews your history and teaches targeted skills" },
            { id: "teach", title: "Teach Mode", desc: "Structured masterclasses on specific techniques" },
            { id: "mock", title: "Mock Interviewer", desc: "Full simulation — Aria plays the interviewer" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => void switchMode(opt.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 16px",
                borderRadius: 12,
                marginBottom: 8,
                cursor: "pointer",
                fontFamily: "inherit",
                border:
                  sessionMode === opt.id ? "1px solid rgba(124,58,237,.4)" : "1px solid rgba(124,58,237,.1)",
                background: sessionMode === opt.id ? "rgba(124,58,237,.15)" : "rgba(124,58,237,.05)",
                color: "#e5e5e5",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.title}</div>
              <div style={{ fontSize: 11, color: "#71717a", marginTop: 4 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      ) : null}

      {endModalOpen ? (
        <button
          type="button"
          aria-label="Close end session"
          onClick={() => setEndModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            border: "none",
            zIndex: 200,
            cursor: "pointer",
          }}
        />
      ) : null}
      {endModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: 360,
            width: "min(360px, 92vw)",
            background: "rgba(8,3,18,.97)",
            border: "1px solid rgba(124,58,237,.2)",
            borderRadius: 20,
            padding: 32,
            textAlign: "center",
            zIndex: 210,
          }}
        >
          <div style={{ width: 48, height: 48, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(239,68,68,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.68 13.31a16 16 0 003.93 3.93l2.85-2.85a2 2 0 002.12-.42 16 16 0 005.1-5.1 2 2 0 000-2.83l-2.36-2.36a2 2 0 00-2.83 0 16 16 0 00-5.1 5.1 2 2 0 00-.42 2.12l-2.85 2.85zM5.41 3.09L3 5.5" />
              <path d="M2 2l20 20" />
            </svg>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, color: "#fff", fontWeight: 700 }}>End this session?</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#737373" }}>
            You&apos;ll see a short recap, then you can start again or return to the dashboard.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setEndModalOpen(false)}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "transparent",
                color: "#d4d4d8",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Keep going
            </button>
            <button
              type="button"
              onClick={() => confirmEndToRecap()}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg,#dc2626,#991b1b)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              End & recap
            </button>
          </div>
        </div>
      ) : null}
    </div>
    </PulseBeams>
    </div>
  );
}
