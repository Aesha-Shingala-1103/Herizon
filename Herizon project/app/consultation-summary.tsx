import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileDown,
  Sparkles,
  HelpCircle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import Colors from '../src/theme/colors';
import Typography from '../src/theme/typography';
import Card from '../src/components/Card';
import Button from '../src/components/Button';
import { storage } from '../src/services/storageService';
import { aiService } from '../src/services/aiService';
import { exportService } from '../src/services/exportService';
import { analyzeSymptomPatterns } from '../src/services/healthCalculations';
import {
  UserProfile,
  SymptomLog,
  HealthMeasurement,
  LaboratoryResult,
  Medication,
  Appointment,
  SleepLog,
} from '../src/types';

/** Renders the summary text without raw markdown symbols (###, **, >, - ). */
function SummaryText({ text }: { text: string }) {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  return (
    <View style={styles.summaryBody}>
      {lines.map((raw, i) => {
        let line = raw.trim();
        if (!line) return <View key={i} style={{ height: 6 }} />;
        const heading = /^#{1,6}\s+/.test(line);
        line = line.replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '');
        const bullet = /^[-*•]\s+/.test(line);
        line = line.replace(/^[-*•]\s+/, '');
        // Split on **bold** segments and render them bold.
        const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <Text key={i} style={[styles.summaryBodyText, heading && styles.summaryHeading, bullet && styles.summaryBullet]}>
            {bullet ? '•  ' : ''}
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
                <Text key={j} style={styles.summaryBold}>{part.slice(2, -2)}</Text>
              ) : (
                <Text key={j}>{part.replace(/\*\*/g, '')}</Text>
              )
            )}
          </Text>
        );
      })}
    </View>
  );
}

