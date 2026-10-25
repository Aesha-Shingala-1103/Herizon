/**
 * HerHealth Whisper Speech-to-Text & Audio Service
 * 
 * Provides:
 * 1. Whisper API speech transcription via OpenAI/Groq compatible endpoint.
 * 2. Cross-platform browser audio recording using MediaRecorder & getUserMedia.
 * 3. Browser SpeechRecognition (Web Speech API) live dictation with zero-latency streaming.
 * 4. Multilingual support: English, Hindi (हिन्दी), and Hinglish (mixed colloquial speech).
 */

import { Platform } from 'react-native';
import { isSupabaseConfigured } from './supabase';
import { callEdgeFunction, EdgeError } from './edgeFunctions';

export interface WhisperTranscriptionResult {
  text: string;
  source: 'whisper-api' | 'web-speech' | 'fallback';
  durationSeconds?: number;
  confidence?: number;
}

export type VoiceErrorKind = 'permission' | 'unsupported' | 'transcription' | 'network' | 'not_configured';

export class VoiceError extends Error {
  kind: VoiceErrorKind;
  constructor(kind: VoiceErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

// expo-audio is an optional native module (install with `npx expo install expo-audio`).
function loadExpoAudio(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-audio');
  } catch {
    return null;
  }
}

export class WhisperService {
  /** Transcription runs through the authenticated `transcribe` Edge Function; no key is in the app. */
  public isWhisperConfigured(): boolean {
    return isSupabaseConfigured();
  }

  public isNativeRecordingSupported(): boolean {
    return Platform.OS !== 'web' && loadExpoAudio() !== null;
  }

  public isWebSpeechSupported(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const win = window as any;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  public isAudioRecordingSupported(): boolean {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
    return Boolean(
      navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof (window as any).MediaRecorder !== 'undefined'
    );
  }

  private async postAudio(form: FormData, lang: string): Promise<WhisperTranscriptionResult> {
    if (lang === 'hi' || lang === 'en') form.append('language', lang);
    try {
      const data = await callEdgeFunction<{ text: string }>('transcribe', form, true);
      if (!data.text) throw new VoiceError('transcription', 'No speech was recognised. Please try again or type instead.');
      return { text: data.text, source: 'whisper-api' };
    } catch (e: any) {
      if (e instanceof VoiceError) throw e;
      if (e instanceof EdgeError) {
        const kind: VoiceErrorKind =
          e.kind === 'network' ? 'network' : e.kind === 'server' ? 'transcription' : 'not_configured';
        throw new VoiceError(kind, e.message);
      }
      throw new VoiceError('transcription', e?.message || 'Transcription failed.');
    }
  }

  public async transcribeAudioBlob(
    audioBlob: Blob,
    lang: 'hinglish' | 'hi' | 'en' = 'hinglish'
  ): Promise<WhisperTranscriptionResult> {
    const form = new FormData();
    const ext = (audioBlob.type || '').includes('mp4') ? 'm4a' : 'webm';
    form.append('file', audioBlob, `speech.${ext}`);
    return this.postAudio(form, lang);
  }

  public async transcribeFileUri(
    uri: string,
    lang: 'hinglish' | 'hi' | 'en' = 'hinglish'
  ): Promise<WhisperTranscriptionResult> {
    const form = new FormData();
    form.append('file', { uri, name: 'speech.m4a', type: 'audio/m4a' } as any);
    return this.postAudio(form, lang);
  }

  /**
   * Native (Android/iOS) recording via expo-audio. Requires a build that includes the module
   * and the microphone permission. API usage follows expo-audio's AudioModule/AudioRecorder; verify on device.
   */
  public async startNativeRecording(): Promise<{ stop: () => Promise<string>; cancel: () => void }> {
    const mod = loadExpoAudio();
    if (!mod) throw new VoiceError('unsupported', 'Voice recording needs the expo-audio module. Run: npx expo install expo-audio');
    const perm = await mod.AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) throw new VoiceError('permission', 'Microphone permission was denied. Enable it in Settings or type your entry.');
    await mod.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    const recorder = new mod.AudioModule.AudioRecorder(mod.RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();
    return {
      stop: async () => {
        await recorder.stop();
        await mod.setAudioModeAsync({ allowsRecording: false });
        if (!recorder.uri) throw new VoiceError('transcription', 'Recording produced no audio.');
        return recorder.uri as string;
      },
      cancel: () => {
        try { recorder.stop(); } catch {}
      },
    };
  }

  /**
   * Start recording microphone audio on Web via MediaRecorder
   */
  public async startWebAudioRecording(): Promise<{
    stop: () => Promise<Blob>;
    cancel: () => void;
  }> {
    if (!this.isAudioRecordingSupported()) {
      throw new Error('Microphone audio recording is not supported in this browser environment.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    let mimeType = 'audio/webm;codecs=opus';
    const win = window as any;
    if (win.MediaRecorder.isTypeSupported && !win.MediaRecorder.isTypeSupported(mimeType)) {
      if (win.MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (win.MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else {
        mimeType = '';
      }
    }

    const mediaRecorder = mimeType
      ? new win.MediaRecorder(stream, { mimeType })
      : new win.MediaRecorder(stream);

    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (event: any) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.start(250); // collect 250ms audio slices

    const stop = (): Promise<Blob> => {
      return new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          // Release microphone tracks
          stream.getTracks().forEach((track) => track.stop());
          const finalBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          resolve(finalBlob);
        };
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      });
    };

    const cancel = () => {
      try {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      } catch {}
      stream.getTracks().forEach((track) => track.stop());
    };

    return { stop, cancel };
  }

  /**
   * Start live speech recognition stream via Web Speech API
   */
  public startLiveWebSpeech(options: {
    language: 'hinglish' | 'hi' | 'en';
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (error: string) => void;
  }): { stop: () => void; abort: () => void } | null {
    if (!this.isWebSpeechSupported()) return null;

    try {
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Select language locale
      if (options.language === 'hi') {
        recognition.lang = 'hi-IN';
      } else if (options.language === 'hinglish') {
        recognition.lang = 'hi-IN'; // Recognizes mixed Hindi & English smoothly
      } else {
        recognition.lang = 'en-US';
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interimTranscript += piece;
          }
        }

        if (interimTranscript) {
          options.onInterim(interimTranscript);
        }
        if (finalTranscript) {
          options.onFinal(finalTranscript);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e.error);
        if (e.error !== 'no-speech') {
          options.onError(e.error || 'Speech recognition error');
        }
      };

      recognition.start();

      return {
        stop: () => {
          try {
            recognition.stop();
          } catch {}
        },
        abort: () => {
          try {
            recognition.abort();
          } catch {}
        },
      };
    } catch (e) {
      console.warn('Failed to start Web Speech Recognition:', e);
      return null;
    }
  }
}

export const whisperService = new WhisperService();
