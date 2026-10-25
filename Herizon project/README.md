# HerHealth (recHERsion'26)
### A Privacy-First Women's Health & Daily Wellness Mobile Application

HerHealth is a personalized, privacy-first women's healthcare companion designed for the **recHERsion'26 women's healthcare hackathon**. It helps women track overall health, capture everyday symptoms (headaches, fatigue, body pain, dizziness, mood changes), manage chronic conditions (diabetes, thyroid disorders, hypertension, PCOS/PCOD), organize medical documents and laboratory reports, schedule medications, prepare for doctor appointments, and identify recurring patterns in their own records.

---

## ⚠️ Non-Negotiable Medical Boundaries

HerHealth adheres to strict, transparent clinical safety guardrails:
- **Never Diagnoses:** The application will never claim a symptom or laboratory result proves a disease.
- **Never Prescribes:** The application will never recommend starting, stopping, or altering medications, dosages, or supplements.
- **Clinician-Centered:** AI and deterministic algorithms are used strictly to organize, summarize, and format user-recorded data into actionable questions for healthcare professionals.
- **Emergency Safeguard:** Deterministic red-flag safety rules immediately flag concerning symptoms (chest pain, acute breathlessness, stroke-like symptoms, or hypertensive extremes) and advise calling local emergency services (**112 in India**).

---

## 📱 Core Features & User Journey

1. **Onboarding & Multi-Step Health Questionnaire (7 Steps)**
   - **Basic Profile:** Preferred name, age, height, weight, activity level, emergency contact with explicit consent.
   - **Medical History:** User-reported chronic conditions (PCOS, Thyroid, Hypertension, Diabetes Type 1 & 2, Endometriosis, Asthma, Migraine, and custom conditions).
   - **Medicines & Allergies:** Active prescriptions and user-reported allergies.
   - **Women's Health:** Menstrual cycle tracking (optional toggle), cycle length, flow, and symptom tracking.
   - **Lifestyle:** Sleep targets, hydration, and movement goals.
   - **Monitoring:** Home measurements preference (glucose, blood pressure, weight).
   - **Preferences & Security:** Language preference, 4-digit PIN lock setup, biometrics consent, and AI data processing opt-in.

2. **Personalized Home Dashboard**
   - **Friendly Greeting & Date:** Tailored to user's preferred name.
   - **Today's Check-in:** Interactive mood (Great, Okay, Tired, Discomfort, Unwell) and energy rating slider (1–10).
   - **Quick Actions:** Dynamically adapts based on user conditions (Log Symptom, Record Glucose, Record Blood Pressure, Add Report).
   - **Today's Overview:** Live counters for symptoms logged today, active medications due, and sleep duration.
   - **Evidence-Based Recurring Patterns:** Deterministic observations calculated from actual records (e.g. *"You logged headaches on 4 days this month. Consider discussing this recurring pattern with your healthcare professional"*).
   - **Urgent Warning Banner:** Prominently alerts with direct 112 calling if an acute red-flag symptom is logged.

3. **Daily Health Journal (`Health Log`)**
   - Fast one-tap chips for common symptoms (Headache, Fatigue, Cramps, Dizziness, Nausea, Bloating, Body Pain, Mood Changes).
   - Full symptom logging: Severity scale (1–10), category, body location, duration, reported triggers, and doctor discussion status.
   - Timeline view with search by keyword and filtering by category.
   - Tabular CSV export of all symptom entries.

4. **Medical Documents & Laboratory Reports Vault (`Reports`)**
   - Document capture via Camera or Gallery/Files (Images & PDFs).
   - **OCR Workflow:** Automated text extraction review and manual correction screen before saving into health records.
   - **Laboratory Test Tracking:** Fasting blood sugar, HbA1c, TSH, Hemoglobin, Vitamin D, Ferritin, etc.
   - **Historical Trend Chart:** Pure React Native SVG time-series charts displaying test values over dates with laboratory-provided upper limits clearly highlighted.
   - Evaluation strictly against laboratory-provided reference intervals.

