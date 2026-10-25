import { storage } from './storageService';
import type { ParsedVoiceCommand } from './voiceCommands';

export interface VoiceExecResult {
  ok: boolean;
  message: string;
}

/**
 * Executes a validated voice command against real storage.
 * Returns ok=false (never a fake success) when nothing was saved.
 */
export async function executeVoiceCommand(cmd: ParsedVoiceCommand): Promise<VoiceExecResult> {
  if (!cmd.valid) {
    return { ok: false, message: cmd.error || 'Some details are still missing.' };
  }
  const note = `Recorded via voice: "${cmd.transcript}"`;
  const now = new Date();
  try {
    switch (cmd.intent) {
      case 'symptom':
        await storage.addSymptom({
          symptom_name: cmd.symptomName!,
          category: 'general',
          severity: cmd.severity!,
          body_location: cmd.bodyLocation || 'General',
          occurred_at: now.toISOString(),
          has_happened_before: false,
          discussed_with_doctor: false,
          notes: note,
        });
        return { ok: true, message: `Saved ${cmd.symptomName} (${cmd.severity}/10).` };
      case 'measurement':
        await storage.addMeasurement({
          measurement_type: cmd.measurementType!,
          numeric_value: cmd.numericValue!,
          secondary_numeric_value: cmd.secondaryNumericValue,
          unit: cmd.unit!,
          recorded_at: now.toISOString(),
          notes: note,
        } as any);
        return { ok: true, message: `Saved ${cmd.extractedFieldsDisplay}.` };
      case 'sleep': {
        const bed = new Date(now.getTime() - cmd.sleepHours! * 3600 * 1000);
        await storage.addSleepLog({
          bedtime: bed.toISOString(),
          wake_time: now.toISOString(),
          total_minutes: Math.round(cmd.sleepHours! * 60),
          awakenings_count: 0,
          notes: note,
        } as any);
        return { ok: true, message: `Saved ${cmd.sleepHours} hours of sleep.` };
      }
      case 'medication': {
        const meds = (await storage.getMedications()).filter((m: any) => m.is_active !== false);
        if (meds.length === 0) {
          return { ok: false, message: 'No active medication found. Add one in Care first.' };
        }
        if (meds.length > 1) {
          return { ok: false, message: 'You have several medications. Please mark the dose in Care so the right one is recorded.' };
        }
        await storage.logMedicationDose({
          medication_id: meds[0].id,
          scheduled_at: now.toISOString(),
          logged_at: now.toISOString(),
          status: 'taken',
          notes: note,
        });
        return { ok: true, message: 'Dose marked as taken.' };
      }
      default:
        return { ok: false, message: cmd.error || 'Command not recognised.' };
    }
  } catch (e: any) {
    return { ok: false, message: `Could not save: ${e?.message || 'storage error'}` };
  }
}
