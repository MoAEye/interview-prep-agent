import { useEffect } from "react";

export default function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onDone?.(), 3800);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 500,
        maxWidth: "min(420px, calc(100vw - 32px))",
        padding: "14px 20px",
        borderRadius: "12px",
        background: "rgba(17,24,39,0.92)",
        color: "#fff",
        fontSize: "14px",
        fontWeight: 600,
        fontFamily: "'Inter', system-ui, sans-serif",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        textAlign: "center",
        lineHeight: 1.45,
      }}
    >
      {message}
    </div>
  );
}
