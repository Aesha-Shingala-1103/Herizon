import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  ArrowLeft,
  Heart,
  Shield,
  Activity,
  Pill,
  Sparkles,
  Calendar,
  Lock,
  Plus,
  Trash2,
  Check,
  User,
  Stethoscope,
  Moon,
  Droplets,
  Bell,
  CheckCircle2,
  Edit2,
  RotateCcw,
} from 'lucide-react-native';
import Colors from '../src/theme/colors';
import Typography from '../src/theme/typography';
import Card from '../src/components/Card';
import Button from '../src/components/Button';
import AppLogo from '../src/components/AppLogo';
import { notifyProfileChanged } from '../src/services/authSession';
import { storage } from '../src/services/storageService';
import { securityService } from '../src/services/securityService';
import { notificationService } from '../src/services/notificationService';
import { HealthcareProvider, Medication } from '../src/types';

interface TempMedication {
  name: string;
  strength: string;
  form: string;
  dosage_instructions: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'as_needed' | 'weekly';
  reminder_times: string[];
  relation_to_meals: 'before_meal' | 'after_meal' | 'with_meal' | 'no_relation';
  prescribing_clinician: string;
  reminder_enabled: boolean;
}

interface TempProvider {
  doctor_name: string;
  specialty: string;
  clinic_or_hospital_name: string;
  phone_number: string;
  upcoming_date?: string;
  reason?: string;
  notes?: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 9;

  // STEP 1: Basic Profile (Section A)
  const [displayName, setDisplayName] = useState('');
  const [dobYear, setDobYear] = useState('1998');
  const [dobMonth, setDobMonth] = useState('06');
  const [dobDay, setDobDay] = useState('15');
  const [genderCarePref, setGenderCarePref] = useState('Cisgender Woman');
  const [height, setHeight] = useState('162');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft_in'>('cm');
  const [weight, setWeight] = useState('58');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [countryRegion, setCountryRegion] = useState('India');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');

  // STEP 2: Menstrual Health (Section B)
  const [currentlyMenstruates, setCurrentlyMenstruates] = useState<'yes' | 'no'>('yes');
  const [nonMenstruatingReason, setNonMenstruatingReason] = useState<
    'pregnant' | 'postpartum' | 'menopausal' | 'contraception' | 'not_menstruating' | 'prefer_not_to_say'
  >('not_menstruating');
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [periodDuration, setPeriodDuration] = useState('5');
  const [cycleLength, setCycleLength] = useState('28');
  const [regularity, setRegularity] = useState<'regular' | 'irregular' | 'unknown'>('regular');
  const [menstrualSymptoms, setMenstrualSymptoms] = useState<string[]>(['cramps', 'bloating']);
  const [crampsSeverity, setCrampsSeverity] = useState(4);
  const [enableCyclePredictions, setEnableCyclePredictions] = useState(true);

  // STEP 3: General Health History (Section C)
  const [previousSurgeries, setPreviousSurgeries] = useState('');
  const [hasAllergies, setHasAllergies] = useState(false);
  const [allergenName, setAllergenName] = useState('');
  const [allergyType, setAllergyType] = useState<'medication' | 'food' | 'environmental' | 'other'>('medication');
  const [allergyReaction, setAllergyReaction] = useState('');
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [generalHealthNotes, setGeneralHealthNotes] = useState('');

