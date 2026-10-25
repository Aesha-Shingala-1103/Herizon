import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Sparkles,
  PlusCircle,
  Activity,
  Heart,
  FilePlus,
  Pill,
  Moon,
  Calendar,
  Mic,
  Smile,
  Meh,
  Frown,
  Battery,
  AlertCircle,
  Footprints,
  Bell,
  CheckCircle2,
  Clock,
  CalendarDays,
  Plus,
  Flame,
} from 'lucide-react-native';
import Colors from '../../src/theme/colors';
import Typography from '../../src/theme/typography';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import HealthChart from '../../src/components/HealthChart';
import UrgentAlertBanner from '../../src/components/UrgentAlertBanner';
import { executeVoiceCommand } from '../../src/services/voiceExecutor';
import VoiceInputModal from '../../src/components/VoiceInputModal';
import { FloralHeroCard, FloralEmptyState } from '../../src/components/FloralDecorations';
import AppLogo from '../../src/components/AppLogo';
import { storage } from '../../src/services/storageService';
import {
  checkUrgentSafetyWarning,
  analyzeSymptomPatterns,
  calculateCycleEstimates,
  SymptomPatternSummary,
  CycleEstimation,
} from '../../src/services/healthCalculations';
import { MenstrualCalendar } from '../../src/components/MenstrualCalendar';
import {
  UserProfile,
  UserPreferences,
  DailyCheckin,
  SymptomLog,
  HealthMeasurement,
  Medication,
  MedicationDoseLog,
  Appointment,
  SleepLog,
  ActivityLog,
  MenstrualCycle,
  UrgentSafetyAlert,
  MoodType,
  LaboratoryResult,
  MedicalCondition,
} from '../../src/types';

