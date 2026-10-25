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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseLogs, setDoseLogs] = useState<MedicationDoseLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Modals
  const [medModalVisible, setMedModalVisible] = useState(false);
  const [aptModalVisible, setAptModalVisible] = useState(false);

  // New Medication Form
  const [medName, setMedName] = useState('');
  const [medStrength, setMedStrength] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medRelation, setMedRelation] = useState<'after_meal' | 'before_meal' | 'with_meal' | 'no_relation'>('after_meal');
  const [medTime, setMedTime] = useState('09:00:00');
  const [medClinician, setMedClinician] = useState('');

  // New Appointment Form
  const [docName, setDocName] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine / Gynecology');
  const [aptDate, setAptDate] = useState('2026-10-30T10:00:00');
  const [reason, setReason] = useState('');
  const [question1, setQuestion1] = useState('');
  const [question2, setQuestion2] = useState('');

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

      if (meds.length === 0) {
        await storage.addMedication({
          name: 'Thyronorm',
          strength: '25 mcg',
          dosage_instructions: '1 tablet once daily in the morning',
          schedule_type: 'daily',
          reminder_times: ['08:00:00'],
          relation_to_meals: 'before_meal',
          prescribing_clinician: 'Dr. Sharma',
          start_date: '2026-09-01',
          is_active: true,
        });
        const updatedMeds = await storage.getMedications();
        setMedications(updatedMeds);
      }

      if (apts.length === 0) {
        await storage.addAppointment({
          clinician_or_clinic_name: 'Dr. Sunita Rao',
          specialty: 'Obstetrics & Gynecology',
          appointment_at: '2026-11-05T10:30:00',
          location_or_link: 'Apollo Clinic, Bangalore',
          reason_for_visit: 'Routine wellness & PCOS follow-up',
          questions_to_ask: [
            'Should we repeat the thyroid panel?',
            'Are my recurring headaches related to sleep patterns or hormones?',
          ],
          reminder_enabled: true,
          status: 'scheduled',
        });
        const updatedApts = await storage.getAppointments();
        setAppointments(updatedApts);
      }
    } catch (e) {
      console.error('Error loading care data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCareData();
    }, [])
  );

  const handleSaveMedication = async () => {
    if (!medName.trim() || !medDosage.trim()) {
      Alert.alert('Required', 'Please enter medicine name and dosage instructions.');
      return;
    }

    const newMed = await storage.addMedication({
      name: medName.trim(),
      strength: medStrength.trim() || undefined,
      dosage_instructions: medDosage.trim(),
      schedule_type: 'daily',
      reminder_times: [medTime],
      relation_to_meals: medRelation,
      prescribing_clinician: medClinician.trim() || undefined,
      start_date: new Date().toISOString().split('T')[0],
      is_active: true,
    });

    await notificationService.scheduleMedicationReminder(
      newMed.id,
      newMed.name,
      medTime,
      true
    );

    setMedModalVisible(false);
    setMedName('');
    setMedStrength('');
    setMedDosage('');
    loadCareData();
  };

  const handleSaveAppointment = async () => {
    if (!docName.trim()) {
      Alert.alert('Required', 'Please enter clinician or clinic name.');
      return;
    }

    const questions: string[] = [];
    if (question1.trim()) questions.push(question1.trim());
    if (question2.trim()) questions.push(question2.trim());

    const newApt = await storage.addAppointment({
      clinician_or_clinic_name: docName.trim(),
      specialty: specialty.trim() || undefined,
      appointment_at: aptDate,
      reason_for_visit: reason.trim() || undefined,
      questions_to_ask: questions,
      reminder_enabled: true,
      status: 'scheduled',
    });

    await notificationService.scheduleAppointmentReminder(
      newApt.id,
      newApt.clinician_or_clinic_name,
      new Date(newApt.appointment_at)
    );

    setAptModalVisible(false);
    setDocName('');
    setReason('');
    setQuestion1('');
    setQuestion2('');
    loadCareData();
  };

  const handleRecordDose = async (medId: string, status: 'taken' | 'skipped' | 'missed') => {
    const today = new Date().toISOString().split('T')[0];
    await storage.logMedicationDose({
      medication_id: medId,
      scheduled_at: `${today}T09:00:00`,
      logged_at: new Date().toISOString(),
      status,
    });
    loadCareData();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDoses = doseLogs.filter((d) => d.scheduled_at.startsWith(todayStr));

  const adherenceRate =
    doseLogs.length > 0
      ? Math.round(
          (doseLogs.filter((d) => d.status === 'taken').length / doseLogs.length) * 100
        )
      : 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <View style={styles.headerTag}>
            <Sparkles size={11} color={Colors.deepBurgundy} />
            <Text style={styles.headerTagText}>Care & Prescriptions</Text>
          </View>
          <Text style={styles.screenTitle}>Care & Appointments</Text>
          <Text style={styles.screenSubtitle}>
            Personalized medication routines, clinician visits, and question preparation
          </Text>
        </View>

        {/* Emergency Assistance Quick Dial Bar */}
        <Card style={styles.emergencyCard} variant="urgent">
          <View style={styles.emergencyRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} color={Colors.deepBurgundy} />
                <Text style={styles.emergencyTitle}>Emergency Services</Text>
              </View>
              <Text style={styles.emergencySub}>
                Helpline: 112 • Contact: {profile?.emergency_contact_phone || 'Family not set'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL('tel:112')}
              style={styles.emergencyDialBtn}
            >
              <PhoneCall size={14} color={Colors.white} />
              <Text style={styles.emergencyDialText}>112</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Doctor Consultation Summary Shortcut */}
        <Card style={styles.summaryCard} variant="rose">
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.summaryCardTitle}>Doctor-Ready Consultation Summary</Text>
              <Text style={styles.summaryCardSub}>
                Organize your symptoms, lab results, and questions before meeting your clinician.
              </Text>
            </View>
            <Button
              title="Open Summary"
              onPress={() => router.push('/consultation-summary')}
              size="small"
              variant="primary"
            />
          </View>
        </Card>

        {/* Active Prescriptions Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Prescriptions & Medicines</Text>
          <TouchableOpacity onPress={() => setMedModalVisible(true)} style={styles.addBtnSmall}>
            <Plus size={13} color={Colors.deepBurgundy} />
            <Text style={styles.addBtnText}>Add Medicine</Text>
          </TouchableOpacity>
        </View>

        {/* Adherence Mini Stat */}
        <View style={styles.adherenceBox}>
          <Text style={styles.adherenceText}>
            Recorded 30-Day Medication Adherence: <Text style={{ fontWeight: '800', color: Colors.deepBurgundy }}>{adherenceRate}%</Text>
          </Text>
        </View>

        {medications.length > 0 ? (
          medications.map((m) => {
            const doseToday = todayDoses.find((d) => d.medication_id === m.id);

            return (
              <Card key={m.id} style={styles.medCard} variant="elevated">
                <View style={styles.medHeader}>
                  <View style={styles.medIconBox}>
                    <Pill size={18} color={Colors.deepBurgundy} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.medName}>
                      {m.name} {m.strength ? `(${m.strength})` : ''}
                    </Text>
                    <Text style={styles.medInstructions}>{m.dosage_instructions}</Text>
                    {m.relation_to_meals && (
                      <Text style={styles.medRelation}>
                        Timing: {m.relation_to_meals.replace('_', ' ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.timeTag}>
                    <Clock size={11} color={Colors.mutedText} style={{ marginRight: 4 }} />
                    <Text style={styles.timeTagText}>
                      {m.reminder_times[0]?.substring(0, 5) || '09:00'}
                    </Text>
                  </View>
                </View>

                {/* Today's Dose Status & Action */}
                <View style={styles.doseActionRow}>
                  <Text style={styles.doseActionPrompt}>
                    Today's status:{' '}
                    <Text style={{ fontWeight: '700', color: Colors.lavenderSlate, textTransform: 'capitalize' }}>
                      {doseToday ? doseToday.status : 'Pending'}
                    </Text>
                  </Text>

                  <View style={styles.doseBtnGroup}>
                    <TouchableOpacity
                      onPress={() => handleRecordDose(m.id, 'taken')}
                      style={[styles.doseBtn, doseToday?.status === 'taken' && styles.doseBtnActive]}
                    >
                      <Check size={13} color={doseToday?.status === 'taken' ? Colors.white : Colors.lavenderSlate} />
                      <Text style={[styles.doseBtnText, doseToday?.status === 'taken' && styles.doseBtnTextActive]}>
                        Taken
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRecordDose(m.id, 'skipped')}
                      style={[styles.doseBtn, doseToday?.status === 'skipped' && styles.doseBtnActiveSecondary]}
                    >
                      <Text style={[styles.doseBtnText, doseToday?.status === 'skipped' && styles.doseBtnTextActiveSecondary]}>
                        Skip
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRecordDose(m.id, 'missed')}
                      style={[styles.doseBtn, doseToday?.status === 'missed' && styles.doseBtnActiveMuted]}
                    >
                      <Text style={[styles.doseBtnText, doseToday?.status === 'missed' && styles.doseBtnTextActiveMuted]}>
                        Missed
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <FloralEmptyState
            title="No Medications Scheduled"
            message="Add your daily vitamins, supplements, or prescriptions to receive gentle reminders and track adherence."
            actionLabel="Add Medication"
            onActionPress={() => setMedModalVisible(true)}
          />
        )}

        {/* Appointments Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Consultations & Follow-ups</Text>
          <TouchableOpacity onPress={() => setAptModalVisible(true)} style={styles.addBtnSmall}>
            <Plus size={13} color={Colors.deepBurgundy} />
            <Text style={styles.addBtnText}>Add Visit</Text>
          </TouchableOpacity>
        </View>

        {appointments.length > 0 ? (
          appointments.map((apt) => {
            const aptDateObj = new Date(apt.appointment_at);
            const formattedDateStr = aptDateObj.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card key={apt.id} style={styles.aptCard} variant="lavender">
                <View style={styles.aptHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{apt.clinician_or_clinic_name}</Text>
                    <Text style={styles.docSpecialty}>{apt.specialty}</Text>
                  </View>
                  <View style={styles.aptStatusBadge}>
                    <Text style={styles.aptStatusText}>{apt.status}</Text>
                  </View>
                </View>

                <View style={styles.aptDateRow}>
                  <Calendar size={13} color={Colors.deepBurgundy} style={{ marginRight: 6 }} />
                  <Text style={styles.aptDateText}>{formattedDateStr}</Text>
                </View>

                {apt.location_or_link && (
                  <Text style={styles.aptLocation}>{apt.location_or_link}</Text>
                )}

                {apt.questions_to_ask && apt.questions_to_ask.length > 0 && (
                  <View style={styles.questionsBox}>
                    <Text style={styles.questionsTitle}>Prepared Questions for Doctor:</Text>
                    {apt.questions_to_ask.map((q, idx) => (
                      <Text key={idx} style={styles.questionItem}>
                        • {q}
                      </Text>
                    ))}
                  </View>
                )}
              </Card>
            );
          })
        ) : (
          <FloralEmptyState
            title="No Upcoming Consultations"
            message="Schedule upcoming visits with your doctor or gynecologist and prepare your clinical questions in advance."
            actionLabel="Schedule Appointment"
            onActionPress={() => setAptModalVisible(true)}
          />
        )}
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal visible={medModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add Medication Routine</Text>

              <Text style={styles.modalLabel}>Medicine Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Thyronorm, Metformin, Vitamin D"
                placeholderTextColor={Colors.mutedText}
                value={medName}
                onChangeText={setMedName}
              />

              <Text style={styles.modalLabel}>Strength / Dosage</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 25 mcg, 500 mg"
                placeholderTextColor={Colors.mutedText}
                value={medStrength}
                onChangeText={setMedStrength}
              />

              <Text style={styles.modalLabel}>Instructions *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1 tablet once daily in the morning"
                placeholderTextColor={Colors.mutedText}
                value={medDosage}
                onChangeText={setMedDosage}
              />

              <Text style={styles.modalLabel}>Relation to Meals</Text>
              <View style={styles.relationRow}>
                {[
                  { key: 'before_meal', label: 'Before Meal' },
                  { key: 'after_meal', label: 'After Meal' },
                  { key: 'with_meal', label: 'With Meal' },
                  { key: 'no_relation', label: 'Anytime' },
                ].map((rel) => (
                  <TouchableOpacity
                    key={rel.key}
                    onPress={() => setMedRelation(rel.key as any)}
                    style={[styles.relationBtn, medRelation === rel.key && styles.relationBtnActive]}
                  >
                    <Text style={[styles.relationText, medRelation === rel.key && styles.relationTextActive]}>
                      {rel.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Reminder Time</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 09:00:00"
                placeholderTextColor={Colors.mutedText}
                value={medTime}
                onChangeText={setMedTime}
              />

              <Text style={styles.modalLabel}>Prescribing Doctor (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Sunita Rao"
                placeholderTextColor={Colors.mutedText}
                value={medClinician}
                onChangeText={setMedClinician}
              />

              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setMedModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Save Routine"
                  onPress={handleSaveMedication}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Appointment Modal */}
      <Modal visible={aptModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Schedule Consultation</Text>

              <Text style={styles.modalLabel}>Clinician or Clinic Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. Sunita Rao (Apollo Clinic)"
                placeholderTextColor={Colors.mutedText}
                value={docName}
                onChangeText={setDocName}
              />

              <Text style={styles.modalLabel}>Specialty</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Gynecology, Endocrinology"
                placeholderTextColor={Colors.mutedText}
                value={specialty}
                onChangeText={setSpecialty}
              />

              <Text style={styles.modalLabel}>Date & Time (ISO format)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DDTHH:MM:SS"
                placeholderTextColor={Colors.mutedText}
                value={aptDate}
                onChangeText={setAptDate}
              />

              <Text style={styles.modalLabel}>Primary Reason for Visit</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Routine 6-month checkup, PCOS review"
                placeholderTextColor={Colors.mutedText}
                value={reason}
                onChangeText={setReason}
              />

              <Text style={styles.modalLabel}>Questions to Ask Clinician</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Question 1 (e.g. Should I recheck ferritin?)"
                placeholderTextColor={Colors.mutedText}
                value={question1}
                onChangeText={setQuestion1}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Question 2 (e.g. Recommended diet changes?)"
                placeholderTextColor={Colors.mutedText}
                value={question2}
                onChangeText={setQuestion2}
              />

              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setAptModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Save Visit"
                  onPress={handleSaveAppointment}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
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
  emergencyCard: {
    padding: 12,
    marginVertical: 6,
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
    fontFamily: Typography.heading,
  },
  emergencySub: {
    fontSize: 11,
    color: Colors.lavenderSlate,
    marginTop: 2,
  },
  emergencyDialBtn: {
    backgroundColor: Colors.deepBurgundy,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  emergencyDialText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  summaryCard: {
    padding: 16,
    marginVertical: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
    marginBottom: 3,
  },
  summaryCardSub: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    lineHeight: 17,
  },
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
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  adherenceBox: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    marginBottom: 10,
  },
  adherenceText: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  medCard: {
    padding: 16,
    marginBottom: 10,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paleRoseWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
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
    fontStyle: 'italic',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  doseActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
  },
  doseActionPrompt: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  doseBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  doseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  doseBtnActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  doseBtnActiveSecondary: {
    backgroundColor: Colors.softLavender,
    borderColor: Colors.blossomRose,
  },
  doseBtnActiveMuted: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.deepBurgundy,
  },
  doseBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  doseBtnTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  doseBtnTextActiveSecondary: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  doseBtnTextActiveMuted: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  aptCard: {
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.deepBurgundy,
  },
  aptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  docName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  docSpecialty: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 2,
  },
  aptStatusBadge: {
    backgroundColor: Colors.white,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  aptStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    textTransform: 'uppercase',
  },
  aptDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aptDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  aptLocation: {
    fontSize: 11,
    color: Colors.mutedText,
    marginBottom: 8,
  },
  questionsBox: {
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  questionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    marginBottom: 4,
  },
  questionItem: {
    fontSize: 11,
    color: Colors.lavenderSlate,
    lineHeight: 16,
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
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 12,
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
  relationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  relationBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  relationBtnActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  relationText: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  relationTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
  },
});
