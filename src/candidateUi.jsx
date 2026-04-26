/** Candidate portal design tokens — styling only. */
export const C = {
  font: "'Inter', system-ui, sans-serif",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  body: "#374151",
  muted: "#6b7280",
  pageBg: "#fafafa",
  purple: "#7c3aed",
  purple2: "#4f46e5",
};

export const pageOuter = {
  minHeight: "100vh",
  background: C.pageBg,
  fontFamily: C.font,
  color: C.body,
  overflowX: "hidden",
  boxSizing: "border-box",
};

export const pageInner = {
  minHeight: "100%",
  backgroundImage: `radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)`,
  backgroundRepeat: "no-repeat",
  paddingBottom: "48px",
  boxSizing: "border-box",
};

export const label = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: "6px",
};

export const h1 = {
  fontSize: "clamp(1.5rem, 4vw, 2rem)",
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: "#111827",
  margin: "0 0 8px",
};

export const sub = {
  fontSize: "15px",
  fontWeight: 400,
  color: C.muted,
  lineHeight: 1.5,
};

export const card = {
  background: "#ffffff",
  border: "1px solid #f0f0f0",
  borderRadius: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
  padding: "24px",
  transition: C.transition,
  boxSizing: "border-box",
};

export const cardHoverHandlers = {
  onMouseEnter: (e) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 8px 32px rgba(124,58,237,0.12)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
  },
};

export const btnPrimary = {
  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
  color: "#ffffff",
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontSize: "15px",
  fontFamily: C.font,
  boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
  transition: C.transition,
};

export const btnPrimaryHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.opacity = "0.92";
    e.currentTarget.style.transform = "translateY(-1px)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.opacity = "1";
    e.currentTarget.style.transform = "translateY(0)";
  },
  onMouseDown: (e) => {
    e.currentTarget.style.transform = "translateY(0)";
  },
};

export const btnSecondary = {
  background: "transparent",
  border: "1.5px solid #e5e7eb",
  color: C.body,
  fontWeight: 600,
  padding: "10px 22px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontFamily: C.font,
  transition: C.transition,
};

export const btnSecondaryHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.borderColor = "#7c3aed";
    e.currentTarget.style.color = "#7c3aed";
    e.currentTarget.style.background = "rgba(124,58,237,0.04)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.borderColor = "#e5e7eb";
    e.currentTarget.style.color = C.body;
    e.currentTarget.style.background = "transparent";
  },
};

export const input = {
  width: "100%",
  padding: "12px 16px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "10px",
  fontSize: "15px",
  fontFamily: C.font,
  outline: "none",
  boxSizing: "border-box",
  background: "#ffffff",
  color: "#111827",
  transition: C.transition,
};

/** Star dots (no emoji) — `filled` count out of 5 */
export function StarDots({ count = 0, max = 5, size = 8 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }} aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: i < count ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "#e5e7eb",
            flexShrink: 0,
          }}
        />
      ))}
    </span>
  );
}