  // STEP 4: Doctor & Healthcare Providers (Section D)
  const [providers, setProviders] = useState<TempProvider[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocClinic, setNewDocClinic] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocUpcoming, setNewDocUpcoming] = useState('');
  const [newDocReason, setNewDocReason] = useState('');

  // STEP 5: Medical Conditions (Section E)
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [conditionNotes, setConditionNotes] = useState<Record<string, string>>({});

  // STEP 6: Medication Profile (Section F)
  const [takesMedications, setTakesMedications] = useState<'yes' | 'no'>('no');
  const [medicationsList, setMedicationsList] = useState<TempMedication[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedStrength, setNewMedStrength] = useState('');
  const [newMedForm, setNewMedForm] = useState('Tablet');
  const [newMedInstructions, setNewMedInstructions] = useState('1 tablet daily');
  const [newMedFrequency, setNewMedFrequency] = useState<'daily' | 'twice_daily' | 'three_times_daily' | 'as_needed' | 'weekly'>('daily');
  const [newMedTimes, setNewMedTimes] = useState<string[]>(['08:00:00']);
  const [newMedMeal, setNewMedMeal] = useState<'before_meal' | 'after_meal' | 'with_meal' | 'no_relation'>('after_meal');

  // STEP 7: Lifestyle & Wellness (Section G)
  const [sleepHours, setSleepHours] = useState('7.5');
  const [sleepQuality, setSleepQuality] = useState(4);
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('moderately_active');
  const [hydrationGoalGlasses, setHydrationGoalGlasses] = useState('8');
  const [dietaryPreference, setDietaryPreference] = useState('Vegetarian');
  const [stressLevel, setStressLevel] = useState(4);
  const [wellnessGoals, setWellnessGoals] = useState<string[]>(['cycle_harmony', 'better_sleep', 'daily_hydration']);

  // STEP 8: Privacy & Feature Customization (Section H)
  const [enabledFeatures, setEnabledFeatures] = useState({
    menstrual_tracking: true,
    medication_reminders: true,
    symptom_journal: true,
    vitals_logging: true,
    hydration_tracking: true,
    appointment_reminders: true,
  });
  const [enablePin, setEnablePin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [aiDoctorSummaryConsent, setAiDoctorSummaryConsent] = useState(true);

  // Resume draft on mount
  useEffect(() => {
    (async () => {
      try {
        const draft = await storage.getOnboardingDraft();
        if (draft) {
          if (draft.displayName) setDisplayName(draft.displayName);
          if (draft.dobYear) setDobYear(draft.dobYear);
          if (draft.dobMonth) setDobMonth(draft.dobMonth);
          if (draft.dobDay) setDobDay(draft.dobDay);
          if (draft.genderCarePref) setGenderCarePref(draft.genderCarePref);
          if (draft.height) setHeight(draft.height);
          if (draft.weight) setWeight(draft.weight);
          if (draft.currentlyMenstruates) setCurrentlyMenstruates(draft.currentlyMenstruates);
          if (draft.lastPeriodDate) setLastPeriodDate(draft.lastPeriodDate);
          if (draft.cycleLength) setCycleLength(draft.cycleLength);
          if (draft.periodDuration) setPeriodDuration(draft.periodDuration);
          if (draft.providers) setProviders(draft.providers);
          if (draft.selectedConditions) setSelectedConditions(draft.selectedConditions);
          if (draft.medicationsList) setMedicationsList(draft.medicationsList);
          if (draft.takesMedications) setTakesMedications(draft.takesMedications);
          if (draft.currentStep && draft.currentStep < totalSteps) setCurrentStep(draft.currentStep);
        }
      } catch (e) {
        console.warn('Error reading onboarding draft:', e);
      }
    })();
  }, []);

  // Compute age dynamically from DOB
  const calculatedAge = useMemo(() => {
    const y = parseInt(dobYear, 10);
    const m = parseInt(dobMonth, 10);
    const d = parseInt(dobDay, 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1920 && y < new Date().getFullYear()) {
      const birthDate = new Date(y, m - 1, d);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return Math.max(age, 12);
    }
    return 28;
  }, [dobYear, dobMonth, dobDay]);

  // Persist draft on step change
  const saveCurrentDraft = async (stepNum: number) => {
    const draft = {
      currentStep: stepNum,
      displayName,
      dobYear,
      dobMonth,
      dobDay,
      genderCarePref,
      height,
      weight,
      currentlyMenstruates,
      nonMenstruatingReason,
      lastPeriodDate,
      periodDuration,
      cycleLength,
      regularity,
      menstrualSymptoms,
      crampsSeverity,
      previousSurgeries,
      familyHistory,
      providers,
      selectedConditions,
      conditionNotes,
      takesMedications,
      medicationsList,
      sleepHours,
      hydrationGoalGlasses,
      wellnessGoals,
      enabledFeatures,
    };
    await storage.saveOnboardingDraft(draft);
  };

  const conditionCatalog = [
    { key: 'pcos', label: 'PCOS / PCOD', desc: 'Hormonal and ovarian rhythm' },
    { key: 'endometriosis', label: 'Endometriosis', desc: 'Pelvic and uterine lining care' },
    { key: 'thyroid_hypo', label: 'Hypothyroidism', desc: 'Low thyroid hormone activity' },
    { key: 'thyroid_hyper', label: 'Hyperthyroidism', desc: 'Elevated thyroid hormone activity' },
    { key: 'diabetes_type_2', label: 'Type 2 Diabetes', desc: 'Glucose and insulin regulation' },
    { key: 'diabetes_type_1', label: 'Type 1 Diabetes', desc: 'Insulin-dependent diabetes' },
    { key: 'hypertension', label: 'Hypertension', desc: 'Elevated blood pressure' },
    { key: 'anemia', label: 'Iron Deficiency / Anemia', desc: 'Low hemoglobin / ferritin' },
    { key: 'migraine', label: 'Migraine', desc: 'Recurring neuro-vascular headaches' },
    { key: 'asthma', label: 'Asthma', desc: 'Respiratory airway sensitivity' },
  ];

  const handleAddDoctor = () => {
    if (!newDocName.trim()) {
      Alert.alert('Required', 'Please enter clinician or clinic name.');
      return;
    }
    const newProv: TempProvider = {
      doctor_name: newDocName.trim(),
      specialty: newDocSpecialty.trim() || 'General Practice / Gynecology',
      clinic_or_hospital_name: newDocClinic.trim() || 'Private Clinic',
      phone_number: newDocPhone.trim(),
      upcoming_date: newDocUpcoming.trim() || undefined,
      reason: newDocReason.trim() || undefined,
    };
    setProviders([...providers, newProv]);
    setNewDocName('');
    setNewDocSpecialty('');
    setNewDocClinic('');
    setNewDocPhone('');
    setNewDocUpcoming('');
    setNewDocReason('');
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) {
      Alert.alert('Required', 'Please enter medicine name.');
      return;
    }
    const newMed: TempMedication = {
      name: newMedName.trim(),
      strength: newMedStrength.trim() || 'As prescribed',
      form: newMedForm,
      dosage_instructions: newMedInstructions.trim() || '1 dose',
      frequency: newMedFrequency,
      reminder_times: newMedTimes,
      relation_to_meals: newMedMeal,
      prescribing_clinician: '',
      reminder_enabled: true,
    };
    setMedicationsList([...medicationsList, newMed]);
    setNewMedName('');
    setNewMedStrength('');
    setNewMedInstructions('1 tablet daily');
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await notificationService.requestPermissions();
    setNotificationsGranted(granted);
    if (granted) {
      Alert.alert('Notifications Enabled', 'Medication and check-in reminders can now alert you on time.');
    } else {
      Alert.alert('Notification Notice', 'You can enable reminders anytime from device Settings.');
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !displayName.trim()) {
      Alert.alert('Required Field', 'Please enter your preferred name so we can address you respectfully.');
      return;
    }
    if (currentStep < totalSteps) {
      const next = currentStep + 1;
      setCurrentStep(next);
      saveCurrentDraft(next);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      saveCurrentDraft(prev);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      const formattedDob = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      const heightCm = heightUnit === 'cm' ? parseFloat(height) : Math.round(parseFloat(height) * 30.48);
      const weightKg = weightUnit === 'kg' ? parseFloat(weight) : Math.round(parseFloat(weight) * 0.453592);

      // 1. Save User Profile
      await storage.saveProfile({
        display_name: displayName.trim() || 'Friend',
        date_of_birth: formattedDob,
        age: calculatedAge,
        gender_identity: genderCarePref,
        height_cm: isNaN(heightCm) ? undefined : heightCm,
        weight_kg: isNaN(weightKg) ? undefined : weightKg,
        country_or_region: countryRegion,
        timezone: timezone,
        menstrual_status: currentlyMenstruates === 'yes' ? 'menstruating' : nonMenstruatingReason,
        activity_level: activityLevel,
        emergency_contact_consent: false,
        onboarding_completed: true,
      });

      // 2. Save User Preferences
      await storage.savePreferences({
        preferred_language: preferredLanguage,
        menstrual_tracking_enabled: currentlyMenstruates === 'yes' && enabledFeatures.menstrual_tracking,
        height_unit: heightUnit,
        weight_unit: weightUnit,
        pin_protection_enabled: enablePin && pinCode.length === 4,
        ai_consent_granted: aiDoctorSummaryConsent,
      });

      // 3. Save Notification Preferences
      await storage.saveNotificationPreferences({
        medication_reminders: enabledFeatures.medication_reminders,
        appointment_reminders: enabledFeatures.appointment_reminders,
        daily_checkin_reminder: true,
        daily_checkin_time: '20:00:00',
        privacy_preserving_notifications: true,
      });

      // 4. Save Menstrual Record (Only if user actually menstruates and provided a date!)
      if (currentlyMenstruates === 'yes' && lastPeriodDate.trim()) {
        await storage.addMenstrualCycle({
          start_date: lastPeriodDate.trim(),
          cycle_length_days: parseInt(cycleLength, 10) || 28,
          period_duration_days: parseInt(periodDuration, 10) || 5,
          flow_intensity: 'medium',
          cramps_severity: crampsSeverity,
          is_irregular: regularity === 'irregular',
          menstrual_symptoms: menstrualSymptoms,
        });
      }

      // 5. Save Medical Conditions
      for (const condKey of selectedConditions) {
        const catalogItem = conditionCatalog.find((c) => c.key === condKey);
        await storage.saveMedicalCondition({
          condition_key: condKey,
          condition_name: catalogItem ? catalogItem.label : condKey,
          is_active: true,
          notes: conditionNotes[condKey] || undefined,
        });
      }
      if (customCondition.trim()) {
        await storage.saveMedicalCondition({
          condition_key: 'custom',
          condition_name: customCondition.trim(),
          is_active: true,
        });
      }

      // 6. Save Allergy if provided
      if (hasAllergies && allergenName.trim()) {
        await storage.saveAllergy({
          allergen_name: allergenName.trim(),
          allergy_type: allergyType,
          reaction_description: allergyReaction.trim() || 'User reported during health profile setup',
          severity: 'moderate',
        });
      }

      // 7. Save Healthcare Providers & Upcoming Appointments
      for (const prov of providers) {
        await storage.saveHealthcareProvider({
          doctor_name: prov.doctor_name,
          specialty: prov.specialty,
          clinic_or_hospital_name: prov.clinic_or_hospital_name,
          phone_number: prov.phone_number,
          notes: prov.notes,
        });

        if (prov.upcoming_date) {
          await storage.addAppointment({
            clinician_or_clinic_name: prov.doctor_name,
            specialty: prov.specialty,
            appointment_at: prov.upcoming_date,
            reason_for_visit: prov.reason || 'General checkup',
            reminder_enabled: true,
            status: 'scheduled',
          });
        }
      }

      // 8. Save Medications & Schedule Notifications
      for (const med of medicationsList) {
        const savedMed = await storage.addMedication({
          name: med.name,
          strength: med.strength,
          dosage_instructions: med.dosage_instructions,
          schedule_type: med.frequency,
          reminder_times: med.reminder_times,
          relation_to_meals: med.relation_to_meals,
          prescribing_clinician: med.prescribing_clinician || undefined,
          start_date: new Date().toISOString().split('T')[0],
          is_active: true,
        });

        if (med.reminder_enabled && med.reminder_times.length > 0) {
          for (const timeStr of med.reminder_times) {
            await notificationService.scheduleMedicationReminder(
              savedMed.id,
              savedMed.name,
              timeStr,
              true
            );
          }
        }
      }

      // 9. Set PIN if requested
      if (enablePin && pinCode.length === 4) {
        await securityService.setPin(pinCode);
      }

      // Clear draft after successful completion
      await storage.clearOnboardingDraft();

      // Notify root layout to transition seamlessly to tabs
      await notifyProfileChanged();
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
      Alert.alert('Error', 'Could not save health profile. Please check your network or try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Step Header */}
      <View style={styles.header}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(currentStep / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <View style={styles.stepCounterRow}>
          <Text style={styles.stepCounterText}>
            Step {currentStep} of {totalSteps}
          </Text>
          <View style={styles.privacyTagRow}>
            <Shield size={12} color={Colors.deepBurgundy} />
            <Text style={styles.privacyTag}>Private & Scoped to Your ID</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION A: Basic Profile */}
          {currentStep === 1 && (
            <View>
              <View style={styles.sectionBadge}>
                <User size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section A • Identity & Vital Baselines</Text>
              </View>
              <Text style={styles.stepTitle}>Let us get to know you</Text>
              <Text style={styles.stepSubtitle}>
                Your identity informs clinical reference intervals and personalized rhythm tracking.
              </Text>

              <Card style={styles.formCard}>
                <Text style={styles.inputLabel}>
                  Preferred Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Maya"
                  placeholderTextColor={Colors.mutedText}
                  value={displayName}
                  onChangeText={setDisplayName}
                />

                <Text style={styles.inputLabel}>Date of Birth (Year - Month - Day)</Text>
                <View style={styles.dobRow}>
                  <TextInput
                    style={[styles.textInput, styles.dobInput, { flex: 2 }]}
                    placeholder="YYYY (e.g. 1998)"
                    placeholderTextColor={Colors.mutedText}
                    keyboardType="numeric"
                    maxLength={4}
                    value={dobYear}
                    onChangeText={setDobYear}
                  />
                  <TextInput
                    style={[styles.textInput, styles.dobInput, { flex: 1.2 }]}
                    placeholder="MM (01-12)"
                    placeholderTextColor={Colors.mutedText}
                    keyboardType="numeric"
                    maxLength={2}
                    value={dobMonth}
                    onChangeText={setDobMonth}
                  />
                  <TextInput
                    style={[styles.textInput, styles.dobInput, { flex: 1.2 }]}
                    placeholder="DD (01-31)"
                    placeholderTextColor={Colors.mutedText}
                    keyboardType="numeric"
                    maxLength={2}
                    value={dobDay}
                    onChangeText={setDobDay}
                  />
                </View>
                <Text style={styles.computedAgeNotice}>
                  Calculated Age: <Text style={{ fontWeight: '700', color: Colors.deepBurgundy }}>{calculatedAge} years</Text>
                </Text>

                <View style={styles.divider} />

                <Text style={styles.inputLabel}>Care & Biological Preferences</Text>
                <View style={styles.optionsWrap}>
                  {['Cisgender Woman', 'Transgender Woman', 'Non-binary', 'Prefer not to say'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setGenderCarePref(opt)}
                      style={[styles.optionChip, genderCarePref === opt && styles.optionChipActive]}
                    >
                      <Text style={[styles.optionChipText, genderCarePref === opt && styles.optionChipTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.divider} />

                {/* Height & Weight with Unit Toggles */}
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.labelWithToggle}>
                      <Text style={styles.inputLabel}>Height</Text>
                      <TouchableOpacity onPress={() => setHeightUnit(heightUnit === 'cm' ? 'ft_in' : 'cm')}>
                        <Text style={styles.unitToggleText}>{heightUnit.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder={heightUnit === 'cm' ? '162' : '5.4'}
                      placeholderTextColor={Colors.mutedText}
                      keyboardType="numeric"
                      value={height}
                      onChangeText={setHeight}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <View style={styles.labelWithToggle}>
                      <Text style={styles.inputLabel}>Weight</Text>
                      <TouchableOpacity onPress={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}>
                        <Text style={styles.unitToggleText}>{weightUnit.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder={weightUnit === 'kg' ? '58' : '128'}
                      placeholderTextColor={Colors.mutedText}
                      keyboardType="numeric"
                      value={weight}
                      onChangeText={setWeight}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Timezone (for scheduled reminders)</Text>
                <TextInput
                  style={styles.textInput}
                  value={timezone}
                  onChangeText={setTimezone}
                  placeholder="e.g. Asia/Kolkata"
                  placeholderTextColor={Colors.mutedText}
                />
              </Card>
            </View>
          )}

          {/* SECTION B: Menstrual Health */}
          {currentStep === 2 && (
            <View>
              <View style={styles.sectionBadge}>
                <Heart size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section B • Menstrual & Hormonal Health</Text>
              </View>
              <Text style={styles.stepTitle}>Menstrual Rhythm</Text>
              <Text style={styles.stepSubtitle}>
                Calibrated to your personal cycle. All predictions are mathematical estimates, never assumptions.
              </Text>

              <Card style={styles.formCard}>
                <Text style={styles.inputLabel}>Do you currently menstruate?</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, currentlyMenstruates === 'yes' && styles.segmentBtnActive]}
                    onPress={() => setCurrentlyMenstruates('yes')}
                  >
                    <Text style={[styles.segmentBtnText, currentlyMenstruates === 'yes' && styles.segmentBtnTextActive]}>
                      Yes, I menstruate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentBtn, currentlyMenstruates === 'no' && styles.segmentBtnActive]}
                    onPress={() => setCurrentlyMenstruates('no')}
                  >
                    <Text style={[styles.segmentBtnText, currentlyMenstruates === 'no' && styles.segmentBtnTextActive]}>
                      No / Other
                    </Text>
                  </TouchableOpacity>
                </View>

                {currentlyMenstruates === 'no' ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.inputLabel}>Reason (Optional - ensures appropriate care flow)</Text>
                    <View style={styles.optionsWrap}>
                      {[
                        { key: 'pregnant', label: 'Currently Pregnant' },
                        { key: 'postpartum', label: 'Postpartum / Nursing' },
                        { key: 'menopausal', label: 'Menopause / Perimenopause' },
                        { key: 'contraception', label: 'Hormonal Contraceptive / IUD' },
                        { key: 'not_menstruating', label: 'Do not menstruate' },
                        { key: 'prefer_not_to_say', label: 'Prefer not to disclose' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          onPress={() => setNonMenstruatingReason(item.key as any)}
                          style={[styles.optionChip, nonMenstruatingReason === item.key && styles.optionChipActive]}
                        >
                          <Text style={[styles.optionChipText, nonMenstruatingReason === item.key && styles.optionChipTextActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.infoNote}>
                      Cycle tracking will remain disabled for your account. You can enable it anytime in Profile settings.
                    </Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.inputLabel}>First day of your most recent period (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 2026-10-10"
                      placeholderTextColor={Colors.mutedText}
                      value={lastPeriodDate}
                      onChangeText={setLastPeriodDate}
                    />
                    <Text style={styles.fieldHint}>Leave blank if unknown or irregular.</Text>

                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>Period Duration (Days)</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          placeholder="5"
                          placeholderTextColor={Colors.mutedText}
                          value={periodDuration}
                          onChangeText={setPeriodDuration}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.inputLabel}>Typical Cycle Length (Days)</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          placeholder="28"
                          placeholderTextColor={Colors.mutedText}
                          value={cycleLength}
                          onChangeText={setCycleLength}
                        />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Cycle Regularity</Text>
                    <View style={styles.optionsWrap}>
                      {[
                        { key: 'regular', label: 'Regular (Predictable)' },
                        { key: 'irregular', label: 'Irregular (Varies)' },
                        { key: 'unknown', label: 'I do not know' },
                      ].map((reg) => (
                        <TouchableOpacity
                          key={reg.key}
                          onPress={() => setRegularity(reg.key as any)}
                          style={[styles.optionChip, regularity === reg.key && styles.optionChipActive]}
                        >
                          <Text style={[styles.optionChipText, regularity === reg.key && styles.optionChipTextActive]}>
                            {reg.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                      Menstrual Cramps Severity: {crampsSeverity}/10
                    </Text>
                    <View style={styles.severityRow}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <TouchableOpacity
                          key={num}
                          onPress={() => setCrampsSeverity(num)}
                          style={[styles.numBtn, crampsSeverity === num && styles.numBtnActive]}
                        >
                          <Text style={[styles.numBtnText, crampsSeverity === num && styles.numBtnTextActive]}>
                            {num}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchLabelBold}>Cycle Predictions & Reminders</Text>
                        <Text style={styles.switchSublabel}>
                          Calculates estimated window for your upcoming period based on logged entries.
                        </Text>
                      </View>
                      <Switch
                        value={enableCyclePredictions}
                        onValueChange={setEnableCyclePredictions}
                        trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                        thumbColor={enableCyclePredictions ? Colors.deepBurgundy : Colors.softWhite}
                      />
                    </View>
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* SECTION C: General Health History */}
          {currentStep === 3 && (
            <View>
              <View style={styles.sectionBadge}>
                <Activity size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section C • Medical History & Sensitivities</Text>
              </View>
              <Text style={styles.stepTitle}>Health Background</Text>
              <Text style={styles.stepSubtitle}>
                Record previous procedures and allergies to safeguard your clinical summaries.
              </Text>

              <Card style={styles.formCard}>
                <Text style={styles.inputLabel}>Previous Surgeries / Procedures (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 60 }]}
                  multiline
                  placeholder="e.g. Appendectomy (2018), Laparoscopy (2022)"
                  placeholderTextColor={Colors.mutedText}
                  value={previousSurgeries}
                  onChangeText={setPreviousSurgeries}
                />

                <View style={styles.divider} />

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabelBold}>Do you have known allergies?</Text>
                    <Text style={styles.switchSublabel}>Medication reactions, food allergies, or dust sensitivities.</Text>
                  </View>
                  <Switch
                    value={hasAllergies}
                    onValueChange={setHasAllergies}
                    trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                    thumbColor={hasAllergies ? Colors.deepBurgundy : Colors.softWhite}
                  />
                </View>

                {hasAllergies && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.inputLabel}>Allergen Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                      placeholderTextColor={Colors.mutedText}
                      value={allergenName}
                      onChangeText={setAllergenName}
                    />

                    <Text style={styles.inputLabel}>Reaction Type & Notes</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Skin hives, breathing difficulty, swelling"
                      placeholderTextColor={Colors.mutedText}
                      value={allergyReaction}
                      onChangeText={setAllergyReaction}
                    />
                  </View>
                )}

                <View style={styles.divider} />

                <Text style={styles.inputLabel}>Family Medical History (Select all that apply)</Text>
                <View style={styles.optionsWrap}>
                  {['PCOS', 'Diabetes', 'Thyroid Disorder', 'Hypertension', 'Cardiovascular', 'Early Menopause'].map((fam) => {
                    const isSelected = familyHistory.includes(fam);
                    return (
                      <TouchableOpacity
                        key={fam}
                        onPress={() => {
                          if (isSelected) setFamilyHistory(familyHistory.filter((f) => f !== fam));
                          else setFamilyHistory([...familyHistory, fam]);
                        }}
                        style={[styles.optionChip, isSelected && styles.optionChipActive]}
                      >
                        <Text style={[styles.optionChipText, isSelected && styles.optionChipTextActive]}>
                          {fam}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            </View>
          )}

          {/* SECTION D: Healthcare Providers */}
          {currentStep === 4 && (
            <View>
              <View style={styles.sectionBadge}>
                <Stethoscope size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section D • Doctors & Care Contacts</Text>
              </View>
              <Text style={styles.stepTitle}>Healthcare Providers</Text>
              <Text style={styles.stepSubtitle}>
                Optional. Add your clinicians for easy reference during emergency or consultation summaries.
              </Text>

              <Card style={styles.formCard}>
                <Text style={styles.inputLabel}>Doctor or Clinic Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Dr. Sunita Rao"
                  placeholderTextColor={Colors.mutedText}
                  value={newDocName}
                  onChangeText={setNewDocName}
                />

                <Text style={styles.inputLabel}>Specialty</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Obstetrician & Gynecologist, Endocrinologist"
                  placeholderTextColor={Colors.mutedText}
                  value={newDocSpecialty}
                  onChangeText={setNewDocSpecialty}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Clinic / Hospital</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Apollo Care"
                      placeholderTextColor={Colors.mutedText}
                      value={newDocClinic}
                      onChangeText={setNewDocClinic}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Phone / Contact</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. +91 9876543210"
                      placeholderTextColor={Colors.mutedText}
                      keyboardType="phone-pad"
                      value={newDocPhone}
                      onChangeText={setNewDocPhone}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Upcoming Appointment Date (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2026-11-15T10:00:00"
                  placeholderTextColor={Colors.mutedText}
                  value={newDocUpcoming}
                  onChangeText={setNewDocUpcoming}
                />

                <Button
                  title="+ Add Doctor to Profile"
                  onPress={handleAddDoctor}
                  variant="secondary"
                  size="small"
                  style={{ marginTop: 4, marginBottom: 8 }}
                />

                {providers.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subhead}>Added Providers ({providers.length}):</Text>
                    {providers.map((p, idx) => (
                      <View key={idx} style={styles.itemPreviewCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemPreviewTitle}>{p.doctor_name}</Text>
                          <Text style={styles.itemPreviewSub}>{p.specialty} • {p.clinic_or_hospital_name}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setProviders(providers.filter((_, i) => i !== idx))}
                          style={styles.deleteBtn}
                        >
                          <Trash2 size={16} color={Colors.deepBurgundy} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* SECTION E: Medical Conditions */}
          {currentStep === 5 && (
            <View>
              <View style={styles.sectionBadge}>
                <Sparkles size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section E • Existing Conditions</Text>
              </View>
              <Text style={styles.stepTitle}>Tracked Conditions</Text>
              <Text style={styles.stepSubtitle}>
                Select any diagnosed conditions you manage. We never infer diagnosis from symptoms alone.
              </Text>

              <Card style={styles.formCard}>
                <View style={styles.conditionsList}>
                  {conditionCatalog.map((c) => {
                    const isSelected = selectedConditions.includes(c.key);
                    return (
                      <TouchableOpacity
                        key={c.key}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedConditions(selectedConditions.filter((k) => k !== c.key));
                          } else {
                            setSelectedConditions([...selectedConditions, c.key]);
                          }
                        }}
                        style={[styles.conditionSelectTile, isSelected && styles.conditionSelectTileActive]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.conditionSelectName, isSelected && styles.conditionSelectNameActive]}>
                            {c.label}
                          </Text>
                          <Text style={styles.conditionSelectDesc}>{c.desc}</Text>
                        </View>
                        <View style={[styles.checkboxSquare, isSelected && styles.checkboxSquareActive]}>
                          {isSelected && <Check size={14} color={Colors.white} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.divider} />

                <Text style={styles.inputLabel}>Other Diagnosed Condition</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Fibroids, Celiac disease"
                  placeholderTextColor={Colors.mutedText}
                  value={customCondition}
                  onChangeText={setCustomCondition}
                />
              </Card>
            </View>
          )}

          {/* SECTION F: Medication Profile */}
          {currentStep === 6 && (
            <View>
              <View style={styles.sectionBadge}>
                <Pill size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section F • Prescription & Daily Medications</Text>
              </View>
              <Text style={styles.stepTitle}>Medication Regimen</Text>
              <Text style={styles.stepSubtitle}>
                Add regular prescriptions to automate daily reminders and adherence logs.
              </Text>

              <Card style={styles.formCard}>
                <Text style={styles.inputLabel}>Do you currently take any medications?</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, takesMedications === 'yes' && styles.segmentBtnActive]}
                    onPress={() => setTakesMedications('yes')}
                  >
                    <Text style={[styles.segmentBtnText, takesMedications === 'yes' && styles.segmentBtnTextActive]}>
                      Yes, I take medicines
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentBtn, takesMedications === 'no' && styles.segmentBtnActive]}
                    onPress={() => setTakesMedications('no')}
                  >
                    <Text style={[styles.segmentBtnText, takesMedications === 'no' && styles.segmentBtnTextActive]}>
                      No medications
                    </Text>
                  </TouchableOpacity>
                </View>

                {takesMedications === 'yes' && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.inputLabel}>Medication Name</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Thyronorm, Metformin, Folic Acid"
                      placeholderTextColor={Colors.mutedText}
                      value={newMedName}
                      onChangeText={setNewMedName}
                    />

                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>Strength / Dosage</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 500 mg, 25 mcg"
                          placeholderTextColor={Colors.mutedText}
                          value={newMedStrength}
                          onChangeText={setNewMedStrength}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.inputLabel}>Form</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Tablet, Syrup"
                          placeholderTextColor={Colors.mutedText}
                          value={newMedForm}
                          onChangeText={setNewMedForm}
                        />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Instructions</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 1 tablet in the morning after breakfast"
                      placeholderTextColor={Colors.mutedText}
                      value={newMedInstructions}
                      onChangeText={setNewMedInstructions}
                    />

                    <Text style={styles.inputLabel}>Frequency</Text>
                    <View style={styles.optionsWrap}>
                      {[
                        { key: 'daily', label: 'Once Daily' },
                        { key: 'twice_daily', label: 'Twice Daily' },
                        { key: 'three_times_daily', label: '3x Daily' },
                        { key: 'as_needed', label: 'As Needed (SOS)' },
                      ].map((f) => (
                        <TouchableOpacity
                          key={f.key}
                          onPress={() => {
                            setNewMedFrequency(f.key as any);
                            if (f.key === 'twice_daily') setNewMedTimes(['08:00:00', '20:00:00']);
                            else if (f.key === 'three_times_daily') setNewMedTimes(['08:00:00', '14:00:00', '20:00:00']);
                            else setNewMedTimes(['08:00:00']);
                          }}
                          style={[styles.optionChip, newMedFrequency === f.key && styles.optionChipActive]}
                        >
                          <Text style={[styles.optionChipText, newMedFrequency === f.key && styles.optionChipTextActive]}>
                            {f.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Button
                      title="+ Add Medication to Profile"
                      onPress={handleAddMedication}
                      variant="secondary"
                      size="small"
                      style={{ marginTop: 8 }}
                    />

                    {medicationsList.length > 0 && (
                      <View style={{ marginTop: 14 }}>
                        <Text style={styles.subhead}>Added Medications ({medicationsList.length}):</Text>
                        {medicationsList.map((m, idx) => (
                          <View key={idx} style={styles.itemPreviewCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemPreviewTitle}>{m.name} ({m.strength})</Text>
                              <Text style={styles.itemPreviewSub}>{m.dosage_instructions} • {m.frequency}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => setMedicationsList(medicationsList.filter((_, i) => i !== idx))}
                              style={styles.deleteBtn}
                            >
                              <Trash2 size={16} color={Colors.deepBurgundy} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* SECTION G: Lifestyle & Wellness */}
          {currentStep === 7 && (
            <View>
              <View style={styles.sectionBadge}>
                <Moon size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section G • Sleep, Vitality & Wellness Goals</Text>
              </View>
              <Text style={styles.stepTitle}>Daily Rhythm</Text>
              <Text style={styles.stepSubtitle}>
                Set healthy baseline targets for restful sleep, hydration, and movement.
              </Text>

              <Card style={styles.formCard}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Typical Sleep (Hours)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      placeholder="7.5"
                      placeholderTextColor={Colors.mutedText}
                      value={sleepHours}
                      onChangeText={setSleepHours}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Hydration Goal (Glasses)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      placeholder="8"
                      placeholderTextColor={Colors.mutedText}
                      value={hydrationGoalGlasses}
                      onChangeText={setHydrationGoalGlasses}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Physical Activity Level</Text>
                <View style={styles.optionsWrap}>
                  {[
                    { key: 'sedentary', label: 'Sedentary (Desk work)' },
                    { key: 'lightly_active', label: 'Lightly Active (1-3 days)' },
                    { key: 'moderately_active', label: 'Moderately Active (3-5 days)' },
                    { key: 'very_active', label: 'Very Active (Intense)' },
                  ].map((act) => (
                    <TouchableOpacity
                      key={act.key}
                      onPress={() => setActivityLevel(act.key as any)}
                      style={[styles.optionChip, activityLevel === act.key && styles.optionChipActive]}
                    >
                      <Text style={[styles.optionChipText, activityLevel === act.key && styles.optionChipTextActive]}>
                        {act.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.divider} />

                <Text style={styles.inputLabel}>Dietary Preferences</Text>
                <View style={styles.optionsWrap}>
                  {['Vegetarian', 'Vegan', 'Eggetarian', 'Non-Vegetarian', 'Gluten-Free'].map((diet) => (
                    <TouchableOpacity
                      key={diet}
                      onPress={() => setDietaryPreference(diet)}
                      style={[styles.optionChip, dietaryPreference === diet && styles.optionChipActive]}
                    >
                      <Text style={[styles.optionChipText, dietaryPreference === diet && styles.optionChipTextActive]}>
                        {diet}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            </View>
          )}

          {/* SECTION H: Privacy & Personalization */}
          {currentStep === 8 && (
            <View>
              <View style={styles.sectionBadge}>
                <Lock size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Section H • Privacy, Notifications & Security</Text>
              </View>
              <Text style={styles.stepTitle}>Security & Reminders</Text>
              <Text style={styles.stepSubtitle}>
                Protect your personal health records with an optional PIN and configure timely alerts.
              </Text>

              <Card style={styles.formCard}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabelBold}>4-Digit Security PIN</Text>
                    <Text style={styles.switchSublabel}>Require a code whenever HerHealth opens on this device.</Text>
                  </View>
                  <Switch
                    value={enablePin}
                    onValueChange={setEnablePin}
                    trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                    thumbColor={enablePin ? Colors.deepBurgundy : Colors.softWhite}
                  />
                </View>

                {enablePin && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.inputLabel}>Enter 4-Digit PIN Code</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                      placeholder="••••"
                      placeholderTextColor={Colors.mutedText}
                      value={pinCode}
                      onChangeText={setPinCode}
                    />
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabelBold}>Doctor Summary Organization</Text>
                    <Text style={styles.switchSublabel}>
                      Structure your symptoms and vitals into printable PDFs for clinician consultations.
                    </Text>
                  </View>
                  <Switch
                    value={aiDoctorSummaryConsent}
                    onValueChange={setAiDoctorSummaryConsent}
                    trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                    thumbColor={aiDoctorSummaryConsent ? Colors.deepBurgundy : Colors.softWhite}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.notificationPermissionBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Bell size={18} color={Colors.deepBurgundy} />
                    <Text style={styles.switchLabelBold}>Device Reminder Permissions</Text>
                  </View>
                  <Text style={styles.switchSublabel}>
                    Allow HerHealth to notify you for medications and scheduled doctor consultations.
                  </Text>
                  <Button
                    title={notificationsGranted ? 'Permissions Granted' : 'Request Notification Permission'}
                    onPress={handleRequestNotificationPermission}
                    variant={notificationsGranted ? 'outline' : 'secondary'}
                    size="small"
                    style={{ marginTop: 10 }}
                  />
                </View>
              </Card>
            </View>
          )}

          {/* FINAL REVIEW (Step 9) */}
          {currentStep === 9 && (
            <View>
              <View style={styles.sectionBadge}>
                <CheckCircle2 size={13} color={Colors.deepBurgundy} />
                <Text style={styles.sectionBadgeText}>Final Review • Confirm Health Profile</Text>
              </View>
              <Text style={styles.stepTitle}>Review Your Profile</Text>
              <Text style={styles.stepSubtitle}>
                Review your baseline health information before launching your personalized dashboard.
              </Text>

              {/* Review Sections */}
              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewSectionTitle}>Identity & Baselines</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(1)} style={styles.reviewEditBtn}>
                    <Edit2 size={14} color={Colors.deepBurgundy} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewLine}>Name: {displayName || 'Friend'}</Text>
                <Text style={styles.reviewLine}>Age: {calculatedAge} years • {genderCarePref}</Text>
                <Text style={styles.reviewLine}>Height: {height} {heightUnit} • Weight: {weight} {weightUnit}</Text>
              </Card>

              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewSectionTitle}>Menstrual Health</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(2)} style={styles.reviewEditBtn}>
                    <Edit2 size={14} color={Colors.deepBurgundy} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                {currentlyMenstruates === 'yes' ? (
                  <>
                    <Text style={styles.reviewLine}>Status: Menstruating ({regularity})</Text>
                    <Text style={styles.reviewLine}>Last Period: {lastPeriodDate || 'Not specified'}</Text>
                    <Text style={styles.reviewLine}>Cycle Length: {cycleLength} days • Duration: {periodDuration} days</Text>
                  </>
                ) : (
                  <Text style={styles.reviewLine}>Status: Non-menstruating ({nonMenstruatingReason})</Text>
                )}
              </Card>

              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewSectionTitle}>Conditions & Regimen</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(5)} style={styles.reviewEditBtn}>
                    <Edit2 size={14} color={Colors.deepBurgundy} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewLine}>
                  Tracked Conditions: {selectedConditions.length > 0 ? selectedConditions.join(', ') : 'None selected'}
                </Text>
                <Text style={styles.reviewLine}>
                  Medications: {medicationsList.length > 0 ? medicationsList.map((m) => m.name).join(', ') : 'None'}
                </Text>
                <Text style={styles.reviewLine}>
                  Healthcare Providers: {providers.length > 0 ? providers.map((p) => p.doctor_name).join(', ') : 'None registered'}
                </Text>
              </Card>

              <Card style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewSectionTitle}>Lifestyle Baselines</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(7)} style={styles.reviewEditBtn}>
                    <Edit2 size={14} color={Colors.deepBurgundy} />
                    <Text style={styles.reviewEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.reviewLine}>Sleep Target: {sleepHours} hours</Text>
                <Text style={styles.reviewLine}>Daily Hydration Goal: {hydrationGoalGlasses} glasses</Text>
                <Text style={styles.reviewLine}>Activity: {activityLevel.replace(/_/g, ' ')}</Text>
              </Card>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={18} color={Colors.deepBurgundy} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <Button
          title={currentStep === totalSteps ? 'Confirm & Open HerHealth' : 'Continue'}
          onPress={handleNext}
          style={{ flex: 1, marginLeft: currentStep > 1 ? 12 : 0 }}
          icon={<ArrowRight size={18} color={Colors.softWhite} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.warmPorcelain,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.softLavenderMist,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.deepBurgundy,
  },
  stepCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    letterSpacing: 0.5,
  },
  privacyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyTag: {
    fontSize: 11,
    color: Colors.mutedText,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  stepTitle: {
    fontFamily: Typography.heading,
    fontSize: 26,
    color: Colors.lavenderSlate,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    lineHeight: 19,
    marginBottom: 16,
  },
  formCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    backgroundColor: Colors.softWhite,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
    marginBottom: 6,
  },
  requiredStar: {
    color: Colors.deepBurgundy,
  },
  textInput: {
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.lavenderSlate,
    marginBottom: 12,
  },
  dobRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dobInput: {
    textAlign: 'center',
  },
  computedAgeNotice: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: -4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelWithToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  optionChip: {
    backgroundColor: Colors.softLavenderMist,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  optionChipActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  optionChipText: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.softLavenderMist,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  segmentBtnActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  segmentBtnText: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: Colors.white,
  },
  infoNote: {
    fontSize: 12,
    color: Colors.mutedText,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: -8,
    marginBottom: 10,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numBtn: {
    width: 28,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.softLavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  numBtnActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  numBtnText: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    fontWeight: '600',
  },
  numBtnTextActive: {
    color: Colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.fineBorder,
    marginVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  switchLabelBold: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  switchSublabel: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
    lineHeight: 16,
  },
  notificationPermissionBox: {
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  conditionsList: {
    gap: 8,
  },
  conditionSelectTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.softLavenderMist,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  conditionSelectTileActive: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.blossomRose,
  },
  conditionSelectName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  conditionSelectNameActive: {
    color: Colors.deepBurgundy,
  },
  conditionSelectDesc: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.mutedText,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkboxSquareActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  subhead: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    marginBottom: 6,
  },
  itemPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.softLavenderMist,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  itemPreviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  itemPreviewSub: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: Colors.softWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.softLavenderMist,
    paddingBottom: 4,
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  reviewEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  reviewLine: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
    backgroundColor: Colors.warmPorcelain,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    backgroundColor: Colors.softWhite,
  },
  backButtonText: {
    marginLeft: 6,
    color: Colors.deepBurgundy,
    fontWeight: '600',
    fontSize: 14,
  },
});
