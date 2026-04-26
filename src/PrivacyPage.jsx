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

export default function PrivacyPage({ marketingNav, marketingFooter }) {
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
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Privacy Policy</h1>
          <p style={{ color: "#666", marginTop: "0.75rem", fontSize: "0.95rem" }}>Last updated: March 2026</p>
        </header>

        <article style={card}>
          <p style={p}>
            InterviewAI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is operated as a UK-based service. This Privacy Policy explains how we collect, use, store, and share
            personal data when you use our website and SaaS product at interviewai.app (the &quot;Service&quot;), in line with the UK GDPR and the Data Protection Act 2018.
          </p>

          <Section title="1. Who we are">
            <p style={p}>
              The data controller responsible for your personal data is InterviewAI. For privacy-related requests, contact us at{" "}
              <a href="mailto:privacy@interviewai.app" style={{ color: "#a78bfa" }}>
                privacy@interviewai.app
              </a>
              .
            </p>
          </Section>

          <Section title="2. What data we collect">
            <p style={p}>We may collect and process the following categories of data:</p>
            <ul style={{ ...p, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Account data:</strong> name, email address, authentication identifiers from Supabase Auth.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>CV and job data:</strong> CV text or uploads, job descriptions, target roles, and related content you submit.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Interview data:</strong> questions shown, your answers (text and, where enabled, voice transcripts), scores, feedback, and session metadata.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Usage and technical data:</strong> IP address, device/browser type, approximate location, timestamps, and cookies or similar technologies (see below).
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Billing data (when payments go live):</strong> subscription status and limited payment metadata processed by Stripe; we do not store full card numbers on our servers.
              </li>
            </ul>
          </Section>

          <Section title="3. How we use your data">
            <p style={p}>We use personal data to:</p>
            <ul style={{ ...p, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>Provide the Service: generate tailored interview questions, run mock interviews, score answers, and produce feedback.</li>
              <li style={{ marginBottom: "0.5rem" }}>Improve relevance of AI outputs (e.g. grading, suggestions) based on the content you provide.</li>
              <li style={{ marginBottom: "0.5rem" }}>Operate CV tools, company research features, and Academy content where you choose to use them.</li>
              <li style={{ marginBottom: "0.5rem" }}>Maintain security, debug issues, and comply with legal obligations.</li>
              <li style={{ marginBottom: "0.5rem" }}>Communicate about your account, service changes, and (where permitted) product updates.</li>
            </ul>
            <p style={p}>
              Our lawful bases under UK GDPR typically include: performance of a contract (providing the Service), legitimate interests (security, product improvement, analytics where proportionate),
              and consent where we rely on it (e.g. non-essential cookies or optional marketing).
            </p>
          </Section>

          <Section title="4. Who we share data with">
            <p style={p}>We share data with trusted processors only as needed to run the Service:</p>
            <ul style={{ ...p, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>OpenAI:</strong> prompts and related content may be sent to OpenAI to generate questions, grading, and other AI features.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Supabase:</strong> authentication, database storage, and related infrastructure.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Vercel:</strong> hosting and delivery of the web application.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Stripe:</strong> payment processing when billing is enabled (subject to Stripe&apos;s privacy policy).
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong style={{ color: "#ccc" }}>Other providers:</strong> e.g. voice or analytics vendors as disclosed in-product when you use those features.
              </li>
            </ul>
            <p style={p}>We do not sell your personal data. Processors are bound by contractual obligations consistent with this Policy and applicable law.</p>
          </Section>

          <Section title="5. International transfers">
            <p style={p}>
              Some providers may process data outside the UK/EEA. Where we transfer personal data, we use appropriate safeguards such as the UK International Data Transfer Agreement / Addendum or EU
              Standard Contractual Clauses, as applicable.
            </p>
          </Section>

          <Section title="6. Data retention">
            <p style={p}>
              We retain personal data for as long as your account is active and for a reasonable period afterwards to resolve disputes, enforce terms, and meet legal requirements. Interview and CV
              content may be retained until you delete it or close your account, unless a longer period is required by law. Backup systems may retain copies for a limited technical period.
            </p>
          </Section>

          <Section title="7. Your rights">
            <p style={p}>Under UK GDPR you may have the right to:</p>
            <ul style={{ ...p, paddingLeft: "1.25rem" }}>
              <li style={{ marginBottom: "0.5rem" }}>Access your personal data and obtain certain information about processing.</li>
              <li style={{ marginBottom: "0.5rem" }}>Rectify inaccurate data or complete incomplete data.</li>
              <li style={{ marginBottom: "0.5rem" }}>Erase your data in certain circumstances (&quot;right to be forgotten&quot;).</li>
              <li style={{ marginBottom: "0.5rem" }}>Restrict or object to processing in certain circumstances.</li>
              <li style={{ marginBottom: "0.5rem" }}>Data portability for data you provided, where processing is based on contract or consent and automated.</li>
              <li style={{ marginBottom: "0.5rem" }}>Withdraw consent where processing is consent-based.</li>
              <li style={{ marginBottom: "0.5rem" }}>Lodge a complaint with the ICO (www.ico.org.uk).</li>
            </ul>
            <p style={p}>
              You may delete your account and associated data from in-app settings where available, or by emailing{" "}
              <a href="mailto:privacy@interviewai.app" style={{ color: "#a78bfa" }}>
                privacy@interviewai.app
              </a>
              . We will respond within the timeframes required by law.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p style={p}>
              We use cookies and similar technologies for essential functions (e.g. session, security) and, where you agree, for analytics or preferences. You can control non-essential cookies through
              your browser settings and any cookie banner we provide. See our Cookie Policy for more detail.
            </p>
          </Section>

          <Section title="9. Children">
            <p style={p}>The Service is not directed at children under 16. We do not knowingly collect personal data from children.</p>
          </Section>

          <Section title="10. Contact us">
            <p style={p}>
              Questions about this Policy:{" "}
              <a href="mailto:privacy@interviewai.app" style={{ color: "#a78bfa" }}>
                privacy@interviewai.app
              </a>
            </p>
          </Section>

          <Section title="11. Changes to this policy">
            <p style={p}>
              We may update this Policy from time to time. We will post the revised version with an updated &quot;Last updated&quot; date and, where appropriate, notify you by email or in-product notice.
              Continued use of the Service after changes constitutes acceptance where permitted by law.
            </p>
          </Section>
        </article>
      </div>
    </PublicMarketingLayout>
  );
}
