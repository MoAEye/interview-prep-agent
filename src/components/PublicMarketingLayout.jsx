import PublicPageShell from "./PublicPageShell.jsx";
import LandingNav from "./LandingNav.jsx";
import LandingFooter from "./LandingFooter.jsx";

/** Wraps public marketing pages with shell + nav + footer. */
export default function PublicMarketingLayout({ navProps, footerProps, children }) {
  return (
    <PublicPageShell>
      <LandingNav {...navProps} />
      <div style={{ flex: 1, position: "relative", zIndex: 1, width: "100%" }}>{children}</div>
      <LandingFooter {...footerProps} />
    </PublicPageShell>
  );
}
