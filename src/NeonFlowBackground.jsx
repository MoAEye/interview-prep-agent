/**
 * Neon Flow — from 21st.dev community (yashvw25/neon-flow).
 * Registry: https://21st.dev/r/yashvw25/neon-flow
 * Uses threejs-components tubes cursor (CDN) for the animated neon tubes effect.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TUBES_MODULE_URL = "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";

function randomColors(count) {
  return new Array(count)
    .fill(0)
    .map(() => `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`);
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]
 * @param {string} [props.className]
 * @param {boolean} [props.enableClickInteraction]
 * @param {boolean} [props.dimOverlay] — dark vignette so foreground UI stays readable
 */
export default function NeonFlowBackground({
  children,
  className,
  enableClickInteraction = true,
  dimOverlay = false,
}) {
  const canvasRef = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const tubesRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let cleanup;

    const initTubes = async () => {
      if (!canvasRef.current) return;

      try {
        const module = await import(/* @vite-ignore */ TUBES_MODULE_URL);
        const TubesCursor = module.default;

        if (!mounted || !canvasRef.current) return;

        const app = TubesCursor(canvasRef.current, {
          tubes: {
            colors: ["#f967fb", "#53bc28", "#6958d5"],
            lights: {
              intensity: 200,
              colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"],
            },
          },
        });

        tubesRef.current = app;

        const handleResize = () => {};
        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.removeEventListener("resize", handleResize);
          tubesRef.current = null;
        };
      } catch (e) {
        console.error("NeonFlowBackground: failed to load tubes effect", e);
        if (mounted) setLoadError(true);
      }
    };

    void initTubes();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const handleClick = () => {
    if (!enableClickInteraction || !tubesRef.current) return;
    tubesRef.current.tubes.setColors(randomColors(3));
    tubesRef.current.tubes.setLightsColors(randomColors(4));
  };

  return (
    <div
      className={cn("relative min-h-screen w-full overflow-hidden bg-[#030308]", className)}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        style={{ touchAction: "none" }}
        aria-hidden
      />
      {loadError ? (
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[#030308]"
          aria-hidden
        />
      ) : null}
      {dimOverlay ? (
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_100%_70%_at_50%_25%,transparent_0%,rgba(3,3,8,0.55)_55%,rgba(3,3,8,0.92)_100%)]"
          aria-hidden
        />
      ) : null}
      <div className="relative z-10 flex min-h-screen w-full flex-col pointer-events-none">{children}</div>
    </div>
  );
}