interface TodayDoseItem {
  medicationId: string;
  medicationName: string;
  strength?: string;
  scheduledTime: string;
  scheduledAt: string;
  status: 'taken' | 'skipped' | 'missed' | 'pending' | 'snoozed';
  relationToMeals?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);
  const [, setSymptomsToday] = useState<SymptomLog[]>([]);
  const [allSymptoms, setAllSymptoms] = useState<SymptomLog[]>([]);
  const [recentPatterns, setRecentPatterns] = useState<SymptomPatternSummary[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayDoses, setTodayDoses] = useState<TodayDoseItem[]>([]);
  const [cycles, setCycles] = useState<MenstrualCycle[]>([]);
  const [cycleEstimates, setCycleEstimates] = useState<CycleEstimation | null>(null);
  const [todayActivity, setTodayActivity] = useState<ActivityLog | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [latestSleep, setLatestSleep] = useState<SleepLog | null>(null);
  const [recentMeasurements, setRecentMeasurements] = useState<HealthMeasurement[]>([]);
  const [labResults, setLabResults] = useState<LaboratoryResult[]>([]);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [activeUrgentAlert, setActiveUrgentAlert] = useState<UrgentSafetyAlert | null>(null);

  // Modals
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [quickMeasureModalVisible, setQuickMeasureModalVisible] = useState(false);
  const [measureType, setMeasureType] = useState<'blood_glucose' | 'blood_pressure'>('blood_glucose');
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');

  const [stepsModalVisible, setStepsModalVisible] = useState(false);
  const [stepInputVal, setStepInputVal] = useState('');

  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodFlow, setPeriodFlow] = useState<'spotting' | 'light' | 'medium' | 'heavy'>('medium');
  const [periodCramps, setPeriodCramps] = useState(3);

  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // Daily checkin form
  const [selectedMood, setSelectedMood] = useState<MoodType>('okay');
  const [energyRating, setEnergyRating] = useState(7);
  const [checkinNotes, setCheckinNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    try {
      const p = await storage.getProfile();
      const prefs = await storage.getPreferences();
      setProfile(p);
      setPreferences(prefs);

      // Check-in for today
      const chk = await storage.getDailyCheckin(todayStr);
      setTodayCheckin(chk);
      if (chk) {
        setSelectedMood(chk.mood);
        setEnergyRating(chk.energy_level);
        setCheckinNotes(chk.notes || '');
      }

      // Symptoms & patterns
      const syms = await storage.getSymptoms();
      setAllSymptoms(syms);
      const todaySyms = syms.filter((s) => s.occurred_at.startsWith(todayStr));
      setSymptomsToday(todaySyms);

      const allSleep = await storage.getSleepLogs();
      if (allSleep.length > 0) {
        setLatestSleep(allSleep[0]);
      }

      // Deterministic patterns
      const patterns = analyzeSymptomPatterns(syms, allSleep);
      setRecentPatterns(patterns);

      // Menstrual cycles
      const cycs = await storage.getMenstrualCycles();
      setCycles(cycs);
      const estimates = calculateCycleEstimates(cycs);
      setCycleEstimates(estimates);

      // Medications and today's dose logs
      const meds = await storage.getMedications();
      const activeMeds = meds.filter((m) => m.is_active);
      setMedications(activeMeds);

      const doseLogs = await storage.getDoseLogsForDate(todayStr);

      const doseItems: TodayDoseItem[] = [];
      activeMeds.forEach((m) => {
        (m.reminder_times || []).forEach((time) => {
          const scheduledAt = `${todayStr}T${time}`;
          const log = doseLogs.find(
            (d) => d.medication_id === m.id && d.scheduled_at === scheduledAt
          );
          doseItems.push({
            medicationId: m.id,
            medicationName: m.name,
            strength: m.strength,
            scheduledTime: time.slice(0, 5),
            scheduledAt,
            status: log ? log.status : 'pending',
            relationToMeals: m.relation_to_meals,
          });
        });
      });
      doseItems.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
      setTodayDoses(doseItems);

      // Activity logs
      const activities = await storage.getActivityLogs();
      const todayAct = activities.find((a) => a.log_date === todayStr);
      setTodayActivity(todayAct || null);
      if (todayAct) {
        setStepInputVal(String(todayAct.step_count));
      }

      // Appointments
      const apts = await storage.getAppointments();
      const upcoming = apts.filter((a) => a.status === 'scheduled');
      setUpcomingAppointments(upcoming.slice(0, 2));

      // Measurements
      const measurements = await storage.getMeasurements();
      setRecentMeasurements(measurements.slice(0, 4));

      // Laboratory results & Conditions
      const labs = await storage.getLaboratoryResults();
      const conds = await storage.getMedicalConditions();
      setLabResults(labs);
      setConditions(conds);

      // Check for urgent red-flag alerts in today's entries or measurements
      let urgent: UrgentSafetyAlert | null = null;
      for (const s of todaySyms) {
        const u = checkUrgentSafetyWarning(s.symptom_name + ' ' + (s.description || ''));
        if (u) {
          urgent = u;
          break;
        }
      }
      if (!urgent) {
        urgent = checkUrgentSafetyWarning('', measurements.slice(0, 2));
      }
      setActiveUrgentAlert(urgent);
    } catch (e) {
      console.error('Error loading home data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleSaveCheckin = async () => {
    await storage.saveDailyCheckin({
      checkin_date: todayStr,
      mood: selectedMood,
      energy_level: energyRating,
      stress_level: 5,
      pain_level: 2,
      wellbeing_score: selectedMood === 'great' ? 9 : selectedMood === 'okay' ? 7 : 4,
      notes: checkinNotes.trim() || undefined,
    });
    setCheckinModalVisible(false);
    loadDashboardData();
  };

  const handleSaveQuickMeasurement = async () => {
    if (!val1) return;
    const num1 = parseFloat(val1);
    if (isNaN(num1)) return;

    if (measureType === 'blood_glucose') {
      await storage.addMeasurement({
        measurement_type: 'blood_glucose',
        numeric_value: num1,
        unit: preferences?.blood_glucose_unit || 'mg/dL',
        recorded_at: new Date().toISOString(),
      });
    } else {
      const num2 = parseFloat(val2);
      await storage.addMeasurement({
        measurement_type: 'blood_pressure',
        numeric_value: num1,
        secondary_numeric_value: isNaN(num2) ? undefined : num2,
        unit: 'mmHg',
        recorded_at: new Date().toISOString(),
      });
    }

    setQuickMeasureModalVisible(false);
    setVal1('');
    setVal2('');
    loadDashboardData();
  };

  const handleSaveSteps = async () => {
    const count = parseInt(stepInputVal, 10);
    if (isNaN(count) || count < 0) {
      Alert.alert('Invalid Steps', 'Please enter a valid step count.');
      return;
    }
    await storage.addOrUpdateActivity({
      log_date: todayStr,
      step_count: count,
      source: 'manual',
    });
    setStepsModalVisible(false);
    loadDashboardData();
  };

  const handleSavePeriod = async () => {
    if (!periodStartDate) return;
    await storage.addMenstrualCycle({
      start_date: periodStartDate,
      flow_intensity: periodFlow,
      cramps_severity: periodCramps,
      is_irregular: false,
    });
    setPeriodModalVisible(false);
    loadDashboardData();
  };

  const handleTakeDoseQuick = async (medicationId: string, scheduledAt: string) => {
    await storage.recordDoseAction(medicationId, scheduledAt, 'taken');
    loadDashboardData();
  };

  const handleVoiceConfirm = async (parsed: any) => {
    const urgent = checkUrgentSafetyWarning(parsed.transcript);
    if (urgent) setActiveUrgentAlert(urgent);
    const result = await executeVoiceCommand(parsed);
    if (result.ok) loadDashboardData();
    return result;
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const latestBP = recentMeasurements.find((m) => m.measurement_type === 'blood_pressure');
  const latestGlucose = recentMeasurements.find((m) => m.measurement_type === 'blood_glucose');

  // Step calculations
  const targetSteps = 8000;
  const currentSteps = todayActivity ? todayActivity.step_count : 0;
  const stepProgressPercent = Math.min(100, Math.round((currentSteps / targetSteps) * 100));
  const remainingSteps = Math.max(0, targetSteps - currentSteps);

  // Medication dose stats
  const totalDosesToday = todayDoses.length;
  const completedDosesToday = todayDoses.filter((d) => d.status === 'taken').length;
  const pendingDoses = todayDoses.filter((d) => d.status === 'pending');

  const isMenstruationTracked =
    preferences?.menstrual_tracking_enabled !== false &&
    profile?.menstrual_status !== 'menopausal' &&
    profile?.menstrual_status !== 'not_menstruating';

  // Laboratory & HbA1c progression calculations
  const hba1cResults = labResults
    .filter((l) => l.test_name.toLowerCase().includes('hba1c'))
    .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  const latestHbA1c = hba1cResults.length > 0 ? hba1cResults[hba1cResults.length - 1] : null;

  const hba1cChartData = hba1cResults.map((l) => ({
    date: new Date(l.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: l.test_value,
  }));

  const otherLabResults = labResults.filter(
    (l) => !l.test_name.toLowerCase().includes('hba1c')
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.deepBurgundy}
          />
        }
      >
        {/* Urgent Warning Banner if triggered */}
        {activeUrgentAlert && (
          <UrgentAlertBanner
            alert={activeUrgentAlert}
            onDismiss={() => setActiveUrgentAlert(null)}
          />
        )}

        {/* Refined Header */}
        <View style={styles.topHeaderRow}>
          <AppLogo size={36} />
          <View style={[styles.dateBadge, { marginBottom: 0, flexShrink: 1, marginLeft: 8 }]}>
            <Sparkles size={11} color={Colors.deepBurgundy} />
            <Text style={styles.dateBadgeText} numberOfLines={1}>{formattedDate}</Text>
          </View>

          <View style={[styles.headerRightActions, { marginTop: 0, marginLeft: 'auto' }]}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/care')}
              accessibilityLabel="Open reminders and appointments"
            >
              <Bell size={18} color={Colors.lavenderSlate} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voiceMicBtn}
              activeOpacity={0.8}
              onPress={() => setVoiceModalVisible(true)}
            >
              <Mic size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingBlock}>
          <Text style={styles.greetingTitle}>
            {getGreetingTime()}, {profile?.display_name || 'Friend'}
          </Text>
          <Text style={styles.headerSubtext}>Welcome to your private wellness space</Text>
        </View>

        {/* Floral Hero Section */}
        <FloralHeroCard
          greeting="Your health, your rhythm"
          name=""
          dateStr="Today's Wellness Rhythm"
          wellnessQuote="A sanctuary designed to understand your body, record patterns, and care for yourself with gentle clarity."
          onExplorePress={() => setCheckinModalVisible(true)}
        />

        {/* Today's Daily Check-in Card (Glass Variant) */}
        <Card style={styles.checkinCard} variant="glass">
          <View style={styles.checkinHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkinPrompt}>How does your body feel today?</Text>
              <Text style={styles.checkinSubtitle}>
                {todayCheckin
                  ? `Logged as "${todayCheckin.mood.replace(/_/g, ' ')}" • Energy ${todayCheckin.energy_level}/10`
                  : 'Take 10 seconds to record your mood, energy, and comfort.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setCheckinModalVisible(true)}
              style={styles.checkinActionBtn}
            >
              <Text style={styles.checkinActionText}>
                {todayCheckin ? 'Update' : 'Check In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Mood Row */}
          <View style={styles.moodRow}>
            {[
              { key: 'great', label: 'Great', icon: Smile, color: Colors.deepBurgundy },
              { key: 'okay', label: 'Balanced', icon: Meh, color: Colors.lavenderSlate },
              { key: 'tired', label: 'Tired', icon: Battery, color: Colors.dustyBlue },
              { key: 'uncomfortable', label: 'Cramps', icon: Frown, color: Colors.blossomRose },
              { key: 'not_feeling_well', label: 'Unwell', icon: AlertCircle, color: Colors.deepBurgundy },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = (todayCheckin?.mood || selectedMood) === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={async () => {
                    setSelectedMood(m.key as MoodType);
                    await storage.saveDailyCheckin({
                      checkin_date: todayStr,
                      mood: m.key as MoodType,
                      energy_level: m.key === 'great' ? 9 : m.key === 'okay' ? 7 : 4,
                      stress_level: 4,
                      pain_level: m.key === 'uncomfortable' ? 5 : 1,
                      wellbeing_score: m.key === 'great' ? 9 : 6,
                    });
                    loadDashboardData();
                  }}
                  style={[styles.moodItem, isSelected && styles.moodItemSelected]}
                >
                  <Icon size={20} color={isSelected ? Colors.white : Colors.lavenderSlate} />
                  <Text
                    style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* SECTION C: MENSTRUAL HEALTH SUMMARY */}
        {isMenstruationTracked && (
          <Card style={styles.cycleSummaryCard} variant="rose">
            <View style={styles.cycleSummaryHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.cycleIconCircle}>
                  <Heart size={18} color={Colors.deepBurgundy} />
                </View>
                <View>
                  <Text style={styles.cycleCardTitle}>Menstrual Rhythm</Text>
                  <Text style={styles.cycleCardSub}>
                    {cycles.length > 0
                      ? `${cycleEstimates?.currentPhase ? cycleEstimates.currentPhase.charAt(0).toUpperCase() + cycleEstimates.currentPhase.slice(1) + ' Phase' : 'Cycle tracking'}`
                      : 'No cycle logged yet'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setPeriodModalVisible(true)}
                style={styles.cycleLogBtn}
              >
                <Plus size={13} color={Colors.deepBurgundy} />
                <Text style={styles.cycleLogBtnText}>Log Period</Text>
              </TouchableOpacity>
            </View>

            {cycles.length > 0 ? (
              <View style={styles.cycleMetricsRow}>
                <View style={styles.cycleMetricBox}>
                  <Text style={styles.cycleMetricLabel}>Estimated Next Period</Text>
                  <Text style={styles.cycleMetricVal}>
                    {cycleEstimates?.estimatedNextPeriodDate
                      ? new Date(cycleEstimates.estimatedNextPeriodDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Calculating...'}
                  </Text>
                  <Text style={styles.cycleMetricHint}>* Mathematical estimate</Text>
                </View>

                <View style={styles.cycleMetricDivider} />

                <View style={styles.cycleMetricBox}>
                  <Text style={styles.cycleMetricLabel}>Avg Cycle Length</Text>
                  <Text style={styles.cycleMetricVal}>
                    {cycleEstimates?.averageCycleLengthDays || 28} days
                  </Text>
                  <Text style={styles.cycleMetricHint}>Based on records</Text>
                </View>

                <View style={styles.cycleMetricDivider} />

                <TouchableOpacity
                  onPress={() => setCalendarModalVisible(true)}
                  style={styles.openCalendarBtn}
                >
                  <CalendarDays size={18} color={Colors.deepBurgundy} />
                  <Text style={styles.openCalendarBtnText}>Open Calendar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cycleEmptyBox}>
                <Text style={styles.cycleEmptyText}>
                  Your cycle predictions, phase windows, and calendar estimates will appear here once you record your first period.
                </Text>
                <Button
                  title="Log Recent Period"
                  size="small"
                  variant="primary"
                  onPress={() => setPeriodModalVisible(true)}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              </View>
            )}
          </Card>
        )}

        {/* SECTION D: TODAY'S MEDICATION SUMMARY */}
        <Card style={styles.medSummaryCard} variant="lavender">
          <View style={styles.medSummaryHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.medIconCircle}>
                <Pill size={18} color={Colors.deepBurgundy} />
              </View>
              <View>
                <Text style={styles.medCardTitle}>Today&apos;s Prescriptions</Text>
                <Text style={styles.medCardSub}>
                  {totalDosesToday > 0
                    ? `${completedDosesToday} of ${totalDosesToday} doses completed`
                    : `${medications.length} active prescriptions`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/care')}
              style={styles.medManageBtn}
            >
              <Text style={styles.medManageBtnText}>Manage Care ›</Text>
            </TouchableOpacity>
          </View>

          {totalDosesToday > 0 ? (
            <View style={{ marginTop: 10 }}>
              {/* Progress bar */}
              <View style={styles.medProgressBarBg}>
                <View
                  style={[
                    styles.medProgressBarFill,
                    {
                      width: `${totalDosesToday > 0 ? (completedDosesToday / totalDosesToday) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>

              {/* Next dose action */}
              {pendingDoses.length > 0 ? (
                <View style={styles.nextDoseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextDoseLabel}>Next scheduled dose:</Text>
                    <Text style={styles.nextDoseName}>
                      {pendingDoses[0].medicationName} {pendingDoses[0].strength ? `• ${pendingDoses[0].strength}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={12} color={Colors.deepBurgundy} />
                      <Text style={styles.nextDoseTime}>{pendingDoses[0].scheduledTime}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleTakeDoseQuick(pendingDoses[0].medicationId, pendingDoses[0].scheduledAt)}
                    style={styles.takeDoseBtn}
                  >
                    <CheckCircle2 size={14} color={Colors.white} />
                    <Text style={styles.takeDoseBtnText}>Take Dose</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.allDosesDoneRow}>
                  <CheckCircle2 size={16} color={Colors.deepBurgundy} />
                  <Text style={styles.allDosesDoneText}>All doses scheduled for today are complete.</Text>
                </View>
              )}
            </View>
          ) : medications.length > 0 ? (
            <View style={styles.medEmptyRow}>
              <Text style={styles.medEmptyText}>
                No reminder times configured for today. Open Care to review your medication schedule.
              </Text>
            </View>
          ) : (
            <View style={styles.medEmptyRow}>
              <Text style={styles.medEmptyText}>
                No active medications recorded. Add your prescriptions and reminders in Care.
              </Text>
              <Button
                title="+ Add Medication"
                size="small"
                variant="outline"
                onPress={() => router.push('/(tabs)/care')}
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
              />
            </View>
          )}
        </Card>

        {/* Movement & Rhythm Tracker Card (REAL DATA ONLY) */}
        <Card style={styles.movementCard} variant="elevated">
          <View style={styles.movementHeader}>
            <View style={styles.movementTitleRow}>
              <View style={styles.movementIconCircle}>
                <Footprints size={18} color={Colors.deepBurgundy} />
              </View>
              <View>
                <Text style={styles.movementTitle}>Daily Movement</Text>
                <Text style={styles.movementSub}>Step goal & vitality</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setStepsModalVisible(true)}
              style={styles.logStepsBtn}
            >
              <Plus size={12} color={Colors.deepBurgundy} />
              <Text style={styles.logStepsBtnText}>{todayActivity ? 'Update Steps' : 'Log Steps'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.movementBody}>
            <View style={styles.movementMetrics}>
              <Text style={styles.stepCount}>
                {currentSteps > 0 ? currentSteps.toLocaleString() : '0'}
              </Text>
              <Text style={styles.stepTarget}>
                of {targetSteps.toLocaleString()} daily steps {currentSteps === 0 ? '• Not logged today' : ''}
              </Text>
              <View style={styles.stepProgressBarBg}>
                <View style={[styles.stepProgressBarFill, { width: `${stepProgressPercent}%` }]} />
              </View>
            </View>

            <View style={styles.movementRightSummary}>
              <Text style={styles.remainingSteps}>
                {remainingSteps > 0 ? remainingSteps.toLocaleString() : 'Goal reached!'}
              </Text>
              <Text style={styles.remainingLabel}>
                {remainingSteps > 0 ? 'steps to goal' : 'Well done'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Health Actions Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            onPress={() => router.push('/chat')}
            accessibilityRole="button"
            accessibilityLabel="Open health assistant chat"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: Colors.deepBurgundy, fontWeight: '600', fontSize: 14 }}>
              Ask assistant ›
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionTile}
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/log')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.paleRoseWhite }]}>
              <PlusCircle size={22} color={Colors.deepBurgundy} />
            </View>
            <Text style={styles.actionTileTitle}>Log Symptom</Text>
            <Text style={styles.actionTileSub}>Headache, cramps, mood</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            activeOpacity={0.75}
            onPress={() => {
              setMeasureType('blood_glucose');
              setQuickMeasureModalVisible(true);
            }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.softLavender }]}>
              <Activity size={22} color={Colors.lavenderSlate} />
            </View>
            <Text style={styles.actionTileTitle}>Blood Glucose</Text>
            <Text style={styles.actionTileSub}>Fasting / post-meal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            activeOpacity={0.75}
            onPress={() => {
              setMeasureType('blood_pressure');
              setQuickMeasureModalVisible(true);
            }}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.paleRoseWhite }]}>
              <Heart size={22} color={Colors.blossomRose} />
            </View>
            <Text style={styles.actionTileTitle}>Blood Pressure</Text>
            <Text style={styles.actionTileSub}>Systolic / diastolic</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/reports')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: Colors.softLavender }]}>
              <FilePlus size={22} color={Colors.dustyBlue} />
            </View>
            <Text style={styles.actionTileTitle}>Add Report</Text>
            <Text style={styles.actionTileSub}>Lab tests & OCR</Text>
          </TouchableOpacity>
        </View>

        {/* Health Overview Cards (REAL SAVED DATA ONLY) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/log')}>
            <Text style={styles.linkText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.overviewGrid}>
          {/* BP Card */}
          <TouchableOpacity
            style={styles.overviewGridItem}
            activeOpacity={0.8}
            onPress={() => {
              setMeasureType('blood_pressure');
              setQuickMeasureModalVisible(true);
            }}
          >
            <Card style={styles.healthMiniCard} variant="lavender">
              <View style={styles.miniCardHeader}>
                <Heart size={16} color={Colors.deepBurgundy} />
                <Text style={styles.miniCardCategory}>Blood Pressure</Text>
              </View>
              <Text style={styles.miniCardValue}>
                {latestBP
                  ? `${latestBP.numeric_value}/${latestBP.secondary_numeric_value || 80}`
                  : '—'}
              </Text>
              <Text style={styles.miniCardSub}>
                {latestBP ? 'mmHg • Logged' : 'Tap to record BP'}
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Blood Glucose Card */}
          <TouchableOpacity
            style={styles.overviewGridItem}
            activeOpacity={0.8}
            onPress={() => {
              setMeasureType('blood_glucose');
              setQuickMeasureModalVisible(true);
            }}
          >
            <Card style={styles.healthMiniCard} variant="rose">
              <View style={styles.miniCardHeader}>
                <Activity size={16} color={Colors.deepBurgundy} />
                <Text style={styles.miniCardCategory}>Blood Glucose</Text>
              </View>
              <Text style={styles.miniCardValue}>
                {latestGlucose ? `${latestGlucose.numeric_value}` : '—'}
              </Text>
              <Text style={styles.miniCardSub}>
                {latestGlucose
                  ? `${preferences?.blood_glucose_unit || 'mg/dL'} • Fasting`
                  : 'Tap to record glucose'}
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Medication Card */}
          <TouchableOpacity
            style={styles.overviewGridItem}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/care')}
          >
            <Card style={styles.healthMiniCard} variant="dusty">
              <View style={styles.miniCardHeader}>
                <Pill size={16} color={Colors.lavenderSlate} />
                <Text style={styles.miniCardCategory}>Medications</Text>
              </View>
              <Text style={styles.miniCardValue}>
                {medications.length} Active
              </Text>
              <Text style={styles.miniCardSub}>
                {medications.length > 0 ? medications[0].name : 'No active prescriptions'}
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Sleep Card */}
          <TouchableOpacity
            style={styles.overviewGridItem}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/log')}
          >
            <Card style={styles.healthMiniCard} variant="elevated">
              <View style={styles.miniCardHeader}>
                <Moon size={16} color={Colors.dustyBlue} />
                <Text style={styles.miniCardCategory}>Rest & Sleep</Text>
              </View>
              <Text style={styles.miniCardValue}>
                {latestSleep ? `${(latestSleep.total_minutes / 60).toFixed(1)}h` : '—'}
              </Text>
              <Text style={styles.miniCardSub}>
                {latestSleep ? 'Restorative sleep' : 'Tap to log rest'}
              </Text>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Clinical Lab Trends & HbA1c Progression Card */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Activity size={16} color={Colors.deepBurgundy} />
            <Text style={styles.sectionTitle}>Lab Trends & Biomarkers</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/reports')}>
            <Text style={styles.linkText}>Reports Vault →</Text>
          </TouchableOpacity>
        </View>

        {labResults.length > 0 ? (
          <Card style={styles.movementCard} variant="elevated">
            {latestHbA1c && (
              <View style={{ marginBottom: hba1cResults.length >= 2 ? 10 : 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.lavenderSlate, fontFamily: Typography.heading }}>
                      HbA1c (Glycated Hemoglobin)
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.mutedText }}>
                      Latest: {latestHbA1c.test_date} • Ref: {latestHbA1c.reference_interval_text || '4.0 - 5.6 %'}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: latestHbA1c.is_outside_lab_range ? 'rgba(128, 0, 32, 0.1)' : 'rgba(74, 93, 110, 0.1)',
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: latestHbA1c.is_outside_lab_range ? Colors.deepBurgundy : Colors.lavenderSlate,
                      }}
                    >
                      {latestHbA1c.test_value} {latestHbA1c.unit}
                    </Text>
                  </View>
                </View>

                {hba1cResults.length >= 2 ? (
                  <HealthChart
                    data={hba1cChartData}
                    title="HbA1c Progression Over Time"
                    unit="%"
                    referenceLineMax={5.6}
                    referenceLabel="Upper Standard (5.6%)"
                    primaryColor={Colors.deepBurgundy}
                    secondaryColor={Colors.blossomRose}
                    height={150}
                  />
                ) : (
                  <View style={{ backgroundColor: Colors.warmPorcelain, padding: 8, borderRadius: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: Colors.mutedText, lineHeight: 15 }}>
                      ✓ 1 verified clinical result recorded. Upload your next quarterly report to track your longitudinal HbA1c progression trend.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Other Lab Biomarkers */}
            {otherLabResults.length > 0 && (
              <View
                style={{
                  marginTop: latestHbA1c ? 8 : 0,
                  paddingTop: latestHbA1c ? 8 : 0,
                  borderTopWidth: latestHbA1c ? 1 : 0,
                  borderTopColor: Colors.fineBorder,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.lavenderSlate, marginBottom: 6 }}>
                  Recent Biomarker Results
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {otherLabResults.slice(0, 3).map((lr) => (
                    <View
                      key={lr.id}
                      style={{
                        backgroundColor: Colors.warmPorcelain,
                        paddingVertical: 5,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: Colors.fineBorder,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: Colors.mutedText }}>{lr.test_name}</Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: lr.is_outside_lab_range ? Colors.deepBurgundy : Colors.lavenderSlate,
                        }}
                      >
                        {lr.test_value} {lr.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        ) : (
          <Card style={styles.emptyPatternCard} variant="glass">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FilePlus size={16} color={Colors.deepBurgundy} />
              <Text style={styles.emptyAppointmentTitle}>Clinical Lab Vault & Trends</Text>
            </View>
            <Text style={styles.emptyPatternText}>
              No laboratory readings recorded yet. Upload your blood tests, HbA1c, or diagnostic reports to see automatic trend visualizations.
            </Text>
            <Button
              title="Scan or Upload Lab Report"
              size="small"
              variant="outline"
              onPress={() => router.push('/(tabs)/reports')}
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
            />
          </Card>
        )}

        {/* Evidence-Based Recurring Patterns */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.patternHeaderRow}>
            <Sparkles size={16} color={Colors.deepBurgundy} />
            <Text style={styles.sectionTitle}>Recurring Health Patterns</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/consultation-summary')}>
            <Text style={styles.linkText}>Doctor Summary →</Text>
          </TouchableOpacity>
        </View>

        {recentPatterns.length > 0 ? (
          recentPatterns.slice(0, 2).map((pat, idx) => (
            <Card key={idx} style={styles.patternCard} variant="glass">
              <View style={styles.patternHeader}>
                <Text style={styles.patternSymptomName}>{pat.symptomName}</Text>
                <View style={styles.patternBadge}>
                  <Text style={styles.patternBadgeText}>
                    {pat.last30DaysCount} entries this month
                  </Text>
                </View>
              </View>
              <Text style={styles.patternNote}>{pat.explanatoryNote}</Text>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyPatternCard} variant="glass">
            <Text style={styles.emptyPatternText}>
              No recurring patterns detected yet. As you log your everyday symptoms and sleep, HerHealth transparently identifies recurring frequencies for your doctor consultations.
            </Text>
          </Card>
        )}

        {/* Upcoming Appointments Card */}
        {upcomingAppointments.length > 0 ? (
          <Card style={styles.appointmentCard} variant="elevated">
            <View style={styles.appointmentHeader}>
              <Calendar size={18} color={Colors.deepBurgundy} />
              <Text style={styles.appointmentTitle}>Upcoming Consultation</Text>
            </View>
            <Text style={styles.doctorName}>
              {upcomingAppointments[0].clinician_or_clinic_name}
            </Text>
            <Text style={styles.appointmentDate}>
              {new Date(upcomingAppointments[0].appointment_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Button
              title="Prepare Doctor Summary"
              onPress={() => router.push('/consultation-summary')}
              variant="secondary"
              size="small"
              style={{ marginTop: 10 }}
            />
          </Card>
        ) : (
          <Card style={styles.emptyAppointmentCard} variant="glass">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Calendar size={16} color={Colors.deepBurgundy} />
              <Text style={styles.emptyAppointmentTitle}>Upcoming Consultations</Text>
            </View>
            <Text style={styles.emptyAppointmentText}>
              No upcoming appointments recorded. Track your clinical consultations, dates, and doctor questions in Care.
            </Text>
            <Button
              title="Schedule Consultation"
              size="small"
              variant="outline"
              onPress={() => router.push('/(tabs)/care')}
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
            />
          </Card>
        )}
      </ScrollView>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onConfirmParsedResult={handleVoiceConfirm}
      />

      {/* Daily Check-in Modal */}
      <Modal visible={checkinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Daily Health Check-in</Text>
            <Text style={styles.modalSub}>Record your current state for {formattedDate}</Text>

            <Text style={styles.inputLabelModal}>Select Mood</Text>
            <View style={styles.modalMoodRow}>
              {(['great', 'okay', 'tired', 'uncomfortable', 'not_feeling_well'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSelectedMood(m)}
                  style={[styles.modalMoodChip, selectedMood === m && styles.modalMoodChipActive]}
                >
                  <Text style={[styles.modalMoodChipText, selectedMood === m && styles.modalMoodChipTextActive]}>
                    {m.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabelModal}>Energy Level (1 - 10): {energyRating}/10</Text>
            <View style={styles.energyRow}>
              {[2, 4, 6, 8, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setEnergyRating(num)}
                  style={[styles.energyBtn, energyRating === num && styles.energyBtnActive]}
                >
                  <Text style={[styles.energyBtnText, energyRating === num && styles.energyBtnTextActive]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabelModal}>Optional Notes</Text>
            <TextInput
              style={styles.modalNotesInput}
              multiline
              placeholder="Any details on stress, meals, or feelings..."
              placeholderTextColor={Colors.mutedText}
              value={checkinNotes}
              onChangeText={setCheckinNotes}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setCheckinModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Check-in"
                onPress={handleSaveCheckin}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Measurement Modal */}
      <Modal visible={quickMeasureModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {measureType === 'blood_glucose' ? 'Record Blood Glucose' : 'Record Blood Pressure'}
            </Text>

            {measureType === 'blood_glucose' ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabelModal}>Reading ({preferences?.blood_glucose_unit || 'mg/dL'})</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 105"
                  placeholderTextColor={Colors.mutedText}
                  keyboardType="numeric"
                  value={val1}
                  onChangeText={setVal1}
                />
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabelModal}>Systolic (Top number, mmHg)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 120"
                  placeholderTextColor={Colors.mutedText}
                  keyboardType="numeric"
                  value={val1}
                  onChangeText={setVal1}
                />
                <Text style={[styles.inputLabelModal, { marginTop: 8 }]}>Diastolic (Bottom number, mmHg)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 80"
                  placeholderTextColor={Colors.mutedText}
                  keyboardType="numeric"
                  value={val2}
                  onChangeText={setVal2}
                />
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setQuickMeasureModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Reading"
                onPress={handleSaveQuickMeasurement}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Steps Modal */}
      <Modal visible={stepsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Record Daily Movement</Text>
            <Text style={styles.modalSub}>Enter total steps walked for today ({formattedDate})</Text>

            <Text style={styles.inputLabelModal}>Step Count</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 6500"
              placeholderTextColor={Colors.mutedText}
              keyboardType="numeric"
              value={stepInputVal}
              onChangeText={setStepInputVal}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setStepsModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Steps"
                onPress={handleSaveSteps}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Period Log Modal */}
      <Modal visible={periodModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log Menstrual Cycle</Text>
            <Text style={styles.modalSub}>Record the start of your period for cycle predictions</Text>

            <Text style={styles.inputLabelModal}>First Day of Period (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.mutedText}
              value={periodStartDate}
              onChangeText={setPeriodStartDate}
            />

            <Text style={styles.inputLabelModal}>Flow Intensity</Text>
            <View style={styles.modalMoodRow}>
              {(['spotting', 'light', 'medium', 'heavy'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setPeriodFlow(f)}
                  style={[styles.modalMoodChip, periodFlow === f && styles.modalMoodChipActive]}
                >
                  <Text style={[styles.modalMoodChipText, periodFlow === f && styles.modalMoodChipTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabelModal}>Cramps Severity (0-10): {periodCramps}/10</Text>
            <View style={styles.energyRow}>
              {[0, 2, 4, 6, 8, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setPeriodCramps(num)}
                  style={[styles.energyBtn, periodCramps === num && styles.energyBtnActive]}
                >
                  <Text style={[styles.energyBtnText, periodCramps === num && styles.energyBtnTextActive]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setPeriodModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Period"
                onPress={handleSavePeriod}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Menstrual Calendar Modal */}
      <Modal visible={calendarModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.warmPorcelain }}>
          <View style={styles.calendarModalHeader}>
            <Text style={styles.calendarModalTitle}>Menstrual Calendar</Text>
            <TouchableOpacity
              onPress={() => setCalendarModalVisible(false)}
              style={styles.calendarCloseBtn}
            >
              <Text style={styles.calendarCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <MenstrualCalendar
              cycles={cycles}
              symptoms={allSymptoms}
              estimatedNextPeriodDate={cycleEstimates?.estimatedNextPeriodDate}
              averageCycleLength={cycleEstimates?.averageCycleLengthDays || 28}
              averagePeriodDuration={cycleEstimates?.averagePeriodDurationDays || 5}
              onAddCycle={async (c) => {
                await storage.addMenstrualCycle(c);
                loadDashboardData();
              }}
              onDeleteCycle={async (id) => {
                await storage.deleteMenstrualCycle(id);
                loadDashboardData();
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  greetingBlock: {
    marginBottom: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.deepBurgundy,
    letterSpacing: 0.3,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  headerSubtext: {
    fontSize: 13,
    color: Colors.mutedText,
    fontFamily: Typography.body,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  voiceMicBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.deepBurgundy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  checkinCard: {
    padding: 16,
    marginVertical: 8,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkinPrompt: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  checkinSubtitle: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 2,
    fontFamily: Typography.body,
  },
  checkinActionBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.blossomRose,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  checkinActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  moodItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 16,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    flex: 1,
    minWidth: 0,
    marginHorizontal: 3,
  },
  moodItemSelected: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  moodLabel: {
    fontSize: 10,
    textAlign: 'center',
    alignSelf: 'stretch',
    color: Colors.mutedText,
    marginTop: 4,
    fontWeight: '500',
  },
  moodLabelSelected: {
    color: Colors.white,
    fontWeight: '700',
  },

  // Cycle summary card styles
  cycleSummaryCard: {
    padding: 16,
    marginVertical: 8,
  },
  cycleSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cycleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paleRoseWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
  },
  cycleCardSub: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  cycleLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.blossomRose,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  cycleLogBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  cycleMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  cycleMetricBox: {
    flex: 1,
  },
  cycleMetricLabel: {
    fontSize: 10,
    color: Colors.mutedText,
    fontWeight: '600',
  },
  cycleMetricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.deepBurgundy,
    fontFamily: Typography.numeric,
    marginTop: 2,
  },
  cycleMetricHint: {
    fontSize: 9,
    color: Colors.mutedText,
    marginTop: 1,
  },
  cycleMetricDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.fineBorder,
    marginHorizontal: 8,
  },
  openCalendarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  openCalendarBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    marginTop: 3,
  },
  cycleEmptyBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  cycleEmptyText: {
    fontSize: 12,
    color: Colors.mutedText,
    lineHeight: 18,
  },

  // Medication summary card styles
  medSummaryCard: {
    padding: 16,
    marginVertical: 8,
  },
  medSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  medCardSub: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  medManageBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  medManageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  medProgressBarBg: {
    height: 6,
    backgroundColor: Colors.white,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 10,
  },
  medProgressBarFill: {
    height: '100%',
    backgroundColor: Colors.deepBurgundy,
    borderRadius: 3,
  },
  nextDoseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  nextDoseLabel: {
    fontSize: 10,
    color: Colors.mutedText,
    fontWeight: '600',
  },
  nextDoseName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginTop: 1,
  },
  nextDoseTime: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  takeDoseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.deepBurgundy,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  takeDoseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  allDosesDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  allDosesDoneText: {
    fontSize: 12,
    color: Colors.deepBurgundy,
    fontWeight: '600',
  },
  medEmptyRow: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  medEmptyText: {
    fontSize: 12,
    color: Colors.mutedText,
    lineHeight: 17,
  },

  // Movement Card
  movementCard: {
    padding: 16,
    marginVertical: 8,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  movementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  movementIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paleRoseWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  movementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  movementSub: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  logStepsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  logStepsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  movementBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementMetrics: {
    flex: 1,
    marginRight: 16,
  },
  stepCount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.lavenderSlate,
    fontFamily: Typography.numeric,
  },
  stepTarget: {
    fontSize: 11,
    color: Colors.mutedText,
    marginBottom: 6,
  },
  stepProgressBarBg: {
    height: 7,
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stepProgressBarFill: {
    height: '100%',
    backgroundColor: Colors.deepBurgundy,
    borderRadius: 4,
  },
  movementRightSummary: {
    alignItems: 'flex-end',
  },
  remainingSteps: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.blossomRose,
  },
  remainingLabel: {
    fontSize: 11,
    color: Colors.mutedText,
  },

  // Actions
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 2,
    fontFamily: Typography.heading,
  },
  actionTileSub: {
    fontSize: 11,
    color: Colors.mutedText,
  },

  // Overview
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewGridItem: {
    width: '48%',
  },
  healthMiniCard: {
    width: '100%',
    padding: 14,
    marginVertical: 0,
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  miniCardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  miniCardValue: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.lavenderSlate,
    fontFamily: Typography.numeric,
    marginBottom: 2,
  },
  miniCardSub: {
    fontSize: 10,
    color: Colors.mutedText,
  },

  // Patterns
  patternHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patternCard: {
    padding: 14,
    marginBottom: 10,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patternSymptomName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
  },
  patternBadge: {
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  patternBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  patternNote: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    lineHeight: 17,
  },
  emptyPatternCard: {
    padding: 16,
    marginBottom: 10,
  },
  emptyPatternText: {
    fontSize: 12,
    color: Colors.mutedText,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Appointments
  appointmentCard: {
    padding: 16,
    marginTop: 6,
    borderLeftWidth: 4,
    borderLeftColor: Colors.deepBurgundy,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  appointmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  emptyAppointmentCard: {
    padding: 16,
    marginTop: 6,
  },
  emptyAppointmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
  },
  emptyAppointmentText: {
    fontSize: 12,
    color: Colors.mutedText,
    lineHeight: 17,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(84, 87, 116, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.mutedText,
    marginBottom: 14,
  },
  inputLabelModal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 8,
  },
  modalMoodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modalMoodChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  modalMoodChipActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  modalMoodChipText: {
    fontSize: 12,
    color: Colors.mutedText,
    textTransform: 'capitalize',
  },
  modalMoodChipTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  energyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  energyBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
  },
  energyBtnActive: {
    backgroundColor: Colors.softLavender,
    borderColor: Colors.blossomRose,
  },
  energyBtnText: {
    fontSize: 13,
    color: Colors.lavenderSlate,
  },
  energyBtnTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  modalNotesInput: {
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    minHeight: 70,
    fontSize: 13,
    color: Colors.lavenderSlate,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalInput: {
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    fontSize: 14,
    color: Colors.lavenderSlate,
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.fineBorder,
    backgroundColor: Colors.white,
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
  },
  calendarCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.paleRoseWhite,
  },
  calendarCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
});
