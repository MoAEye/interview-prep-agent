import { motion } from "framer-motion";
import { cn } from "../lib/utils.js";

/**
 * Soft voice presence (v3) — blurred gradient blob + calm pulse, inspired by voice-orbs without busy rings.
 * @param {"speaking" | "listening" | "user" | "muted"} state
 */
export function AriaVoiceOrb({ letter = "A", name = "Aria", state = "listening", barsActive = false }) {
  const speaking = state === "speaking";
  const user = state === "user";
  const muted = state === "muted";

  const barDelays = [0, 0.07, 0.14, 0.21, 0.14];

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative flex h-[min(240px,48vw)] w-[min(240px,48vw)] items-center justify-center">
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "118%",
            height: "118%",
            background:
              speaking || user
                ? "radial-gradient(circle, rgba(109,40,217,0.38) 0%, rgba(67,56,202,0.14) 42%, transparent 68%)"
                : "radial-gradient(circle, rgba(91,33,182,0.24) 0%, rgba(49,46,129,0.08) 45%, transparent 70%)",
            filter: "blur(28px)",
          }}
          animate={{ opacity: speaking ? [0.88, 1, 0.88] : [0.72, 0.88, 0.72] }}
          transition={{ duration: speaking ? 1.6 : 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <div
          className="pointer-events-none absolute rounded-full opacity-90"
          style={{
            width: "88%",
            height: "88%",
            background: muted
              ? "radial-gradient(circle at 35% 30%, #52525b 0%, #27272a 55%, #18181b 100%)"
              : "radial-gradient(circle at 32% 28%, #a78bfa 0%, #6d28d9 38%, #4338ca 72%, #312e81 100%)",
            filter: "blur(18px)",
          }}
        />

        <motion.div
          className="relative z-[1] flex h-[46%] w-[46%] items-center justify-center rounded-full"
          style={{
            background: muted
              ? "linear-gradient(155deg, #52525b 0%, #3f3f46 50%, #27272a 100%)"
              : "linear-gradient(155deg, #c4b5fd 0%, #7c3aed 42%, #5b21b6 100%)",
            boxShadow: muted
              ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 40px rgba(0,0,0,0.5)"
              : "inset 0 1px 0 rgba(255,255,255,0.35), 0 16px 48px rgba(91,33,182,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
          }}
          animate={{
            scale: speaking ? [1, 1.045, 1] : user ? [1, 1.028, 1] : [1, 1.012, 1],
          }}
          transition={{
            duration: speaking ? 1 : user ? 1.5 : 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span
            className={cn(
              "select-none text-[clamp(1.75rem,7vw,2.5rem)] font-bold tracking-tight text-white",
              muted && "text-zinc-200"
            )}
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.35)" }}
          >
            {letter}
          </span>
          <div
            className="pointer-events-none absolute inset-0 rounded-full opacity-50"
            style={{
              background: "linear-gradient(175deg, rgba(255,255,255,0.45) 0%, transparent 42%)",
            }}
          />
        </motion.div>

        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: "72%",
            height: "72%",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: speaking ? "0 0 24px rgba(124,58,237,0.12)" : "none",
          }}
        />
      </div>

      <div className="mt-6 flex h-6 items-end justify-center gap-1">
        {barsActive
          ? barDelays.map((delay, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-violet-400/90"
                style={{
                  minHeight: 4,
                  height: 20,
                  animation: `aria-orb-bar 0.5s ease-in-out infinite ${delay}s`,
                }}
              />
            ))
          : barDelays.map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-zinc-600/40" style={{ height: 5, opacity: muted ? 0.2 : 0.45 }} />
            ))}
      </div>

      <div className="mt-4 text-center">
        <div className="text-[13px] font-semibold tracking-tight text-zinc-200">{name}</div>
        <div className="mt-0.5 text-[11px] font-medium text-zinc-500">
          {muted ? "Mic off" : speaking ? "Speaking" : user ? "Listening to you" : "Live session"}
        </div>
      </div>
    </div>
  );
}
