import React, { useState, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from '../src/theme/colors';
import Typography, { brandFontMap } from '../src/theme/typography';
import { restoreSession, subscribeAuth, subscribeProfileChanged, AuthState } from '../src/services/authSession';
import { supabase, isSupabaseConfigured } from '../src/services/supabase';
import BrandSplash from '../src/components/BrandSplash';
import { storage } from '../src/services/storageService';
import { securityService } from '../src/services/securityService';
import { PinLockModal } from '../src/components/PinLockModal';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isLocked, setIsLocked] = useState(false);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [fontsLoaded, fontError] = useFonts(brandFontMap);

  // 1. Restore session + profile once, before anything is shown.
  useEffect(() => {
    (async () => {
      try {
        const state = await restoreSession();
        setAuthState(state);
        if (state !== 'signed_out') {
          const profile = await storage.getProfile();
          setNeedsOnboarding(!profile || !profile.onboarding_completed);
          if (await securityService.shouldLockApp(5)) setIsLocked(true);
        }
      } catch {
        setAuthState('signed_out');
      }
    })();
  }, []);

  useEffect(() => {
    return subscribeAuth(async (state) => {
      setAuthState(state);
      if (state !== 'signed_out') {
        const profile = await storage.getProfile();
        setNeedsOnboarding(!profile || !profile.onboarding_completed);
      }
    });
  }, []);

  useEffect(() => {
    return subscribeProfileChanged(async () => {
      const profile = await storage.getProfile();
      setNeedsOnboarding(!profile || !profile.onboarding_completed);
    });
  }, []);

  // 2. React to sign-in / sign-out / revoked or expired sessions.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        storage.setUserId('local_user_default');
        setAuthState('signed_out');
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        storage.setUserId(session.user.id);
        setAuthState('signed_in');
        const profile = await storage.getProfile();
        setNeedsOnboarding(!profile || !profile.onboarding_completed);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const ready = authState !== null && (fontsLoaded || !!fontError);

  // 3. Route guard: unauthenticated users can only see /auth; new users go to onboarding.
  useEffect(() => {
    if (!ready) return;
    const top = segments[0] as string | undefined;
    if (authState === 'signed_out' && top !== 'auth') {
      router.replace('/auth');
    } else if (authState !== 'signed_out' && needsOnboarding && top !== 'onboarding') {
      router.replace('/onboarding');
    } else if (authState !== 'signed_out' && !needsOnboarding && top === 'onboarding') {
      router.replace('/(tabs)');
    }
  }, [ready, authState, needsOnboarding, segments, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.warmPorcelain,
          },
          headerTintColor: Colors.deepBurgundy,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: Colors.lavenderSlate,
            fontFamily: Typography.heading,
          },
          contentStyle: {
            backgroundColor: Colors.warmPorcelain,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="chat" options={{ title: 'Health Assistant' }} />
        <Stack.Screen
          name="consultation-summary"
          options={{
            title: 'Doctor-Ready Summary',
            presentation: 'card',
          }}
        />
      </Stack>

      <BrandSplash done={ready} />

      {/* Global PIN Lock Modal */}
      <PinLockModal
        visible={isLocked}
        onUnlocked={() => {
          setIsLocked(false);
        }}
      />
    </SafeAreaProvider>
  );
}
