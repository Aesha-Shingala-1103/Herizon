/**
 * HerHealth OCR & Document Parsing Service
 * Extracts laboratory test names, numeric values, units, and reference ranges.
 * Always presents extracted candidate values for human review before persisting.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LaboratoryResult } from '../types';

export interface ExtractedLabCandidate {
  test_name: string;
  test_value: number;
  unit: string;
  reference_interval_min?: number;
  reference_interval_max?: number;
  reference_interval_text?: string;
  is_outside_lab_range?: boolean;
}

export class OCRService {
  /**
   * Pick document image from Camera
   */
  public async captureDocumentImage(): Promise<{ uri: string; name: string } | null> {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || `doc_${Date.now()}.jpg`,
        };
      }
      return null;
    } catch (e) {
      console.warn('Capture document error:', e);
      return null;
    }
  }

  /**
   * Pick document from Gallery or Files (Images/PDFs)
   */
  public async pickDocument(): Promise<{ uri: string; name: string; mimeType?: string } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return {
          uri: result.assets[0].uri,
          name: result.assets[0].name,
          mimeType: result.assets[0].mimeType,
        };
      }
      return null;
    } catch (e) {
      console.warn('Pick document error:', e);
      return null;
    }
  }

  /**
   * Parse extracted OCR text for recognized lab test formats
   * Example text lines:
   * "HbA1c : 5.8 % (Reference: 4.0 - 5.6 %)"
   * "TSH (Ultrasensitive) : 2.45 uIU/mL (Range: 0.35 - 4.94)"
   * "Hemoglobin : 12.4 g/dL (Normal: 12.0 - 15.5)"
   * "Fasting Blood Sugar : 98 mg/dL (70 - 99)"
   */
  public parseLabReportText(ocrText: string): ExtractedLabCandidate[] {
    const candidates: ExtractedLabCandidate[] = [];
    const lines = ocrText.split('\n');

    const knownTests = [
      { key: 'hba1c', name: 'HbA1c', defaultUnit: '%', min: 4.0, max: 5.6 },
      { key: 'tsh', name: 'Thyroid Stimulating Hormone (TSH)', defaultUnit: 'uIU/mL', min: 0.35, max: 4.5 },
      { key: 'hemoglobin', name: 'Hemoglobin', defaultUnit: 'g/dL', min: 12.0, max: 15.5 },
      { key: 'fasting blood sugar', name: 'Fasting Blood Sugar', defaultUnit: 'mg/dL', min: 70, max: 100 },
      { key: 'cholesterol', name: 'Total Cholesterol', defaultUnit: 'mg/dL', min: 125, max: 200 },
      { key: 'vitamin d', name: 'Vitamin D (25-OH)', defaultUnit: 'ng/mL', min: 30, max: 100 },
      { key: 'ferritin', name: 'Serum Ferritin', defaultUnit: 'ng/mL', min: 13, max: 150 },
      { key: 'platelets', name: 'Platelet Count', defaultUnit: '10^3/uL', min: 150, max: 450 },
    ];

    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const t of knownTests) {
        if (lower.includes(t.key)) {
          // Look for numeric value near test name
          const numMatch = line.match(/(?:[:\-=\s])(\d+(?:\.\d+)?)/);
          if (numMatch) {
            const val = parseFloat(numMatch[1]);
            // Check reference range if present
            const rangeMatch = line.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/i);
            const refMin = rangeMatch ? parseFloat(rangeMatch[1]) : t.min;
            const refMax = rangeMatch ? parseFloat(rangeMatch[2]) : t.max;

            const isOutside = (refMin !== undefined && val < refMin) || (refMax !== undefined && val > refMax);

            candidates.push({
              test_name: t.name,
              test_value: val,
              unit: t.defaultUnit,
              reference_interval_min: refMin,
              reference_interval_max: refMax,
              reference_interval_text: `${refMin} - ${refMax} ${t.defaultUnit}`,
              is_outside_lab_range: isOutside,
            });
            break;
          }
        }
      }
    }

    return candidates;
  }
}

export const ocrService = new OCRService();
