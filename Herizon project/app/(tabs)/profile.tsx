import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  User,
  Heart,
  Shield,
  Award,
  Download,
  LogOut,
  Trash2,
  Calendar,
  Sparkles,
  Plus,
  Stethoscope,
  Phone,
  Building,
  FileText,
  Check,
} from 'lucide-react-native';
import Colors from '../../src/theme/colors';
import Typography from '../../src/theme/typography';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { signOut } from '../../src/services/authSession';
import { storage } from '../../src/services/storageService';
import { securityService } from '../../src/services/securityService';
import { gamificationService, MilestoneBadge } from '../../src/services/gamificationService';
import { calculateCycleEstimates, CycleEstimation } from '../../src/services/healthCalculations';
import { MenstrualCalendar } from '../../src/components/MenstrualCalendar';
import {
  UserProfile,
  UserPreferences,
  MenstrualCycle,
  MedicalCondition,
  Allergy,
  HealthcareProvider,
  SymptomLog,
} from '../../src/types';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [cycles, setCycles] = useState<MenstrualCycle[]>([]);
  const [allSymptoms, setAllSymptoms] = useState<SymptomLog[]>([]);
  const [cycleEstimates, setCycleEstimates] = useState<CycleEstimation | null>(null);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [badges, setBadges] = useState<MilestoneBadge[]>([]);

  // Modals
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [flowIntensity, setFlowIntensity] = useState<'spotting' | 'light' | 'medium' | 'heavy'>('medium');
  const [crampsSeverity, setCrampsSeverity] = useState(4);

  // Healthcare provider modal
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docNotes, setDocNotes] = useState('');

  // Add condition modal
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [newConditionName, setNewConditionName] = useState('');
  const [newConditionNotes, setNewConditionNotes] = useState('');

  const loadProfileData = async () => {
    try {
      const p = await storage.getProfile();
      const prefs = await storage.getPreferences();
      const cycs = await storage.getMenstrualCycles();
      const syms = await storage.getSymptoms();
      const conds = await storage.getMedicalConditions();
      const allgs = await storage.getAllergies();
      const provs = await storage.getHealthcareProviders();
      const b = await gamificationService.getBadges();

      setProfile(p);
      setPreferences(prefs);
      setCycles(cycs);
      setAllSymptoms(syms);
      setConditions(conds);
      setAllergies(allgs);
      setProviders(provs);
      setBadges(b);

      const estimates = calculateCycleEstimates(cycs);
      setCycleEstimates(estimates);
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN code.');
      return;
    }
    const success = await securityService.setPin(newPin);
    if (success) {
      await storage.savePreferences({ pin_protection_enabled: true });
      Alert.alert('PIN Protected', 'Your 4-digit security PIN has been encrypted and enabled.');
      setPinModalVisible(false);
      setNewPin('');
      loadProfileData();
    }
  };

  const handleAddPeriodLog = async () => {
    if (!periodStartDate) return;
    await storage.addMenstrualCycle({
      start_date: periodStartDate,
      flow_intensity: flowIntensity,
      cramps_severity: crampsSeverity,
      is_irregular: false,
    });
    setPeriodModalVisible(false);
    loadProfileData();
  };

  const handleSaveProvider = async () => {
    if (!docName.trim()) {
      Alert.alert('Required', 'Please enter the clinician or doctor name.');
      return;
    }
    await storage.saveHealthcareProvider({
      doctor_name: docName.trim(),
      specialty: docSpecialty.trim() || undefined,
      clinic_or_hospital_name: clinicName.trim() || undefined,
      phone_number: docPhone.trim() || undefined,
      notes: docNotes.trim() || undefined,
    });
    setProviderModalVisible(false);
    setDocName('');
    setDocSpecialty('');
    setClinicName('');
    setDocPhone('');
    setDocNotes('');
    loadProfileData();
  };

  const handleDeleteProvider = (id: string, name: string) => {
    Alert.alert('Delete Provider', `Remove ${name} from your healthcare contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await storage.deleteHealthcareProvider(id);
          loadProfileData();
        },
      },
    ]);
  };

  const handleSaveCondition = async () => {
    if (!newConditionName.trim()) {
      Alert.alert('Required', 'Please enter a condition name.');
      return;
    }
    await storage.saveMedicalCondition({
      condition_key: newConditionName.trim().toLowerCase().replace(/\s+/g, '_'),
      condition_name: newConditionName.trim(),
      is_active: true,
      notes: newConditionNotes.trim() || undefined,
    });
    setConditionModalVisible(false);
    setNewConditionName('');
    setNewConditionNotes('');
    loadProfileData();
  };

  const handleExportData = async () => {
    try {
      const json = await storage.exportAllUserData();
      await Share.share({ title: 'HerHealth Private Data Export', message: json });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message || 'Could not prepare the export.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'You will need to sign in again to open your records on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  const handleWipeData = () => {
    Alert.alert(
      'Wipe All Records',
      'Are you sure you want to permanently delete all local health records from this device? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await storage.wipeAllUserData();
            await securityService.removePin();
            Alert.alert('Records Deleted', 'All local records wiped successfully.');
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const bioDetails: string[] = [];
  if (profile?.age) bioDetails.push(`${profile.age} yrs`);
  if (profile?.height_cm) bioDetails.push(`${profile.height_cm} cm`);
  if (profile?.weight_kg) bioDetails.push(`${profile.weight_kg} kg`);
  if (profile?.country_or_region) bioDetails.push(profile.country_or_region);
  const bioString = bioDetails.length > 0 ? bioDetails.join(' • ') : 'Profile details not set';

  const isMenstruationTracked =
    preferences?.menstrual_tracking_enabled !== false &&
    profile?.menstrual_status !== 'menopausal' &&
    profile?.menstrual_status !== 'not_menstruating';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <View style={styles.headerTag}>
            <Sparkles size={11} color={Colors.deepBurgundy} />
            <Text style={styles.headerTagText}>Account & Sanctuary</Text>
          </View>
          <Text style={styles.screenTitle}>Profile & Preferences</Text>
          <Text style={styles.screenSubtitle}>
            Personal wellness profile, biometric PIN lock, and data sovereignty
          </Text>
        </View>

        {/* Profile Card Header (REAL DATA ONLY) */}
        <Card style={styles.userCard} variant="lavender">
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <User size={26} color={Colors.deepBurgundy} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.userName}>{profile?.display_name || 'HerHealth Member'}</Text>
              <Text style={styles.userSub}>{bioString}</Text>
              {profile?.menstrual_status && (
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    Status: {profile.menstrual_status.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Women's Health & Menstrual Rhythm Section */}
        {isMenstruationTracked && (
          <View style={{ marginVertical: 8 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Heart size={16} color={Colors.deepBurgundy} />
                <Text style={styles.sectionTitle}>Menstrual Rhythm & Calendar</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPeriodModalVisible(true)}
                style={styles.addPeriodBtn}
              >
                <Plus size={13} color={Colors.deepBurgundy} />
                <Text style={styles.addPeriodBtnText}>Log Period</Text>
              </TouchableOpacity>
            </View>

            {cycles.length > 0 && (
              <Card style={styles.cycleCard} variant="rose">
                <View style={styles.cycleGrid}>
                  <View style={styles.cycleGridItem}>
                    <Text style={styles.cycleGridLabel}>Estimated Next Period</Text>
                    <Text style={styles.cycleGridValue}>
                      {cycleEstimates?.estimatedNextPeriodDate
                        ? new Date(cycleEstimates.estimatedNextPeriodDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Calculating...'}
                    </Text>
                  </View>
                  <View style={styles.cycleGridDivider} />
                  <View style={styles.cycleGridItem}>
                    <Text style={styles.cycleGridLabel}>Avg Cycle Length</Text>
                    <Text style={styles.cycleGridValue}>
                      {cycleEstimates?.averageCycleLengthDays || 28} days
                    </Text>
                  </View>
                  <View style={styles.cycleGridDivider} />
                  <View style={styles.cycleGridItem}>
                    <Text style={styles.cycleGridLabel}>Avg Duration</Text>
                    <Text style={styles.cycleGridValue}>
                      {cycleEstimates?.averagePeriodDurationDays || 5} days
                    </Text>
                  </View>
                </View>

                <View style={styles.cycleDisclaimerBox}>
                  <Text style={styles.cycleDisclaimerText}>
                    * {cycleEstimates?.disclaimer || 'Cycle estimates are mathematical calculations from past entries and do not replace clinical advice.'}
                  </Text>
                </View>
              </Card>
            )}

            {/* Interactive Month-Grid Menstrual Calendar */}
            <View style={{ marginTop: 6 }}>
              <MenstrualCalendar
                cycles={cycles}
                symptoms={allSymptoms}
                estimatedNextPeriodDate={cycleEstimates?.estimatedNextPeriodDate}
                averageCycleLength={cycleEstimates?.averageCycleLengthDays || 28}
                averagePeriodDuration={cycleEstimates?.averagePeriodDurationDays || 5}
                onAddCycle={async (c) => {
                  await storage.addMenstrualCycle(c);
                  loadProfileData();
                }}
                onDeleteCycle={async (id) => {
                  await storage.deleteMenstrualCycle(id);
                  loadProfileData();
                }}
              />
            </View>
          </View>
        )}

        {/* Chronic Conditions & Allergies Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tracked Conditions & Allergies</Text>
          <TouchableOpacity
            onPress={() => setConditionModalVisible(true)}
            style={styles.addPeriodBtn}
          >
            <Plus size={13} color={Colors.deepBurgundy} />
            <Text style={styles.addPeriodBtnText}>Add Condition</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          <Text style={styles.cardSubheading}>Health Background & Conditions</Text>
          <View style={styles.chipsWrap}>
            {conditions.length > 0 ? (
              conditions.map((c) => (
                <View key={c.id} style={styles.conditionChip}>
                  <Text style={styles.conditionChipText}>{c.condition_name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>No chronic conditions logged.</Text>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.cardSubheading}>Known Allergies & Sensitivities</Text>
          <View style={styles.chipsWrap}>
            {allergies.length > 0 ? (
              allergies.map((a) => (
                <View key={a.id} style={[styles.conditionChip, { borderColor: Colors.blossomRose }]}>
                  <Text style={styles.conditionChipText}>{a.allergen_name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>No known allergies logged.</Text>
            )}
          </View>
        </Card>

        {/* SECTION D: HEALTHCARE PROVIDERS */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Stethoscope size={16} color={Colors.deepBurgundy} />
            <Text style={styles.sectionTitle}>Healthcare Providers & Clinicians</Text>
          </View>
          <TouchableOpacity
            onPress={() => setProviderModalVisible(true)}
            style={styles.addPeriodBtn}
          >
            <Plus size={13} color={Colors.deepBurgundy} />
            <Text style={styles.addPeriodBtnText}>Add Doctor</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          {providers.length > 0 ? (
            providers.map((p, idx) => (
              <View key={p.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.providerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{p.doctor_name}</Text>
                    {p.specialty && <Text style={styles.providerSpecialty}>{p.specialty}</Text>}
                    {p.clinic_or_hospital_name && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Building size={12} color={Colors.mutedText} />
                        <Text style={styles.providerMeta}>{p.clinic_or_hospital_name}</Text>
                      </View>
                    )}
                    {p.phone_number && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Phone size={12} color={Colors.mutedText} />
                        <Text style={styles.providerMeta}>{p.phone_number}</Text>
                      </View>
                    )}
                    {p.notes && <Text style={styles.providerNotes}>{p.notes}</Text>}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteProvider(p.id, p.doctor_name)}
                    style={styles.providerDeleteBtn}
                  >
                    <Trash2 size={16} color={Colors.deepBurgundy} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View>
              <Text style={styles.emptyNote}>
                No healthcare providers added yet. Keep your doctors&apos; contacts, clinic names, and specialties organized for consultations.
              </Text>
              <Button
                title="+ Add Healthcare Provider"
                size="small"
                variant="outline"
                onPress={() => setProviderModalVisible(true)}
                style={{ alignSelf: 'flex-start', marginTop: 10 }}
              />
            </View>
          )}
        </Card>

        {/* Mindful Milestones */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Award size={16} color={Colors.deepBurgundy} />
            <Text style={styles.sectionTitle}>Mindful Milestones</Text>
          </View>
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          <Text style={styles.badgesIntro}>
            Gentle celebrations of logging consistency and organizing your records.
          </Text>
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <View
                key={b.id}
                style={[styles.badgeTile, b.isUnlocked && styles.badgeTileUnlocked]}
              >
                <Award size={20} color={b.isUnlocked ? Colors.deepBurgundy : Colors.mutedText} />
                <Text
                  style={[styles.badgeTileTitle, b.isUnlocked && styles.badgeTileTitleUnlocked]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {b.title}
                </Text>
                <Text style={styles.badgeTileStatus} numberOfLines={1}>
                  {b.isUnlocked ? 'Unlocked' : 'In Progress'}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Privacy & Security Settings */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Shield size={16} color={Colors.deepBurgundy} />
            <Text style={styles.sectionTitle}>Privacy & App Lock</Text>
          </View>
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>4-Digit Security PIN</Text>
              <Text style={styles.settingSub}>
                {preferences?.pin_protection_enabled ? 'Encrypted PIN is active' : 'Protect journal with PIN on launch'}
              </Text>
            </View>
            <Button
              title={preferences?.pin_protection_enabled ? 'Change PIN' : 'Set PIN'}
              onPress={() => setPinModalVisible(true)}
              size="small"
              variant="outline"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Export Health Records</Text>
              <Text style={styles.settingSub}>Download private JSON copy of all data</Text>
            </View>
            <TouchableOpacity onPress={handleExportData} style={styles.exportBtn}>
              <Download size={16} color={Colors.deepBurgundy} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Sign out</Text>
              <Text style={styles.settingSub}>Clears the saved session on this device</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={styles.exportBtn} accessibilityRole="button" accessibilityLabel="Sign out">
              <LogOut size={16} color={Colors.deepBurgundy} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: Colors.deepBurgundy }]}>Wipe Local Records</Text>
              <Text style={styles.settingSub}>Permanently delete all stored data from device</Text>
            </View>
            <TouchableOpacity onPress={handleWipeData} style={styles.wipeBtn}>
              <Trash2 size={16} color={Colors.deepBurgundy} />
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      {/* Set PIN Modal */}
      <Modal visible={pinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Set 4-Digit Security PIN</Text>
            <Text style={styles.modalSub}>
              Your PIN is hashed with SHA-256 and stored locally in encrypted storage.
            </Text>

            <TextInput
              style={styles.pinInput}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={Colors.mutedText}
              value={newPin}
              onChangeText={setNewPin}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setPinModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save PIN"
                onPress={handleSavePin}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Log Period Modal */}
      <Modal visible={periodModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log Menstrual Cycle</Text>

            <Text style={styles.modalLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={periodStartDate}
              onChangeText={setPeriodStartDate}
              placeholderTextColor={Colors.mutedText}
            />

            <Text style={styles.modalLabel}>Flow Intensity</Text>
            <View style={styles.intensityRow}>
              {(['spotting', 'light', 'medium', 'heavy'] as const).map((flow) => (
                <TouchableOpacity
                  key={flow}
                  onPress={() => setFlowIntensity(flow)}
                  style={[styles.intensityBtn, flowIntensity === flow && styles.intensityBtnActive]}
                >
                  <Text style={[styles.intensityText, flowIntensity === flow && styles.intensityTextActive]}>
                    {flow}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Cramps Severity: {crampsSeverity}/10</Text>
            <View style={styles.severityRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => setCrampsSeverity(num)}
                  style={[styles.severityNumBtn, crampsSeverity === num && styles.severityNumBtnActive]}
                >
                  <Text
                    style={[
                      styles.severityNumText,
                      crampsSeverity === num && styles.severityNumTextActive,
                    ]}
                  >
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
                onPress={handleAddPeriodLog}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Healthcare Provider Modal */}
      <Modal visible={providerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Healthcare Provider</Text>
            <Text style={styles.modalSub}>Record your doctor or clinic contact details</Text>

            <Text style={styles.modalLabel}>Doctor / Clinician Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dr. Sunita Sharma"
              placeholderTextColor={Colors.mutedText}
              value={docName}
              onChangeText={setDocName}
            />

            <Text style={styles.modalLabel}>Specialty</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Gynecologist / Endocrinologist"
              placeholderTextColor={Colors.mutedText}
              value={docSpecialty}
              onChangeText={setDocSpecialty}
            />

            <Text style={styles.modalLabel}>Clinic or Hospital Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Apollo Hospital"
              placeholderTextColor={Colors.mutedText}
              value={clinicName}
              onChangeText={setClinicName}
            />

            <Text style={styles.modalLabel}>Phone Number / Contact</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={Colors.mutedText}
              keyboardType="phone-pad"
              value={docPhone}
              onChangeText={setDocPhone}
            />

            <Text style={styles.modalLabel}>Notes / Instructions</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="e.g. Recommended fasting blood panel before visit"
              placeholderTextColor={Colors.mutedText}
              multiline
              value={docNotes}
              onChangeText={setDocNotes}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setProviderModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Provider"
                onPress={handleSaveProvider}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Condition Modal */}
      <Modal visible={conditionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Medical Condition</Text>
            <Text style={styles.modalSub}>Record a condition for personal monitoring</Text>

            <Text style={styles.modalLabel}>Condition Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Thyroid, Migraine, Endometriosis"
              placeholderTextColor={Colors.mutedText}
              value={newConditionName}
              onChangeText={setNewConditionName}
            />

            <Text style={styles.modalLabel}>Management Notes</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="e.g. Monitored with quarterly TSH lab tests"
              placeholderTextColor={Colors.mutedText}
              multiline
              value={newConditionNotes}
              onChangeText={setNewConditionNotes}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setConditionModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save Condition"
                onPress={handleSaveCondition}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
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
  screenHeader: {
    marginBottom: 14,
  },
  headerTag: {
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
  headerTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    fontFamily: Typography.body,
    marginTop: 2,
  },
  userCard: {
    padding: 18,
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  userSub: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 2,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  statusPillText: {
    fontSize: 10,
    color: Colors.deepBurgundy,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  addPeriodBtn: {
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
  addPeriodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  cycleCard: {
    padding: 16,
    marginBottom: 8,
  },
  cycleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cycleGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  cycleGridLabel: {
    fontSize: 10,
    color: Colors.mutedText,
    marginBottom: 4,
    textAlign: 'center',
  },
  cycleGridValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    textAlign: 'center',
  },
  cycleGridDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(219, 161, 165, 0.4)',
  },
  cycleDisclaimerBox: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(219, 161, 165, 0.3)',
  },
  cycleDisclaimerText: {
    fontSize: 10,
    color: Colors.mutedText,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 10,
  },
  cardSubheading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionChip: {
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  conditionChipText: {
    fontSize: 11,
    color: Colors.lavenderSlate,
    fontWeight: '600',
  },
  emptyNote: {
    fontSize: 12,
    color: Colors.mutedText,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.fineBorder,
    marginVertical: 12,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
  },
  providerSpecialty: {
    fontSize: 12,
    color: Colors.deepBurgundy,
    fontWeight: '600',
    marginTop: 1,
  },
  providerMeta: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  providerNotes: {
    fontSize: 11,
    color: Colors.lavenderSlate,
    marginTop: 4,
    fontStyle: 'italic',
  },
  providerDeleteBtn: {
    padding: 6,
  },
  badgesIntro: {
    fontSize: 12,
    color: Colors.mutedText,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badgeTile: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 3,
    borderRadius: 14,
    backgroundColor: Colors.paleRoseWhite,
    marginHorizontal: '1%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  badgeTileUnlocked: {
    backgroundColor: Colors.softLavender,
    borderColor: 'rgba(217, 218, 228, 0.9)',
  },
  badgeTileTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mutedText,
    marginTop: 6,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  badgeTileTitleUnlocked: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  badgeTileStatus: {
    fontSize: 9,
    color: Colors.mutedText,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.lavenderSlate,
  },
  settingSub: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paleRoseWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  wipeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paleRoseWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.blossomRose,
  },

  // Modals
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
  pinInput: {
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.blossomRose,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 12,
    color: Colors.deepBurgundy,
    marginVertical: 14,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 6,
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
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  intensityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
  },
  intensityBtnActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  intensityText: {
    fontSize: 12,
    color: Colors.mutedText,
    textTransform: 'capitalize',
  },
  intensityTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  severityNumBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
  },
  severityNumBtnActive: {
    backgroundColor: Colors.softLavender,
    borderColor: Colors.blossomRose,
  },
  severityNumText: {
    fontSize: 11,
    color: Colors.lavenderSlate,
  },
  severityNumTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
