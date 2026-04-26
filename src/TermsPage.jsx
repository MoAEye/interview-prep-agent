import PublicMarketingLayout from "./components/PublicMarketingLayout.jsx";

const card = {
  background: "rgba(10,5,25,0.8)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
  padding: "clamp(1.5rem, 4vw, 2.5rem)",
  marginTop: "2rem",
};

const h2 = {
  color: "#a78bfa",
  fontWeight: 700,
  fontSize: "1.1rem",
  marginTop: "2rem",
  marginBottom: "0.75rem",
};

const p = { color: "#aaa", lineHeight: 1.8, fontSize: "0.92rem", margin: "0 0 1rem" };

function Section({ title, children }) {
  return (
    <section>
      <h2 style={h2}>{title}</h2>
      {children}
    </section>
  );
}

export default function TermsPage({ marketingNav, marketingFooter }) {
  return (
    <PublicMarketingLayout navProps={marketingNav} footerProps={marketingFooter}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 clamp(1.25rem, 4vw, 3rem) 3rem" }}>
        <header style={{ textAlign: "center", paddingTop: "2.5rem", paddingBottom: "0.5rem" }}>
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
            LEGAL
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Terms of Service</h1>
          <p style={{ color: "#666", marginTop: "0.75rem", fontSize: "0.95rem" }}>Last updated: March 2026</p>
        </header>

        <article style={card}>
          <p style={p}>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of InterviewAI&apos;s website and software services (the &quot;Service&quot;). By creating an account or using the
            Service, you agree to these Terms.
          </p>

          <Section title="1. Acceptance of terms">
            <p style={p}>
              If you do not agree, do not use the Service. You must be at least 16 years old and able to enter a binding contract. If you use the Service on behalf of an organisation, you represent that
              you have authority to bind that organisation.
            </p>
          </Section>

          <Section title="2. Description of service">
            <p style={p}>
              InterviewAI provides AI-assisted tools for interview preparation and related career features (including mock interviews, feedback, CV tools, company research, and educational content).
              The Service relies on third-party AI and infrastructure; outputs are informational and do not guarantee interview or employment outcomes.
            </p>
          </Section>

          <Section title="3. User accounts and responsibilities">
            <p style={p}>You are responsible for safeguarding your account credentials and for all activity under your account. You agree to provide accurate information and to keep it updated.</p>
            <p style={p}>
              You must not share accounts in a way that violates fair-use limits, circumvent billing, or expose other users&apos; data. Notify us promptly at{" "}
              <a href="mailto:legal@interviewai.app" style={{ color: "#a78bfa" }}>
                legal@interviewai.app
              </a>{" "}
              if you suspect unauthorised access.
            </p>
          </Section>

          <Section title="4. Free and Pro plans">
            <p style={p}>
              We may offer Free and Pro (paid) tiers with different feature limits. Fees, taxes, and billing cycles are presented at checkout when payments are enabled (e.g. via Stripe). We may change
              pricing or features with reasonable notice where required. Failure to pay may result in downgrade or suspension of Pro features.
            </p>
          </Section>

          <Section title="5. Acceptable use">
            <p style={p}>You agree not to:</p>
            <ul style={{ ...p, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>Use the Service unlawfully, fraudulently, or to harm others.</li>
              <li style={{ marginBottom: "0.5rem" }}>Scrape, crawl, reverse engineer, or attempt to extract our models, data, or source code except as permitted by law.</li>
              <li style={{ marginBottom: "0.5rem" }}>Upload malware, spam, or content you do not have rights to use.</li>
              <li style={{ marginBottom: "0.5rem" }}>Overload or disrupt the Service, bypass rate limits, or probe for vulnerabilities without authorisation.</li>
              <li style={{ marginBottom: "0.5rem" }}>Use the Service to build a competing product using our proprietary materials or to misrepresent AI output as human professional advice where regulated.</li>
            </ul>
            <p style={p}>We may suspend or terminate access for violations.</p>
          </Section>

          <Section title="6. Intellectual property">
            <p style={p}>
              We and our licensors own the Service, branding, and underlying software. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable licence to use the Service for
              your personal or internal business use. You retain rights in content you submit; you grant us a licence to host, process, and use that content to provide and improve the Service.
            </p>
          </Section>

          <Section title="7. AI outputs and disclaimer">
            <p style={p}>
              AI-generated content may be inaccurate or incomplete. You are responsible for reviewing outputs before relying on them. The Service is not a substitute for professional legal, HR, or
              immigration advice.
            </p>
          </Section>

          <Section title="8. Disclaimer of warranties">
            <p style={p}>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p style={p}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, INTERVIEWAI AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA,
              OR GOODWILL. OUR AGGREGATE LIABILITY ARISING OUT OF THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE
              HUNDRED POUNDS (£100), EXCEPT WHERE LIABILITY CANNOT BE LIMITED UNDER APPLICABLE LAW (INCLUDING DEATH OR PERSONAL INJURY CAUSED BY NEGLIGENCE OR FRAUD).
            </p>
          </Section>

          <Section title="10. Termination">
            <p style={p}>
              You may stop using the Service at any time. We may suspend or terminate access for breach of these Terms, risk to the Service, or legal requirements. Provisions that by nature should
              survive (e.g. liability limits, IP) will survive termination.
            </p>
          </Section>

          <Section title="11. Governing law">
            <p style={p}>These Terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction, subject to mandatory consumer protections where applicable.</p>
          </Section>

          <Section title="12. Contact">
            <p style={p}>
              <a href="mailto:legal@interviewai.app" style={{ color: "#a78bfa" }}>
                legal@interviewai.app
              </a>
            </p>
          </Section>
        </article>
      </div>
    </PublicMarketingLayout>
  );
}
