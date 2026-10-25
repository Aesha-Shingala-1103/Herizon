/**
 * Deterministic voice-command parser (English / Hindi / Hinglish).
 *
 * Rules:
 *  - Never invents values. If a required field is not spoken it is listed in `missing`
 *    and the UI must ask the user before anything is saved.
 *  - Every numeric value is range-validated; invalid values produce `error`.
 *  - Pure functions only (no React Native imports) so it can be unit-tested with Node.
 */

export type VoiceIntentType =
  | 'symptom'
  | 'measurement'
  | 'sleep'
  | 'medication'
  | 'unknown';

export interface ParsedVoiceCommand {
  intent: VoiceIntentType;
  transcript: string;
  confidence: number;
  extractedFieldsDisplay: string;
  /** Fields still required before the command can be executed. */
  missing: Array<'severity' | 'sleepHours'>;
  /** True only when every required field is present and in a valid range. */
  valid: boolean;
  /** Human readable reason when valid === false and nothing is merely missing. */
  error?: string;
  symptomName?: string;
  severity?: number;
  bodyLocation?: string;
  measurementType?: 'blood_pressure' | 'blood_glucose';
  numericValue?: number;
  secondaryNumericValue?: number;
  unit?: string;
  sleepHours?: number;
  medicationName?: string;
  actionTaken?: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, ek: 1, do: 2, teen: 3, chaar: 4, char: 4, paanch: 5, panch: 5,
  chhah: 6, chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10, gyarah: 11, barah: 12,
};

/** Replace spoken small numbers ("five hours") with digits so one regex path handles both. */
export function normalizeNumberWords(text: string): string {
  return text.replace(/\b[a-z]+\b/g, (w) => (w in NUMBER_WORDS ? String(NUMBER_WORDS[w]) : w));
}

const SYMPTOMS: Array<{ keys: string[]; name: string; location: string }> = [
  { keys: ['headache', 'head ache', 'sir dard', 'sar dard', 'sar me dard', 'migraine'], name: 'Headache', location: 'Head' },
  { keys: ['cramp'], name: 'Cramps', location: 'Abdomen' },
  { keys: ['stomach', 'pet dard', 'abdominal'], name: 'Abdominal Pain', location: 'Abdomen' },
  { keys: ['fatigue', 'thakan', 'kamzori', 'tired'], name: 'Fatigue', location: 'Whole Body' },
  { keys: ['nausea', 'ulti', 'vomit'], name: 'Nausea', location: 'Digestive' },
  { keys: ['dizzy', 'dizziness', 'chakkar'], name: 'Dizziness', location: 'Head' },
  { keys: ['back pain', 'kamar dard'], name: 'Back Pain', location: 'Lower Back' },
  { keys: ['body pain', 'badan dard', 'body ache'], name: 'Body Pain', location: 'Musculoskeletal' },
  { keys: ['bloating', 'bloated'], name: 'Bloating', location: 'Abdomen' },
];

const base = (transcript: string): ParsedVoiceCommand => ({
  intent: 'unknown',
  transcript,
  confidence: 0,
  extractedFieldsDisplay: '',
  missing: [],
  valid: false,
});

