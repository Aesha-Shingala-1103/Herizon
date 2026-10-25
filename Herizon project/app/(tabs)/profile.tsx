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
import {
  UserProfile,
  UserPreferences,
  MenstrualCycle,
  MedicalCondition,
  Allergy,
} from '../../src/types';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [, setCycles] = useState<MenstrualCycle[]>([]);
  const [cycleEstimates, setCycleEstimates] = useState<CycleEstimation | null>(null);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [badges, setBadges] = useState<MilestoneBadge[]>([]);

  // Modals
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [periodStartDate, setPeriodStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [crampsSeverity, setCrampsSeverity] = useState(4);

  const loadProfileData = async () => {
    try {
      const p = await storage.getProfile();
      const prefs = await storage.getPreferences();
      const cycs = await storage.getMenstrualCycles();
      const conds = await storage.getMedicalConditions();
      const allgs = await storage.getAllergies();
      const b = await gamificationService.getBadges();

      setProfile(p);
      setPreferences(prefs);
      setCycles(cycs);
      setConditions(conds);
      setAllergies(allgs);
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

  const handleExportData = async () => {
    try {
      const json = await storage.exportAllUserData();
      // Opens the OS share sheet with the real JSON export (nothing is uploaded by the app).
      await Share.share({ title: 'HerHealth export', message: json });
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

        {/* Profile Card Header */}
        <Card style={styles.userCard} variant="lavender">
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <User size={26} color={Colors.deepBurgundy} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.userName}>{profile?.display_name || 'Ananya Sharma'}</Text>
              <Text style={styles.userSub}>
                {profile?.age ? `${profile.age} yrs • ` : '29 yrs • '}
                {profile?.height_cm ? `${profile.height_cm} cm • ` : '162 cm • '}
                {profile?.weight_kg ? `${profile.weight_kg} kg` : '58 kg'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Women's Health & Menstrual Cycle Section */}
        {preferences?.menstrual_tracking_enabled && (
          <View style={{ marginVertical: 8 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Heart size={16} color={Colors.deepBurgundy} />
                <Text style={styles.sectionTitle}>Menstrual Rhythm & Cycle</Text>
              </View>
              <TouchableOpacity
                onPress={() => setPeriodModalVisible(true)}
                style={styles.addPeriodBtn}
              >
                <Plus size={13} color={Colors.deepBurgundy} />
                <Text style={styles.addPeriodBtnText}>Log Period</Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.cycleCard} variant="rose">
              <View style={styles.cycleGrid}>
                <View style={styles.cycleGridItem}>
                  <Text style={styles.cycleGridLabel}>Estimated Next Period</Text>
                  <Text style={styles.cycleGridValue}>
                    {cycleEstimates?.estimatedNextPeriodDate || 'Calculating...'}
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
          </View>
        )}

        {/* Chronic Conditions & Allergies Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tracked Conditions & Allergies</Text>
        </View>

        <Card style={styles.sectionCard} variant="elevated">
          <Text style={styles.cardSubheading}>Health Background</Text>
          <View style={styles.chipsWrap}>
            {conditions.length > 0 ? (
              conditions.map((c) => (
                <View key={c.id} style={styles.conditionChip}>
                  <Text style={styles.conditionChipText}>{c.condition_name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>PCOS, Mild Hypothyroidism (User-Reported)</Text>
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
              <Text style={styles.emptyNote}>Penicillin, Dust Mites</Text>
            )}
          </View>
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
              {(['light', 'medium', 'heavy'] as const).map((flow) => (
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
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    fontSize: 13,
    color: Colors.lavenderSlate,
    marginBottom: 8,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  severityNumBtn: {
    flex: 1,
    paddingVertical: 7,
    marginHorizontal: 2,
    borderRadius: 10,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
  },
  severityNumBtnActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  severityNumText: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  severityNumTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
  },
});
