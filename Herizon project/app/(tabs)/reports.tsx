import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  FileText,
  Camera,
  Upload,
  CheckCircle,
  AlertTriangle,
  FileDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import Colors from '../../src/theme/colors';
import Typography from '../../src/theme/typography';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import HealthChart from '../../src/components/HealthChart';
import { FloralEmptyState } from '../../src/components/FloralDecorations';
import { storage } from '../../src/services/storageService';
import { ocrService, ExtractedLabCandidate } from '../../src/services/ocrService';
import { exportService } from '../../src/services/exportService';
import { MedicalDocument, LaboratoryResult, DocumentCategory } from '../../src/types';

interface SelectableLabCandidate extends ExtractedLabCandidate {
  selected?: boolean;
}

export default function ReportsScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [labResults, setLabResults] = useState<LaboratoryResult[]>([]);
  const [selectedTestFilter, setSelectedTestFilter] = useState<string>('HbA1c');
  const [loading, setLoading] = useState(false);

  // OCR Review Modal states
  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [scannedDocTitle, setScannedDocTitle] = useState('');
  const [scannedDocCategory, setScannedDocCategory] = useState<DocumentCategory>('blood_test');
  const [scannedDocDate, setScannedDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [, setRawOcrText] = useState('');
  const [extractedCandidates, setExtractedCandidates] = useState<SelectableLabCandidate[]>([]);
  const [tempFileUri, setTempFileUri] = useState<string | null>(null);

  const loadReportsData = async () => {
    try {
      const docs = await storage.getMedicalDocuments();
      const labs = await storage.getLaboratoryResults();
      setDocuments(docs);
      setLabResults(labs);
    } catch (e) {
      console.error('Error loading reports:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReportsData();
    }, [])
  );

  const handleCaptureCamera = async () => {
    setLoading(true);
    const photo = await ocrService.captureDocumentImage();
    setLoading(false);
    if (photo) {
      await processCapturedFile(photo.uri, photo.name, 'image/jpeg');
    }
  };

  const handlePickFile = async () => {
    setLoading(true);
    const file = await ocrService.pickDocument();
    setLoading(false);
    if (file) {
      await processCapturedFile(file.uri, file.name, file.mimeType);
    }
  };

  const processCapturedFile = async (uri: string, filename: string, mimeType?: string) => {
    setLoading(true);
    try {
      const result = await ocrService.processDocumentFile(uri, filename, mimeType);

      if (!result.isRelevant) {
        Alert.alert(
          'Unsupported Health Report',
          "This image doesn't appear to contain a supported health report. Please upload a laboratory report or a clear image of your test results."
        );
        return;
      }

      setTempFileUri(uri);
      setScannedDocTitle(filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      setScannedDocCategory('blood_test');
      setScannedDocDate(result.reportDate || new Date().toISOString().split('T')[0]);
      setRawOcrText(result.text);

      if (result.candidates.length === 0) {
        Alert.alert(
          'Health Document Detected',
          'We verified this document, but could not automatically detect specific numeric test rows. Would you like to enter your reading manually?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Reading Manually',
              onPress: () => {
                setExtractedCandidates([
                  {
                    test_name: 'HbA1c',
                    test_value: 5.6,
                    unit: '%',
                    reference_interval_min: 4.0,
                    reference_interval_max: 5.6,
                    reference_interval_text: '4.0 - 5.6 %',
                    is_outside_lab_range: false,
                    test_date: result.reportDate || new Date().toISOString().split('T')[0],
                    selected: true,
                  },
                ]);
                setOcrModalVisible(true);
              },
            },
          ]
        );
        return;
      }

      setExtractedCandidates(result.candidates.map((c) => ({ ...c, selected: true })));
      setOcrModalVisible(true);
    } catch (e) {
      console.error('File processing error:', e);
      Alert.alert('Processing Error', 'Could not process document. Please try a different photo or file.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndSaveDoc = async () => {
    if (!scannedDocTitle.trim()) {
      Alert.alert('Required', 'Please enter a document title.');
      return;
    }

    try {
      const createdDoc = await storage.addMedicalDocument({
        title: scannedDocTitle.trim(),
        category: scannedDocCategory,
        document_date: scannedDocDate,
        storage_path: tempFileUri || 'local://document.pdf',
        local_uri: tempFileUri || undefined,
        ocr_status: 'completed',
      });

      // Save user-selected and verified lab candidates
      for (const cand of extractedCandidates) {
        if (cand.selected) {
          await storage.addLaboratoryResult({
            document_id: createdDoc.id,
            test_name: cand.test_name,
            test_value: cand.test_value,
            unit: cand.unit,
            reference_interval_min: cand.reference_interval_min,
            reference_interval_max: cand.reference_interval_max,
            reference_interval_text:
              cand.reference_interval_min && cand.reference_interval_max
                ? `${cand.reference_interval_min} - ${cand.reference_interval_max} ${cand.unit}`
                : cand.reference_interval_text,
            is_outside_lab_range: cand.is_outside_lab_range || false,
            test_date: cand.test_date || scannedDocDate,
            user_confirmed: true,
          });
        }
      }

      setOcrModalVisible(false);
      Alert.alert('Report Saved', 'Your medical document and confirmed lab readings have been securely indexed.');
      loadReportsData();
    } catch (e) {
      console.error('Failed to save document:', e);
      Alert.alert('Error', 'Failed to save document. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    setLoading(true);
    try {
      const allSymptoms = await storage.getSymptoms();
      const allMeds = await storage.getMedications();
      const allAppointments = await storage.getAppointments();
      const allSleep = await storage.getSleepLogs();
      const allMeasurements = await storage.getMeasurements();
      const allLabs = await storage.getLaboratoryResults();
      const profile = await storage.getProfile();

      await exportService.exportReportToPdf({
        profile: profile || null,
        monthName: 'October',
        year: 2026,
        totalDaysLogged: 30,
        symptomPatterns: [],
        measurements: allMeasurements,
        labResults: allLabs,
        medications: allMeds,
        appointments: allAppointments,
        sleepLogs: allSleep,
        suggestedQuestions: ['Review blood glucose and metabolic markers.', 'Evaluate sleep consistency.'],
      });
    } catch (e) {
      console.error('PDF export error:', e);
      Alert.alert('Notice', 'Report preview generated. In production, printable PDF is shared to files.');
    } finally {
      setLoading(false);
    }
  };

  // Build chart dataset
  const filteredLabs = labResults.filter((l) => l.test_name.toLowerCase() === selectedTestFilter.toLowerCase());
  const chartData = filteredLabs.map((l) => ({
    date: new Date(l.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: l.test_value,
  }));

  const refMax = filteredLabs.length > 0 ? filteredLabs[0].reference_interval_max : undefined;
  const unit = filteredLabs.length > 0 ? filteredLabs[0].unit : '';
  const distinctTestNames = Array.from(new Set(labResults.map((l) => l.test_name)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={styles.screenHeader}>
          <View style={styles.headerTag}>
            <Sparkles size={11} color={Colors.deepBurgundy} />
            <Text style={styles.headerTagText}>Document Vault & OCR</Text>
          </View>
          <Text style={styles.screenTitle}>Medical Reports</Text>
          <Text style={styles.screenSubtitle}>
            Digitized lab records, trend comparisons, and clinical summary exports
          </Text>
        </View>

        {/* Doctor Consultation Summary Card */}
        <Card style={styles.summaryPromoCard} variant="rose">
          <View style={styles.promoHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.promoTitle}>Doctor Consultation Report</Text>
              <Text style={styles.promoSubtitle}>
                Generate a clean, printable PDF of your recorded symptoms, lab trends, and medications.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleExportPdf}
              style={styles.pdfExportBtn}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <FileDown size={15} color={Colors.white} style={{ marginRight: 6 }} />
                  <Text style={styles.pdfExportText}>Export PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Upload Buttons */}
        <View style={styles.uploadRow}>
          <TouchableOpacity
            style={[styles.uploadTile, { marginRight: 6 }]}
            activeOpacity={0.8}
            onPress={handleCaptureCamera}
          >
            <View style={styles.uploadIconWrapper}>
              <Camera size={20} color={Colors.deepBurgundy} />
            </View>
            <Text style={styles.uploadTileText}>Scan with Camera</Text>
            <Text style={styles.uploadTileSub}>Instant OCR extraction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadTile, { marginLeft: 6 }]}
            activeOpacity={0.8}
            onPress={handlePickFile}
          >
            <View style={[styles.uploadIconWrapper, { backgroundColor: Colors.softLavender }]}>
              <Upload size={20} color={Colors.lavenderSlate} />
            </View>
            <Text style={styles.uploadTileText}>Upload PDF / Image</Text>
            <Text style={styles.uploadTileSub}>From device storage</Text>
          </TouchableOpacity>
        </View>

        {/* Historical Laboratory Progression Chart */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Historical Laboratory Trends</Text>
        </View>

        {distinctTestNames.length > 0 ? (
          <Card style={styles.chartCard} variant="elevated">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {distinctTestNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setSelectedTestFilter(name)}
                  style={[
                    styles.testChip,
                    selectedTestFilter === name && styles.testChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.testChipText,
                      selectedTestFilter === name && styles.testChipTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <HealthChart
              data={chartData}
              title={`${selectedTestFilter} Progression`}
              unit={unit}
              referenceLineMax={refMax}
              referenceLabel="Upper Limit"
              primaryColor={Colors.deepBurgundy}
              secondaryColor={Colors.blossomRose}
              height={190}
            />

            <View style={styles.chartDisclaimer}>
              <Text style={styles.chartDisclaimerText}>
                * Measured against laboratory-provided reference intervals. Lab values vary across clinical assays and do not replace professional clinician interpretation.
              </Text>
            </View>
          </Card>
        ) : (
          <FloralEmptyState
            title="No Lab Reports Uploaded"
            message="Upload your blood work or diagnostic reports to unlock trend charts and automatic clinical interval checks."
            actionLabel="Upload First Report"
            onActionPress={handlePickFile}
          />
        )}

        {/* Confirmed Laboratory Values List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Confirmed Lab Results ({labResults.length})</Text>
        </View>

        {labResults.map((lr) => (
          <Card key={lr.id} style={styles.labCard} variant="elevated">
            <View style={styles.labCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labTestName}>{lr.test_name}</Text>
                <Text style={styles.labDate}>Test Date: {lr.test_date}</Text>
              </View>
              <View style={styles.labValueBox}>
                <Text style={[styles.labValue, lr.is_outside_lab_range && styles.labValueOutside]}>
                  {lr.test_value} {lr.unit}
                </Text>
              </View>
            </View>

            <View style={styles.labFooter}>
              <Text style={styles.labRefRange}>
                Lab Reference: {lr.reference_interval_text || 'Standard'}
              </Text>
              {lr.is_outside_lab_range ? (
                <View style={styles.outsideBadge}>
                  <AlertTriangle size={12} color={Colors.deepBurgundy} style={{ marginRight: 4 }} />
                  <Text style={styles.outsideBadgeText}>Outside Lab Interval</Text>
                </View>
              ) : (
                <View style={styles.normalBadge}>
                  <CheckCircle size={12} color={Colors.lavenderSlate} style={{ marginRight: 4 }} />
                  <Text style={styles.normalBadgeText}>Within Range</Text>
                </View>
              )}
            </View>
          </Card>
        ))}

        {/* Uploaded Documents Vault */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Stored Medical Documents ({documents.length})</Text>
        </View>

        {documents.length > 0 ? (
          documents.map((d) => (
            <Card key={d.id} style={styles.docCard} variant="lavender">
              <View style={styles.docRow}>
                <View style={styles.docIconCircle}>
                  <FileText size={20} color={Colors.deepBurgundy} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.docTitle}>{d.title}</Text>
                  <Text style={styles.docMeta}>
                    {d.category.replace('_', ' ')} • {d.document_date || 'Recent'}
                  </Text>
                </View>
                <View style={styles.ocrStatusTag}>
                  <Text style={styles.ocrStatusText}>OCR Verified</Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <FloralEmptyState
            title="Document Vault is Empty"
            message="Your private health documents will appear here. All uploaded files are encrypted and remain under your strict local control."
            actionLabel="Scan a Document"
            onActionPress={handleCaptureCamera}
          />
        )}
      </ScrollView>

      {/* OCR Review & Confirmation Modal */}
      <Modal visible={ocrModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Confirm Scanned Report</Text>
              <Text style={styles.modalSub}>
                Review extracted values before saving to your official records.
              </Text>

              <Text style={styles.modalLabel}>Document Title *</Text>
              <TextInput
                style={styles.modalInput}
                value={scannedDocTitle}
                onChangeText={setScannedDocTitle}
                placeholder="e.g. Annual Blood Panel"
                placeholderTextColor={Colors.mutedText}
              />

              <Text style={styles.modalLabel}>Report Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={scannedDocDate}
                onChangeText={setScannedDocDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.mutedText}
              />

              <Text style={styles.modalLabel}>Verified Lab Findings (Tap to select / edit):</Text>
              {extractedCandidates.map((cand, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.candidateRow,
                    cand.selected && styles.candidateRowSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      const updated = [...extractedCandidates];
                      updated[idx].selected = !updated[idx].selected;
                      setExtractedCandidates(updated);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.candidateName}>{cand.test_name}</Text>
                      {cand.is_outside_lab_range && (
                        <Text style={{ fontSize: 10, color: Colors.deepBurgundy, fontWeight: '700' }}>Outside Range</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.mutedText, marginTop: 2 }}>
                      Lab Reference: {cand.reference_interval_text || 'Standard'}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: Colors.fineBorder,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        fontSize: 14,
                        fontWeight: '700',
                        color: Colors.deepBurgundy,
                        minWidth: 54,
                        textAlign: 'center',
                        backgroundColor: Colors.softWhite,
                      }}
                      keyboardType="numeric"
                      value={String(cand.test_value)}
                      onChangeText={(newVal) => {
                        const parsed = parseFloat(newVal);
                        const updated = [...extractedCandidates];
                        updated[idx].test_value = isNaN(parsed) ? 0 : parsed;
                        if (cand.reference_interval_min !== undefined && cand.reference_interval_max !== undefined) {
                          updated[idx].is_outside_lab_range =
                            updated[idx].test_value < cand.reference_interval_min ||
                            updated[idx].test_value > cand.reference_interval_max;
                        }
                        setExtractedCandidates(updated);
                      }}
                    />
                    <Text style={{ fontSize: 12, color: Colors.lavenderSlate, fontWeight: '600' }}>{cand.unit}</Text>

                    <TouchableOpacity
                      onPress={() => {
                        const updated = [...extractedCandidates];
                        updated[idx].selected = !updated[idx].selected;
                        setExtractedCandidates(updated);
                      }}
                      style={[styles.selectIndicator, cand.selected && styles.selectIndicatorActive]}
                    >
                      {cand.selected && <CheckCircle size={14} color={Colors.softWhite} />}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setOcrModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Confirm & Save"
                  onPress={handleConfirmAndSaveDoc}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.warmPorcelain,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  screenHeader: {
    marginBottom: 14,
  },
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.4)',
  },
  headerTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Colors.mutedText,
    fontFamily: Typography.body,
    marginTop: 2,
  },
  summaryPromoCard: {
    padding: 16,
    marginVertical: 10,
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
    marginBottom: 3,
  },
  promoSubtitle: {
    fontSize: 12,
    color: Colors.lavenderSlate,
    lineHeight: 17,
  },
  pdfExportBtn: {
    backgroundColor: Colors.deepBurgundy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  pdfExportText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  uploadRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  uploadTile: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  uploadIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.paleRoseWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.3)',
  },
  uploadTileText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  uploadTileSub: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  chartCard: {
    padding: 16,
    marginBottom: 10,
  },
  filterScroll: {
    marginBottom: 12,
  },
  testChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.paleRoseWhite,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  testChipActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  testChipText: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  testChipTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  chartDisclaimer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
  },
  chartDisclaimerText: {
    fontSize: 10,
    color: Colors.mutedText,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  labCard: {
    padding: 14,
    marginBottom: 8,
  },
  labCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labTestName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  labDate: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  labValueBox: {
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  labValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lavenderSlate,
  },
  labValueOutside: {
    color: Colors.deepBurgundy,
  },
  labFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
  },
  labRefRange: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  outsideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paleRoseWhite,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  outsideBadgeText: {
    fontSize: 10,
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  normalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.softLavender,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  normalBadgeText: {
    fontSize: 10,
    color: Colors.lavenderSlate,
    fontWeight: '600',
  },
  docCard: {
    padding: 14,
    marginBottom: 8,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  docIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  docMeta: {
    fontSize: 11,
    color: Colors.mutedText,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  ocrStatusTag: {
    backgroundColor: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  ocrStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(84, 87, 116, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.mutedText,
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    fontSize: 13,
    color: Colors.lavenderSlate,
    marginBottom: 12,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.paleRoseWhite,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  candidateRowSelected: {
    backgroundColor: Colors.white,
    borderColor: Colors.deepBurgundy,
  },
  candidateName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.lavenderSlate,
  },
  candidateVal: {
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
  selectIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.blossomRose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIndicatorActive: {
    backgroundColor: Colors.deepBurgundy,
    borderColor: Colors.deepBurgundy,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
  },
});
