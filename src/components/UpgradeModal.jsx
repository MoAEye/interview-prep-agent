import { UPGRADE_MODAL_FREE, UPGRADE_MODAL_PRO } from "../pricingFeatures.js";

export default function UpgradeModal({ open, onClose, onUpgradeClick }) {
  if (!open) return null;

  const glass = {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "20px",
    border: "1px solid rgba(124, 58, 237, 0.12)",
    boxShadow: "0 24px 80px rgba(124, 58, 237, 0.15), 0 0 0 1px rgba(255,255,255,0.5) inset",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-h1"
    >
      <div style={{ ...glass, maxWidth: "880px", width: "100%", padding: "28px 24px 24px", position: "relative", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "40px",
            height: "40px",
            border: "none",
            borderRadius: "10px",
            background: "rgba(0,0,0,0.06)",
            cursor: "pointer",
            fontSize: "20px",
            lineHeight: 1,
            color: "#374151",
          }}
        >
          ×
        </button>
        <h2 id="upgrade-h1" style={{ margin: "0 48px 8px 0", fontSize: "clamp(1.35rem, 3vw, 1.6rem)", fontWeight: 800, color: "#111827" }}>
          Upgrade to Pro
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: "15px", color: "#6b7280", lineHeight: 1.5 }}>Unlock everything InterviewAI has to offer</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: "16px",
              border: "1px solid #e5e7eb",
              padding: "20px",
              background: "#fafafa",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", color: "#6b7280", textTransform: "uppercase", marginBottom: "12px" }}>Free</div>
            <ul style={{ margin: 0, paddingLeft: "18px", color: "#374151", fontSize: "14px", lineHeight: 1.55 }}>
              {UPGRADE_MODAL_FREE.map((t) => (
                <li key={t} style={{ marginBottom: "8px" }}>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div
            style={{
              borderRadius: "16px",
              border: "2px solid #7c3aed",
              padding: "20px",
              background: "linear-gradient(180deg, rgba(124,58,237,0.06) 0%, #ffffff 40%)",
              boxShadow: "0 0 0 1px rgba(124,58,237,0.2), 0 12px 40px rgba(124,58,237,0.18)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Pro
            </div>
            <ul style={{ margin: "0 0 20px", paddingLeft: "18px", color: "#374151", fontSize: "14px", lineHeight: 1.55 }}>
              {UPGRADE_MODAL_PRO.map((t) => (
                <li key={t} style={{ marginBottom: "8px" }}>
                  {t}
                </li>
              ))}
            </ul>
            <p style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 700, color: "#111827" }}>
              £12/month or £99/year <span style={{ color: "#7c3aed", fontSize: "13px" }}>(save 31%)</span>
            </p>
            <button
              type="button"
              onClick={onUpgradeClick}
              style={{
                width: "100%",
                minHeight: "48px",
                padding: "14px 18px",
                border: "none",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 8px 28px rgba(124,58,237,0.4)",
              }}
            >
              Upgrade to Pro — £12/month
            </button>
            <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>Cancel anytime · No commitment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
