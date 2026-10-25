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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Mic,
  FileDown,
  Sparkles,
  Activity,
  Heart,
  Droplets,
  Calendar,
} from 'lucide-react-native';
import Colors from '../../src/theme/colors';
import Typography from '../../src/theme/typography';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import UrgentAlertBanner from '../../src/components/UrgentAlertBanner';
import { executeVoiceCommand } from '../../src/services/voiceExecutor';
import VoiceInputModal from '../../src/components/VoiceInputModal';
import { FloralEmptyState } from '../../src/components/FloralDecorations';
import { storage } from '../../src/services/storageService';
import { exportService } from '../../src/services/exportService';
import { checkUrgentSafetyWarning } from '../../src/services/healthCalculations';
import { SymptomLog, UrgentSafetyAlert } from '../../src/types';

export default function LogScreen() {
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'journal' | 'trackers'>('journal');
  const [modalVisible, setModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [activeUrgentAlert, setActiveUrgentAlert] = useState<UrgentSafetyAlert | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [symptomName, setSymptomName] = useState('');
  const [category, setCategory] = useState<SymptomLog['category']>('head');
  const [severity, setSeverity] = useState(5);
  const [bodyLocation, setBodyLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [reportedTriggers, setReportedTriggers] = useState('');
  const [description, setDescription] = useState('');
  const [hasHappenedBefore, setHasHappenedBefore] = useState(false);
  const [discussedWithDoctor, setDiscussedWithDoctor] = useState(false);

  const commonSymptomChips = [
    { name: 'Headache', cat: 'head', loc: 'Head / Forehead' },
    { name: 'Fatigue', cat: 'general', loc: 'Full Body' },
    { name: 'Abdominal Pain', cat: 'digestive', loc: 'Lower Abdomen' },
    { name: 'Bloating', cat: 'digestive', loc: 'Stomach' },
    { name: 'Dizziness', cat: 'head', loc: 'Head' },
    { name: 'Body Pain', cat: 'body', loc: 'Muscles / Joints' },
    { name: 'Nausea', cat: 'digestive', loc: 'Digestive' },
    { name: 'Cramps', cat: 'reproductive', loc: 'Pelvic' },
    { name: 'Mood Changes', cat: 'mood', loc: 'Emotional' },
    { name: 'Sleep Difficulty', cat: 'general', loc: 'Sleep' },
  ];

  const healthTrackersList = [
    { title: 'Menstrual & Hormonal Rhythm', desc: 'Cycle phase, regularity & ovulation', icon: Calendar, color: Colors.deepBurgundy, tag: 'Active' },
    { title: 'Blood Glucose & Metabolism', desc: 'Fasting, post-meal & HbA1c', icon: Activity, color: Colors.lavenderSlate, tag: 'Logged' },
    { title: 'Blood Pressure & Vitals', desc: 'Systolic, diastolic & heart rate', icon: Heart, color: Colors.blossomRose, tag: 'Normal' },
    { title: 'PCOS & Hormonal Health', desc: 'Symptom correlation & energy tracking', icon: Sparkles, color: Colors.dustyBlue, tag: 'Tracking' },
    { title: 'Anaemia & Iron Status', desc: 'Fatigue, dizziness & ferritin indicators', icon: Droplets, color: Colors.deepBurgundy, tag: 'Optimal' },
  ];

  const loadSymptoms = async () => {
    const list = await storage.getSymptoms();
    setSymptoms(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadSymptoms();
    }, [])
  );

  const handleOpenAddModal = (prefill?: typeof commonSymptomChips[0]) => {
    setEditingId(null);
    setSymptomName(prefill ? prefill.name : '');
    setCategory(prefill ? (prefill.cat as any) : 'general');
    setBodyLocation(prefill ? prefill.loc : '');
    setSeverity(5);
    setDurationMinutes('60');
    setReportedTriggers('');
    setDescription('');
    setHasHappenedBefore(false);
    setDiscussedWithDoctor(false);
    setModalVisible(true);
  };

  const handleEditSymptom = (item: SymptomLog) => {
    setEditingId(item.id);
    setSymptomName(item.symptom_name);
    setCategory(item.category);
    setSeverity(item.severity);
    setBodyLocation(item.body_location || '');
    setDurationMinutes(item.duration_minutes ? item.duration_minutes.toString() : '');
    setReportedTriggers(item.reported_triggers || '');
    setDescription(item.description || '');
    setHasHappenedBefore(item.has_happened_before);
    setDiscussedWithDoctor(item.discussed_with_doctor);
    setModalVisible(true);
  };

  const handleDeleteSymptom = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to remove this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await storage.deleteSymptom(id);
          loadSymptoms();
        },
      },
    ]);
  };

  const handleSaveSymptom = async () => {
    if (!symptomName.trim()) {
      Alert.alert('Required', 'Please enter a symptom name.');
      return;
    }

    const combinedText = `${symptomName} ${description} ${bodyLocation}`;
    const urgent = checkUrgentSafetyWarning(combinedText);
    if (urgent) {
      setActiveUrgentAlert(urgent);
    }

    const payload = {
      symptom_name: symptomName.trim(),
      category,
      severity,
      body_location: bodyLocation.trim() || undefined,
      duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
      reported_triggers: reportedTriggers.trim() || undefined,
      description: description.trim() || undefined,
      occurred_at: new Date().toISOString(),
      has_happened_before: hasHappenedBefore,
      discussed_with_doctor: discussedWithDoctor,
    };

    if (editingId) {
      await storage.updateSymptom(editingId, payload);
    } else {
      await storage.addSymptom(payload);
    }

    setModalVisible(false);
    loadSymptoms();
  };

  const handleExportCsv = async () => {
    if (symptoms.length === 0) {
      Alert.alert('Notice', 'No symptom entries available to export.');
      return;
    }
    exportService.exportSymptomsToCsv(symptoms);
    Alert.alert('CSV Export Ready', `${symptoms.length} entries prepared in structured CSV format.`);
  };

  const handleVoiceConfirm = async (parsed: any) => {
    const urgent = checkUrgentSafetyWarning(parsed.transcript);
    if (urgent) setActiveUrgentAlert(urgent);
    const result = await executeVoiceCommand(parsed);
    if (result.ok) loadSymptoms();
    return result;
  };

  const filteredSymptoms = symptoms.filter((item) => {
    const matchesSearch =
      item.symptom_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.body_location && item.body_location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Urgent Warning if triggered */}
        {activeUrgentAlert && (
          <UrgentAlertBanner
            alert={activeUrgentAlert}
            onDismiss={() => setActiveUrgentAlert(null)}
          />
        )}

        {/* Header Title with Botanical Badge */}
        <View style={styles.screenHeader}>
          <View>
            <View style={styles.headerTag}>
              <Sparkles size={11} color={Colors.deepBurgundy} />
              <Text style={styles.headerTagText}>Personal Health Space</Text>
            </View>
            <Text style={styles.screenTitle}>My Health Journal</Text>
            <Text style={styles.screenSubtitle}>
              Calm, clinical logging for your symptoms, vitals, and wellness rhythm
            </Text>
          </View>
        </View>

        {/* Tab Switcher: Journal vs Trackers */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'journal' && styles.tabButtonActive]}
            onPress={() => setActiveTab('journal')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'journal' && styles.tabButtonTextActive]}>
              Symptom Journal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'trackers' && styles.tabButtonActive]}
            onPress={() => setActiveTab('trackers')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'trackers' && styles.tabButtonTextActive]}>
              Health Trackers
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'trackers' ? (
          <View style={styles.trackersContainer}>
            {healthTrackersList.map((t, idx) => {
              const Icon = t.icon;
              return (
                <Card key={idx} style={styles.trackerCard} variant="glass">
                  <View style={styles.trackerRow}>
                    <View style={[styles.trackerIconCircle, { backgroundColor: Colors.paleRoseWhite }]}>
                      <Icon size={20} color={t.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.trackerTitle}>{t.title}</Text>
                      <Text style={styles.trackerDesc}>{t.desc}</Text>
                    </View>
                    <View style={styles.trackerBadge}>
                      <Text style={styles.trackerBadgeText}>{t.tag}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <>
            {/* Top Controls: Search, Voice, and Add */}
            <View style={styles.topControlRow}>
              <View style={styles.searchBar}>
                <Search size={16} color={Colors.mutedText} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search symptoms, notes, triggers..."
                  placeholderTextColor={Colors.mutedText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={styles.voiceBtn}
                activeOpacity={0.8}
                onPress={() => setVoiceModalVisible(true)}
              >
                <Mic size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Quick Log Chips */}
            <Text style={styles.subHeading}>Quick Log Common Symptoms:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {commonSymptomChips.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleOpenAddModal(chip)}
                  style={styles.quickChip}
                >
                  <Plus size={13} color={Colors.deepBurgundy} style={{ marginRight: 4 }} />
                  <Text style={styles.quickChipText}>{chip.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action Row: Category Filter + Export */}
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {['all', 'head', 'digestive', 'body', 'mood', 'reproductive', 'general'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[styles.catFilterChip, selectedCategory === cat && styles.catFilterChipActive]}
                  >
                    <Text style={[styles.catFilterText, selectedCategory === cat && styles.catFilterTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={handleExportCsv} style={styles.exportBtn}>
                <FileDown size={16} color={Colors.deepBurgundy} />
              </TouchableOpacity>
            </View>

            {/* Add Custom Symptom Button */}
            <Button
              title="+ Add Detailed Symptom Entry"
              onPress={() => handleOpenAddModal()}
              variant="primary"
              style={{ marginBottom: 16 }}
            />

            {/* Symptoms Timeline List */}
            <View style={styles.historyHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                Symptom History ({filteredSymptoms.length})
              </Text>
            </View>

            {filteredSymptoms.length > 0 ? (
              filteredSymptoms.map((s) => {
                const dateStr = new Date(s.occurred_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Card key={s.id} style={styles.symptomCard} variant="elevated">
                    <View style={styles.symptomCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.symptomTitle}>{s.symptom_name}</Text>
                        <Text style={styles.symptomLocationDate}>
                          {s.body_location ? `${s.body_location} • ` : ''}
                          {dateStr}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.severityBadge,
                          s.severity >= 7 ? styles.severityHigh : styles.severityNormal,
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            s.severity >= 7 ? styles.severityTextHigh : styles.severityTextNormal,
                          ]}
                        >
                          {s.severity}/10
                        </Text>
                      </View>
                    </View>

                    {s.description ? (
                      <Text style={styles.symptomDesc}>{s.description}</Text>
                    ) : null}

                    {s.reported_triggers ? (
                      <Text style={styles.symptomTriggers}>
                        <Text style={{ fontWeight: '700' }}>Triggers: </Text>
                        {s.reported_triggers}
                      </Text>
                    ) : null}

                    <View style={styles.symptomFooter}>
                      <View style={styles.tagsRow}>
                        {s.has_happened_before && (
                          <View style={styles.subtleTag}>
                            <Text style={styles.subtleTagText}>Recurring</Text>
                          </View>
                        )}
                        {s.discussed_with_doctor && (
                          <View style={[styles.subtleTag, { backgroundColor: Colors.softLavender }]}>
                            <Text style={[styles.subtleTagText, { color: Colors.lavenderSlate }]}>
                              Doctor Discussed
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          onPress={() => handleEditSymptom(s)}
                          style={styles.iconBtn}
                        >
                          <Edit3 size={15} color={Colors.lavenderSlate} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSymptom(s.id)}
                          style={styles.iconBtn}
                        >
                          <Trash2 size={15} color={Colors.deepBurgundy} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                );
              })
            ) : (
              <FloralEmptyState
                title="No Symptoms Recorded"
                message="Your health journal is clear. Track any physical sensations, cramps, or changes to empower your doctor consultations with accurate timelines."
                actionLabel="Log a Symptom"
                onActionPress={() => handleOpenAddModal()}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Add / Edit Symptom Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Health Entry' : 'Log a Symptom'}
              </Text>

              <Text style={styles.modalLabel}>Symptom Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Headache, Cramps, Fatigue"
                placeholderTextColor={Colors.mutedText}
                value={symptomName}
                onChangeText={setSymptomName}
              />

              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.catChipsRow}>
                {(['head', 'body', 'digestive', 'respiratory', 'mood', 'reproductive', 'general'] as const).map(
                  (c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setCategory(c)}
                      style={[styles.catChip, category === c && styles.catChipActive]}
                    >
                      <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.modalLabel}>Severity (1 - 10): {severity}/10</Text>
              <View style={styles.severityRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <TouchableOpacity
                    key={num}
                    onPress={() => setSeverity(num)}
                    style={[styles.severityNumBtn, severity === num && styles.severityNumBtnActive]}
                  >
                    <Text
                      style={[
                        styles.severityNumText,
                        severity === num && styles.severityNumTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Body Location</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Left temple, Pelvic, Upper back"
                placeholderTextColor={Colors.mutedText}
                value={bodyLocation}
                onChangeText={setBodyLocation}
              />

              <Text style={styles.modalLabel}>Estimated Duration (minutes)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 60"
                placeholderTextColor={Colors.mutedText}
                keyboardType="numeric"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
              />

              <Text style={styles.modalLabel}>Possible Triggers / Context</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Skipped lunch, Screen glare, Lack of sleep"
                placeholderTextColor={Colors.mutedText}
                value={reportedTriggers}
                onChangeText={setReportedTriggers}
              />

              <Text style={styles.modalLabel}>Detailed Notes</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="How it started, sensations, actions taken..."
                placeholderTextColor={Colors.mutedText}
                value={description}
                onChangeText={setDescription}
              />

              {/* Toggles */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => setHasHappenedBefore(!hasHappenedBefore)}
                  style={[styles.checkbox, hasHappenedBefore && styles.checkboxActive]}
                >
                  <Text style={[styles.checkboxText, hasHappenedBefore && styles.checkboxTextActive]}>
                    Has happened before
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDiscussedWithDoctor(!discussedWithDoctor)}
                  style={[styles.checkbox, discussedWithDoctor && styles.checkboxActive]}
                >
                  <Text style={[styles.checkboxText, discussedWithDoctor && styles.checkboxTextActive]}>
                    Discussed with doctor
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={editingId ? 'Save Changes' : 'Save Symptom'}
                  onPress={handleSaveSymptom}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Voice Input Modal */}
      <VoiceInputModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onConfirmParsedResult={handleVoiceConfirm}
      />
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
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
  },
  tabButtonTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  trackersContainer: {
    gap: 10,
  },
  trackerCard: {
    padding: 16,
    marginVertical: 4,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  trackerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 2,
  },
  trackerDesc: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  trackerBadge: {
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  trackerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.lavenderSlate,
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.deepBurgundy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
    marginBottom: 8,
  },
  chipsScroll: {
    marginBottom: 14,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  quickChipText: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  catFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.paleRoseWhite,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  catFilterChipActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  catFilterText: {
    fontSize: 11,
    color: Colors.mutedText,
    textTransform: 'capitalize',
  },
  catFilterTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyHeaderRow: {
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  symptomCard: {
    padding: 16,
    marginBottom: 10,
  },
  symptomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  symptomTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  symptomLocationDate: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  severityBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  severityHigh: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.deepBurgundy,
  },
  severityNormal: {
    backgroundColor: Colors.softLavender,
    borderColor: 'rgba(217, 218, 228, 0.9)',
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  severityTextHigh: {
    color: Colors.deepBurgundy,
  },
  severityTextNormal: {
    color: Colors.lavenderSlate,
  },
  symptomDesc: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    lineHeight: 18,
    marginBottom: 6,
  },
  symptomTriggers: {
    fontSize: 12,
    color: Colors.mutedText,
    marginBottom: 8,
  },
  symptomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  subtleTag: {
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  subtleTagText: {
    fontSize: 10,
    color: Colors.mutedText,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    padding: 4,
  },

  // Modal Sheet
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
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 14,
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
  catChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  catChipActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  catChipText: {
    fontSize: 11,
    color: Colors.mutedText,
    textTransform: 'capitalize',
  },
  catChipTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  checkbox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.softLavender,
    borderColor: Colors.blossomRose,
  },
  checkboxText: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  checkboxTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 20,
  },
});
