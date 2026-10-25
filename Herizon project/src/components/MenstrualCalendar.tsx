import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Heart,
  Sparkles,
} from 'lucide-react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import Card from './Card';
import Button from './Button';
import { MenstrualCycle, SymptomLog } from '../types';

interface MenstrualCalendarProps {
  cycles: MenstrualCycle[];
  symptoms?: SymptomLog[];
  estimatedNextPeriodDate?: string;
  averageCycleLength?: number;
  averagePeriodDuration?: number;
  onAddCycle?: (cycle: Omit<MenstrualCycle, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onDeleteCycle?: (id: string) => Promise<void>;
}

export const MenstrualCalendar: React.FC<MenstrualCalendarProps> = ({
  cycles,
  symptoms = [],
  estimatedNextPeriodDate,
  averageCycleLength = 28,
  averagePeriodDuration = 5,
  onAddCycle,
  onDeleteCycle,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [flow, setFlow] = useState<'spotting' | 'light' | 'medium' | 'heavy'>('medium');
  const [cramps, setCramps] = useState(3);
  const [durationDays, setDurationDays] = useState(String(averagePeriodDuration || 5));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Compute days in month and start day
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Map recorded period days
  const recordedPeriodDates = new Set<string>();
  const cycleByStartDate: Record<string, MenstrualCycle> = {};

  for (const c of cycles) {
    cycleByStartDate[c.start_date] = c;
    const dur = c.period_duration_days || averagePeriodDuration || 5;
    const s = new Date(c.start_date);
    for (let i = 0; i < dur; i++) {
      const d = new Date(s.getTime() + i * 24 * 60 * 60 * 1000);
      recordedPeriodDates.add(d.toISOString().split('T')[0]);
    }
  }

  // Map estimated future period window
  const estimatedDates = new Set<string>();
  if (estimatedNextPeriodDate) {
    const nextStart = new Date(estimatedNextPeriodDate);
    if (!isNaN(nextStart.getTime())) {
      const dur = averagePeriodDuration || 5;
      for (let i = 0; i < dur; i++) {
        const d = new Date(nextStart.getTime() + i * 24 * 60 * 60 * 1000);
        estimatedDates.add(d.toISOString().split('T')[0]);
      }
    }
  }

  // Map symptom days
  const symptomDates = new Set<string>();
  for (const s of symptoms) {
    if (s.occurred_at) {
      symptomDates.add(s.occurred_at.split('T')[0]);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const handleDayPress = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setModalVisible(true);
  };

  const handleSavePeriodEntry = async () => {
    if (!selectedDateStr || !onAddCycle) return;
    await onAddCycle({
      start_date: selectedDateStr,
      period_duration_days: parseInt(durationDays, 10) || 5,
      cycle_length_days: averageCycleLength || 28,
      flow_intensity: flow,
      cramps_severity: cramps,
      is_irregular: false,
    });
    setModalVisible(false);
  };

  // Generate calendar grid cells
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectedCycle = selectedDateStr ? cycleByStartDate[selectedDateStr] : null;
  const isRecordedSelectedDay = selectedDateStr ? recordedPeriodDates.has(selectedDateStr) : false;
  const isEstimatedSelectedDay = selectedDateStr ? estimatedDates.has(selectedDateStr) : false;

  return (
    <Card style={styles.card} variant="elevated">
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} accessibilityLabel="Previous month">
          <ChevronLeft size={20} color={Colors.deepBurgundy} />
        </TouchableOpacity>
        <View style={styles.monthHeaderRow}>
          <CalendarIcon size={16} color={Colors.deepBurgundy} />
          <Text style={styles.monthTitle}>{monthName}</Text>
        </View>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} accessibilityLabel="Next month">
          <ChevronRight size={20} color={Colors.deepBurgundy} />
        </TouchableOpacity>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekdaysRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, idx) => (
          <Text key={idx} style={styles.weekdayLabel}>{d}</Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {blanks.map((b) => (
          <View key={`b-${b}`} style={styles.dayCell} />
        ))}

        {days.map((dayNum) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isRecorded = recordedPeriodDates.has(dateStr);
          const isEstimated = !isRecorded && estimatedDates.has(dateStr);
          const hasSymptom = symptomDates.has(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <TouchableOpacity
              key={dayNum}
              onPress={() => handleDayPress(dateStr)}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                isRecorded && styles.recordedCell,
                isEstimated && styles.estimatedCell,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isToday && styles.todayNumber,
                  isRecorded && styles.recordedNumber,
                  isEstimated && styles.estimatedNumber,
                ]}
              >
                {dayNum}
              </Text>
              {hasSymptom && <View style={[styles.symptomDot, isRecorded && { backgroundColor: Colors.white }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Calendar Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.deepBurgundy }]} />
          <Text style={styles.legendText}>Recorded Period</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.blossomRose, borderStyle: 'dashed', borderWidth: 1 }]} />
          <Text style={styles.legendText}>Estimated *</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.lavenderSlate, borderRadius: 3, width: 6, height: 6 }]} />
          <Text style={styles.legendText}>Symptom Logged</Text>
        </View>
      </View>

      <Text style={styles.disclaimerNote}>
        * Future windows are derived mathematical estimates from your logged rhythm.
      </Text>

      {/* Date Detail / Log Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Heart size={18} color={Colors.deepBurgundy} />
                <Text style={styles.modalTitle}>
                  {selectedDateStr ? new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date Details'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isRecordedSelectedDay && (
              <View style={styles.badgeRecorded}>
                <Text style={styles.badgeRecordedText}>Recorded Period Day</Text>
              </View>
            )}

            {isEstimatedSelectedDay && (
              <View style={styles.badgeEstimated}>
                <Text style={styles.badgeEstimatedText}>Estimated Cycle Window (Prediction)</Text>
              </View>
            )}

            {selectedCycle && onDeleteCycle ? (
              <View style={styles.existingEntryBox}>
                <Text style={styles.existingTitle}>Recorded Cycle Beginning: {selectedCycle.start_date}</Text>
                <Text style={styles.existingSub}>
                  Duration: {selectedCycle.period_duration_days || 5} days • Flow: {selectedCycle.flow_intensity}
                </Text>
                <Button
                  title="Delete This Period Entry"
                  variant="outline"
                  size="small"
                  onPress={async () => {
                    await onDeleteCycle(selectedCycle.id);
                    setModalVisible(false);
                  }}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : onAddCycle ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.inputLabel}>Log Period Starting On This Date</Text>
                <View style={styles.flowRow}>
                  {(['spotting', 'light', 'medium', 'heavy'] as const).map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFlow(f)}
                      style={[styles.flowChip, flow === f && styles.flowChipActive]}
                    >
                      <Text style={[styles.flowChipText, flow === f && styles.flowChipTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Duration (Days)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={durationDays}
                  onChangeText={setDurationDays}
                  placeholder="5"
                  placeholderTextColor={Colors.mutedText}
                />

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Cramps Severity (1-10): {cramps}/10</Text>
                <View style={styles.severityRow}>
                  {[1, 3, 5, 7, 9].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setCramps(n)}
                      style={[styles.sevBtn, cramps === n && styles.sevBtnActive]}
                    >
                      <Text style={[styles.sevBtnText, cramps === n && styles.sevBtnTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  title="Save Period Entry"
                  onPress={handleSavePeriodEntry}
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              <Text style={styles.modalNotice}>No period entries recorded for this date.</Text>
            )}
          </View>
        </View>
      </Modal>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.softWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  navBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.softLavenderMist,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.fineBorder,
  },
  weekdayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: Colors.deepBurgundy,
  },
  recordedCell: {
    backgroundColor: Colors.deepBurgundy,
  },
  estimatedCell: {
    backgroundColor: 'rgba(219, 161, 165, 0.45)',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.blossomRose,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.lavenderSlate,
  },
  todayNumber: {
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  recordedNumber: {
    color: Colors.white,
    fontWeight: '700',
  },
  estimatedNumber: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  symptomDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.lavenderSlate,
    position: 'absolute',
    bottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: Colors.mutedText,
    fontWeight: '500',
  },
  disclaimerNote: {
    fontSize: 10,
    color: Colors.mutedText,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: Colors.mutedText,
  },
  badgeRecorded: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  badgeRecordedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  badgeEstimated: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.softLavenderMist,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  badgeEstimatedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  existingEntryBox: {
    backgroundColor: Colors.softLavenderMist,
    padding: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  existingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  existingSub: {
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lavenderSlate,
    marginBottom: 6,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flowChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Colors.softLavenderMist,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  flowChipActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  flowChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.lavenderSlate,
    textTransform: 'capitalize',
  },
  flowChipTextActive: {
    color: Colors.white,
  },
  modalInput: {
    backgroundColor: Colors.softLavenderMist,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.lavenderSlate,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sevBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.softLavenderMist,
    alignItems: 'center',
  },
  sevBtnActive: {
    backgroundColor: Colors.deepBurgundy,
  },
  sevBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  sevBtnTextActive: {
    color: Colors.white,
  },
  modalNotice: {
    fontSize: 13,
    color: Colors.mutedText,
    fontStyle: 'italic',
    marginVertical: 12,
  },
});
