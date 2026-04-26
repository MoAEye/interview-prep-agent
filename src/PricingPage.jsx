import { useState } from "react";
import { UPGRADE_MODAL_FREE, UPGRADE_MODAL_PRO } from "./pricingFeatures.js";
import PublicMarketingLayout from "./components/PublicMarketingLayout.jsx";
import { GlowCard } from "./components/ui/spotlight-card";

const PRICING_IMG_FREE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80&auto=format&fit=crop";
const PRICING_IMG_PRO =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&auto=format&fit=crop";

const PRO_EXTRA_LINES = [
  "Voice interviews",
  "Company research",
  "CV Tailor",
  "Interview Academy",
  "Full history",
  "Cover letter generation",
];

function CheckRow({ ok, children, pro }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.6rem",
        marginBottom: "0.65rem",
        fontSize: "0.88rem",
        lineHeight: 1.45,
        color: ok ? (pro ? "#d4d4d8" : "#aaa") : "#555",
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 2, color: ok ? (pro ? "#a78bfa" : "#6ee7b7") : "#3f3f46", fontWeight: 800 }}>{ok ? "✓" : "✗"}</span>
      <span style={{ textDecoration: ok ? "none" : "line-through", opacity: ok ? 1 : 0.65 }}>{children}</span>
    </li>
  );
}

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div
      style={{
        background: "rgba(10,5,25,0.75)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        marginBottom: "0.75rem",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "1rem 1.15rem",
          background: "transparent",
          border: "none",
          color: "#fff",
          fontWeight: 700,
          fontSize: "0.92rem",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {q}
        <span style={{ color: "#a78bfa", fontSize: "1.1rem", flexShrink: 0 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 1.15rem 1.1rem", color: "#888", fontSize: "0.88rem", lineHeight: 1.65, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ margin: "0.75rem 0 0" }}>{a}</p>
        </div>
      )}
    </div>
  );
}

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yes, cancel any time from your profile settings. No questions asked.",
  },
  {
    q: "What happens when I hit the free interview limit?",
    a: "You'll see an upgrade prompt. Your data and history are always saved.",
  },
  {
    q: "Is my CV data safe?",
    a: "Yes. All data is encrypted and stored securely. We never share your data. Read our Privacy Policy for full details.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 7-day money-back guarantee on Pro subscriptions.",
  },
  {
    q: "Will you add more features to Pro?",
    a: "Yes — richer voice experiences, more Academy modules, and recruiter analytics are planned for Pro first.",
  },
];

function DarkShell({ children, isPublic }) {
  if (isPublic) return children;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05020f",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        color: "#e5e5e5",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
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
            top: "-5%",
            right: "-10%",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {boolean} [props.isPublic]
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onGetStarted]
 * @param {() => void} [props.onProUpgrade] — toast / modal from parent
 * @param {object} [props.marketingNav]
 * @param {object} [props.marketingFooter]
 */
