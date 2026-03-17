import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function Item({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <View style={s.item}>
      <Text style={s.itemTitle}>{num}. {title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return <Text style={s.bullet}>• {text}</Text>;
}

export default function LegalScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          <Text style={s.headerTitleWhite}>FISH</Text>
          <Text style={s.headerTitleGold}>LEAGUE</Text>
          <Text style={s.headerTitleSub}> Legal</Text>
        </Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.pageTitle}>FishLeague Legal</Text>
        <Text style={s.lastUpdated}>Last Updated: March 2026</Text>
        <Text style={s.intro}>
          Welcome to FishLeague. This page outlines our Terms of Service and Privacy Policy. By using FishLeague, you agree to these terms.
        </Text>

        {/* ── Terms of Service ── */}
        <SectionHeader title="Terms of Service" />

        <Item num="1" title="Acceptance of Terms">
          <Text style={s.body}>By accessing or using FishLeague ("Platform"), you agree to be bound by these Terms. If you do not agree, you may not use the Platform.</Text>
        </Item>

        <Item num="2" title="Eligibility">
          <Bullet text="Be at least 13 years old" />
          <Bullet text="Have parental consent if under 18" />
          <Bullet text="Comply with all applicable laws" />
        </Item>

        <Item num="3" title="User Accounts">
          <Text style={s.body}>You are responsible for:</Text>
          <Bullet text="Maintaining account security" />
          <Bullet text="All activity under your account" />
          <Bullet text="Providing accurate information" />
        </Item>

        <Item num="4" title="Compliance with Fishing Laws">
          <Text style={s.body}>You are solely responsible for holding valid fishing licenses and following local regulations. FishLeague does not verify licenses.</Text>
        </Item>

        <Item num="5" title="Assumption of Risk">
          <Text style={s.body}>Fishing involves inherent risks. You participate at your own risk. FishLeague is not liable for injury, loss, or damages.</Text>
        </Item>

        <Item num="6" title="Catch Submission Rules">
          <Text style={s.subLabel}>Requirements</Text>
          <Bullet text="Fish must be fully visible" />
          <Bullet text="Measurement must be clear" />
          <Bullet text="Mouth closed, tail pinched (if applicable)" />
          <Bullet text="Use official FishLeague measuring system when required" />
          <Text style={s.subLabel}>Submission Must Include</Text>
          <Bullet text="Clear photo and/or video" />
          <Bullet text="Accurate measurement" />
          <Bullet text="No editing or manipulation" />
          <Text style={s.subLabel}>Violations May Result In</Text>
          <Bullet text="Rejected submissions" />
          <Bullet text="Tournament disqualification" />
          <Bullet text="Account suspension or termination" />
        </Item>

        <Item num="7" title="Anti-Cheating & Fair Play">
          <Text style={s.body}>You may not submit altered or AI-generated images, misrepresent size or species, or exploit the system. FishLeague may suspend or ban accounts for violations.</Text>
        </Item>

        <Item num="8" title="Final Decision Authority">
          <Text style={s.body}>All decisions regarding catch validation, tournament outcomes, and rule enforcement are final and not subject to appeal.</Text>
        </Item>

        <Item num="9" title="Tournaments, Prizes & Rewards">
          <Text style={s.body}>FishLeague may offer cash prizes and merchandise. You are responsible for taxes and legal eligibility. Prizes may be modified or cancelled at any time.</Text>
        </Item>

        <Item num="10" title="Skill-Based Competition">
          <Text style={s.body}>All tournaments are games of skill, not chance. Outcomes are based on user performance.</Text>
        </Item>

        <Item num="11" title="Location & Legal Restrictions">
          <Text style={s.body}>Paid tournaments may not be available in all jurisdictions. You are responsible for ensuring participation is legal in your location.</Text>
        </Item>

        <Item num="12" title="Alternative Method of Entry (AMOE)">
          <Text style={s.body}>Where required by law, FishLeague may provide a free method of entry for certain tournaments.</Text>
        </Item>

        <Item num="13" title="Identity Verification">
          <Text style={s.body}>FishLeague may require identity verification prior to awarding prizes.</Text>
        </Item>

        <Item num="14" title="Fraud & Abuse Monitoring">
          <Text style={s.body}>We reserve the right to monitor activity for fraud, suspend accounts pending investigation, and withhold prizes if violations are detected.</Text>
        </Item>

        <Item num="15" title="User Content & License">
          <Text style={s.body}>You retain ownership of your content. By submitting content, you grant FishLeague a worldwide, non-exclusive, royalty-free license to use, display, and promote your content.</Text>
        </Item>

        <Item num="16" title="Code of Conduct">
          <Text style={s.body}>You agree to respect other users, avoid harassment or abuse, and contribute positively. Violations may result in removal.</Text>
        </Item>

        <Item num="17" title="Account Enforcement">
          <Text style={s.body}>FishLeague may suspend or terminate accounts, remove content, and restrict access.</Text>
        </Item>

        <Item num="18" title="Indemnification">
          <Text style={s.body}>You agree to indemnify and hold FishLeague harmless from any claims, damages, or expenses arising from your use of the Platform, violations of these Terms, or your content or conduct.</Text>
        </Item>

        <Item num="19" title="Dispute Resolution & Arbitration">
          <Text style={s.body}>All disputes will be resolved through binding arbitration in North Carolina (unless required otherwise), conducted by a single arbitrator. Small claims court exceptions apply where eligible.</Text>
        </Item>

        <Item num="20" title="Class Action Waiver">
          <Text style={s.body}>You agree to resolve disputes individually and waive any right to participate in class actions.</Text>
        </Item>

        <Item num="21" title="Disclaimer of Warranties">
          <Text style={s.body}>The Platform is provided "as is" without warranties of any kind.</Text>
        </Item>

        <Item num="22" title="Limitation of Liability">
          <Text style={s.body}>FishLeague is not liable for indirect or consequential damages, or loss of data, profits, or goodwill.</Text>
        </Item>

        <Item num="23" title="Governing Law">
          <Text style={s.body}>These Terms are governed by the laws of the State of North Carolina.</Text>
        </Item>

        <Item num="24" title="Changes to Terms">
          <Text style={s.body}>We may update these Terms at any time. Continued use constitutes acceptance.</Text>
        </Item>

        {/* ── Privacy Policy ── */}
        <SectionHeader title="Privacy Policy" />

        <Item num="1" title="Information We Collect">
          <Text style={s.subLabel}>User-Provided</Text>
          <Bullet text="Name, username, email" />
          <Bullet text="Profile data" />
          <Bullet text="Photos/videos of catches" />
          <Text style={s.subLabel}>Automatically Collected</Text>
          <Bullet text="Device and browser info" />
          <Bullet text="IP address" />
          <Bullet text="Usage data" />
          <Text style={s.subLabel}>Location Data</Text>
          <Bullet text="GPS data at time of submission" />
          <Bullet text="Approximate location via IP" />
        </Item>

        <Item num="2" title="How We Use Data">
          <Bullet text="Operate the Platform" />
          <Bullet text="Validate catches" />
          <Bullet text="Run tournaments and rankings" />
          <Bullet text="Improve user experience" />
          <Bullet text="Detect fraud" />
        </Item>

        <Item num="3" title="Sharing of Data">
          <Bullet text="With service providers" />
          <Bullet text="With sponsors (as needed)" />
          <Bullet text="Aggregated/anonymized data" />
          <Bullet text="When required by law" />
          <Text style={s.body}>We do not sell personal data without consent.</Text>
        </Item>

        <Item num="4" title="Data Retention">
          <Text style={s.body}>We retain data while your account is active and as required for legal or operational purposes.</Text>
        </Item>

        <Item num="5" title="Your Rights">
          <Text style={s.body}>You may request to access, correct, or delete your data.</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:admin@fishleague.app')}>
            <Text style={s.link}>Contact: admin@fishleague.app</Text>
          </TouchableOpacity>
        </Item>

        <Item num="6" title="Data Security">
          <Text style={s.body}>We use reasonable safeguards but cannot guarantee absolute security.</Text>
        </Item>

        <Item num="7" title="Children's Privacy">
          <Text style={s.body}>We do not knowingly collect data from children under 13 without parental consent.</Text>
        </Item>

        <Item num="8" title="Third-Party Services">
          <Text style={s.body}>We are not responsible for third-party privacy practices.</Text>
        </Item>

        <Item num="9" title="Updates">
          <Text style={s.body}>We may update this policy. Continued use means acceptance.</Text>
        </Item>

        <Item num="10" title="Contact">
          <TouchableOpacity onPress={() => Linking.openURL('mailto:admin@fishleague.app')}>
            <Text style={s.link}>admin@fishleague.app</Text>
          </TouchableOpacity>
        </Item>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { paddingRight: 8 },
  backText: { color: colors.textSecondary, fontSize: 14 },
  headerTitle: { fontSize: 16 },
  headerTitleWhite: { fontWeight: '900', color: colors.textPrimary },
  headerTitleGold: { fontWeight: '900', color: colors.accent },
  headerTitleSub: { color: colors.textMuted, fontSize: 13 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
  lastUpdated: { color: colors.textMuted, fontSize: 12, marginBottom: 16 },
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 32 },
  sectionHeader: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 20, marginTop: 8 },
  sectionHeaderText: { color: colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  item: { marginBottom: 20 },
  itemTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 4 },
  bullet: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, paddingLeft: 8, marginBottom: 2 },
  subLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  link: { color: colors.accent, fontSize: 14, marginTop: 4 },
});
