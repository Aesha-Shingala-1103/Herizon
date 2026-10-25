/**
 * HerHealth Types and Interfaces
 * Privacy-first women's healthcare companion
 */

export type MoodType = 'great' | 'okay' | 'tired' | 'uncomfortable' | 'not_feeling_well';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string;
  date_of_birth?: string;
  age?: number;
  gender_identity?: string;
  height_cm?: number;
  weight_kg?: number;
  country_or_region?: string;
  timezone?: string;
  menstrual_status?: 'menstruating' | 'irregular' | 'pregnant' | 'postpartum' | 'menopausal' | 'contraception' | 'not_menstruating' | 'prefer_not_to_say';
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_consent: boolean;
  activity_level?: ActivityLevel;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthcareProvider {
  id: string;
  user_id: string;
  doctor_name: string;
  specialty?: string;
  clinic_or_hospital_name?: string;
  phone_number?: string;
  email_or_contact?: string;
  notes?: string;
  created_at: string;
}

export interface UserPreferences {
  id?: string;
  user_id: string;
  preferred_language: 'en' | 'hi' | 'hinglish';
  blood_glucose_unit: 'mg/dL' | 'mmol/L';
  height_unit: 'cm' | 'ft_in';
  weight_unit: 'kg' | 'lbs';
  temperature_unit: 'F' | 'C';
  menstrual_tracking_enabled: boolean;
  daily_checkin_enabled: boolean;
  gamification_enabled: boolean;
  ai_consent_granted: boolean;
  auto_lock_duration_minutes: number;
  pin_protection_enabled: boolean;
  biometrics_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  medication_reminders: boolean;
  appointment_reminders: boolean;
  daily_checkin_reminder: boolean;
  daily_checkin_time: string; // HH:mm:ss
  privacy_preserving_notifications: boolean;
}

export interface MedicalCondition {
  id: string;
  user_id: string;
  condition_key: string;
  condition_name: string;
  diagnosis_year?: number;
  is_active: boolean;
  notes?: string;
  surgeries?: string[];
  hospitalizations?: string[];
  family_history?: string[];
  healthcare_providers?: string[];
  created_at: string;
}

export interface Allergy {
  id: string;
  user_id: string;
  allergen_name: string;
  allergy_type: 'medication' | 'food' | 'environmental' | 'other';
  reaction_description?: string;
  severity: 'mild' | 'moderate' | 'severe';
  diagnosed_year?: number;
  notes?: string;
  created_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  checkin_date: string; // YYYY-MM-DD
  mood: MoodType;
  energy_level: number; // 1-10
  stress_level: number; // 1-10
  pain_level: number; // 0-10
  wellbeing_score: number; // 1-10
  notes?: string;
  created_at: string;
}

export interface SymptomLog {
  id: string;
  user_id: string;
  symptom_name: string;
  category: 'head' | 'body' | 'digestive' | 'respiratory' | 'mood' | 'reproductive' | 'skin' | 'general' | 'custom';
  occurred_at: string; // ISO string
  duration_minutes?: number;
  severity: number; // 1-10
  body_location?: string;
  description?: string;
  associated_symptoms?: string[];
  reported_triggers?: string;
  menstrual_cycle_phase?: 'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'unknown';
  has_happened_before: boolean;
  discussed_with_doctor: boolean;
  notes?: string;
  attachment_path?: string;
  created_at: string;
  updated_at: string;
}

export interface MenstrualCycle {
  id: string;
  user_id: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  cycle_length_days?: number;
  period_duration_days?: number;
  flow_intensity: 'spotting' | 'light' | 'medium' | 'heavy';
  cramps_severity: number; // 0-10
  menstrual_symptoms?: string[];
  mood_notes?: string;
  is_irregular: boolean;
  notes?: string;
  created_at: string;
}

export type MeasurementType =
  | 'blood_glucose'
  | 'blood_pressure'
  | 'weight'
  | 'heart_rate'
  | 'spo2'
  | 'temperature'
  | 'custom';

