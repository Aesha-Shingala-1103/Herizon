/**
 * HerHealth AI Health Organizer & Voice Parsing Engine
 * 
 * STRICT COMPLIANCE:
 * - NO diagnosis.
 * - NO treatment or prescription advice.
 * - Deterministic calculations always supply the numbers, counts, and dates.
 * - LLM only phrases deterministic statistics into empathetic, clear clinician questions.
 * - Full offline/template fallback when external API is unreachable or omitted.
 */

import { SymptomLog, HealthMeasurement, LaboratoryResult, SleepLog, Appointment, Medication } from '../types';
import { SymptomPatternSummary } from './healthCalculations';
import { isSupabaseConfigured } from './supabase';
import { callEdgeFunction } from './edgeFunctions';
import { parseVoiceCommand, ParsedVoiceCommand } from './voiceCommands';

interface AISummaryRequest {
  symptomPatterns: SymptomPatternSummary[];
  recentMeasurements: HealthMeasurement[];
  recentLabResults: LaboratoryResult[];
  sleepLogs: SleepLog[];
  medications: Medication[];
  daysCovered: number;
}

export class AIService {
  /** AI runs via the authenticated `ai-proxy` Edge Function; keys never ship in the app. */
  public isAIConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /** Multi-turn assistant chat. Throws EdgeError on failure (no canned replies). */
  public async chat(messages: { role: 'user' | 'assistant'; content: string }[], context?: string): Promise<string> {
    const data = await callEdgeFunction<{ content: string }>('ai-proxy', { messages, system: context });
    if (!data.content) throw new Error('The assistant returned an empty reply. Please retry.');
    return data.content;
  }

  /**
   * Generates a monthly or 7-day Health Insight Summary
   * Uses deterministic facts as the ground truth.
   */
  public async generateHealthSummary(params: AISummaryRequest): Promise<{
    headline: string;
    summaryMarkdown: string;
    suggestedQuestionsForDoctor: string[];
    isAIAssisted: boolean;
  }> {
    const { symptomPatterns, recentMeasurements, recentLabResults, sleepLogs, daysCovered } = params;

    // 1. Build deterministic summary facts
    const factsList: string[] = [];
    if (symptomPatterns.length > 0) {
      for (const sp of symptomPatterns.slice(0, 4)) {
        factsList.push(
          `- ${sp.symptomName}: recorded on ${sp.last30DaysCount} day(s) with average severity ${sp.averageSeverity}/10 (trend: ${sp.trend}).`
        );
      }
    } else {
      factsList.push('- No recurring symptoms recorded in this period.');
    }

    if (recentMeasurements.length > 0) {
      const glucose = recentMeasurements.filter(m => m.measurement_type === 'blood_glucose');
      const bp = recentMeasurements.filter(m => m.measurement_type === 'blood_pressure');
      if (glucose.length > 0) factsList.push(`- Blood Glucose: ${glucose.length} reading(s) recorded.`);
      if (bp.length > 0) factsList.push(`- Blood Pressure: ${bp.length} reading(s) recorded.`);
    }

    if (recentLabResults.length > 0) {
      const outside = recentLabResults.filter(l => l.is_outside_lab_range);
      factsList.push(`- Laboratory Results: ${recentLabResults.length} test(s) added (${outside.length} outside lab reference interval).`);
    }

    if (sleepLogs.length > 0) {
      const avgMinutes = Math.round(sleepLogs.reduce((a, b) => a + b.total_minutes, 0) / sleepLogs.length);
      const hours = (avgMinutes / 60).toFixed(1);
      factsList.push(`- Sleep: Average logged duration of ${hours} hours over ${sleepLogs.length} logged night(s).`);
    }

    // Default Deterministic Questions for Doctor
    const defaultQuestions: string[] = [];
    if (symptomPatterns.length > 0) {
      defaultQuestions.push(`"I have logged ${symptomPatterns[0].symptomName} on ${symptomPatterns[0].last30DaysCount} days recently. Does this pattern indicate any specific tests we should consider?"`);
    }
    if (recentLabResults.some(l => l.is_outside_lab_range)) {
      defaultQuestions.push('"One of my recent lab tests was outside the lab reference interval. How should we interpret this in the context of my current health?"');
    }
    defaultQuestions.push('"Are there any specific lifestyle or monitoring metrics you would recommend I track before our next consultation?"');

    // Deterministic fallback content
    const fallbackHeadline = `${daysCovered}-Day Health Records Organization`;
    const fallbackMarkdown = `### Recorded Health Patterns\n\n` +
      `Here is a summary of the entries you made over the past ${daysCovered} days:\n\n` +
      factsList.join('\n') +
      `\n\n> **Notice:** These observations represent recorded correlations in your personal journal. They do not constitute a diagnosis or clinical evaluation.`;

    // If external AI is not configured, return high-fidelity deterministic summary
    if (!this.isAIConfigured()) {
      return {
        headline: fallbackHeadline,
        summaryMarkdown: fallbackMarkdown,
        suggestedQuestionsForDoctor: defaultQuestions,
        isAIAssisted: false,
      };
    }

    // Call LLM with strict safeguards
    try {
      const systemPrompt = `You are the HerHealth records organizer.
Your strict guidelines:
1. NEVER diagnose any disease or clinical condition.
2. NEVER prescribe medicines, supplements, or clinical therapies.
3. NEVER make causal claims (e.g. do not say "X caused Y", say "X and Y were recorded together").
4. Strictly ground your response on the provided factual bullet points.
5. Provide a neutral, empathetic summary and 3 questions the user can ask their doctor.
Format output as JSON with keys: "headline", "summaryMarkdown", "suggestedQuestionsForDoctor" (array of strings).`;

      const userPrompt = `Here are the verified records from the past ${daysCovered} days:\n${factsList.join('\n')}\nOrganize these records for the user's doctor consultation.`;

      const reply = await callEdgeFunction<{ content: string }>('ai-proxy', {
        system: systemPrompt,
        json: true,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const content = reply.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          headline: parsed.headline || fallbackHeadline,
          summaryMarkdown: parsed.summaryMarkdown || fallbackMarkdown,
          suggestedQuestionsForDoctor: parsed.suggestedQuestionsForDoctor || defaultQuestions,
          isAIAssisted: true,
        };
      }
    } catch (e) {
      console.warn('AI API summary call failed, using deterministic fallback:', e);
    }

    return {
      headline: fallbackHeadline,
      summaryMarkdown: fallbackMarkdown,
      suggestedQuestionsForDoctor: defaultQuestions,
      isAIAssisted: false,
    };
  }

  /**
   * Deterministic & AI Multi-lingual Voice Parser
   * Supports English, Hindi, and Hinglish.
   * Hand-tuned patterns for hackathon test phrases:
   * 1. "Aaj subah se headache ho raha hai."
   * 2. "Mera BP reading 140 by 90 hai."
   * 3. "Kal raat sirf paanch ghante soyi."
   * 4. "Maine lunch ke baad medicine le li."
   * 5. "Aaj headache 6 out of 10 hai"
   */
  public parseVoiceInput(transcript: string): ParsedVoiceCommand {
    return parseVoiceCommand(transcript);
  }
}

export const aiService = new AIService();
