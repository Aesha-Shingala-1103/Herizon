import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Mic, MicOff, Check, AlertCircle, Sparkles, X, Volume2, Radio } from 'lucide-react-native';
import Colors from '../theme/colors';
import Typography from '../theme/typography';
import { aiService } from '../services/aiService';
import { whisperService, VoiceError } from '../services/whisperService';
import { ParsedVoiceCommand, completeVoiceCommand } from '../services/voiceCommands';
import type { VoiceExecResult } from '../services/voiceExecutor';

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  /** Chat mode: accept any transcript (no health-intent required). */
  allowFreeText?: boolean;
  onConfirmParsedResult: (result: ParsedVoiceCommand) => Promise<VoiceExecResult> | VoiceExecResult | void;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  visible,
  onClose,
  onConfirmParsedResult,
  allowFreeText = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<'hinglish' | 'hi' | 'en'>('hinglish');
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('Tap microphone to speak');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedVoiceCommand | null>(null);
  const [execResult, setExecResult] = useState<VoiceExecResult | null>(null);
  const [saving, setSaving] = useState(false);
  const nativeRecorderRef = useRef<{ stop: () => Promise<string>; cancel: () => void } | null>(null);

  // Stable Animated Value without accessing .current in render
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Audio recording & Speech recognition handles
  const webAudioRecorderRef = useRef<{ stop: () => Promise<Blob>; cancel: () => void } | null>(null);
  const liveSpeechRecognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const timerIntervalRef = useRef<any>(null);

  const hasWhisperKey = whisperService.isWhisperConfigured();
  const hasWebSpeech = whisperService.isWebSpeechSupported();

  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => {
        loop.stop();
        pulseAnim.setValue(1);
      };
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Clean up on unmount or modal close
  useEffect(() => {
    if (!visible) {
      if (webAudioRecorderRef.current) {
        webAudioRecorderRef.current.cancel();
        webAudioRecorderRef.current = null;
      }
      if (liveSpeechRecognitionRef.current) {
        liveSpeechRecognitionRef.current.abort();
        liveSpeechRecognitionRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setIsRecording(false);
      setIsTranscribing(false);
      setRecordingSeconds(0);
      setErrorMessage(null);
    }
  }, [visible]);

  const testPhrases = [
    { label: 'Hinglish Headache', text: 'Aaj subah se headache ho raha hai.' },
    { label: 'Severity 6/10', text: 'Aaj headache 6 out of 10 hai' },
    { label: 'BP Reading', text: 'Mera BP reading 140 by 90 hai.' },
    { label: 'Sleep 5 Hours', text: 'Kal raat sirf paanch ghante soyi.' },
    { label: 'Medicine Taken', text: 'Maine lunch ke baad medicine le li.' },
  ];

  const handleStartRecording = async () => {
    setErrorMessage(null);
    setParsedResult(null);
    setRecordingSeconds(0);

    let streamStarted = false;

    // 1. Attempt Web Audio recording (MediaRecorder) for Whisper API
    if (whisperService.isAudioRecordingSupported()) {
      try {
        const recorder = await whisperService.startWebAudioRecording();
        webAudioRecorderRef.current = recorder;
        streamStarted = true;
      } catch (err: any) {
        console.warn('Microphone recording error:', err);
        setErrorMessage('Microphone access was denied or is unavailable. You can type or use the test phrases below.');
      }
    }

    // 1b. Native (Android/iOS) recording via expo-audio
    if (!streamStarted && whisperService.isNativeRecordingSupported()) {
      try {
        nativeRecorderRef.current = await whisperService.startNativeRecording();
        streamStarted = true;
      } catch (err: any) {
        setErrorMessage(err instanceof VoiceError ? err.message : 'Could not start recording. You can type your entry below.');
        return;
      }
    }
    if (!streamStarted && !whisperService.isWebSpeechSupported()) {
      setErrorMessage('Voice capture is not available in this build (microphone module missing). Please type your entry below.');
      return;
    }

    // 2. Start real-time Web Speech recognition if supported (for instant live preview)
    if (whisperService.isWebSpeechSupported()) {
      try {
        const liveRecognizer = whisperService.startLiveWebSpeech({
          language: selectedLanguage,
          onInterim: (interim) => {
            setTranscript((prev) => {
              const base = prev.trim();
              return base ? `${base} ${interim}` : interim;
            });
          },
          onFinal: (finalChunk) => {
            setTranscript((prev) => {
              const base = prev.trim();
              const updated = base ? `${base} ${finalChunk}` : finalChunk;
              setParsedResult(aiService.parseVoiceInput(updated));
              return updated;
            });
          },
          onError: (err) => {
            console.warn('Live speech recognition warning:', err);
          },
        });
        liveSpeechRecognitionRef.current = liveRecognizer;
        streamStarted = true;
      } catch (e) {
        console.warn('Failed to start live speech recognition:', e);
      }
    }

    setIsRecording(true);
    setStatusMessage(streamStarted ? 'Listening... Speak clearly (Tap to finish)' : 'Recording session active...');

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((sec) => sec + 1);
    }, 1000);
  };

  const handleStopRecording = async (forcedText?: string) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);

    // Stop live recognition
    if (liveSpeechRecognitionRef.current) {
      try {
        liveSpeechRecognitionRef.current.stop();
      } catch {}
      liveSpeechRecognitionRef.current = null;
    }

    let finalTranscriptText = forcedText || transcript;

    // Process Whisper API audio blob if audio recorder was running
    if (webAudioRecorderRef.current) {
      const recorder = webAudioRecorderRef.current;
      webAudioRecorderRef.current = null;

      try {
        const audioBlob = await recorder.stop();

        // If Whisper API is configured, send the real audio blob for clinical-grade transcription
        if (whisperService.isWhisperConfigured() && audioBlob.size > 100) {
          setIsTranscribing(true);
          setStatusMessage('Transcribing with Whisper AI...');

          const whisperResult = await whisperService.transcribeAudioBlob(
            audioBlob,
            selectedLanguage
          );

          if (whisperResult.text && whisperResult.text.trim()) {
            finalTranscriptText = whisperResult.text.trim();
            setTranscript(finalTranscriptText);
          }
        }
      } catch (err: any) {
        if (err instanceof VoiceError && !finalTranscriptText.trim()) setErrorMessage(err.message);
        // Fallback gracefully to the transcript we already captured
      } finally {
        setIsTranscribing(false);
      }
    }

    if (nativeRecorderRef.current) {
      const rec = nativeRecorderRef.current;
      nativeRecorderRef.current = null;
      try {
        const uri = await rec.stop();
        setIsTranscribing(true);
        setStatusMessage('Transcribing...');
        const r = await whisperService.transcribeFileUri(uri, selectedLanguage);
        finalTranscriptText = r.text;
        setTranscript(r.text);
      } catch (err: any) {
        const label = err instanceof VoiceError
          ? { network: 'Network problem', transcription: 'Transcription failed', permission: 'Permission denied', unsupported: 'Not supported', not_configured: 'Speech service unavailable' }[err.kind]
          : 'Recording failed';
        setErrorMessage(`${label}: ${err?.message || ''} You can type your entry instead.`);
      } finally {
        setIsTranscribing(false);
      }
    }

    setStatusMessage('Tap microphone to speak');

    if (finalTranscriptText.trim()) {
      const parsed = aiService.parseVoiceInput(finalTranscriptText);
      setParsedResult(parsed);
    }
  };

  const handleSelectTestPhrase = (phraseText: string) => {
    setTranscript(phraseText);
    const parsed = aiService.parseVoiceInput(phraseText);
    setParsedResult(parsed);
  };

  const handleConfirm = async () => {
    if (allowFreeText && transcript.trim() && !saving) {
      await onConfirmParsedResult({ intent: 'unknown', transcript: transcript.trim(), confidence: 1, extractedFieldsDisplay: '', missing: [], valid: true });
      onClose();
      setTranscript('');
      setParsedResult(null);
      return;
    }
    if (!parsedResult || !parsedResult.valid || saving) return;
    setSaving(true);
    try {
      const res = (await onConfirmParsedResult(parsedResult)) as VoiceExecResult | undefined;
      if (res && !res.ok) {
        setExecResult(res); // stay open: nothing was saved
        return;
      }
      setExecResult(res || { ok: true, message: 'Saved.' });
      setTimeout(() => {
        onClose();
        setTranscript('');
        setParsedResult(null);
        setExecResult(null);
        setRecordingSeconds(0);
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  const formatSeconds = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Volume2 color={Colors.primaryTeal} size={22} />
              <Text style={styles.title}>Voice Health Logging</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Active Engine Badge */}
            <View style={styles.engineBadgeContainer}>
              <View
                style={[
                  styles.engineBadge,
                  hasWhisperKey
                    ? styles.engineBadgeWhisper
                    : hasWebSpeech
                    ? styles.engineBadgeWeb
                    : styles.engineBadgeFallback,
                ]}
              >
                <Sparkles size={12} color={hasWhisperKey ? Colors.deepTeal : Colors.primaryTeal} />
                <Text style={styles.engineBadgeText}>
                  {whisperService.isNativeRecordingSupported() || hasWebSpeech
                    ? hasWhisperKey ? 'Voice: cloud transcription' : 'Voice: on-device recognition'
                    : 'Typing mode (microphone unavailable)'}
                </Text>
              </View>
            </View>

            {/* Language Selection Chips */}
            <View style={styles.langSelector}>
              <Text style={styles.langLabel}>Voice Input Language:</Text>
              <View style={styles.langRow}>
                {(['hinglish', 'hi', 'en'] as const).map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => setSelectedLanguage(lang)}
                    style={[
                      styles.langChip,
                      selectedLanguage === lang && styles.langChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langChipText,
                        selectedLanguage === lang && styles.langChipTextActive,
                      ]}
                    >
                      {lang === 'hinglish' ? 'Hinglish (Mix)' : lang === 'hi' ? 'Hindi (हिन्दी)' : 'English'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Error Message if any */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={Colors.urgentRed} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Mic Center Button */}
            <View style={styles.micSection}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isTranscribing}
                  onPress={isRecording ? () => handleStopRecording() : handleStartRecording}
                  style={[
                    styles.micButton,
                    isRecording ? styles.micButtonActive : styles.micButtonIdle,
                  ]}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : isRecording ? (
                    <MicOff size={32} color={Colors.white} />
                  ) : (
                    <Mic size={32} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </Animated.View>

              {isRecording && (
                <View style={styles.recordingTimer}>
                  <Radio size={12} color={Colors.urgentRed} />
                  <Text style={styles.recordingTimerText}>{formatSeconds(recordingSeconds)}</Text>
                </View>
              )}

              <Text style={styles.micStatusText}>
                {isTranscribing ? 'Transcribing your voice...' : statusMessage}
              </Text>
            </View>

            {/* Editable Transcript Input */}
            <View style={styles.transcriptBox}>
              <View style={styles.transcriptHeader}>
                <Text style={styles.inputTitle}>Recognized Speech / Free-text</Text>
                {transcript.length > 0 && (
                  <TouchableOpacity onPress={() => setTranscript('')}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="Speak into microphone or type your symptom, medicine, or BP reading here..."
                placeholderTextColor={Colors.textMuted}
                value={transcript}
                onChangeText={(t) => {
                  setTranscript(t);
                  if (t.length > 4) {
                    setParsedResult(aiService.parseVoiceInput(t));
                  }
                }}
              />
            </View>

            {/* Test Phrases Shortcuts */}
            <View style={styles.quickPhrases}>
              <Text style={styles.quickPhrasesTitle}>Examples (tap to try):</Text>
              <View style={styles.chipsWrap}>
                {testPhrases.map((tp, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.phraseChip}
                    onPress={() => handleSelectTestPhrase(tp.text)}
                  >
                    <Text style={styles.phraseChipText}>&ldquo;{tp.text}&rdquo;</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Candidate Structured Extraction Confirmation Card */}
            {parsedResult && (
              <View style={styles.candidateCard}>
                <View style={styles.candidateHeader}>
                  <Sparkles size={18} color={Colors.deepTeal} />
                  <Text style={styles.candidateTitle}>Extracted Health Entry</Text>
                </View>

                <View style={styles.candidateDetails}>
                  <Text style={styles.candidateIntent}>
                    Detected Category: <Text style={{ fontWeight: '700', textTransform: 'capitalize' }}>{parsedResult.intent}</Text>
                  </Text>
                  <Text style={styles.candidateFieldText}>
                    {parsedResult.extractedFieldsDisplay}
                  </Text>
                </View>

                {!allowFreeText && parsedResult.error && (
                  <Text style={[styles.candidateFieldText, { color: Colors.deepBurgundy }]}>{parsedResult.error}</Text>
                )}
                {parsedResult.missing.includes('severity') && (
                  <View>
                    <Text style={styles.candidateIntent}>How severe is it? (1–10)</Text>
                    <View style={styles.chipsWrap}>
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                        <TouchableOpacity key={n} style={styles.phraseChip} onPress={() => setParsedResult(completeVoiceCommand(parsedResult, 'severity', n))}>
                          <Text style={styles.phraseChipText}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {parsedResult.missing.includes('sleepHours') && (
                  <View>
                    <Text style={styles.candidateIntent}>How many hours did you sleep?</Text>
                    <View style={styles.chipsWrap}>
                      {[4,5,6,7,8,9].map((n) => (
                        <TouchableOpacity key={n} style={styles.phraseChip} onPress={() => setParsedResult(completeVoiceCommand(parsedResult, 'sleepHours', n))}>
                          <Text style={styles.phraseChipText}>{n} h</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {execResult && (
                  <Text style={[styles.candidateFieldText, { color: execResult.ok ? Colors.lavenderSlate : Colors.deepBurgundy }]}>{execResult.message}</Text>
                )}

                <View style={styles.safetyNotice}>
                  <AlertCircle size={14} color={Colors.primaryTeal} />
                  <Text style={styles.safetyNoticeText}>
                    Entries are saved only after your explicit review and confirmation.
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleConfirm}
                  disabled={(!allowFreeText && !parsedResult.valid) || saving}
                  style={[styles.confirmSaveBtn, ((!allowFreeText && !parsedResult.valid) || saving) && { opacity: 0.45 }]}
                >
                  <Check size={18} color={Colors.white} />
                  <Text style={styles.confirmSaveText}>Confirm & Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 43, 58, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
  },
  closeBtn: {
    padding: 6,
  },
  engineBadgeContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  engineBadgeWhisper: {
    backgroundColor: Colors.softLavender,
    borderWidth: 1,
    borderColor: Colors.blossomRose,
  },
  engineBadgeWeb: {
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.softLavender,
  },
  engineBadgeFallback: {
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  engineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.deepBurgundy,
  },
  langSelector: {
    marginBottom: 14,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
    marginBottom: 6,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.paleRoseWhite,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  langChipActive: {
    backgroundColor: Colors.softLavender,
    borderColor: Colors.blossomRose,
  },
  langChipText: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  langChipTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.deepBurgundy,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    color: Colors.deepBurgundy,
    flex: 1,
  },
  micSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  micButtonIdle: {
    backgroundColor: Colors.deepBurgundy,
  },
  micButtonActive: {
    backgroundColor: Colors.blossomRose,
  },
  recordingTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  recordingTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepBurgundy,
  },
  micStatusText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.mutedText,
    fontWeight: '500',
  },
  transcriptBox: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    marginBottom: 14,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: Colors.mutedText,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 11,
    color: Colors.deepBurgundy,
    fontWeight: '600',
  },
  textInput: {
    fontSize: 14,
    color: Colors.lavenderSlate,
    minHeight: 54,
    textAlignVertical: 'top',
  },
  quickPhrases: {
    marginBottom: 14,
  },
  quickPhrasesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedText,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  phraseChip: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.fineBorder,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  phraseChipText: {
    fontSize: 11,
    color: Colors.lavenderSlate,
    fontStyle: 'italic',
  },
  candidateCard: {
    backgroundColor: Colors.paleRoseWhite,
    borderColor: Colors.blossomRose,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  candidateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    fontFamily: Typography.heading,
  },
  candidateDetails: {
    backgroundColor: Colors.white,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  candidateIntent: {
    fontSize: 12,
    color: Colors.mutedText,
    marginBottom: 4,
  },
  candidateFieldText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.lavenderSlate,
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  safetyNoticeText: {
    fontSize: 11,
    color: Colors.mutedText,
    flex: 1,
  },
  confirmSaveBtn: {
    backgroundColor: Colors.deepBurgundy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 22,
  },
  confirmSaveText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default VoiceInputModal;