5. **Doctor-Ready Consultation Summaries & PDF Export**
   - Compiles selected symptoms, frequency counts, home measurements, confirmed lab reports, active medications, and patient questions.
   - AI Health Organizer provides empathetic, non-diagnostic natural language phrasing.
   - One-tap downloadable, printable **Doctor-Ready Consultation Summary PDF** via `expo-print` and `expo-sharing`.

6. **Care & Prescriptions Management (`Care`)**
   - Active medications list with dosage instructions and relation to meals (before/after/with food).
   - Dose tracking for today: Mark as Taken, Skipped, or Missed.
   - Calculated 30-day medication adherence percentage.
   - Appointment scheduler with reason for visit and customizable questions for the doctor.
   - Privacy-preserving notifications: *"HerHealth: You have a scheduled reminder"* (masks medicine names on lock screen).

7. **Multilingual Voice Logging**
   - Supports **English, Hindi, and Hinglish** (e.g., *"Aaj subah se headache ho raha hai"*, *"Mera BP reading 140 by 90 hai"*, *"Kal raat sirf paanch ghante soyi"*).
   - Natural language intent extraction maps speech to symptoms, blood pressure readings, glucose, sleep duration, or medication logs.
   - Displays recognized transcript with explicit user confirmation before saving.

8. **Security, Privacy & Data Ownership (`Profile`)**
   - Encrypted 4-digit PIN lock with SHA-256 cryptographic hashing (`expo-crypto`) stored in `expo-secure-store`.
   - Biometric authentication (`expo-local-authentication`) using device hardware.
   - Optional automatic lock after inactivity.
   - Full data export in JSON & CSV format.
   - Complete local data wipe option.

---

## 🎨 Design System

Lavender Mist `#D9DAE4` · Dusty Blue `#91A0BD` · Muted Lavender Slate `#545774` · Cherry Blossom Rose `#DBA1A5` · Deep Blossom Burgundy `#853D4D`
(+ Warm Porcelain `#FBF8F7`, Muted text `#777681`, Fine border `#E9E3E7`, Pale rose-white `#F8ECEC`). See `src/theme/colors.ts`.
Headings use Playfair Display and UI text uses DM Sans **when the optional font packages are installed** (see below); otherwise platform serif/sans fallbacks are used.

---

## 🏗️ Architecture (what is actually implemented)

| Area | Status |
|---|---|
| Framework | Expo (SDK 58 per `package.json`) + Expo Router, React Native. Single app; no separate backend server. |
| Auth | Supabase email/password. Session tokens are stored in the OS keystore (`expo-secure-store`, chunked). Session is restored at launch behind the branded splash; route guard sends signed-out users to `/auth`. Sign-out is in Profile. |
| Without Supabase vars | "On-device mode" only (no fake login). Data stays on the phone in AsyncStorage. |
| Data | **Health records (symptoms, measurements, meds, appointments, reports metadata…) are stored locally in AsyncStorage, scoped per user id.** Only `profiles` and `user_preferences` are written to Supabase today. Full cloud sync of records is **not implemented** (see Known limitations). |
| AI chat + summaries | `app/chat.tsx` → `aiService.chat` → Supabase Edge Function `ai-proxy`. Keys live only in Edge Function secrets. Deterministic red-flag check runs before any AI call; chat requires the AI-consent preference; sharing a symptom summary is an explicit toggle. No canned replies: failures show an error with Retry. |
| Voice | Deterministic English/Hindi/Hinglish parser (`src/services/voiceCommands.ts`, unit-tested). Missing fields (e.g. severity) are asked, never invented; implausible values are rejected; nothing is saved without confirmation; results come from the real storage call. Capture: browser Web Speech (web) or `expo-audio` + `transcribe` Edge Function (native). Typing fallback always available. |
| Notifications | Existing local-notification service (`expo-notifications`). **Not re-audited in this pass.** |
| Steps | `expo-sensors` Pedometer code exists. **Not re-audited in this pass.** |

---

## 🚀 Setup