export function parseVoiceCommand(transcript: string): ParsedVoiceCommand {
  const raw = transcript.trim();
  const lower = raw.toLowerCase().replace(/\s+/g, ' ');
  const out = base(raw);
  if (!lower) {
    out.error = 'No speech was captured.';
    return out;
  }
  const norm = normalizeNumberWords(lower);

  // 1. Blood pressure: "BP 120/80", "blood pressure 120 over 80", "140 by 90"
  const bp = norm.match(/(?:\bbp\b|blood pressure)[^\d]{0,25}(\d{2,3})\s*(?:by|over|\/|and|-|\s)\s*(\d{2,3})/);
  if (bp) {
    const sys = parseInt(bp[1], 10);
    const dia = parseInt(bp[2], 10);
    const ok = sys >= 70 && sys <= 260 && dia >= 40 && dia <= 160 && sys > dia;
    return {
      ...out,
      intent: 'measurement',
      measurementType: 'blood_pressure',
      numericValue: sys,
      secondaryNumericValue: dia,
      unit: 'mmHg',
      confidence: 0.95,
      valid: ok,
      error: ok ? undefined : `${sys}/${dia} is not a plausible blood pressure. Please repeat or type it.`,
      extractedFieldsDisplay: `Blood Pressure: ${sys}/${dia} mmHg`,
    };
  }

  // 2. Glucose
  const glu = norm.match(/(?:sugar|glucose)[^\d]{0,25}(\d{2,3}(?:\.\d)?)/);
  if (glu) {
    const val = parseFloat(glu[1]);
    const mmol = /mmol/.test(norm);
    const ok = mmol ? val >= 1 && val <= 35 : val >= 20 && val <= 600;
    return {
      ...out,
      intent: 'measurement',
      measurementType: 'blood_glucose',
      numericValue: val,
      unit: mmol ? 'mmol/L' : 'mg/dL',
      confidence: 0.92,
      valid: ok,
      error: ok ? undefined : `${val} is not a plausible glucose value.`,
      extractedFieldsDisplay: `Blood Glucose: ${val} ${mmol ? 'mmol/L' : 'mg/dL'}`,
    };
  }

  // 3. Sleep
  if (/(soyi|soya|slept|sleep|neend)/.test(norm)) {
    const m = norm.match(/(\d+(?:\.\d+)?)\s*(?:ghante|ghanta|hours?|hrs?)/);
    if (!m) {
      return { ...out, intent: 'sleep', confidence: 0.8, missing: ['sleepHours'], extractedFieldsDisplay: 'Sleep log: hours not stated' };
    }
    const h = parseFloat(m[1]);
    const ok = h > 0 && h <= 16;
    return {
      ...out, intent: 'sleep', sleepHours: h, confidence: 0.9, valid: ok,
      error: ok ? undefined : `${h} hours is not a plausible sleep duration.`,
      extractedFieldsDisplay: `Sleep Log: ${h} hours`,
    };
  }

  // 4. Medication taken (does not guess which medicine)
  if (/(medicine le li|dawa le li|took (my )?(medicine|medication|tablet|pill)|taken my (medicine|medication)|tablet li|dawai li)/.test(norm)) {
    return {
      ...out, intent: 'medication', actionTaken: true, confidence: 0.9, valid: true,
      extractedFieldsDisplay: 'Medication: mark the next due dose as Taken',
    };
  }

  // 5. Symptom
  const sym = SYMPTOMS.find((s) => s.keys.some((k) => norm.includes(k)));
  if (sym) {
    const sevMatch = norm.match(/(\d{1,2})\s*(?:out of 10|\/\s*10|\/10)/);
    let severity: number | undefined = sevMatch ? parseInt(sevMatch[1], 10) : undefined;
    if (severity === undefined) {
      if (/(severe|bahut jyada|bahut tez|unbearable)/.test(norm)) severity = 8;
      else if (/(mild|halka|halki|thoda)/.test(norm)) severity = 3;
    }
    if (severity !== undefined && (severity < 1 || severity > 10)) {
      return { ...out, intent: 'symptom', symptomName: sym.name, bodyLocation: sym.location, confidence: 0.8,
        error: 'Severity must be between 1 and 10.', missing: ['severity'],
        extractedFieldsDisplay: `Symptom: ${sym.name}` };
    }
    return {
      ...out, intent: 'symptom', symptomName: sym.name, bodyLocation: sym.location, severity,
      confidence: 0.88,
      missing: severity === undefined ? ['severity'] : [],
      valid: severity !== undefined,
      extractedFieldsDisplay: `Symptom: ${sym.name}${severity !== undefined ? ` (Severity ${severity}/10)` : ' (severity needed)'}`,
    };
  }

  out.error = 'I could not match that to a health action. Try "BP 120 over 80", "headache 6 out of 10", or "slept 6 hours".';
  return out;
}

/** Apply a user-supplied correction for a missing field and re-validate. */
export function completeVoiceCommand(
  cmd: ParsedVoiceCommand,
  field: 'severity' | 'sleepHours',
  value: number
): ParsedVoiceCommand {
  const next: ParsedVoiceCommand = { ...cmd, error: undefined };
  if (field === 'severity') {
    if (!(value >= 1 && value <= 10)) return { ...next, error: 'Severity must be between 1 and 10.' };
    next.severity = value;
    next.extractedFieldsDisplay = `Symptom: ${cmd.symptomName} (Severity ${value}/10)`;
  } else {
    if (!(value > 0 && value <= 16)) return { ...next, error: 'Sleep must be between 0 and 16 hours.' };
    next.sleepHours = value;
    next.extractedFieldsDisplay = `Sleep Log: ${value} hours`;
  }
  next.missing = cmd.missing.filter((m) => m !== field);
  next.valid = next.missing.length === 0;
  return next;
}
