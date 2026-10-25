/**
 * HerHealth OCR & Medical Document Processing Service
 * 
 * Provides:
 * 1. Mobile document & camera capture with size/type validation.
 * 2. Real text extraction from PDF streams and image OCR pipelines.
 * 3. Clinical relevance check: rejects non-medical photos (selfies, receipts, landscapes)
 *    with friendly guidance before opening review.
 * 4. Deep laboratory test recognition with special emphasis on HbA1c variants:
 *    HbA1c, Hb A1c, Glycated haemoglobin, Glycosylated hemoglobin, Hemoglobin A1c.
 * 5. Extraction of measured values, units (%, mmol/mol, mg/dL, etc.), reference ranges, and dates.
 * 6. Clean human-in-the-loop candidate structure ready for user verification.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface ExtractedLabCandidate {
  test_name: string;
  test_value: number;
  unit: string;
  reference_interval_min?: number;
  reference_interval_max?: number;
  reference_interval_text?: string;
  is_outside_lab_range?: boolean;
  test_date?: string; // YYYY-MM-DD
  confidence?: number; // 0-1
  raw_line?: string;
}

export interface DocumentProcessingResult {
  text: string;
  isRelevant: boolean;
  rejectionReason?: string;
  candidates: ExtractedLabCandidate[];
  reportDate?: string;
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
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || `lab_photo_${Date.now()}.jpg`,
        };
      }
      return null;
    } catch (e) {
      console.warn('Capture document error:', e);
      return null;
    }
  }

  /**
   * Pick document from Files (Images/PDFs) with size & type validation
   */
  public async pickDocument(): Promise<{ uri: string; name: string; mimeType?: string; size?: number } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        // Validate size (max 15MB)
        if (asset.size && asset.size > 15 * 1024 * 1024) {
          throw new Error('File exceeds maximum supported size (15 MB).');
        }

        return {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        };
      }
      return null;
    } catch (e) {
      console.warn('Pick document error:', e);
      return null;
    }
  }

  /**
   * Validates if extracted document text contains medical, clinical, or laboratory markers.
   * Rejects unrelated photos (selfies, pets, receipts, landscapes, memes).
   */
  public validateHealthReportRelevance(text: string): { isRelevant: boolean; reason?: string } {
    if (!text || text.trim().length < 8) {
      return {
        isRelevant: false,
        reason: 'The uploaded file does not contain readable printed text.',
      };
    }

    const lower = text.toLowerCase();

    // Clinical and laboratory indicators
    const labKeywords = [
      'laboratory',
      'diagnostic',
      'pathology',
      'clinic',
      'hospital',
      'patient',
      'specimen',
      'reference interval',
      'reference range',
      'biological reference',
      'normal range',
      'test name',
      'investigation',
      'biochemistry',
      'hematology',
      'haematology',
      'endocrinology',
      'microbiology',
      'report date',
      'collection date',
      'verified by',
      'pathologist',
      'dr.',
      'doctor',
      'prescription',
      'consultation',
    ];

    // Known medical analytes and health markers
    const testKeywords = [
      'hba1c',
      'glycated',
      'glycosylated',
      'hemoglobin',
      'haemoglobin',
      'tsh',
      'thyroid',
      'blood sugar',
      'fasting glucose',
      'glucose',
      'fbs',
      'ppbs',
      'cholesterol',
      'triglyceride',
      'hdl',
      'ldl',
      'lipid',
      'ferritin',
      'iron',
      'vitamin d',
      'b12',
      'platelet',
      'wbc',
      'rbc',
      'creatinine',
      'urea',
      'uric acid',
      'bilirubin',
      'sgot',
      'sgpt',
      'alt',
      'ast',
      'alkaline phosphatase',
      'esr',
      'crp',
      'urinalysis',
      'urine',
      'pcod',
      'pcos',
      'blood pressure',
    ];

    const hasLabKeyword = labKeywords.some((k) => lower.includes(k));
    const hasTestKeyword = testKeywords.some((k) => lower.includes(k));

    if (hasLabKeyword || hasTestKeyword) {
      return { isRelevant: true };
    }

    return {
      isRelevant: false,
      reason: 'No medical or laboratory test markers found in document.',
    };
  }

  /**
   * Attempts text extraction from a PDF file using string/stream parsing
   */
  public async extractTextFromPDF(uri: string): Promise<string> {
    try {
      // Read raw binary/latin1 content of the PDF to extract uncompressed textual streams
      const raw = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const extractedStrings: string[] = [];

      // Extract text in PDF literal strings (e.g. (HbA1c) or (Fasting Blood Sugar))
      const textMatches = raw.match(/\(([^()]{2,100})\)/g);
      if (textMatches) {
        for (const match of textMatches) {
          const clean = match.replace(/[()]/g, '').trim();
          if (clean.length > 1 && !/[^\x20-\x7E]/.test(clean)) {
            extractedStrings.push(clean);
          }
        }
      }

      if (extractedStrings.length > 5) {
        return extractedStrings.join(' ');
      }

      return raw;
    } catch (e) {
      console.warn('PDF stream extraction notice:', e);
      return '';
    }
  }

  /**
   * Extracts text from an image or falls back to OCR API
   */
  public async extractTextFromImage(uri: string): Promise<string> {
    try {
      // Read base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Free OCR.space public engine for mobile clinical test parsing
      try {
        const formData = new FormData();
        formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: {
            apikey: 'K87899142388957', // Public free tier OCR key
          },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.ParsedResults && data.ParsedResults.length > 0) {
            const parsed = data.ParsedResults[0].ParsedText;
            if (parsed && parsed.trim().length > 0) {
              return parsed;
            }
          }
        }
      } catch (ocrNetErr) {
        console.warn('Cloud OCR request notice:', ocrNetErr);
      }

      return '';
    } catch (e) {
      console.warn('Image text extraction error:', e);
      return '';
    }
  }

  /**
   * Extracts standard report date (YYYY-MM-DD) from document text
   */
  public extractReportDate(text: string): string | undefined {
    // Matches YYYY-MM-DD
    const isoMatch = text.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // Matches DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }

    // Matches e.g. "15 Oct 2026" or "15 October 2026"
    const namedMonthMatch = text.match(
      /\b(0?[1-9]|[12]\d|3[01])[\s-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,]+(20\d{2})\b/i
    );
    if (namedMonthMatch) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const mIdx = monthNames.findIndex((m) => namedMonthMatch[2].toLowerCase().startsWith(m));
      if (mIdx >= 0) {
        const mStr = String(mIdx + 1).padStart(2, '0');
        const dStr = namedMonthMatch[1].padStart(2, '0');
        return `${namedMonthMatch[3]}-${mStr}-${dStr}`;
      }
    }

    return undefined;
  }

  /**
   * Main Document Processing Pipeline
   */
  public async processDocumentFile(
    uri: string,
    filename: string,
    mimeType?: string
  ): Promise<DocumentProcessingResult> {
    const isPdf = filename.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';

    let rawText = '';
    if (isPdf) {
      rawText = await this.extractTextFromPDF(uri);
    } else {
      rawText = await this.extractTextFromImage(uri);
    }

    // If text was sparse but file name suggests a specific test (e.g. "hba1c_report.pdf")
    const combinedForRelevance = `${filename}\n${rawText}`;
    const relevance = this.validateHealthReportRelevance(combinedForRelevance);

    if (!relevance.isRelevant) {
      return {
        text: rawText,
        isRelevant: false,
        rejectionReason:
          relevance.reason ||
          "This image doesn't appear to contain a supported health report. Please upload a laboratory report or a clear image of your test results.",
        candidates: [],
      };
    }

    const reportDate = this.extractReportDate(rawText) || new Date().toISOString().split('T')[0];
    const candidates = this.parseLabReportText(rawText, reportDate);

    return {
      text: rawText,
      isRelevant: true,
      candidates,
      reportDate,
    };
  }

  /**
   * Deep Parser for Laboratory Reports
   * Supports:
   * - HbA1c (variants: HbA1c, Hb A1c, Glycated haemoglobin, Glycosylated hemoglobin, Hemoglobin A1c)
   * - TSH, Fasting Blood Sugar, Hemoglobin, Lipid Profile, Vitamin D, Ferritin, Platelets, Creatinine
   */
  public parseLabReportText(ocrText: string, fallbackDate?: string): ExtractedLabCandidate[] {
    const candidates: ExtractedLabCandidate[] = [];
    const dateToUse = fallbackDate || new Date().toISOString().split('T')[0];
    const lines = ocrText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    // 1. HbA1c Dedicated Extraction
    const hba1cPatterns = [
      /\b(?:hba1c|hb\s*a1c|hb-a1c|glycated\s*h[ae]moglobin|glycosylated\s*h[ae]moglobin|h[ae]moglobin\s*a1c|a1c)\b/i,
    ];

    for (const line of lines) {
      const isHbA1cMatch = hba1cPatterns.some((pattern) => pattern.test(line));
      if (isHbA1cMatch) {
        // Check if unit is mmol/mol or %
        const isMmol = /mmol\s*\/\s*mol/i.test(line);
        const unit = isMmol ? 'mmol/mol' : '%';

        // Extract numeric value near test name
        const numMatch = line.match(/(?:[:\-=\s]|^)\s*(\d{1,2}(?:\.\d{1,2})?)(?:\s*%|\s*mmol|\s*$|\s*\()/i);
        if (numMatch) {
          const val = parseFloat(numMatch[1]);
          if (!isNaN(val) && val > 0 && val < (isMmol ? 150 : 25)) {
            // Check printed reference range in line
            const rangeMatch = line.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/i);
            const refMin = rangeMatch ? parseFloat(rangeMatch[1]) : (isMmol ? 20 : 4.0);
            const refMax = rangeMatch ? parseFloat(rangeMatch[2]) : (isMmol ? 42 : 5.6);

            const isOutside = val < refMin || val > refMax;

            candidates.push({
              test_name: 'HbA1c',
              test_value: val,
              unit,
              reference_interval_min: refMin,
              reference_interval_max: refMax,
              reference_interval_text: `${refMin} - ${refMax} ${unit}`,
              is_outside_lab_range: isOutside,
              test_date: dateToUse,
              confidence: 0.95,
              raw_line: line,
            });
            break; // Found primary HbA1c
          }
        }
      }
    }

    // 2. Other Standard Laboratory Tests
    const standardTests = [
      {
        matchRegex: /\b(?:tsh|thyroid\s*stimulating\s*hormone)\b/i,
        name: 'Thyroid Stimulating Hormone (TSH)',
        defaultUnit: 'uIU/mL',
        defaultMin: 0.35,
        defaultMax: 4.5,
        maxSensible: 100,
      },
      {
        matchRegex: /\b(?:fasting\s*blood\s*sugar|fasting\s*glucose|fbs)\b/i,
        name: 'Fasting Blood Sugar',
        defaultUnit: 'mg/dL',
        defaultMin: 70,
        defaultMax: 100,
        maxSensible: 500,
      },
      {
        matchRegex: /\b(?:post\s*prandial\s*glucose|ppbs)\b/i,
        name: 'Postprandial Blood Sugar',
        defaultUnit: 'mg/dL',
        defaultMin: 70,
        defaultMax: 140,
        maxSensible: 600,
      },
      {
        matchRegex: /\b(?:h[ae]moglobin)\b/i,
        excludeRegex: /a1c|glycated/i,
        name: 'Hemoglobin',
        defaultUnit: 'g/dL',
        defaultMin: 12.0,
        defaultMax: 15.5,
        maxSensible: 25,
      },
      {
        matchRegex: /\b(?:total\s*cholesterol)\b/i,
        name: 'Total Cholesterol',
        defaultUnit: 'mg/dL',
        defaultMin: 125,
        defaultMax: 200,
        maxSensible: 600,
      },
      {
        matchRegex: /\b(?:vitamin\s*d|25-hydroxy\s*vitamin\s*d|25-oh)\b/i,
        name: 'Vitamin D (25-OH)',
        defaultUnit: 'ng/mL',
        defaultMin: 30,
        defaultMax: 100,
        maxSensible: 200,
      },
      {
        matchRegex: /\b(?:serum\s*ferritin|ferritin)\b/i,
        name: 'Serum Ferritin',
        defaultUnit: 'ng/mL',
        defaultMin: 13,
        defaultMax: 150,
        maxSensible: 1000,
      },
      {
        matchRegex: /\b(?:platelet\s*count|platelets)\b/i,
        name: 'Platelet Count',
        defaultUnit: '10^3/uL',
        defaultMin: 150,
        defaultMax: 450,
        maxSensible: 1000,
      },
      {
        matchRegex: /\b(?:serum\s*creatinine|creatinine)\b/i,
        name: 'Serum Creatinine',
        defaultUnit: 'mg/dL',
        defaultMin: 0.6,
        defaultMax: 1.2,
        maxSensible: 15,
      },
    ];

    for (const testDef of standardTests) {
      // Don't duplicate if already extracted
      if (candidates.some((c) => c.test_name === testDef.name)) continue;

      for (const line of lines) {
        if (testDef.excludeRegex && testDef.excludeRegex.test(line)) continue;

        if (testDef.matchRegex.test(line)) {
          const numMatch = line.match(/(?:[:\-=\s]|^)\s*(\d+(?:\.\d+)?)/);
          if (numMatch) {
            const val = parseFloat(numMatch[1]);
            if (!isNaN(val) && val > 0 && val < testDef.maxSensible) {
              const rangeMatch = line.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)/i);
              const refMin = rangeMatch ? parseFloat(rangeMatch[1]) : testDef.defaultMin;
              const refMax = rangeMatch ? parseFloat(rangeMatch[2]) : testDef.defaultMax;

              const isOutside = (refMin !== undefined && val < refMin) || (refMax !== undefined && val > refMax);

              candidates.push({
                test_name: testDef.name,
                test_value: val,
                unit: testDef.defaultUnit,
                reference_interval_min: refMin,
                reference_interval_max: refMax,
                reference_interval_text: `${refMin} - ${refMax} ${testDef.defaultUnit}`,
                is_outside_lab_range: isOutside,
                test_date: dateToUse,
                confidence: 0.9,
                raw_line: line,
              });
              break;
            }
          }
        }
      }
    }

    return candidates;
  }
}

export const ocrService = new OCRService();