export interface HealthMeasurement {
  id: string;
  user_id: string;
  measurement_type: MeasurementType;
  recorded_at: string; // ISO
  numeric_value: number; // e.g. glucose, weight, systolic BP
  secondary_numeric_value?: number; // diastolic BP
  tertiary_numeric_value?: number; // pulse
  unit: string;
  context_tag?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'resting' | 'active' | 'other';
  notes?: string;
  user_target_min?: number;
  user_target_max?: number;
  created_at: string;
}

export type DocumentCategory =
  | 'blood_test'
  | 'thyroid'
  | 'glucose_hba1c'
  | 'lipid'
  | 'cbc'
  | 'iron_ferritin'
  | 'vitamin'
  | 'hormone'
  | 'imaging'
  | 'discharge_summary'
  | 'prescription'
  | 'other';

export interface MedicalDocument {
  id: string;
  user_id: string;
  title: string;
  category: DocumentCategory;
  document_date?: string; // YYYY-MM-DD
  storage_path: string;
  local_uri?: string;
  mime_type?: string;
  file_size_bytes?: number;
  provider_or_lab_name?: string;
  user_notes?: string;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed' | 'corrected';
  ocr_extracted_text?: string;
  ocr_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface LaboratoryResult {
  id: string;
  user_id: string;
  document_id?: string;
  test_name: string;
  test_value: number;
  unit: string;
  reference_interval_min?: number;
  reference_interval_max?: number;
  reference_interval_text?: string;
  is_outside_lab_range?: boolean;
  test_date: string;
  user_confirmed: boolean;
  notes?: string;
  created_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  strength?: string;
  dosage_instructions: string;
  schedule_type: 'daily' | 'twice_daily' | 'three_times_daily' | 'as_needed' | 'weekly' | 'custom';
  reminder_times: string[]; // HH:mm:ss format
  relation_to_meals?: 'before_meal' | 'after_meal' | 'with_meal' | 'no_relation';
  prescribing_clinician?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  document_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationDoseLog {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_at: string;
  logged_at: string;
  status: 'taken' | 'skipped' | 'missed' | 'snoozed';
  notes?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  clinician_or_clinic_name: string;
  specialty?: string;
  appointment_at: string; // ISO
  location_or_link?: string;
  reason_for_visit?: string;
  questions_to_ask?: string[];
  related_symptom_ids?: string[];
  related_document_ids?: string[];
  follow_up_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  consultation_summary?: string;
  consultation_notes?: string;
  reminder_enabled: boolean;
  is_monthly_recurring?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  bedtime: string; // ISO
  wake_time: string; // ISO
  total_minutes: number;
  quality_rating?: number; // 1-5
  awakenings_count: number;
  notes?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  step_count: number;
  source: 'device_pedometer' | 'manual';
  active_minutes?: number;
  distance_meters?: number;
  created_at: string;
}

export interface WellnessGoal {
  id: string;
  user_id: string;
  goal_type: 'daily_steps' | 'sleep_duration_hours' | 'daily_symptom_log' | 'hydration_glasses' | 'medication_adherence';
  target_value: number;
  unit: string;
  frequency: 'daily' | 'weekly';
  is_active: boolean;
  created_at: string;
}

export interface HealthInsight {
  id: string;
  user_id: string;
  insight_type: 'recurring_symptom' | 'measurement_trend' | 'sleep_correlation' | 'lab_comparison';
  title: string;
  body: string;
  evidence_counts?: {
    count?: number;
    days?: string[];
    unit?: string;
    [key: string]: any;
  };
  supporting_dates?: string[];
  suggested_clinician_discussion?: string;
  is_dismissed: boolean;
  generated_at: string;
}

export interface UrgentSafetyAlert {
  is_urgent: boolean;
  headline: string;
  description: string;
  emergency_number: string;
  instructions: string[];
}
