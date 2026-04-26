/** Shared dark shell: background, grid, purple orbs — wrap public marketing pages. */
export default function PublicPageShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05020f",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        color: "#e5e5e5",
        position: "relative",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-8%",
            right: "-5%",
            width: "480px",
            height: "480px",
            background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "-10%",
            width: "420px",
            height: "420px",
            background: "radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
      </div>
      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}
