import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Pill,
  Calendar,
  Clock,
  Check,
  Plus,
  PhoneCall,
  AlertTriangle,
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  X,
  Bell,
  CheckCircle2,
  Pencil,
  Repeat,
} from 'lucide-react-native';
import Colors from '../../src/theme/colors';
import Typography from '../../src/theme/typography';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { FloralEmptyState } from '../../src/components/FloralDecorations';
import { storage } from '../../src/services/storageService';
import { notificationService } from '../../src/services/notificationService';
import { Medication, MedicationDoseLog, Appointment, UserProfile } from '../../src/types';

export default function CareScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'medications' | 'appointments'>('medications');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseLogs, setDoseLogs] = useState<MedicationDoseLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Date selection for daily medication schedule
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modals
  const [medModalVisible, setMedModalVisible] = useState(false);
  const [aptModalVisible, setAptModalVisible] = useState(false);

  // New Medication Form
  const [medName, setMedName] = useState('');
  const [medStrength, setMedStrength] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medRelation, setMedRelation] = useState<'after_meal' | 'before_meal' | 'with_meal' | 'no_relation'>('after_meal');
  const [medFrequency, setMedFrequency] = useState<'daily' | 'twice_daily' | 'three_times_daily' | 'as_needed' | 'weekly'>('daily');
  const [medReminderTimes, setMedReminderTimes] = useState<string[]>(['08:00:00']);
  const [medClinician, setMedClinician] = useState('');
  const [medReminderEnabled, setMedReminderEnabled] = useState(true);

  // Appointment Form & Editing
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [docName, setDocName] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine / Gynecology');
  const [aptDate, setAptDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0] + 'T10:00:00';
  });
  const [clinicName, setClinicName] = useState('');
  const [reason, setReason] = useState('');
  const [question1, setQuestion1] = useState('');
  const [question2, setQuestion2] = useState('');
  const [aptReminderEnabled, setAptReminderEnabled] = useState(true);
  const [isMonthlyRecurring, setIsMonthlyRecurring] = useState(false);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const isSelectedToday = selectedDateStr === todayStr;

  const loadCareData = async () => {
    try {
      const p = await storage.getProfile();
      const meds = await storage.getMedications();
      const doses = await storage.getDoseLogs();
      const apts = await storage.getAppointments();

      setProfile(p);
      setMedications(meds);
      setDoseLogs(doses);
      setAppointments(apts);
    } catch (e) {
      console.error('Error loading care data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCareData();
    }, [])
  );

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleSelectToday = () => {
    setSelectedDate(new Date());
  };

  const handleSaveMedication = async () => {
    if (!medName.trim() || !medDosage.trim()) {
      Alert.alert('Required', 'Please enter medicine name and dosage instructions.');
      return;
    }

    const newMed = await storage.addMedication({
      name: medName.trim(),
      strength: medStrength.trim() || undefined,
      dosage_instructions: medDosage.trim(),
      schedule_type: medFrequency,
      reminder_times: medReminderTimes,
      relation_to_meals: medRelation,
      prescribing_clinician: medClinician.trim() || undefined,
      start_date: todayStr,
      is_active: true,
    });

    if (medReminderEnabled && medReminderTimes.length > 0) {
      for (const t of medReminderTimes) {
        await notificationService.scheduleMedicationReminder(
          newMed.id,
          newMed.name,
          t,
          true
        );
      }
    }

    setMedModalVisible(false);
    setMedName('');
    setMedStrength('');
    setMedDosage('');
    setMedClinician('');
    setMedReminderTimes(['08:00:00']);
    loadCareData();
  };

  const handleDeleteMedication = (id: string, name: string) => {
    Alert.alert(
      'Remove Medication',
      `Are you sure you want to remove ${name}? This will also cancel its scheduled reminders.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await storage.deleteMedication(id);
            await notificationService.cancelMedicationReminders(id);
            loadCareData();
          },
        },
      ]
    );
  };

  const handleOpenAddAppointment = () => {
    setEditingAppointment(null);
    setDocName('');
    setSpecialty('General Medicine / Gynecology');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setAptDate(d.toISOString().split('T')[0] + 'T10:00:00');
    setClinicName('');
    setReason('');
    setQuestion1('');
    setQuestion2('');
    setAptReminderEnabled(true);
    setIsMonthlyRecurring(false);
    setAptModalVisible(true);
  };

  const handleOpenEditAppointment = (apt: Appointment) => {
    setEditingAppointment(apt);
    setDocName(apt.clinician_or_clinic_name);
    setSpecialty(apt.specialty || '');
    setAptDate(apt.appointment_at || new Date().toISOString().slice(0, 19));
    setClinicName(apt.location_or_link || '');
    setReason(apt.reason_for_visit || '');
    setQuestion1(apt.questions_to_ask?.[0] || '');
    setQuestion2(apt.questions_to_ask?.[1] || '');
    setAptReminderEnabled(apt.reminder_enabled !== false);
    setIsMonthlyRecurring(!!apt.is_monthly_recurring);
    setAptModalVisible(true);
  };

  const handleSaveAppointment = async () => {
    if (!docName.trim()) {
      Alert.alert('Required', 'Please enter clinician or clinic name.');
      return;
    }

    const questions: string[] = [];
    if (question1.trim()) questions.push(question1.trim());
    if (question2.trim()) questions.push(question2.trim());

    if (editingAppointment) {
      await storage.updateAppointment(editingAppointment.id, {
        clinician_or_clinic_name: docName.trim(),
        specialty: specialty.trim() || undefined,
        appointment_at: aptDate,
        location_or_link: clinicName.trim() || undefined,
        reason_for_visit: reason.trim() || undefined,
        questions_to_ask: questions,
        reminder_enabled: aptReminderEnabled,
        is_monthly_recurring: isMonthlyRecurring,
      });

      // Cancel previous reminders and reschedule
      await notificationService.cancelAppointmentReminders(editingAppointment.id);

      if (aptReminderEnabled) {
        await notificationService.scheduleAppointmentReminder(
          editingAppointment.id,
          docName.trim(),
          new Date(aptDate)
        );
      }

      if (isMonthlyRecurring) {
        const parsedDate = new Date(aptDate);
        const dayOfMonth = !isNaN(parsedDate.getDate()) ? parsedDate.getDate() : 1;
        const timePart = aptDate.includes('T') ? aptDate.split('T')[1].substring(0, 5) : '09:00';
        await notificationService.scheduleMonthlyDoctorReminder(
          editingAppointment.id,
          docName.trim(),
          dayOfMonth,
          timePart
        );
      }
    } else {
      const newApt = await storage.addAppointment({
        clinician_or_clinic_name: docName.trim(),
        specialty: specialty.trim() || undefined,
        appointment_at: aptDate,
        location_or_link: clinicName.trim() || undefined,
        reason_for_visit: reason.trim() || undefined,
        questions_to_ask: questions,
        reminder_enabled: aptReminderEnabled,
        is_monthly_recurring: isMonthlyRecurring,
        status: 'scheduled',
      });

      if (aptReminderEnabled) {
        await notificationService.scheduleAppointmentReminder(
          newApt.id,
          newApt.clinician_or_clinic_name,
          new Date(newApt.appointment_at)
        );
      }

      if (isMonthlyRecurring) {
        const parsedDate = new Date(newApt.appointment_at);
        const dayOfMonth = !isNaN(parsedDate.getDate()) ? parsedDate.getDate() : 1;
        const timePart = newApt.appointment_at.includes('T') ? newApt.appointment_at.split('T')[1].substring(0, 5) : '09:00';
        await notificationService.scheduleMonthlyDoctorReminder(
          newApt.id,
          newApt.clinician_or_clinic_name,
          dayOfMonth,
          timePart
        );
      }
    }

    setAptModalVisible(false);
    setEditingAppointment(null);
    setDocName('');
    setClinicName('');
    setReason('');
    setQuestion1('');
    setQuestion2('');
    loadCareData();
  };

  const handleDeleteAppointment = (id: string) => {
    Alert.alert('Cancel Consultation', 'Remove this scheduled appointment from your calendar?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await storage.deleteAppointment(id);
          await notificationService.cancelAppointmentReminders(id);
          loadCareData();
        },
      },
    ]);
  };

  // Record individual dose action for a specific scheduled time
  const handleRecordDose = async (
    medId: string,
    timeStr: string,
    status: 'taken' | 'skipped' | 'missed'
  ) => {
    const scheduledAt = `${selectedDateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`;
    await storage.recordDoseAction(medId, scheduledAt, status);
    loadCareData();
  };

  // Selected date's dose logs
  const selectedDateDoses = doseLogs.filter((d) => d.scheduled_at.startsWith(selectedDateStr));

  // Compute daily schedule items grouped by time of day
  interface ScheduleItem {
    medication: Medication;
    time: string;
    scheduledAt: string;
    log?: MedicationDoseLog;
    timeGroup: 'morning' | 'afternoon' | 'evening' | 'night';
  }

  const activeMeds = medications.filter((m) => m.is_active);
  const scheduleItems: ScheduleItem[] = [];

  for (const med of activeMeds) {
    const times = med.reminder_times.length > 0 ? med.reminder_times : ['08:00:00'];
    for (const t of times) {
      const scheduledAt = `${selectedDateStr}T${t.length === 5 ? t + ':00' : t}`;
      const log = selectedDateDoses.find((d) => d.medication_id === med.id && d.scheduled_at === scheduledAt);

      const hour = parseInt(t.split(':')[0], 10);
      let timeGroup: ScheduleItem['timeGroup'] = 'morning';
      if (hour >= 12 && hour < 17) timeGroup = 'afternoon';
      else if (hour >= 17 && hour < 21) timeGroup = 'evening';
      else if (hour >= 21 || hour < 5) timeGroup = 'night';

      scheduleItems.push({
        medication: med,
        time: t,
        scheduledAt,
        log,
        timeGroup,
      });
    }
  }

  // Sort schedule items chronologically
  scheduleItems.sort((a, b) => a.time.localeCompare(b.time));

  const totalDosesToday = scheduleItems.length;
  const takenDosesToday = scheduleItems.filter((s) => s.log?.status === 'taken').length;
  const adherenceRate =
    doseLogs.length > 0
      ? Math.round((doseLogs.filter((d) => d.status === 'taken').length / doseLogs.length) * 100)
      : 100;

  const formattedHeaderDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <View style={styles.headerTag}>
            <Sparkles size={11} color={Colors.deepBurgundy} />
            <Text style={styles.headerTagText}>Care & Prescriptions</Text>
          </View>
          <Text style={styles.screenTitle}>Care & Regimen</Text>
          <Text style={styles.screenSubtitle}>
            Personalized medication routines, dose adherence, and clinician visits
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'medications' && styles.tabButtonActive]}
            onPress={() => setActiveTab('medications')}
          >
            <Pill size={15} color={activeTab === 'medications' ? Colors.deepBurgundy : Colors.mutedText} />
            <Text style={[styles.tabButtonText, activeTab === 'medications' && styles.tabButtonTextActive]}>
              Medication Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'appointments' && styles.tabButtonActive]}
            onPress={() => setActiveTab('appointments')}
          >
            <Calendar size={15} color={activeTab === 'appointments' ? Colors.deepBurgundy : Colors.mutedText} />
            <Text style={[styles.tabButtonText, activeTab === 'appointments' && styles.tabButtonTextActive]}>
              Consultations ({appointments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Assistance Quick Bar */}
        <Card style={styles.emergencyCard} variant="urgent">
          <View style={styles.emergencyRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} color={Colors.deepBurgundy} />
                <Text style={styles.emergencyTitle}>Emergency Services</Text>
              </View>
              <Text style={styles.emergencySub}>
                Helpline: 112 • Contact: {profile?.emergency_contact_phone || 'Family not set'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL('tel:112')} style={styles.emergencyDialBtn}>
              <PhoneCall size={13} color={Colors.white} />
              <Text style={styles.emergencyDialText}>112</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {activeTab === 'medications' ? (
          <>
            {/* Daily Date Navigator */}
            <View style={styles.dateNavRow}>
              <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavBtn}>
                <ChevronLeft size={18} color={Colors.deepBurgundy} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSelectToday} style={styles.dateNavCenter}>
                <Text style={styles.dateNavTitle}>{formattedHeaderDate}</Text>
                {isSelectedToday ? (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>Today</Text>
                  </View>
                ) : (
                  <Text style={styles.tapForTodayText}>Tap to return to Today</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextDay} style={styles.dateNavBtn}>
                <ChevronRight size={18} color={Colors.deepBurgundy} />
              </TouchableOpacity>
            </View>

            {/* Daily Adherence Progress */}
            <Card style={styles.summaryCard} variant="rose">
              <View style={styles.summaryHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryCardTitle}>
                    {totalDosesToday > 0
                      ? `${takenDosesToday} of ${totalDosesToday} doses completed`
                      : 'No scheduled doses for this date'}
                  </Text>
                  <Text style={styles.summaryCardSub}>
                    Overall recorded adherence: {adherenceRate}%
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setMedModalVisible(true)} style={styles.addMedHeroBtn}>
                  <Plus size={14} color={Colors.white} />
                  <Text style={styles.addMedHeroText}>Add Medicine</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Daily Schedule List */}
            {scheduleItems.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.sectionHeaderTitle}>Scheduled Routine</Text>
                {scheduleItems.map((item, idx) => {
                  const m = item.medication;
                  const isTaken = item.log?.status === 'taken';
                  const isSkipped = item.log?.status === 'skipped';

                  return (
                    <Card key={`${m.id}-${item.time}-${idx}`} style={styles.scheduleCard} variant="elevated">
                      <View style={styles.scheduleRow}>
                        <View style={[styles.timeCircle, isTaken && styles.timeCircleTaken]}>
                          <Clock size={14} color={isTaken ? Colors.white : Colors.deepBurgundy} />
                          <Text style={[styles.timeText, isTaken && { color: Colors.white }]}>
                            {item.time.substring(0, 5)}
                          </Text>
                        </View>

                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.medName}>
                              {m.name} {m.strength ? `(${m.strength})` : ''}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteMedication(m.id, m.name)}
                              style={{ padding: 4 }}
                            >
                              <Trash2 size={14} color={Colors.mutedText} />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.medInstructions}>{m.dosage_instructions}</Text>
                          {m.relation_to_meals && (
                            <Text style={styles.medRelation}>
                              Timing: {m.relation_to_meals.replace(/_/g, ' ')}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Dose Action Buttons */}
                      <View style={styles.doseActionRow}>
                        <View style={styles.statusIndicatorRow}>
                          <Text style={styles.doseStatusLabel}>Status: </Text>
                          <Text
                            style={[
                              styles.doseStatusValue,
                              isTaken && { color: Colors.deepBurgundy },
                              isSkipped && { color: Colors.lavenderSlate },
                            ]}
                          >
                            {isTaken ? 'Taken ✓' : isSkipped ? 'Skipped' : 'Pending'}
                          </Text>
                        </View>

                        <View style={styles.doseButtonActions}>
                          <TouchableOpacity
                            onPress={() => handleRecordDose(m.id, item.time, isTaken ? 'missed' : 'taken')}
                            style={[styles.actionBtn, isTaken ? styles.actionBtnActive : styles.actionBtnOutline]}
                          >
                            <Check size={14} color={isTaken ? Colors.white : Colors.deepBurgundy} />
                            <Text style={[styles.actionBtnText, isTaken && { color: Colors.white }]}>
                              {isTaken ? 'Taken' : 'Mark Taken'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleRecordDose(m.id, item.time, 'skipped')}
                            style={[styles.skipBtn, isSkipped && styles.skipBtnActive]}
                          >
                            <Text style={[styles.skipBtnText, isSkipped && { color: Colors.white }]}>
                              {isSkipped ? 'Skipped' : 'Skip'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <FloralEmptyState
                title="Your Medication Routine is Clear"
                message="No prescription or daily supplement has been added yet. Add your medications to automate reminders and protect adherence."
                actionLabel="Add Medication"
                onActionPress={() => setMedModalVisible(true)}
              />
            )}
          </>
        ) : (
          /* APPOINTMENTS TAB */
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Consultations & Doctor Visits</Text>
              <TouchableOpacity onPress={handleOpenAddAppointment} style={styles.addBtnSmall}>
                <Plus size={13} color={Colors.deepBurgundy} />
                <Text style={styles.addBtnText}>New Visit</Text>
              </TouchableOpacity>
            </View>

            {/* Doctor Summary Generator Card */}
            <Card style={styles.consultationPrepCard} variant="rose">
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.consultationPrepTitle}>Doctor-Ready Summary</Text>
                <Text style={styles.consultationPrepSub}>
                  Consolidate your symptoms, vitals, and questions into a clear briefing before your visit.
                </Text>
              </View>
              <Button
                title="Prepare Summary"
                size="small"
                onPress={() => router.push('/consultation-summary')}
              />
            </Card>

            {appointments.length > 0 ? (
              appointments.map((apt) => (
                <Card key={apt.id} style={styles.appointmentCard} variant="elevated">
                  <View style={styles.aptHeader}>
                    <View style={styles.aptIconCircle}>
                      <Stethoscope size={18} color={Colors.deepBurgundy} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.doctorName}>{apt.clinician_or_clinic_name}</Text>
                        {apt.is_monthly_recurring && (
                          <View style={styles.monthlyBadge}>
                            <Repeat size={10} color={Colors.deepBurgundy} />
                            <Text style={styles.monthlyBadgeText}>Monthly</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.specialtyText}>{apt.specialty || 'Healthcare Provider'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => handleOpenEditAppointment(apt)}
                        style={{ padding: 6 }}
                        accessibilityLabel="Edit consultation"
                      >
                        <Pencil size={15} color={Colors.deepBurgundy} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteAppointment(apt.id)}
                        style={{ padding: 6 }}
                        accessibilityLabel="Delete consultation"
                      >
                        <Trash2 size={16} color={Colors.mutedText} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.aptDetailsBox}>
                    <View style={styles.aptDetailRow}>
                      <Calendar size={13} color={Colors.mutedText} />
                      <Text style={styles.aptDetailText}>
                        {new Date(apt.appointment_at).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {apt.reason_for_visit && (
                      <View style={[styles.aptDetailRow, { marginTop: 4 }]}>
                        <Sparkles size={13} color={Colors.mutedText} />
                        <Text style={styles.aptDetailText}>Reason: {apt.reason_for_visit}</Text>
                      </View>
                    )}
                  </View>

                  {apt.questions_to_ask && apt.questions_to_ask.length > 0 && (
                    <View style={styles.questionsContainer}>
                      <Text style={styles.questionsTitle}>Questions for Clinician:</Text>
                      {apt.questions_to_ask.map((q, qIdx) => (
                        <Text key={qIdx} style={styles.questionItem}>• {q}</Text>
                      ))}
                    </View>
                  )}
                </Card>
              ))
            ) : (
              <FloralEmptyState
                title="No Consultations Scheduled"
                message="Keep track of your gynecologist, endocrinologist, or GP visits and prepare questions in advance."
                actionLabel="Schedule Consultation"
                onActionPress={handleOpenAddAppointment}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal visible={medModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medication</Text>
              <TouchableOpacity onPress={() => setMedModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Medication Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Thyronorm, Metformin, Multivitamin"
                placeholderTextColor={Colors.mutedText}
                value={medName}
                onChangeText={setMedName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalLabel}>Strength / Dose</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 500 mg, 25 mcg"
                    placeholderTextColor={Colors.mutedText}
                    value={medStrength}
                    onChangeText={setMedStrength}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.modalLabel}>Relation to Meals</Text>
                  <View style={styles.mealChipsRow}>
                    {(['before_meal', 'after_meal', 'no_relation'] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setMedRelation(r)}
                        style={[styles.miniChip, medRelation === r && styles.miniChipActive]}
                      >
                        <Text style={[styles.miniChipText, medRelation === r && styles.miniChipTextActive]}>
                          {r.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.modalLabel}>Dosage Instructions *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1 tablet in the morning"
                placeholderTextColor={Colors.mutedText}
                value={medDosage}
                onChangeText={setMedDosage}
              />

              <Text style={styles.modalLabel}>Frequency</Text>
              <View style={styles.optionsWrap}>
                {[
                  { key: 'daily', label: 'Once Daily', times: ['08:00:00'] },
                  { key: 'twice_daily', label: 'Twice Daily', times: ['08:00:00', '20:00:00'] },
                  { key: 'three_times_daily', label: '3x Daily', times: ['08:00:00', '14:00:00', '20:00:00'] },
                  { key: 'as_needed', label: 'As Needed (SOS)', times: ['08:00:00'] },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => {
                      setMedFrequency(f.key as any);
                      setMedReminderTimes(f.times);
                    }}
                    style={[styles.freqChip, medFrequency === f.key && styles.freqChipActive]}
                  >
                    <Text style={[styles.freqChipText, medFrequency === f.key && styles.freqChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Reminder Times</Text>
              <View style={styles.timesListRow}>
                {medReminderTimes.map((t, tIdx) => (
                  <View key={tIdx} style={styles.timeBadge}>
                    <Clock size={12} color={Colors.deepBurgundy} />
                    <Text style={styles.timeBadgeText}>{t.substring(0, 5)}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.modalLabel}>Prescribing Clinician (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Sharma"
                placeholderTextColor={Colors.mutedText}
                value={medClinician}
                onChangeText={setMedClinician}
              />

              <Button
                title="Save Medication"
                onPress={handleSaveMedication}
                style={{ marginTop: 14, marginBottom: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Appointment Modal */}
      <Modal visible={aptModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAppointment ? 'Edit Consultation' : 'Schedule Consultation'}
              </Text>
              <TouchableOpacity onPress={() => setAptModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Clinician / Clinic Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Sunita Rao"
                placeholderTextColor={Colors.mutedText}
                value={docName}
                onChangeText={setDocName}
              />

              <Text style={styles.modalLabel}>Specialty</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Obstetrics & Gynecology, Endocrinology"
                placeholderTextColor={Colors.mutedText}
                value={specialty}
                onChangeText={setSpecialty}
              />

              <Text style={styles.modalLabel}>Date & Time (YYYY-MM-DDTHH:MM)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 2026-11-10T10:30:00"
                placeholderTextColor={Colors.mutedText}
                value={aptDate}
                onChangeText={setAptDate}
              />

              <Text style={styles.modalLabel}>Location / Clinic Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Apollo Clinic, Bangalore"
                placeholderTextColor={Colors.mutedText}
                value={clinicName}
                onChangeText={setClinicName}
              />

              <Text style={styles.modalLabel}>Reason for Visit</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Routine checkup, PCOS symptom review"
                placeholderTextColor={Colors.mutedText}
                value={reason}
                onChangeText={setReason}
              />

              {/* Monthly Recurring Reminder Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.toggleLabel}>Monthly Recurring Reminder</Text>
                  <Text style={styles.toggleSub}>
                    Repeat reminder on this day every month for routine checkups
                  </Text>
                </View>
                <Switch
                  value={isMonthlyRecurring}
                  onValueChange={setIsMonthlyRecurring}
                  trackColor={{ false: Colors.fineBorder, true: Colors.blossomRose }}
                  thumbColor={isMonthlyRecurring ? Colors.deepBurgundy : '#f4f3f4'}
                />
              </View>

              <Text style={styles.modalLabel}>Question to ask doctor #1</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Should we check hormone panel?"
                placeholderTextColor={Colors.mutedText}
                value={question1}
                onChangeText={setQuestion1}
              />

              <Text style={styles.modalLabel}>Question to ask doctor #2</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Are my cramps within expected baseline?"
                placeholderTextColor={Colors.mutedText}
                value={question2}
                onChangeText={setQuestion2}
              />

              <Button
                title={editingAppointment ? 'Update Consultation' : 'Save Consultation'}
                onPress={handleSaveAppointment}
                style={{ marginTop: 14, marginBottom: 20 }}
              />
            </ScrollView>
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
    marginBottom: 12,
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
    borderRadius: 18,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
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
  emergencyCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  emergencySub: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 1,
  },
  emergencyDialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.deepBurgundy,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  emergencyDialText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.softWhite,
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  dateNavBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.softLavenderMist,
  },
  dateNavCenter: {
    alignItems: 'center',
  },
  dateNavTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  todayBadge: {
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginTop: 2,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  tapForTodayText: {
    fontSize: 10,
    color: Colors.deepBurgundy,
    marginTop: 2,
  },
  summaryCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  summaryCardSub: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  addMedHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.deepBurgundy,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  addMedHeroText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 10,
    fontFamily: Typography.heading,
  },
  scheduleCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: Colors.softWhite,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  timeCircleTaken: {
    backgroundColor: Colors.deepBurgundy,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    marginTop: 2,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
  },
  medInstructions: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 2,
  },
  medRelation: {
    fontSize: 11,
    color: Colors.deepBurgundy,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  doseActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.softLavenderMist,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doseStatusLabel: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  doseStatusValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mutedText,
  },
  doseButtonActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionBtnOutline: {
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  actionBtnActive: {
    backgroundColor: Colors.deepBurgundy,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.softLavenderMist,
  },
  skipBtnActive: {
    backgroundColor: Colors.lavenderSlate,
  },
  skipBtnText: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.paleRoseWhite,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  consultationPrepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  consultationPrepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  consultationPrepSub: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  appointmentCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: Colors.softWhite,
  },
  aptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aptIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.paleRoseWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
  },
  specialtyText: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 1,
  },
  aptDetailsBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.softLavenderMist,
    borderRadius: 12,
  },
  aptDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aptDetailText: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    fontWeight: '500',
  },
  questionsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.softLavenderMist,
  },
  questionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    marginBottom: 4,
  },
  questionItem: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 43, 58, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.softWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.lavenderSlate,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniChip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: Colors.softLavenderMist,
  },
  miniChipActive: {
    backgroundColor: Colors.deepBurgundy,
  },
  miniChipText: {
    fontSize: 10,
    color: Colors.lavenderSlate,
    textTransform: 'capitalize',
  },
  miniChipTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  freqChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  freqChipActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  freqChipText: {
    fontSize: 11,
    color: Colors.lavenderSlate,
    fontWeight: '500',
  },
  freqChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  timesListRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  monthlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.paleRoseWhite,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.blossomRose,
  },
  monthlyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.softLavenderMist,
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  toggleSub: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
});
