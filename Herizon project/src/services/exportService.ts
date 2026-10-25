/**
 * HerHealth Report & Export Service
 * Generates beautiful Doctor-Ready PDF Consultation Summaries and CSV tabular exports.
 * Uses expo-print and expo-sharing.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import {
  UserProfile,
  SymptomLog,
  HealthMeasurement,
  LaboratoryResult,
  Medication,
  Appointment,
  SleepLog,
} from '../types';
import { SymptomPatternSummary } from './healthCalculations';
import { LOGO_DATA_URI } from '../theme/logoBase64';

export interface MonthlyReportData {
  profile: UserProfile | null;
  monthName: string;
  year: number;
  totalDaysLogged: number;
  symptomPatterns: SymptomPatternSummary[];
  measurements: HealthMeasurement[];
  labResults: LaboratoryResult[];
  medications: Medication[];
  appointments: Appointment[];
  sleepLogs: SleepLog[];
  suggestedQuestions: string[];
}

export class ExportService {
  /**
   * Generates formatted HTML for Doctor-Ready Consultation Summary PDF
   */
  public generateReportHtml(data: MonthlyReportData): string {
    const { profile, monthName, year, totalDaysLogged, symptomPatterns, measurements, labResults, medications, appointments, sleepLogs, suggestedQuestions } = data;

    const patientName = profile?.display_name || 'Patient';
    const age = profile?.age ? `${profile.age} yrs` : 'Not specified';
    const emergencyContact = profile?.emergency_contact_name ? `${profile.emergency_contact_name} (${profile.emergency_contact_phone || ''})` : 'None specified';

    // Symptoms table rows
    const symptomRows = symptomPatterns.slice(0, 8).map(s => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #172B3A;">${s.symptomName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">${s.last30DaysCount} days</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">${s.averageSeverity}/10</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center; text-transform: capitalize;">${s.trend}</td>
      </tr>
    `).join('');

    // Measurements table rows
    const measurementRows = measurements.slice(0, 10).map(m => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-transform: capitalize;">${m.measurement_type.replace('_', ' ')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">
          ${m.numeric_value}${m.secondary_numeric_value ? '/' + m.secondary_numeric_value : ''} ${m.unit}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">${m.context_tag || 'Standard'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">${m.recorded_at.split('T')[0]}</td>
      </tr>
    `).join('');

    // Lab results table rows
    const labRows = labResults.slice(0, 8).map(l => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; font-weight: 600;">${l.test_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; ${l.is_outside_lab_range ? 'color: #D97706; font-weight: bold;' : ''}">
          ${l.test_value} ${l.unit}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">${l.reference_interval_text || 'Lab default'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; color: #64748B;">${l.test_date}</td>
      </tr>
    `).join('');

    // Medicines rows
    const medRows = medications.filter(m => m.is_active).map(m => `
      <li style="margin-bottom: 6px;">
        <strong>${m.name}</strong> ${m.strength ? `(${m.strength})` : ''} — ${m.dosage_instructions}
        ${m.relation_to_meals ? `[${m.relation_to_meals.replace('_', ' ')}]` : ''}
      </li>
    `).join('');

    const questionsList = suggestedQuestions.map(q => `
      <li style="margin-bottom: 8px; color: #172B3A;">${q}</li>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>HerHealth Doctor-Ready Consultation Summary</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #172B3A;
            margin: 0;
            padding: 32px;
            background: #FFFFFF;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            border-bottom: 2px solid #237F78;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            color: #145B57;
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 4px 0;
          }
          .subtitle {
            color: #64748B;
            font-size: 12px;
            margin: 0;
          }
          .disclaimer-box {
            background: #DDF1E9;
            border-left: 4px solid #237F78;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 11px;
            color: #145B57;
            margin-bottom: 20px;
          }
          .section {
            margin-bottom: 24px;
          }
          .section-title {
            color: #145B57;
            font-size: 15px;
            font-weight: 700;
            border-bottom: 1px solid #DCE6E1;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            margin-top: 8px;
          }
          th {
            background: #F8F7F0;
            padding: 8px;
            color: #64748B;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #DCE6E1;
          }
          .patient-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
            background: #F8F7F0;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .badge {
            display: inline-block;
            background: #DDF1E9;
            color: #145B57;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center;">
            <img src="${LOGO_DATA_URI}" alt="HerHealth" style="width: 48px; height: 48px; margin-right: 12px;" />
            <div>
              <h1 class="title">HerHealth</h1>
              <p class="subtitle">Personal Health Journal & Consultation Summary</p>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge">${monthName} ${year}</span>
            <p style="font-size: 11px; color: #64748B; margin-top: 4px;">Active Logging Days: ${totalDaysLogged}</p>
          </div>
        </div>

        <div class="disclaimer-box">
          <strong>Non-Diagnostic Record Notice:</strong> This summary is compiled from the patient's self-recorded daily wellness logs, measurements, and confirmed test reports. It is organized to assist doctor-patient consultation and does not constitute a clinical diagnosis or treatment prescription.
        </div>

        <div class="patient-grid">
          <div><strong>Patient Name:</strong> ${patientName}</div>
          <div><strong>Age:</strong> ${age}</div>
          <div><strong>Emergency Contact:</strong> ${emergencyContact}</div>
          <div><strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>

        <div class="section">
          <div class="section-title">1. Recurring Symptoms & Patterns (Past 30 Days)</div>
          ${symptomPatterns.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Symptom</th>
                  <th style="text-align: center;">Frequency</th>
                  <th style="text-align: center;">Avg Severity</th>
                  <th style="text-align: center;">Trend</th>
                </tr>
              </thead>
              <tbody>
                ${symptomRows}
              </tbody>
            </table>
          ` : '<p style="color: #64748B;">No recurring symptoms recorded in this reporting period.</p>'}
        </div>

        <div class="section">
          <div class="section-title">2. Recent Home Measurements</div>
          ${measurements.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reading</th>
                  <th>Context</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${measurementRows}
              </tbody>
            </table>
          ` : '<p style="color: #64748B;">No home measurements recorded in this period.</p>'}
        </div>

        <div class="section">
          <div class="section-title">3. Confirmed Laboratory Reports</div>
          ${labResults.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Result</th>
                  <th>Reference Range</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${labRows}
              </tbody>
            </table>
          ` : '<p style="color: #64748B;">No laboratory reports added in this period.</p>'}
        </div>

        <div class="section">
          <div class="section-title">4. Active Medications (User-Reported)</div>
          ${medications.filter(m => m.is_active).length > 0 ? `
            <ul style="padding-left: 20px; margin-top: 6px;">
              ${medRows}
            </ul>
          ` : '<p style="color: #64748B;">No active medications reported.</p>'}
        </div>

        <div class="section">
          <div class="section-title">5. Patient's Prepared Questions for Doctor</div>
          <ul style="padding-left: 20px; margin-top: 6px;">
            ${questionsList}
          </ul>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Export PDF File and Open Sharing Sheet
   */
  public async exportReportToPdf(data: MonthlyReportData): Promise<string | null> {
    try {
      const html = this.generateReportHtml(data);
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // On Android the file written by expo-print can be rejected by the share sheet
      // ("Not allowed to read file under given URL"). Copy it to a clean file in the app
      // cache folder and share that copy instead.
      let shareUri = uri;
      try {
        const target = new File(Paths.cache, 'HerHealth_Doctor_Summary.pdf');
        if (target.exists) target.delete();
        await new File(uri).copy(target);
        shareUri = target.uri;
      } catch (copyErr) {
        console.warn('Could not copy PDF to cache, sharing original file:', copyErr);
      }

      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(shareUri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: 'HerHealth Consultation Summary',
          });
        } catch (shareErr) {
          console.warn('Share sheet failed, opening the print / save-as-PDF dialog instead:', shareErr);
          await Print.printAsync({ html });
        }
      } else {
        await Print.printAsync({ html });
      }

      return shareUri;
    } catch (e) {
      console.error('PDF export failed:', e);
      return null;
    }
  }

  /**
   * Export Tabular Records to CSV Format
   */
  public exportSymptomsToCsv(symptoms: SymptomLog[]): string {
    const headers = ['Date', 'Symptom', 'Category', 'Severity (1-10)', 'Duration (min)', 'Location', 'Triggers', 'Notes'];
    const rows = symptoms.map(s => [
      `"${s.occurred_at}"`,
      `"${s.symptom_name.replace(/"/g, '""')}"`,
      `"${s.category}"`,
      s.severity,
      s.duration_minutes || '',
      `"${(s.body_location || '').replace(/"/g, '""')}"`,
      `"${(s.reported_triggers || '').replace(/"/g, '""')}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  public exportMeasurementsToCsv(measurements: HealthMeasurement[]): string {
    const headers = ['Date', 'Type', 'Value', 'Secondary Value', 'Unit', 'Context', 'Notes'];
    const rows = measurements.map(m => [
      `"${m.recorded_at}"`,
      `"${m.measurement_type}"`,
      m.numeric_value,
      m.secondary_numeric_value || '',
      `"${m.unit}"`,
      `"${m.context_tag || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const exportService = new ExportService();
