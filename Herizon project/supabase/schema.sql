-- ==============================================================================
-- HerHealth: Supabase Relational Database Schema & Row Level Security (RLS)
-- Hackathon: recHERsion'26 - Women's Healthcare Hackathon
-- Built with privacy-first architecture, strict per-user ownership, and zero diagnosis claims.
-- ==============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    date_of_birth date,
    age integer,
    height_cm numeric(5,2),
    weight_kg numeric(5,2),
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_consent boolean default false,
    activity_level text check (activity_level in ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
    onboarding_completed boolean default false,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. USER PREFERENCES & NOTIFICATION SETTINGS
-- ------------------------------------------------------------------------------
create table if not exists public.user_preferences (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null unique,
    preferred_language text default 'en' check (preferred_language in ('en', 'hi', 'hinglish')),
    blood_glucose_unit text default 'mg/dL' check (blood_glucose_unit in ('mg/dL', 'mmol/L')),
    height_unit text default 'cm' check (height_unit in ('cm', 'ft_in')),
    weight_unit text default 'kg' check (weight_unit in ('kg', 'lbs')),
    temperature_unit text default 'F' check (temperature_unit in ('F', 'C')),
    menstrual_tracking_enabled boolean default false,
    daily_checkin_enabled boolean default true,
    gamification_enabled boolean default true,
    ai_consent_granted boolean default false,
    auto_lock_duration_minutes integer default 5,
    pin_protection_enabled boolean default false,
    biometrics_enabled boolean default false,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.user_preferences enable row level security;
create policy "Users can access own preferences" on public.user_preferences for all using (auth.uid() = user_id);

create table if not exists public.notification_preferences (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null unique,
    medication_reminders boolean default true,
    appointment_reminders boolean default true,
    daily_checkin_reminder boolean default true,
    daily_checkin_time time default '20:00:00',
    privacy_preserving_notifications boolean default true, -- masks medicine names on lockscreen
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.notification_preferences enable row level security;
create policy "Users can access own notification preferences" on public.notification_preferences for all using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. MEDICAL HISTORY & ALLERGIES (User-Reported)
-- ------------------------------------------------------------------------------
create table if not exists public.medical_history (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    condition_key text not null, -- e.g. 'diabetes_type_2', 'pcos', 'hypertension', 'thyroid_hypo', 'custom'
    condition_name text not null,
    diagnosis_year integer,
    is_active boolean default true,
    notes text,
    surgeries jsonb default '[]'::jsonb,
    hospitalizations jsonb default '[]'::jsonb,
    family_history jsonb default '[]'::jsonb,
    healthcare_providers jsonb default '[]'::jsonb,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.medical_history enable row level security;
create policy "Users can access own medical history" on public.medical_history for all using (auth.uid() = user_id);
create index idx_medical_history_user on public.medical_history(user_id);

create table if not exists public.allergies (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    allergen_name text not null,
    allergy_type text check (allergy_type in ('medication', 'food', 'environmental', 'other')),
    reaction_description text,
    severity text check (severity in ('mild', 'moderate', 'severe')),
    diagnosed_year integer,
    notes text,
    created_at timestamptz default now() not null
);

alter table public.allergies enable row level security;
create policy "Users can access own allergies" on public.allergies for all using (auth.uid() = user_id);
create index idx_allergies_user on public.allergies(user_id);

-- ------------------------------------------------------------------------------
-- 4. DAILY HEALTH JOURNAL & SYMPTOMS
-- ------------------------------------------------------------------------------
create table if not exists public.daily_checkins (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    checkin_date date not null,
    mood text check (mood in ('great', 'okay', 'tired', 'uncomfortable', 'not_feeling_well')),
    energy_level integer check (energy_level between 1 and 10),
    stress_level integer check (stress_level between 1 and 10),
    pain_level integer check (pain_level between 0 and 10),
    wellbeing_score integer check (wellbeing_score between 1 and 10),
    notes text,
    created_at timestamptz default now() not null,
    unique(user_id, checkin_date)
);

alter table public.daily_checkins enable row level security;
create policy "Users can access own checkins" on public.daily_checkins for all using (auth.uid() = user_id);
create index idx_daily_checkins_user_date on public.daily_checkins(user_id, checkin_date desc);

create table if not exists public.symptoms (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    symptom_name text not null,
    category text default 'general', -- e.g. 'head', 'body', 'digestive', 'respiratory', 'mood', 'reproductive'
    occurred_at timestamptz not null default now(),
    duration_minutes integer,
    severity integer check (severity between 1 and 10) not null,
    body_location text,
    description text,
    associated_symptoms text[],
    reported_triggers text,
    menstrual_cycle_phase text, -- 'follicular', 'ovulatory', 'luteal', 'menstrual', 'unknown'
    has_happened_before boolean default false,
    discussed_with_doctor boolean default false,
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.symptoms enable row level security;
create policy "Users can access own symptoms" on public.symptoms for all using (auth.uid() = user_id);
create index idx_symptoms_user_date on public.symptoms(user_id, occurred_at desc);
create index idx_symptoms_name on public.symptoms(user_id, symptom_name);

-- ------------------------------------------------------------------------------
-- 5. WOMEN'S HEALTH & MENSTRUAL TRACKER
-- ------------------------------------------------------------------------------
create table if not exists public.menstrual_cycles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    start_date date not null,
    end_date date,
    cycle_length_days integer,
    period_duration_days integer,
    flow_intensity text check (flow_intensity in ('spotting', 'light', 'medium', 'heavy')),
    cramps_severity integer check (cramps_severity between 0 and 10),
    menstrual_symptoms text[],
    mood_notes text,
    is_irregular boolean default false,
    notes text,
    created_at timestamptz default now() not null
);

alter table public.menstrual_cycles enable row level security;
create policy "Users can access own menstrual cycles" on public.menstrual_cycles for all using (auth.uid() = user_id);
create index idx_menstrual_cycles_user on public.menstrual_cycles(user_id, start_date desc);

-- ------------------------------------------------------------------------------
-- 6. HEALTH MEASUREMENTS (Glucose, Blood Pressure, Vitals)
-- ------------------------------------------------------------------------------
create table if not exists public.health_measurements (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    measurement_type text not null, -- 'blood_glucose', 'blood_pressure', 'weight', 'heart_rate', 'spo2', 'temperature', 'custom'
    recorded_at timestamptz not null default now(),
    numeric_value numeric(7,2), -- primary numeric (e.g. glucose, weight, systolic)
    secondary_numeric_value numeric(7,2), -- secondary (e.g. diastolic for BP, pulse)
    tertiary_numeric_value numeric(7,2), -- pulse or extra
    unit text not null, -- 'mg/dL', 'mmol/L', 'mmHg', 'kg', 'lbs', 'bpm', '%', 'F', 'C'
    context_tag text, -- e.g. 'fasting', 'before_meal', 'after_meal', 'bedtime', 'resting'
    notes text,
    user_target_min numeric(7,2),
    user_target_max numeric(7,2),
    created_at timestamptz default now() not null
);

alter table public.health_measurements enable row level security;
create policy "Users can access own measurements" on public.health_measurements for all using (auth.uid() = user_id);
create index idx_measurements_user_type on public.health_measurements(user_id, measurement_type, recorded_at desc);

-- ------------------------------------------------------------------------------
-- 7. MEDICAL DOCUMENTS & LABORATORY REPORTS (Private Storage)
-- ------------------------------------------------------------------------------
create table if not exists public.medical_documents (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    category text not null, -- 'blood_test', 'thyroid', 'glucose_hba1c', 'lipid', 'cbc', 'iron_ferritin', 'vitamin', 'hormone', 'imaging', 'discharge_summary', 'prescription', 'other'
    document_date date,
    storage_path text not null, -- private path in Supabase Storage bucket 'medical-vault'
    mime_type text,
    file_size_bytes bigint,
    provider_or_lab_name text,
    user_notes text,
    ocr_status text default 'pending' check (ocr_status in ('pending', 'processing', 'completed', 'failed', 'corrected')),
    ocr_extracted_text text,
    ocr_confidence numeric(4,3),
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.medical_documents enable row level security;
create policy "Users can access own medical documents" on public.medical_documents for all using (auth.uid() = user_id);
create index idx_med_docs_user on public.medical_documents(user_id, document_date desc);

create table if not exists public.laboratory_results (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    document_id uuid references public.medical_documents(id) on delete set null,
    test_name text not null, -- e.g. 'HbA1c', 'TSH', 'Hemoglobin', 'Fasting Blood Sugar'
    test_value numeric(10,3) not null,
    unit text not null,
    reference_interval_min numeric(10,3),
    reference_interval_max numeric(10,3),
    reference_interval_text text, -- raw text from lab report e.g. "0.4 - 4.5 uIU/mL"
    is_outside_lab_range boolean,
    test_date date not null,
    user_confirmed boolean default false,
    notes text,
    created_at timestamptz default now() not null
);

alter table public.laboratory_results enable row level security;
create policy "Users can access own lab results" on public.laboratory_results for all using (auth.uid() = user_id);
create index idx_lab_results_user_test on public.laboratory_results(user_id, test_name, test_date desc);

-- ------------------------------------------------------------------------------
-- 8. PRESCRIPTIONS, MEDICINES & REMINDERS
-- ------------------------------------------------------------------------------
create table if not exists public.medications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    strength text, -- e.g. '500 mg', '25 mcg'
    dosage_instructions text not null, -- user-reported e.g. "1 tablet after breakfast"
    schedule_type text default 'daily' check (schedule_type in ('daily', 'twice_daily', 'three_times_daily', 'as_needed', 'weekly', 'custom')),
    reminder_times time[], -- array of times e.g. ['08:00:00', '20:00:00']
    relation_to_meals text check (relation_to_meals in ('before_meal', 'after_meal', 'with_meal', 'no_relation')),
    prescribing_clinician text,
    start_date date default current_date not null,
    end_date date,
    is_active boolean default true,
    document_id uuid references public.medical_documents(id) on delete set null,
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.medications enable row level security;
create policy "Users can access own medications" on public.medications for all using (auth.uid() = user_id);
create index idx_medications_user on public.medications(user_id, is_active);

create table if not exists public.medication_dose_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    medication_id uuid references public.medications(id) on delete cascade not null,
    scheduled_at timestamptz not null,
    logged_at timestamptz default now() not null,
    status text check (status in ('taken', 'skipped', 'missed', 'snoozed')) not null,
    notes text,
    created_at timestamptz default now() not null
);

alter table public.medication_dose_logs enable row level security;
create policy "Users can access own dose logs" on public.medication_dose_logs for all using (auth.uid() = user_id);
create index idx_dose_logs_user_med on public.medication_dose_logs(user_id, medication_id, scheduled_at desc);

-- ------------------------------------------------------------------------------
-- 9. APPOINTMENTS & CONSULTATION NOTES
-- ------------------------------------------------------------------------------
create table if not exists public.appointments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    clinician_or_clinic_name text not null,
    specialty text,
    appointment_at timestamptz not null,
    location_or_link text,
    reason_for_visit text,
    questions_to_ask text[],
    related_symptom_ids uuid[],
    related_document_ids uuid[],
    follow_up_date date,
    status text default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    consultation_summary text,
    consultation_notes text,
    reminder_enabled boolean default true,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

alter table public.appointments enable row level security;
create policy "Users can access own appointments" on public.appointments for all using (auth.uid() = user_id);
create index idx_appointments_user on public.appointments(user_id, appointment_at asc);

-- ------------------------------------------------------------------------------
-- 10. SLEEP, ACTIVITY & WELLNESS GOALS
-- ------------------------------------------------------------------------------
create table if not exists public.sleep_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    bedtime timestamptz not null,
    wake_time timestamptz not null,
    total_minutes integer not null, -- calculated deterministically
    quality_rating integer check (quality_rating between 1 and 5),
    awakenings_count integer default 0,
    notes text,
    created_at timestamptz default now() not null
);

alter table public.sleep_logs enable row level security;
create policy "Users can access own sleep logs" on public.sleep_logs for all using (auth.uid() = user_id);
create index idx_sleep_user on public.sleep_logs(user_id, bedtime desc);

create table if not exists public.activity_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    log_date date not null,
    step_count integer default 0 not null,
    source text default 'manual' check (source in ('device_pedometer', 'manual')),
    active_minutes integer default 0,
    distance_meters numeric(8,2),
    created_at timestamptz default now() not null,
    unique(user_id, log_date, source)
);

alter table public.activity_logs enable row level security;
create policy "Users can access own activity logs" on public.activity_logs for all using (auth.uid() = user_id);
create index idx_activity_user_date on public.activity_logs(user_id, log_date desc);

create table if not exists public.wellness_goals (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    goal_type text not null, -- 'daily_steps', 'sleep_duration_hours', 'daily_symptom_log', 'hydration_glasses', 'medication_adherence'
    target_value numeric(7,2) not null,
    unit text not null,
    frequency text default 'daily' check (frequency in ('daily', 'weekly')),
    is_active boolean default true,
    created_at timestamptz default now() not null
);

alter table public.wellness_goals enable row level security;
create policy "Users can access own wellness goals" on public.wellness_goals for all using (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. HEALTH INSIGHTS & MONTHLY REPORTS
-- ------------------------------------------------------------------------------
create table if not exists public.health_insights (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    insight_type text not null, -- 'recurring_symptom', 'measurement_trend', 'sleep_correlation', 'lab_comparison'
    title text not null,
    body text not null,
    evidence_counts jsonb, -- e.g. {"count": 4, "days": ["2026-10-01", "2026-10-05"], "unit": "days"}
    supporting_dates date[],
    suggested_clinician_discussion text,
    is_dismissed boolean default false,
    generated_at timestamptz default now() not null
);

alter table public.health_insights enable row level security;
create policy "Users can access own insights" on public.health_insights for all using (auth.uid() = user_id);
create index idx_insights_user on public.health_insights(user_id, generated_at desc);

-- ------------------------------------------------------------------------------
-- 12. STORAGE BUCKET CONFIGURATION (RLS for Private Documents)
-- ------------------------------------------------------------------------------
-- Run in Supabase SQL editor:
-- insert into storage.buckets (id, name, public) values ('medical-vault', 'medical-vault', false) on conflict do nothing;
-- create policy "Allow user access to own folder in medical-vault" on storage.objects
-- for all using (bucket_id = 'medical-vault' and (storage.foldername(name))[1] = auth.uid()::text);
