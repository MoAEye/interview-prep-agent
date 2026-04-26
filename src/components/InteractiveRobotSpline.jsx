import { Suspense, lazy } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

export function InteractiveRobotSpline({ scene, style, className }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid rgba(124,58,237,0.2)",
              borderTopColor: "#7c3aed",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
      }
    >
      <Spline scene={scene} style={style} className={className} />
    </Suspense>
  );
}
