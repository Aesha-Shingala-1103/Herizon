import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Heart,
  Shield,
  Activity,
  Pill,
  Sparkles,
  Calendar,
  Lock,
} from 'lucide-react-native';
import Colors from '../src/theme/colors';
import Typography from '../src/theme/typography';
import Card from '../src/components/Card';
import Button from '../src/components/Button';
import { notifyProfileChanged } from '../src/services/authSession';
import { storage } from '../src/services/storageService';
import { securityService } from '../src/services/securityService';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  // Step 1: Basic Profile
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('162');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft_in'>('cm');
  const [weight, setWeight] = useState('58');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'>('moderately_active');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyConsent, setEmergencyConsent] = useState(false);

  // Step 2: Medical History
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [previousSurgeries, setPreviousSurgeries] = useState('');

  // Step 3: Medicines & Allergies
  const [currentMedicineName, setCurrentMedicineName] = useState('');
  const [currentMedicineDose, setCurrentMedicineDose] = useState('');
  const [allergenName, setAllergenName] = useState('');
  const [allergyReaction, setAllergyReaction] = useState('');

  // Step 4: Women's Health
  const [menstrualTrackingEnabled, setMenstrualTrackingEnabled] = useState(true);
  const [lastPeriodDate, setLastPeriodDate] = useState('2026-10-10');
  const [cycleLength, setCycleLength] = useState('28');
  const [periodDuration, setPeriodDuration] = useState('5');
  const [isIrregular, setIsIrregular] = useState(false);

  // Step 5: Lifestyle
  const [typicalSleepHours, setTypicalSleepHours] = useState('7.5');
  const [dailyStepGoal, setDailyStepGoal] = useState('8000');

  // Step 6: Monitoring Requirements
  const [trackGlucose, setTrackGlucose] = useState(false);
  const [trackBloodPressure, setTrackBloodPressure] = useState(false);
  const [trackWeight, setTrackWeight] = useState(true);

  // Step 7: Preferences & Security
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [enablePin, setEnablePin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [aiConsent, setAiConsent] = useState(false);

  const conditionOptions = [
    { key: 'pcos', label: 'PCOS / PCOD' },
    { key: 'thyroid_hypo', label: 'Thyroid Disorder' },
    { key: 'hypertension', label: 'Hypertension' },
    { key: 'diabetes_type_2', label: 'Diabetes (Type 2)' },
    { key: 'diabetes_type_1', label: 'Diabetes (Type 1)' },
    { key: 'endometriosis', label: 'Endometriosis' },
    { key: 'migraine', label: 'Migraine' },
    { key: 'anemia', label: 'Anemia' },
    { key: 'asthma', label: 'Asthma' },
  ];

  const toggleCondition = (key: string) => {
    if (selectedConditions.includes(key)) {
      setSelectedConditions(selectedConditions.filter((c) => c !== key));
    } else {
      setSelectedConditions([...selectedConditions, key]);
      if (key.includes('diabetes')) setTrackGlucose(true);
      if (key === 'hypertension') setTrackBloodPressure(true);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !displayName.trim()) {
      Alert.alert('Required', 'Please enter your preferred display name.');
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      // 1. Save Profile
      await storage.saveProfile({
        display_name: displayName.trim() || 'User',
        age: age ? parseInt(age, 10) : undefined,
        height_cm: heightUnit === 'cm' ? parseFloat(height) : Math.round(parseFloat(height) * 30.48),
        weight_kg: weightUnit === 'kg' ? parseFloat(weight) : Math.round(parseFloat(weight) * 0.453592),
        activity_level: activityLevel,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        emergency_contact_consent: emergencyConsent,
        onboarding_completed: true,
      });

      // 2. Save Preferences
      await storage.savePreferences({
        preferred_language: preferredLanguage,
        menstrual_tracking_enabled: menstrualTrackingEnabled,
        ai_consent_granted: aiConsent,
        pin_protection_enabled: enablePin && pinCode.length === 4,
        blood_glucose_unit: 'mg/dL',
        height_unit: heightUnit,
        weight_unit: weightUnit,
      });

      // 3. Save Medical Conditions
      for (const condKey of selectedConditions) {
        const option = conditionOptions.find((c) => c.key === condKey);
        await storage.saveMedicalCondition({
          condition_key: condKey,
          condition_name: option ? option.label : condKey,
          is_active: true,
        });
      }
      if (customCondition.trim()) {
        await storage.saveMedicalCondition({
          condition_key: 'custom',
          condition_name: customCondition.trim(),
          is_active: true,
        });
      }

      // 4. Save Medicines & Allergies if entered
      if (currentMedicineName.trim()) {
        await storage.addMedication({
          name: currentMedicineName.trim(),
          strength: currentMedicineDose.trim() || 'As directed',
          dosage_instructions: 'User-reported during onboarding',
          schedule_type: 'daily',
          reminder_times: ['09:00:00'],
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
        });
      }
      if (allergenName.trim()) {
        await storage.saveAllergy({
          allergen_name: allergenName.trim(),
          allergy_type: 'medication',
          reaction_description: allergyReaction.trim() || 'Mild reaction',
          severity: 'moderate',
        });
      }

      // 5. Save Menstrual cycle entry if enabled
      if (menstrualTrackingEnabled && lastPeriodDate) {
        await storage.addMenstrualCycle({
          start_date: lastPeriodDate,
          cycle_length_days: parseInt(cycleLength, 10) || 28,
          period_duration_days: parseInt(periodDuration, 10) || 5,
          flow_intensity: 'medium',
          cramps_severity: 4,
          is_irregular: isIrregular,
        });
      }

      // 6. Set PIN if requested
      if (enablePin && pinCode.length === 4) {
        await securityService.setPin(pinCode);
      }

      // Navigate to main tabs!
      await notifyProfileChanged();
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
      Alert.alert('Error', 'Could not save onboarding data. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.privacyTag}>🔒 Privacy-First Storage</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Basic Profile */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>Welcome to HerHealth</Text>
            <Text style={styles.stepSubtitle}>
              Let's create your personal profile. Your information remains strictly private and protected.
            </Text>

            <Card style={styles.formCard}>
              <Text style={styles.inputLabel}>What should we call you? *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Preferred name (e.g. Ananya)"
                placeholderTextColor={Colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 27"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Height ({heightUnit})</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="162"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Weight ({weightUnit})</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="58"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Activity Level</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => {
                      const levels: ('sedentary' | 'lightly_active' | 'moderately_active' | 'very_active')[] = [
                        'sedentary',
                        'lightly_active',
                        'moderately_active',
                        'very_active',
                      ];
                      const next = levels[(levels.indexOf(activityLevel) + 1) % levels.length];
                      setActivityLevel(next);
                    }}
                  >
                    <Text style={styles.selectBoxText}>
                      {activityLevel.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={[styles.inputLabel, { marginTop: 4 }]}>
                Emergency Contact (Optional)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contact Name"
                placeholderTextColor={Colors.textMuted}
                value={emergencyName}
                onChangeText={setEmergencyName}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Contact Phone Number"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  I consent to HerHealth storing this emergency contact locally.
                </Text>
                <Switch
                  value={emergencyConsent}
                  onValueChange={setEmergencyConsent}
                  trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                  thumbColor={emergencyConsent ? Colors.deepBurgundy : Colors.softWhite}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Step 2: Medical History */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>Medical History</Text>
            <Text style={styles.stepSubtitle}>
              Select any diagnosed chronic conditions. HerHealth tailors your daily tracking shortcuts accordingly.
            </Text>

            <View style={styles.chipsWrap}>
              {conditionOptions.map((cond) => {
                const isSelected = selectedConditions.includes(cond.key);
                return (
                  <TouchableOpacity
                    key={cond.key}
                    activeOpacity={0.8}
                    onPress={() => toggleCondition(cond.key)}
                    style={[
                      styles.conditionChip,
                      isSelected && styles.conditionChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.conditionChipText,
                        isSelected && styles.conditionChipTextActive,
                      ]}
                    >
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Card style={styles.formCard}>
              <Text style={styles.inputLabel}>Add Custom Condition</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Hypoglycemia, Cervical Spondylosis"
                placeholderTextColor={Colors.textMuted}
                value={customCondition}
                onChangeText={setCustomCondition}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                Past Surgeries or Hospitalizations (Optional)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Appendectomy in 2021"
                placeholderTextColor={Colors.textMuted}
                value={previousSurgeries}
                onChangeText={setPreviousSurgeries}
              />
            </Card>
          </View>
        )}

        {/* Step 3: Current Medicines & Allergies */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepTitle}>Medicines & Known Allergies</Text>
            <Text style={styles.stepSubtitle}>
              Record current prescriptions for schedules and reminders. HerHealth never recommends medicines or dosages.
            </Text>

            <Card style={styles.formCard}>
              <Text style={styles.cardHeaderSmall}>Current Medication</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Medicine Name (e.g. Metformin, Thyronorm)"
                placeholderTextColor={Colors.textMuted}
                value={currentMedicineName}
                onChangeText={setCurrentMedicineName}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Strength / Dose (e.g. 500mg once daily after food)"
                placeholderTextColor={Colors.textMuted}
                value={currentMedicineDose}
                onChangeText={setCurrentMedicineDose}
              />

              <View style={styles.divider} />

              <Text style={styles.cardHeaderSmall}>Known Allergies</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Allergen (e.g. Penicillin, Sulfa, Peanuts)"
                placeholderTextColor={Colors.textMuted}
                value={allergenName}
                onChangeText={setAllergenName}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Reported Reaction (e.g. Skin rash, facial swelling)"
                placeholderTextColor={Colors.textMuted}
                value={allergyReaction}
                onChangeText={setAllergyReaction}
              />
            </Card>
          </View>
        )}

        {/* Step 4: Women's Health & Menstrual Tracking */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.stepTitle}>Women's Health</Text>
            <Text style={styles.stepSubtitle}>
              Cycle tracking is completely optional. You can disable it at any time.
            </Text>

            <Card style={styles.formCard}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabelBold}>Enable Menstrual Cycle Tracking</Text>
                  <Text style={styles.switchSublabel}>
                    Track period dates, flow intensity, and cycle symptoms
                  </Text>
                </View>
                <Switch
                  value={menstrualTrackingEnabled}
                  onValueChange={setMenstrualTrackingEnabled}
                  trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                  thumbColor={menstrualTrackingEnabled ? Colors.deepBurgundy : Colors.softWhite}
                />
              </View>

              {menstrualTrackingEnabled && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.inputLabel}>Last Period Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="2026-10-10"
                    placeholderTextColor={Colors.textMuted}
                    value={lastPeriodDate}
                    onChangeText={setLastPeriodDate}
                  />

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Cycle Length (days)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="28"
                        keyboardType="numeric"
                        value={cycleLength}
                        onChangeText={setCycleLength}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.inputLabel}>Period Duration (days)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="5"
                        keyboardType="numeric"
                        value={periodDuration}
                        onChangeText={setPeriodDuration}
                      />
                    </View>
                  </View>

                  <View style={[styles.switchRow, { marginTop: 10 }]}>
                    <Text style={styles.switchLabel}>My cycles tend to be irregular</Text>
                    <Switch
                      value={isIrregular}
                      onValueChange={setIsIrregular}
                      trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                      thumbColor={isIrregular ? Colors.deepBurgundy : Colors.softWhite}
                    />
                  </View>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Step 5: Lifestyle & Daily Goals */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.stepTitle}>Lifestyle & Wellness</Text>
            <Text style={styles.stepSubtitle}>
              Set baseline targets for sleep and movement to monitor your rest patterns.
            </Text>

            <Card style={styles.formCard}>
              <Text style={styles.inputLabel}>Typical Nightly Sleep Target (Hours)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="7.5"
                keyboardType="numeric"
                value={typicalSleepHours}
                onChangeText={setTypicalSleepHours}
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Daily Steps Target</Text>
              <TextInput
                style={styles.textInput}
                placeholder="8000"
                keyboardType="numeric"
                value={dailyStepGoal}
                onChangeText={setDailyStepGoal}
              />
            </Card>
          </View>
        )}

        {/* Step 6: Monitoring Requirements */}
        {currentStep === 6 && (
          <View>
            <Text style={styles.stepTitle}>Home Measurements</Text>
            <Text style={styles.stepSubtitle}>
              Select the measurements you plan to record regularly at home.
            </Text>

            <Card style={styles.formCard}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabelBold}>Blood Glucose Tracking</Text>
                  <Text style={styles.switchSublabel}>For diabetes or metabolic health monitoring</Text>
                </View>
                <Switch
                  value={trackGlucose}
                  onValueChange={setTrackGlucose}
                  trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                  thumbColor={trackGlucose ? Colors.deepBurgundy : Colors.softWhite}
                />
              </View>

              <View style={[styles.switchRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabelBold}>Blood Pressure & Pulse</Text>
                  <Text style={styles.switchSublabel}>For hypertension or cardiovascular tracking</Text>
                </View>
                <Switch
                  value={trackBloodPressure}
                  onValueChange={setTrackBloodPressure}
                  trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                  thumbColor={trackBloodPressure ? Colors.deepBurgundy : Colors.softWhite}
                />
              </View>

              <View style={[styles.switchRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabelBold}>Body Weight Tracking</Text>
                  <Text style={styles.switchSublabel}>Monitor gentle weight stability over time</Text>
                </View>
                <Switch
                  value={trackWeight}
                  onValueChange={setTrackWeight}
                  trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                  thumbColor={trackWeight ? Colors.deepBurgundy : Colors.softWhite}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Step 7: Preferences & Privacy Security */}
        {currentStep === 7 && (
          <View>
            <Text style={styles.stepTitle}>Privacy & App Lock</Text>
            <Text style={styles.stepSubtitle}>
              Configure your language preference and set a secure app lock PIN.
            </Text>

            <Card style={styles.formCard}>
              <Text style={styles.inputLabel}>Preferred Language</Text>
              <View style={styles.row}>
                {(['en', 'hi', 'hinglish'] as const).map((l) => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => setPreferredLanguage(l)}
                    style={[
                      styles.langBtn,
                      preferredLanguage === l && styles.langBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        preferredLanguage === l && styles.langBtnTextActive,
                      ]}
                    >
                      {l === 'en' ? 'English' : l === 'hi' ? 'Hindi' : 'Hinglish'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabelBold}>Secure PIN Lock</Text>
                  <Text style={styles.switchSublabel}>Require a 4-digit code to open HerHealth</Text>
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
                  <Text style={styles.inputLabel}>Set 4-Digit Security PIN</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 1234"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    value={pinCode}
                    onChangeText={setPinCode}
                  />
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabelBold}>AI Health Organization Consent</Text>
                  <Text style={styles.switchSublabel}>
                    Allow organizing your journal into doctor-ready summaries. Data is never used for training.
                  </Text>
                </View>
                <Switch
                  value={aiConsent}
                  onValueChange={setAiConsent}
                  trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                  thumbColor={aiConsent ? Colors.deepBurgundy : Colors.softWhite}
                />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={18} color={Colors.deepBurgundy} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <Button
          title={currentStep === totalSteps ? 'Complete & Open HerHealth' : 'Next Step'}
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
  privacyTag: {
    fontSize: 11,
    color: Colors.mutedText,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontFamily: Typography.heading,
    fontSize: 26,
    color: Colors.lavenderSlate,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.mutedText,
    lineHeight: 20,
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
  textInput: {
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.lavenderSlate,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectBox: {
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  selectBoxText: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.fineBorder,
    marginVertical: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    flex: 1,
  },
  switchLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  switchSublabel: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  conditionChip: {
    backgroundColor: Colors.softWhite,
    borderColor: Colors.fineBorder,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  conditionChipActive: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.blossomRose,
  },
  conditionChipText: {
    fontSize: 13,
    color: Colors.mutedText,
    fontWeight: '500',
  },
  conditionChipTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  cardHeaderSmall: {
    fontFamily: Typography.heading,
    fontSize: 15,
    color: Colors.lavenderSlate,
    marginBottom: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.softLavenderMist,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  langBtnActive: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.blossomRose,
  },
  langBtnText: {
    fontSize: 13,
    color: Colors.mutedText,
  },
  langBtnTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.softWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.fineBorder,
    backgroundColor: Colors.softWhite,
  },
  backButtonText: {
    marginLeft: 6,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
});
