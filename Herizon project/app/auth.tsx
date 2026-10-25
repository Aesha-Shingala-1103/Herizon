import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
  LayoutChangeEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, Lock, Mail, User, Sparkles, Eye, EyeOff } from 'lucide-react-native';
import Colors from '../src/theme/colors';
import Typography from '../src/theme/typography';
import Button from '../src/components/Button';
import AppLogo from '../src/components/AppLogo';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';
import { storage } from '../src/services/storageService';
import { startLocalSession, startSupabaseSession } from '../src/services/authSession';

export default function AuthScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Keep the field being typed in visible above the keyboard.
  const scrollRef = useRef<any>(null);
  const formY = useRef(0);
  const fieldY = useRef<Record<string, number>>({});
  const onFormLayout = (e: LayoutChangeEvent) => {
    formY.current = e.nativeEvent.layout.y;
  };
  const setFieldLayout = (key: string, y: number) => {
    fieldY.current[key] = y;
  };
  const scrollToField = (key: string) => {
    setTimeout(() => {
      const y = formY.current + (fieldY.current[key] ?? 0) - 90;
      scrollRef.current?.scrollTo({ y: Math.max(y, 0), animated: true });
    }, 250);
  };

  const handleAuth = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Check your email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured()) {
      try {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
              data: {
                display_name: displayName.trim() || 'User',
              },
            },
          });
          if (error) throw error;
          if (data.user) {
            await startSupabaseSession(data.user.id);
            await storage.saveProfile({
              id: data.user.id,
              email: data.user.email,
              display_name: displayName.trim() || 'User',
              onboarding_completed: false,
            });
            Alert.alert(
              'Account Created',
              'Welcome to HerHealth! Let us personalize your health journey.',
              [{ text: 'Continue', onPress: () => router.replace('/onboarding') }]
            );
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });
          if (error) throw error;
          if (data.user) {
            await startSupabaseSession(data.user.id);
            const profile = await storage.getProfile();
            if (profile && profile.onboarding_completed) {
              router.replace('/(tabs)');
            } else {
              router.replace('/onboarding');
            }
          }
        }
      } catch (e: any) {
        Alert.alert('Authentication Notice', e.message || 'Could not authenticate.');
      } finally {
        setLoading(false);
      }
    } else {
      // Cloud auth is not configured: do NOT pretend to authenticate.
      setLoading(false);
      Alert.alert(
        'Cloud sign-in not configured',
        'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to enable accounts. You can continue in on-device mode, where data stays on this phone only.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Continue on this phone', onPress: () => { handleContinueAsGuest(); } },
        ]
      );
    }
  };

  const handleContinueAsGuest = async () => {
    await startLocalSession('local_user_default');
    const profile = await storage.getProfile();
    if (profile && profile.onboarding_completed) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/floral_auth_bg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <AppLogo size={88} style={{ marginBottom: 12 }} />
          <View style={styles.botanicalBadge}>
            <Sparkles size={13} color={Colors.deepBurgundy} />
            <Text style={styles.botanicalBadgeText}>Feminine Digital Healthcare</Text>
          </View>
          <Text style={styles.appName}>HerHealth</Text>
          <Text style={styles.appTagline}>
            Your health, your rhythm. A private sanctuary to understand your body and care for yourself.
          </Text>
        </View>

        {/* Translucent Glass Form Card */}
        <View style={styles.formCard} onLayout={onFormLayout}>
          <View style={styles.tabToggleRow}>
            <TouchableOpacity
              style={[styles.tabToggle, !isSignUp && styles.tabToggleActive]}
              onPress={() => setIsSignUp(false)}
            >
              <Text style={[styles.tabToggleText, !isSignUp && styles.tabToggleTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabToggle, isSignUp && styles.tabToggleActive]}
              onPress={() => setIsSignUp(true)}
            >
              <Text style={[styles.tabToggleText, isSignUp && styles.tabToggleTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <View style={styles.inputGroup} onLayout={(e) => setFieldLayout('name', e.nativeEvent.layout.y)}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color={Colors.mutedText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Maya Patel"
                  placeholderTextColor={Colors.mutedText}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onFocus={() => scrollToField('name')}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup} onLayout={(e) => setFieldLayout('email', e.nativeEvent.layout.y)}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color={Colors.mutedText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={Colors.mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => scrollToField('email')}
              />
            </View>
          </View>

          <View style={styles.inputGroup} onLayout={(e) => setFieldLayout('password', e.nativeEvent.layout.y)}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.mutedText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.mutedText}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                onFocus={() => scrollToField('password')}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={18} color={Colors.mutedText} />
                ) : (
                  <Eye size={18} color={Colors.mutedText} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title={isSignUp ? 'Create My Health Account' : 'Sign In to HerHealth'}
            onPress={handleAuth}
            loading={loading}
            variant="primary"
            size="large"
            style={{ marginTop: 8 }}
          />

          <View style={styles.privacyNote}>
            <Shield size={14} color={Colors.deepBurgundy} />
            <Text style={styles.privacyNoteText}>
              End-to-end encrypted storage. We never share or sell personal health records.
            </Text>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  botanicalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(219, 161, 165, 0.5)',
    marginBottom: 8,
  },
  botanicalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.deepBurgundy,
    letterSpacing: 0.3,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.lavenderSlate,
    fontFamily: Typography.heading,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    color: Colors.lavenderSlate,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    fontFamily: Typography.body,
    paddingHorizontal: 20,
    opacity: 0.9,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      } as any,
      default: {},
    }),
    shadowColor: Colors.deepBurgundy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 20,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
  },
  tabToggle: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 16,
  },
  tabToggleActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.lavenderSlate,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mutedText,
  },
  tabToggleTextActive: {
    color: Colors.deepBurgundy,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.lavenderSlate,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paleRoseWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.fineBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.lavenderSlate,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.fineBorder,
  },
  privacyNoteText: {
    fontSize: 11,
    color: Colors.mutedText,
    flex: 1,
    lineHeight: 15,
  },
});
