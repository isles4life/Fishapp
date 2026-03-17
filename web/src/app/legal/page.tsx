'use client';
import Link from 'next/link';

const C = {
  bg: '#0D1A0D', surface: '#152515', surfaceHigh: '#1D331D',
  border: '#2A4A2A', accent: '#C9A450',
  text: '#F0EDE4', textSub: '#8BA88B', textMuted: '#4A6A4A',
};

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 32 }}>
      <h2 style={{ color: C.accent, fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px', paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Sub({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: '0 0 8px' }}>{num}. {title}</h3>
      <div style={{ color: C.textSub, fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
      {items.map((item, i) => <li key={i} style={{ color: C.textSub, fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>{item}</li>)}
    </ul>
  );
}

export default function LegalPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.text }}>
      {/* Header */}
      <div style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: C.textSub, textDecoration: 'none', fontSize: 13 }}>← Back</Link>
        <div>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.text }}>FISH</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>LEAGUE</span>
          <span style={{ color: C.textMuted, fontSize: 13, marginLeft: 10 }}>Legal</span>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Quick links */}
        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 40 }}>
          <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>Quick Links</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a href="#terms" style={{ color: C.accent, fontSize: 14, textDecoration: 'none' }}>Terms of Service</a>
            <span style={{ color: C.textMuted }}>·</span>
            <a href="#privacy" style={{ color: C.accent, fontSize: 14, textDecoration: 'none' }}>Privacy Policy</a>
            <span style={{ color: C.textMuted }}>·</span>
            <a href="#arbitration" style={{ color: C.accent, fontSize: 14, textDecoration: 'none' }}>Arbitration</a>
          </div>
        </div>

        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 900, margin: '0 0 4px', letterSpacing: 1 }}>FishLeague Legal</h1>
        <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 40 }}>Last Updated: March 2026</p>
        <p style={{ color: C.textSub, fontSize: 14, lineHeight: 1.7, marginBottom: 40 }}>
          Welcome to FishLeague. This page outlines our Terms of Service and Privacy Policy. By using fishleague.app, you agree to these terms.
        </p>

        {/* ── Terms of Service ── */}
        <Section id="terms" title="Terms of Service">
          <Sub num="1" title="Acceptance of Terms">
            <p style={{ margin: 0 }}>By accessing or using FishLeague ("Platform"), you agree to be bound by these Terms. If you do not agree, you may not use the Platform.</p>
          </Sub>

          <Sub num="2" title="Eligibility">
            <p style={{ margin: '0 0 6px' }}>You must:</p>
            <Ul items={['Be at least 13 years old', 'Have parental consent if under 18', 'Comply with all applicable laws']} />
          </Sub>

          <Sub num="3" title="User Accounts">
            <p style={{ margin: '0 0 6px' }}>You are responsible for:</p>
            <Ul items={['Maintaining account security', 'All activity under your account', 'Providing accurate information']} />
          </Sub>

          <Sub num="4" title="Compliance with Fishing Laws">
            <p style={{ margin: '0 0 6px' }}>You are solely responsible for:</p>
            <Ul items={['Holding valid fishing licenses where required', 'Following local regulations, limits, and restrictions']} />
            <p style={{ margin: '8px 0 0' }}>FishLeague does not verify licenses and is not responsible for compliance.</p>
          </Sub>

          <Sub num="5" title="Assumption of Risk">
            <p style={{ margin: '0 0 6px' }}>Fishing involves inherent risks. You agree:</p>
            <Ul items={['You participate at your own risk', 'FishLeague is not liable for injury, loss, or damages']} />
          </Sub>

          <Sub num="6" title="Catch Submission Rules">
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: C.text }}>Requirements</p>
            <Ul items={['Fish must be fully visible', 'Measurement must be clear', 'Mouth closed', 'Tail pinched (if applicable)', 'Use official FishLeague measuring system when required']} />
            <p style={{ margin: '8px 0 4px', fontWeight: 600, color: C.text }}>Submission Must Include</p>
            <Ul items={['Clear photo and/or video', 'Accurate measurement', 'No editing or manipulation']} />
            <p style={{ margin: '8px 0 4px', fontWeight: 600, color: C.text }}>Violations May Result In</p>
            <Ul items={['Rejected submissions', 'Tournament disqualification', 'Account suspension or termination']} />
          </Sub>

          <Sub num="7" title="Anti-Cheating & Fair Play">
            <p style={{ margin: '0 0 4px' }}>You may not:</p>
            <Ul items={['Submit altered or AI-generated images', 'Submit catches that are not your own', 'Misrepresent size or species', 'Exploit the system']} />
            <p style={{ margin: '8px 0 4px' }}>FishLeague may:</p>
            <Ul items={['Review and remove submissions', 'Disqualify participants', 'Suspend or ban accounts']} />
          </Sub>

          <Sub num="8" title="Final Decision Authority">
            <p style={{ margin: '0 0 6px' }}>All decisions regarding:</p>
            <Ul items={['Catch validation', 'Tournament outcomes', 'Rule enforcement']} />
            <p style={{ margin: '8px 0 0' }}>are final and not subject to appeal.</p>
          </Sub>

          <Sub num="9" title="Tournaments, Prizes & Rewards">
            <p style={{ margin: '0 0 6px' }}>FishLeague may offer:</p>
            <Ul items={['Cash prizes (where permitted)', 'Merchandise or sponsor rewards']} />
            <p style={{ margin: '8px 0 6px' }}>You are responsible for:</p>
            <Ul items={['Taxes', 'Legal eligibility']} />
            <p style={{ margin: '8px 0 0' }}>FishLeague may modify or cancel prizes at any time.</p>
          </Sub>

          <Sub num="10" title="Skill-Based Competition">
            <p style={{ margin: 0 }}>All tournaments are intended to be games of skill, not chance. Outcomes are based on user performance.</p>
          </Sub>

          <Sub num="11" title="Location & Legal Restrictions">
            <p style={{ margin: 0 }}>Paid tournaments may not be available in all jurisdictions. You are responsible for ensuring participation is legal in your location.</p>
          </Sub>

          <Sub num="12" title="Alternative Method of Entry (AMOE)">
            <p style={{ margin: 0 }}>Where required by law, FishLeague may provide a free method of entry for certain tournaments.</p>
          </Sub>

          <Sub num="13" title="Identity Verification">
            <p style={{ margin: 0 }}>FishLeague may require identity verification prior to awarding prizes.</p>
          </Sub>

          <Sub num="14" title="Fraud & Abuse Monitoring">
            <p style={{ margin: '0 0 6px' }}>We reserve the right to:</p>
            <Ul items={['Monitor activity for fraud', 'Suspend accounts pending investigation', 'Withhold prizes if violations are detected']} />
          </Sub>

          <Sub num="15" title="User Content & License">
            <p style={{ margin: '0 0 6px' }}>You retain ownership of your content. By submitting content, you grant FishLeague a:</p>
            <Ul items={['Worldwide', 'Non-exclusive', 'Royalty-free license']} />
            <p style={{ margin: '8px 0 0' }}>to use, display, and promote your content.</p>
          </Sub>

          <Sub num="16" title="Code of Conduct">
            <p style={{ margin: '0 0 6px' }}>You agree to:</p>
            <Ul items={['Respect other users', 'Avoid harassment or abuse', 'Contribute positively']} />
            <p style={{ margin: '8px 0 0' }}>Violations may result in removal.</p>
          </Sub>

          <Sub num="17" title="Account Enforcement">
            <p style={{ margin: '0 0 6px' }}>FishLeague may:</p>
            <Ul items={['Suspend or terminate accounts', 'Remove content', 'Restrict access']} />
          </Sub>

          <Sub num="18" title="Indemnification">
            <p style={{ margin: '0 0 6px' }}>You agree to indemnify and hold FishLeague harmless from any claims, damages, or expenses arising from:</p>
            <Ul items={['Your use of the Platform', 'Your violations of these Terms or laws', 'Your content or conduct']} />
          </Sub>

          <Sub num="19" title="Dispute Resolution & Arbitration">
            <div id="arbitration" />
            <p style={{ margin: '0 0 6px' }}>All disputes will be resolved through binding arbitration, not in court.</p>
            <Ul items={['Governed by applicable arbitration rules', 'Conducted in North Carolina (unless required otherwise)', 'Single arbitrator', 'Small claims court exceptions apply where eligible']} />
          </Sub>

          <Sub num="20" title="Class Action Waiver">
            <p style={{ margin: 0 }}>You agree to resolve disputes individually and waive any right to participate in class actions.</p>
          </Sub>

          <Sub num="21" title="Disclaimer of Warranties">
            <p style={{ margin: 0 }}>The Platform is provided "as is" without warranties of any kind.</p>
          </Sub>

          <Sub num="22" title="Limitation of Liability">
            <p style={{ margin: '0 0 6px' }}>FishLeague is not liable for:</p>
            <Ul items={['Indirect or consequential damages', 'Loss of data, profits, or goodwill']} />
          </Sub>

          <Sub num="23" title="Governing Law">
            <p style={{ margin: 0 }}>These Terms are governed by the laws of the State of North Carolina.</p>
          </Sub>

          <Sub num="24" title="Changes to Terms">
            <p style={{ margin: 0 }}>We may update these Terms at any time. Continued use constitutes acceptance.</p>
          </Sub>
        </Section>

        {/* ── Privacy Policy ── */}
        <Section id="privacy" title="Privacy Policy">
          <Sub num="1" title="Information We Collect">
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: C.text }}>User-Provided</p>
            <Ul items={['Name, username, email', 'Profile data', 'Photos/videos of catches']} />
            <p style={{ margin: '8px 0 4px', fontWeight: 600, color: C.text }}>Automatically Collected</p>
            <Ul items={['Device and browser info', 'IP address', 'Usage data']} />
            <p style={{ margin: '8px 0 4px', fontWeight: 600, color: C.text }}>Location Data</p>
            <Ul items={['GPS data at time of submission', 'Approximate location via IP']} />
          </Sub>

          <Sub num="2" title="How We Use Data">
            <p style={{ margin: '0 0 6px' }}>We use data to:</p>
            <Ul items={['Operate the Platform', 'Validate catches', 'Run tournaments and rankings', 'Improve user experience', 'Detect fraud']} />
          </Sub>

          <Sub num="3" title="Sharing of Data">
            <p style={{ margin: '0 0 6px' }}>We may share:</p>
            <Ul items={['With service providers', 'With sponsors (as needed)', 'Aggregated/anonymized data', 'When required by law']} />
            <p style={{ margin: '8px 0 0' }}>We do not sell personal data without consent.</p>
          </Sub>

          <Sub num="4" title="Data Retention">
            <p style={{ margin: '0 0 6px' }}>We retain data:</p>
            <Ul items={['While your account is active', 'As required for legal or operational purposes']} />
          </Sub>

          <Sub num="5" title="Your Rights">
            <p style={{ margin: '0 0 6px' }}>You may request to:</p>
            <Ul items={['Access your data', 'Correct inaccuracies', 'Delete your data']} />
            <p style={{ margin: '8px 0 0' }}>Contact: <a href="mailto:admin@fishleague.app" style={{ color: C.accent }}>admin@fishleague.app</a></p>
          </Sub>

          <Sub num="6" title="Data Security">
            <p style={{ margin: 0 }}>We use reasonable safeguards but cannot guarantee absolute security.</p>
          </Sub>

          <Sub num="7" title="Children's Privacy">
            <p style={{ margin: 0 }}>We do not knowingly collect data from children under 13 without parental consent.</p>
          </Sub>

          <Sub num="8" title="Third-Party Services">
            <p style={{ margin: 0 }}>We are not responsible for third-party privacy practices.</p>
          </Sub>

          <Sub num="9" title="Updates">
            <p style={{ margin: 0 }}>We may update this policy. Continued use means acceptance.</p>
          </Sub>

          <Sub num="10" title="Contact">
            <p style={{ margin: 0 }}>Email: <a href="mailto:admin@fishleague.app" style={{ color: C.accent }}>admin@fishleague.app</a></p>
          </Sub>
        </Section>
      </div>
    </div>
  );
}