### Prerequisites
Node 20+ (tested with Node 22), npm, an Android phone with **Expo Go** (same Wi-Fi as the laptop) or a development build.

```bash
npm install
cp .env.example .env     # fill EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Optional packages for the full look and native voice
These are loaded with guarded `require`, so the app runs without them (fallback fonts, no blur, typing-only voice on native).
```bash
npx expo install expo-audio expo-blur @expo-google-fonts/playfair-display @expo-google-fonts/dm-sans
```

### Database
1. Create a Supabase project, run `supabase/schema.sql` in the SQL editor (RLS policies are in the file).
2. Create the private bucket `medical-vault` using the commented statements at the end of the schema.
3. Deploy the AI/voice proxies and set server-side secrets:
```bash
supabase functions deploy ai-proxy
supabase functions deploy transcribe
supabase secrets set AI_API_URL=... AI_API_KEY=... AI_MODEL=...
supabase secrets set WHISPER_API_URL=... WHISPER_API_KEY=... WHISPER_MODEL=whisper-large-v3
```

### Run on a physical Android phone (Expo Go)
```bash
npx expo start            # same Wi-Fi: scan the QR in Expo Go
npx expo start --tunnel   # if LAN fails (needs @expo/ngrok, Expo will offer to install)
```
Troubleshooting: disable VPNs; allow Node through the Windows/macOS firewall on private networks; some guest/office Wi-Fi isolates devices (use a phone hotspot); make sure the phone and laptop are on the same subnet. The app has no `localhost` URLs: it talks to Supabase over HTTPS, so no laptop IP is required.

### When Expo Go is not enough
`expo-audio`, `expo-notifications` (remote push/background behaviour), and Android Health/sensor permissions behave fully only in a development build:
```bash
npx expo install expo-dev-client
npx expo run:android            # local build, needs Android SDK + USB debugging
# or: npx eas build --profile development --platform android
```
Android permissions (mic, notifications, activity recognition, biometrics) are declared in `app.json`.

### Tests and checks
```bash
npm test            # business-logic + voice parser tests (Node --experimental-strip-types)
npx tsc --noEmit    # type check
npx expo lint
```

### Hackathon demo checklist
1. Create a fresh demo account (never reuse real medical data); mention clearly that entries are synthetic.
2. Complete onboarding with "AI data processing" enabled if you want to show chat.
3. Log a symptom by voice ("headache 6 out of 10"), then "BP 120 over 80"; show the confirm step and the saved entries.
4. Close and reopen the app to show session + data persistence; then sign out from Profile.
5. If Edge Functions are not deployed, chat/transcription will show an honest "not configured" error; typing fallback still works.

---

## ⚠️ Known limitations
- Health records are device-local; Supabase sync for symptoms/measurements/meds/appointments/reports is not implemented, and reports are not uploaded to the `medical-vault` bucket.
- The bottom navigation still has Home / My Health / Reports / Care / Profile (there is no separate Insights tab); chat is opened from Home ("Ask assistant").
- Glass blur needs `expo-blur`; without it surfaces are near-opaque.
- Notification scheduling, step counter, OCR and report upload were not re-verified in this pass.
- Nothing has been run on a physical device by the author of this change; the JS bundle compiles (Metro, Android) and unit tests pass.














{
  "expo": {
    "name": "HerHealth",
    "slug": "herhealth",
    "scheme": "herhealth",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSMicrophoneUsageDescription": "HerHealth uses the microphone so you can log health entries by voice.",
        "NSMotionUsageDescription": "HerHealth reads your step count.",
        "NSFaceIDUsageDescription": "Unlock HerHealth with Face ID."
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#D9DAE4",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "permissions": [
        "RECORD_AUDIO",
        "POST_NOTIFICATIONS",
        "ACTIVITY_RECOGNITION",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-status-bar",
      "expo-secure-store",
      "expo-sharing",
      "expo-font",
      "expo-audio",
      "expo-asset"
    ],
    "backgroundColor": "#D9DAE4",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#D9DAE4"
    }
  }
}
