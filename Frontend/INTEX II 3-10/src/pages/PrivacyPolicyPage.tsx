import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';

const c = { ivory: '#FBF8F2', forest: '#2A4A35', gold: '#D4A44C', text: '#2C2B28', muted: '#7A786F', white: '#FFFFFF' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: c.forest, fontWeight: 400, marginBottom: '0.75rem' }}>{title}</h2>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <NavBar />
      <main id="main-content" style={{ background: c.ivory, minHeight: '100vh', padding: '3rem 2rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', background: c.white, borderRadius: 16, padding: '2.5rem 3rem', boxShadow: '0 2px 16px rgba(44,43,40,0.06)', border: '0.5px solid rgba(44,43,40,0.08)' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, color: c.forest, fontWeight: 400, marginBottom: '0.5rem' }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: c.muted, marginBottom: '2rem' }}>Last updated: April 2026</p>

          <Section title="1. Who we are">
            <p>Hiraya Haven (also operating as Lighthouse Sanctuary) is a 501(c)(3) nonprofit organization providing safe homes and rehabilitation services for girl survivors of abuse and trafficking in the Philippines. Our registered address and contact information are available on our <Link to="/" style={{ color: c.forest }}>home page</Link>.</p>
          </Section>

          <Section title="2. What data we collect">
            <p>We collect the following categories of personal data:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Account data:</strong> Username, email address, and encrypted password when you register.</li>
              <li><strong>Donation data:</strong> Donation amounts, dates, campaigns, and allocation records for donors.</li>
              <li><strong>Resident data (staff-access only):</strong> Case files, health records, education records, and intervention plans for girls in our care. This data is strictly protected and never shared publicly.</li>
              <li><strong>Usage data:</strong> IP addresses, login timestamps, and system action logs for security auditing.</li>
              <li><strong>Cookie data:</strong> Session and preference cookies as described below.</li>
            </ul>
          </Section>

          <Section title="3. How we use your data">
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>To provide and secure access to your account and its associated services.</li>
              <li>To process and track donations and generate tax receipts.</li>
              <li>To manage resident case files in accordance with DSWD standards and Philippine Republic Act 9208.</li>
              <li>To maintain audit logs for regulatory compliance and safeguarding purposes.</li>
              <li>To communicate with you about your account or donations.</li>
            </ul>
          </Section>

          <Section title="4. Cookies">
            <p>We use the following types of cookies:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Essential cookies:</strong> Required for authentication and security. These cannot be disabled.</li>
              <li><strong>Preference cookies:</strong> Store your display preferences (e.g., light/dark mode). These are only set after you accept our cookie policy.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>You can withdraw your consent at any time by clearing your browser cookies. Essential cookies will be re-set on your next visit as they are necessary for the site to function.</p>
          </Section>

          <Section title="5. Data sharing">
            <p>We do not sell, rent, or trade your personal data. Data may be shared with:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Regulatory bodies (DSWD, IRS) as required by law.</li>
              <li>Our hosting provider (Microsoft Azure) as a data processor under appropriate data processing agreements.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>Resident data is never exposed through the donor portal or publicly accessible pages, even in anonymized form beyond published impact snapshots.</p>
          </Section>

          <Section title="6. Data retention">
            <p>Donor and account data is retained for as long as your account is active and for a minimum of 7 years to meet IRS Form 990 reporting requirements. Resident case data is retained per DSWD guidelines. Audit log data is retained permanently and is immutable.</p>
          </Section>

          <Section title="7. Your rights (GDPR)">
            <p>If you are located in the European Economic Area, you have the following rights:</p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data.</li>
              <li><strong>Erasure:</strong> Request deletion of your data, subject to legal retention obligations.</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format.</li>
              <li><strong>Objection:</strong> Object to certain types of processing.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>To exercise any of these rights, contact us at <a href="mailto:privacy@hirayahaven.org" style={{ color: c.forest }}>privacy@hirayahaven.org</a>.</p>
          </Section>

          <Section title="8. Security">
            <p>All passwords are hashed using industry-standard algorithms (bcrypt/Argon2). All data is transmitted over HTTPS/TLS. Access to sensitive data is role-restricted and audited. Accounts are locked after repeated failed login attempts.</p>
          </Section>

          <Section title="9. Changes to this policy">
            <p>We may update this policy from time to time. The date at the top of this page reflects the most recent revision. Continued use of the site after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="10. Contact">
            <p>For privacy questions or to exercise your rights: <a href="mailto:privacy@hirayahaven.org" style={{ color: c.forest }}>privacy@hirayahaven.org</a></p>
          </Section>

          <div style={{ borderTop: '0.5px solid rgba(44,43,40,0.1)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <Link to="/" style={{ fontSize: 13, color: c.muted }}>← Back to home</Link>
          </div>
        </div>
      </main>
    </>
  );
}