export default function ConsultationSummaryScreen() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [measurements, setMeasurements] = useState<HealthMeasurement[]>([]);
  const [labResults, setLabResults] = useState<LaboratoryResult[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Generated Summary data
  const [headline, setHeadline] = useState('');
  const [summaryMarkdown, setSummaryMarkdown] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isAIAssisted, setIsAIAssisted] = useState(false);

  useEffect(() => {
    async function loadAndGenerate() {
      try {
        setLoading(true);
        const p = await storage.getProfile();
        const syms = await storage.getSymptoms();
        const meas = await storage.getMeasurements();
        const labs = await storage.getLaboratoryResults();
        const meds = await storage.getMedications();
        const slps = await storage.getSleepLogs();
        const apts = await storage.getAppointments();

        setProfile(p);
        setSymptoms(syms);
        setMeasurements(meas);
        setLabResults(labs);
        setMedications(meds);
        setSleepLogs(slps);
        setAppointments(apts);

        // Analyze deterministic patterns
        const patterns = analyzeSymptomPatterns(syms, slps);

        // Call AI Service or deterministic fallback
        const result = await aiService.generateHealthSummary({
          symptomPatterns: patterns,
          recentMeasurements: meas,
          recentLabResults: labs,
          sleepLogs: slps,
          medications: meds,
          daysCovered: 30,
        });

        setHeadline(result.headline);
        setSummaryMarkdown(result.summaryMarkdown);
        setSuggestedQuestions(result.suggestedQuestionsForDoctor);
        setIsAIAssisted(result.isAIAssisted);
      } catch (e) {
        console.error('Failed to generate summary:', e);
      } finally {
        setLoading(false);
      }
    }

    loadAndGenerate();
  }, []);

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      const patterns = analyzeSymptomPatterns(symptoms, sleepLogs);
      const reportData = {
        profile,
        monthName: 'October',
        year: 2026,
        totalDaysLogged: symptoms.length > 0 ? 18 : 0,
        symptomPatterns: patterns,
        measurements,
        labResults,
        medications,
        appointments,
        sleepLogs,
        suggestedQuestions,
      };

      const uri = await exportService.exportReportToPdf(reportData);
      if (uri) {
        Alert.alert('PDF Ready', 'Doctor-Ready Consultation Summary prepared and opened for sharing.');
      }
    } catch (e) {
      console.error('Export error:', e);
      Alert.alert('Export Notice', 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={Colors.deepBurgundy} />
        <Text style={styles.loadingText}>Organizing health records for your consultation...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.header}>
          <View style={styles.aiBadge}>
            <Sparkles size={12} color={Colors.deepBurgundy} />
            <Text style={styles.aiBadgeText}>
              {isAIAssisted ? 'AI-Organized Medical Summary' : 'Deterministic Clinical Summary'}
            </Text>
          </View>
          <Text style={styles.title}>{headline || '30-Day Health Records'}</Text>
          <Text style={styles.subtitle}>
            Empowering your doctor consultations with objective timelines and key questions.
          </Text>
        </View>

        {/* Action Button */}
        <Button
          title={exporting ? 'Generating PDF...' : 'Download / Share Doctor Report (PDF)'}
          onPress={handleExportPdf}
          loading={exporting}
          variant="primary"
          icon={<FileDown size={18} color={Colors.white} />}
          style={{ marginBottom: 16 }}
        />

        {/* Structured Summary Body Card */}
        <Card style={styles.summaryCard} variant="glass">
          <Text style={styles.cardHeader}>Recorded Health Summary</Text>
          <SummaryText text={summaryMarkdown} />

          <View style={styles.complianceNotice}>
            <AlertCircle size={14} color={Colors.deepBurgundy} style={{ marginTop: 2 }} />
            <Text style={styles.complianceNoticeText}>
              Safeguard: HerHealth never provides automated diagnoses or treatments. All facts are ground-truth correlations to assist you and your clinician.
            </Text>
          </View>
        </Card>

        {/* Suggested Questions for Your Doctor */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <HelpCircle size={18} color={Colors.deepBurgundy} />
            <Text style={styles.sectionTitle}>Questions Prepared for Clinician</Text>
          </View>
        </View>

        {suggestedQuestions.map((q, idx) => (
          <Card key={idx} style={styles.questionCard} variant="rose">
            <View style={styles.questionRow}>
              <View style={styles.questionNumberBox}>
                <Text style={styles.questionNumber}>{idx + 1}</Text>
              </View>
              <Text style={styles.questionText}>{q}</Text>
            </View>
          </Card>
        ))}

        {/* Vitals & Readings Quick Snapshot */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recorded Vitals & Lab Snapshot</Text>
        </View>

        <Card style={styles.snapshotCard} variant="elevated">
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotValue}>{symptoms.length}</Text>
              <Text style={styles.snapshotLabel}>Symptoms Logged</Text>
            </View>
            <View style={styles.snapshotDivider} />
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotValue}>{measurements.length}</Text>
              <Text style={styles.snapshotLabel}>Vitals Recorded</Text>
            </View>
            <View style={styles.snapshotDivider} />
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotValue}>{labResults.length}</Text>
              <Text style={styles.snapshotLabel}>Lab Reports</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.warmPorcelain,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    backgroundColor: Colors.warmPorcelain,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: Colors.mutedText,
    fontFamily: Typography.body,
    textAlign: 'center',
  },
  header: {
    marginBottom: 16,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    flexShrink: 1,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  aiBadgeText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    fontFamily: Typography.body,
    marginTop: 4,
    lineHeight: 18,
  },
  summaryCard: {
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 10,
  },
  summaryBodyText: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    lineHeight: 20,
    fontFamily: Typography.body,
  },
  summaryBody: {
    marginBottom: 14,
  },
  summaryHeading: {
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
  },
  summaryBullet: {
    paddingLeft: 4,
  },
  summaryBold: {
    fontWeight: '700',
  },
  complianceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.paleRoseWhite,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.3)',
  },
  complianceNoticeText: {
    fontSize: 11,
    color: Colors.deepBurgundy,
    flex: 1,
    lineHeight: 15,
  },
  sectionHeaderRow: {
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  questionCard: {
    padding: 14,
    marginBottom: 8,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionNumberBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  questionText: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  snapshotCard: {
    padding: 16,
    marginTop: 6,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snapshotItem: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.lavenderSlate,
    fontFamily: Typography.numeric,
  },
  snapshotLabel: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
    textAlign: 'center',
  },
  snapshotDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.fineBorder,
  },
});
