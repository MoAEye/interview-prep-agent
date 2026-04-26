import { motion } from "framer-motion";
import { cn } from "../../lib/utils.js";

const DEFAULT_GRADIENT = {
  start: "#18CCFC",
  middle: "#6344F5",
  end: "#AE48FF",
};

function BeamSvg({ beams, gradientColors }) {
  const gc = gradientColors ?? DEFAULT_GRADIENT;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 881 473"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-[0.85]"
      aria-hidden
    >
      <defs>
        {beams.map((beam, i) => (
          <motion.linearGradient
            key={`grad-${i}`}
            id={`aria-beam-grad-${i}`}
            gradientUnits="userSpaceOnUse"
            initial={beam.gradientConfig.initial}
            animate={beam.gradientConfig.animate}
            transition={beam.gradientConfig.transition}
          >
            <stop offset="0%" stopColor={gc.start} stopOpacity="0" />
            <stop offset="20%" stopColor={gc.start} />
            <stop offset="50%" stopColor={gc.middle} />
            <stop offset="100%" stopColor={gc.end} stopOpacity="0" />
          </motion.linearGradient>
        ))}
      </defs>
      {beams.map((beam, i) => (
        <g key={`beam-g-${i}`}>
          <path
            d={beam.path}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={beam.path}
            stroke={`url(#aria-beam-grad-${i})`}
            strokeWidth="1.25"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
      {beams.map((beam, i) =>
        (beam.connectionPoints || []).map((pt, j) => (
          <circle
            key={`pt-${i}-${j}`}
            cx={pt.cx}
            cy={pt.cy}
            r={pt.r}
            fill="#020617"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1"
          />
        ))
      )}
    </svg>
  );
}

/**
 * Animated beam background (Aceternity-style). Children sit in a flush z-10 layer.
 */
export function PulseBeams({ className, children, beams, gradientColors, style }) {
  return (
    <div className={cn("relative flex w-full min-h-0 flex-1 flex-col", className)} style={style}>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#020617]" />
        <BeamSvg beams={beams} gradientColors={gradientColors} />
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/40 to-[#020617]/90"
          aria-hidden
        />
      </div>
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
