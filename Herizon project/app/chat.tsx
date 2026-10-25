import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Send, Mic, RotateCcw } from 'lucide-react-native';
import Colors from '../src/theme/colors';
import Typography from '../src/theme/typography';
import { aiService } from '../src/services/aiService';
import { EdgeError } from '../src/services/edgeFunctions';
import { storage } from '../src/services/storageService';
import { checkUrgentSafetyWarning } from '../src/services/healthCalculations';
import UrgentAlertBanner from '../src/components/UrgentAlertBanner';
import VoiceInputModal from '../src/components/VoiceInputModal';
import type { UrgentSafetyAlert } from '../src/types';

interface Msg { id: string; role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'Help me understand my latest report.',
  'Summarize my recent health entries.',
  'What should I discuss with my doctor?',
  'Explain what HbA1c means.',
  'Help me prepare for my next appointment.',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const [shareEntries, setShareEntries] = useState(false);
  const [aiConsent, setAiConsent] = useState<boolean | null>(null);
  const [urgent, setUrgent] = useState<UrgentSafetyAlert | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    storage.getPreferences().then((p) => setAiConsent(!!p.ai_consent_granted)).catch(() => setAiConsent(false));
  }, []);

  const buildContext = useCallback(async (): Promise<string | undefined> => {
    if (!shareEntries) return undefined;
    const since = Date.now() - 14 * 86400000;
    const symptoms = (await storage.getSymptoms()).filter((s) => new Date(s.occurred_at).getTime() > since);
    const counts: Record<string, { n: number; sev: number }> = {};
    symptoms.forEach((s) => {
      counts[s.symptom_name] = counts[s.symptom_name] || { n: 0, sev: 0 };
      counts[s.symptom_name].n += 1; counts[s.symptom_name].sev += s.severity;
    });
    const lines = Object.entries(counts).map(([k, v]) => `- ${k}: ${v.n} entries, avg severity ${(v.sev / v.n).toFixed(1)}/10`);
    return `User-shared records (last 14 days, user's own entries, not verified):\n${lines.join('\n') || '- none recorded'}`;
  }, [shareEntries]);

  const send = useCallback(async (text: string, isRetry = false) => {
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    // Deterministic red-flag check runs BEFORE any AI call.
    const alert = checkUrgentSafetyWarning(content);
    if (alert) setUrgent(alert);

    const history = isRetry ? messages : [...messages, { id: `u${Date.now()}`, role: 'user' as const, content }];
    if (!isRetry) { setMessages(history); setInput(''); }
    setLastUserText(content);
    setSending(true);
    try {
      const context = await buildContext();
      const reply = await aiService.chat(history.map(({ role, content: c }) => ({ role, content: c })), context);
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(e instanceof EdgeError ? e.message : 'The assistant could not answer. Please retry.');
    } finally {
      setSending(false);
    }
  }, [messages, sending, buildContext]);

  useEffect(() => { listRef.current?.scrollToEnd({ animated: true }); }, [messages, sending]);

  const header = (
    <View>
      {urgent && <UrgentAlertBanner alert={urgent} onDismiss={() => setUrgent(null)} />}
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Hello, I'm your HerHealth guide</Text>
        <Text style={styles.introText}>
          I can explain health terms and help organise questions for your clinician. I can't diagnose, prescribe, or change
          your medicines. For emergencies call 112.
        </Text>
        {messages.length === 0 && STARTERS.map((s) => (
          <TouchableOpacity key={s} style={styles.starter} onPress={() => send(s)} accessibilityRole="button">
            <Text style={styles.starterText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (aiConsent === false) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Health Assistant' }} />
        <View style={styles.intro}>
          <Text style={styles.introTitle}>AI assistant is off</Text>
          <Text style={styles.introText}>
            Messages are processed by an external AI service. Turn on "AI data processing" in your profile preferences to use chat.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Health Assistant' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
              <Text style={[styles.bubbleText, item.role === 'user' && { color: Colors.white }]} selectable>{item.content}</Text>
            </View>
          )}
          ListFooterComponent={
            <View>
              {sending && (
                <View style={[styles.bubble, styles.bot, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <ActivityIndicator size="small" color={Colors.deepBurgundy} />
                  <Text style={styles.bubbleText}>Thinking…</Text>
                </View>
              )}
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                  {lastUserText && (
                    <TouchableOpacity onPress={() => send(lastUserText, true)} style={styles.retry} accessibilityRole="button">
                      <RotateCcw size={14} color={Colors.deepBurgundy} /><Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          }
        />
        <View style={styles.shareRow}>
          <Switch value={shareEntries} onValueChange={setShareEntries} trackColor={{ true: Colors.blossomRose, false: Colors.fineBorder }} thumbColor={shareEntries ? Colors.deepBurgundy : Colors.white} />
          <Text style={styles.shareText}>Share a summary of my last 14 days of symptoms with the AI service</Text>
        </View>
        <View style={styles.composer}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setVoiceOpen(true)} accessibilityLabel="Voice input">
            <Mic size={20} color={Colors.lavenderSlate} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask a health question…"
            placeholderTextColor={Colors.mutedText}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.send, (!input.trim() || sending) && { opacity: 0.45 }]}
            disabled={!input.trim() || sending}
            onPress={() => send(input)}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {/* Voice here only fills the composer: transcript is reviewed/edited before sending. */}
      <VoiceInputModal
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConfirmParsedResult={(r) => {
          setInput(r.transcript);
          return { ok: true, message: 'Added to your message.' };
        }}
        allowFreeText
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.warmPorcelain },
  intro: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.fineBorder, marginBottom: 12 },
  introTitle: { fontFamily: Typography.heading, fontSize: 20, color: Colors.lavenderSlate, marginBottom: 6 },
  introText: { fontFamily: Typography.body, fontSize: 14, lineHeight: 20, color: Colors.mutedText, marginBottom: 8 },
  starter: { backgroundColor: Colors.paleRoseWhite, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8, minHeight: 44, justifyContent: 'center' },
  starterText: { fontFamily: Typography.body, fontSize: 14, color: Colors.deepBurgundy },
  bubble: { maxWidth: '86%', borderRadius: 18, padding: 12, marginBottom: 10 },
  user: { alignSelf: 'flex-end', backgroundColor: Colors.deepBurgundy, borderBottomRightRadius: 4 },
  bot: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.fineBorder, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: Typography.body, fontSize: 15, lineHeight: 21, color: Colors.lavenderSlate },
  errorBox: { backgroundColor: Colors.paleRoseWhite, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.blossomRose },
  errorText: { fontFamily: Typography.body, fontSize: 14, color: Colors.deepBurgundy },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, minHeight: 44 },
  retryText: { fontFamily: Typography.body, fontSize: 14, fontWeight: '600', color: Colors.deepBurgundy },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  shareText: { flex: 1, fontFamily: Typography.body, fontSize: 12, color: Colors.mutedText },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: Colors.fineBorder, backgroundColor: Colors.white },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, backgroundColor: Colors.warmPorcelain, paddingHorizontal: 16, paddingVertical: 10, fontFamily: Typography.body, fontSize: 15, color: Colors.lavenderSlate },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.softLavender },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.deepBurgundy },
});