export default function PricingPage({ isPublic = false, onBack, onGetStarted, onProUpgrade, marketingNav, marketingFooter }) {
  const [yearly, setYearly] = useState(false);
  const [faqOpen, setFaqOpen] = useState(() => ({}));

  const freeRows = [
    ...UPGRADE_MODAL_FREE.map((line) => ({ line, ok: true })),
    ...PRO_EXTRA_LINES.map((line) => ({ line, ok: false })),
  ];

  const proPriceLabel = yearly ? "£99" : "£12";
  const proPeriod = yearly ? "/year" : "/month";
  const ctaLabel = yearly ? "Upgrade to Pro — £99/year" : "Upgrade to Pro — £12/month";

  const inner = (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: isPublic ? "0 clamp(1.25rem, 4vw, 3rem) 3rem" : "1rem clamp(1.25rem, 4vw, 3rem) 3rem" }}>
      {!isPublic && (
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#ccc",
            borderRadius: 12,
            padding: "0.55rem 1rem",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "1.25rem",
            fontFamily: "inherit",
          }}
        >
          ← Back
        </button>
      )}

      <header style={{ textAlign: "center", paddingTop: isPublic ? "2.5rem" : "0.5rem" }}>
        <div
          style={{
            display: "inline-block",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.2)",
            color: "#a78bfa",
            borderRadius: "20px",
            padding: "0.3rem 0.9rem",
            fontSize: "0.78rem",
            fontWeight: "700",
            marginBottom: "0.75rem",
          }}
        >
          PRICING
        </div>
        <h1 style={{ fontSize: "clamp(1.85rem, 4vw, 2.75rem)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Simple, honest pricing</h1>
        <p style={{ color: "#888", marginTop: "0.85rem", fontSize: "1rem", maxWidth: "480px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
          Start free. Upgrade when you&apos;re ready. Cancel anytime.
        </p>
      </header>

      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "2rem", marginBottom: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setYearly(false)}
          style={{
            padding: "0.5rem 1.15rem",
            borderRadius: "999px",
            border: "1px solid " + (!yearly ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"),
            fontWeight: 700,
            cursor: "pointer",
            background: !yearly ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.04)",
            color: !yearly ? "#fff" : "#888",
            fontFamily: "inherit",
            fontSize: "0.88rem",
          }}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setYearly(true)}
          style={{
            padding: "0.5rem 1.15rem",
            borderRadius: "999px",
            border: "1px solid " + (yearly ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"),
            fontWeight: 700,
            cursor: "pointer",
            background: yearly ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.04)",
            color: yearly ? "#fff" : "#888",
            fontFamily: "inherit",
            fontSize: "0.88rem",
          }}
        >
          Yearly
        </button>
        {yearly && (
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#6ee7b7",
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.35)",
              padding: "0.35rem 0.65rem",
              borderRadius: "999px",
            }}
          >
            Save 31%
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "1.25rem",
          marginTop: "2rem",
          alignItems: "stretch",
        }}
      >
        <GlowCard glowColor="blue" customSize className="h-full w-full min-h-[480px] !rounded-[20px] !p-0">
          <div className="relative z-10 flex h-full flex-col p-9">
          <img
            src={PRICING_IMG_FREE}
            alt=""
            className="mb-4 h-28 w-full rounded-xl object-cover opacity-90 ring-1 ring-white/10"
            loading="lazy"
            decoding="async"
          />
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#888", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>Free</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff" }}>£0</span>
            <span style={{ color: "#555", fontSize: "0.95rem" }}>/month</span>
          </div>
          <p style={{ color: "#666", fontSize: "0.9rem", margin: "0 0 1.25rem" }}>Perfect for getting started</p>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: "1.25rem" }} />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
            {freeRows.map(({ line, ok }) => (
              <CheckRow key={line} ok={ok} pro={false}>
                {line}
              </CheckRow>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => (isPublic ? onGetStarted?.() : onBack?.())}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              background: "transparent",
              color: "#e5e5e5",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "14px",
              padding: "0.95rem 1rem",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: "0.95rem",
              fontFamily: "inherit",
            }}
          >
            {isPublic ? "Get Started Free" : "Continue with Free"}
          </button>
          </div>
        </GlowCard>

        <GlowCard glowColor="purple" customSize className="h-full w-full min-h-[520px] !rounded-[20px] !p-0 ring-1 ring-violet-500/40">
          <div className="relative z-10 flex h-full flex-col p-9">
          <img
            src={PRICING_IMG_PRO}
            alt=""
            className="mb-4 h-28 w-full rounded-xl object-cover opacity-95 ring-1 ring-violet-400/30"
            loading="lazy"
            decoding="async"
          />
          <div
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              zIndex: 20,
              fontSize: "0.65rem",
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: "#0f172a",
              background: "linear-gradient(135deg, #c4b5fd, #a78bfa)",
              padding: "0.3rem 0.6rem",
              borderRadius: "999px",
            }}
          >
            MOST POPULAR
          </div>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 900,
              background: "linear-gradient(135deg, #e9d5ff, #7c3aed)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.5rem",
            }}
          >
            Pro
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", marginBottom: "0.15rem" }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff" }}>{proPriceLabel}</span>
            <span style={{ color: "#888", fontSize: "0.95rem" }}>{proPeriod}</span>
          </div>
          {yearly && (
            <p style={{ color: "#6ee7b7", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.75rem" }}>Save £45/year</p>
          )}
          {!yearly && <div style={{ marginBottom: "0.75rem" }} />}
          <p style={{ color: "#888", fontSize: "0.9rem", margin: "0 0 1.25rem" }}>Everything you need to land the job</p>
          <div style={{ height: 1, background: "rgba(124,58,237,0.25)", marginBottom: "1.25rem" }} />
          <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
            {UPGRADE_MODAL_PRO.map((line) => (
              <CheckRow key={line} ok pro>
                {line}
              </CheckRow>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onProUpgrade?.()}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff",
              border: "none",
              borderRadius: "14px",
              padding: "1rem 1rem",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: "0.95rem",
              fontFamily: "inherit",
              boxShadow: "0 0 24px rgba(124,58,237,0.4)",
            }}
          >
            {ctaLabel}
          </button>
          <p style={{ color: "#666", fontSize: "0.8rem", marginTop: "0.85rem", textAlign: "center", marginBottom: 0 }}>
            Cancel anytime · No commitment · Instant access
          </p>
          </div>
        </GlowCard>
      </div>

      <section style={{ marginTop: "3.5rem", maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
        <h2 style={{ textAlign: "center", color: "#fff", fontSize: "1.35rem", fontWeight: 800, marginBottom: "1.25rem" }}>FAQ</h2>
        {FAQ.map((item, i) => (
          <FaqItem
            key={item.q}
            q={item.q}
            a={item.a}
            open={!!faqOpen[i]}
            onToggle={() => setFaqOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
          />
        ))}
      </section>
    </div>
  );

  if (isPublic && marketingNav && marketingFooter) {
    return (
      <PublicMarketingLayout navProps={marketingNav} footerProps={marketingFooter}>
        {inner}
      </PublicMarketingLayout>
    );
  }

  return <DarkShell isPublic={false}>{inner}</DarkShell>;
}
