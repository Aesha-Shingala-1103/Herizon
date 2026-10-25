import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { storage } from './storageService';

const LOCAL_ID_KEY = 'herhealth_local_user_id';

export type AuthState = 'signed_in' | 'signed_out' | 'local';

const listeners = new Set<(s: AuthState) => void>();
/** Lets the root layout react to local (on-device) session changes. */
export function subscribeAuth(cb: (s: AuthState) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
let current: AuthState = 'signed_out';
const emit = (s: AuthState) => { current = s; listeners.forEach((l) => l(s)); };
/** Call after the profile changes (e.g. onboarding finished) so route guards re-evaluate. */
const profileListeners = new Set<() => void | Promise<void>>();
export const subscribeProfileChanged = (cb: () => void) => { profileListeners.add(cb); return () => { profileListeners.delete(cb); }; };
export const notifyProfileChanged = async () => { await Promise.all([...profileListeners].map((l) => l())); };

/** Restores the previous session on app start and points storage at the right user. */
export async function restoreSession(): Promise<AuthState> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session?.user) {
        storage.setUserId(data.session.user.id);
        current = 'signed_in';
        return 'signed_in';
      }
    } catch {
      // offline/expired: fall through to signed_out
    }
    return 'signed_out';
  }
  const localId = await AsyncStorage.getItem(LOCAL_ID_KEY);
  if (localId) {
    storage.setUserId(localId);
    current = 'local';
    return 'local';
  }
  return 'signed_out';
}

export async function startLocalSession(id = 'local_user_default'): Promise<void> {
  await AsyncStorage.setItem(LOCAL_ID_KEY, id);
  storage.setUserId(id);
  emit('local');
}

/** Signs out and clears the persisted session. Local records stay on device, scoped to the user id. */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) await supabase.auth.signOut();
  await AsyncStorage.removeItem(LOCAL_ID_KEY);
  storage.setUserId('local_user_default');
  emit('signed_out');
}
