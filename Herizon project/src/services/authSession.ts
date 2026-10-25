import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { storage } from './storageService';

const LOCAL_ID_KEY = 'herhealth_local_user_id';
const ACTIVE_USER_ID_KEY = 'herhealth_active_user_id';
const AUTH_PROVIDER_KEY = 'herhealth_auth_provider'; // 'supabase' | 'local'

export type AuthState = 'signed_in' | 'signed_out' | 'local';

const listeners = new Set<(s: AuthState) => void>();
/** Lets the root layout react to local (on-device) session changes. */
export function subscribeAuth(cb: (s: AuthState) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
let current: AuthState = 'signed_out';
export const getCachedAuthState = (): AuthState => current;

const emit = (s: AuthState) => {
  current = s;
  listeners.forEach((l) => l(s));
};

/** Call after the profile changes (e.g. onboarding finished) so route guards re-evaluate. */
const profileListeners = new Set<() => void | Promise<void>>();
export const subscribeProfileChanged = (cb: () => void) => {
  profileListeners.add(cb);
  return () => { profileListeners.delete(cb); };
};
export const notifyProfileChanged = async () => {
  await Promise.all([...profileListeners].map((l) => l()));
};

/** Restores the previous session on app start and points storage at the right user. */
export async function restoreSession(): Promise<AuthState> {
  const cachedProvider = await AsyncStorage.getItem(AUTH_PROVIDER_KEY);
  const cachedUserId = await AsyncStorage.getItem(ACTIVE_USER_ID_KEY);

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session?.user) {
        const uid = data.session.user.id;
        await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, uid);
        await AsyncStorage.setItem(AUTH_PROVIDER_KEY, 'supabase');
        storage.setUserId(uid);
        emit('signed_in');
        return 'signed_in';
      }
      
      // If error or no session, but network might be offline and we had an active Supabase user:
      if (cachedProvider === 'supabase' && cachedUserId) {
        // Retain session offline: do not log user out simply because of temporary connectivity loss
        storage.setUserId(cachedUserId);
        emit('signed_in');
        return 'signed_in';
      }
    } catch {
      // Offline fallback: keep the user logged in if they had an active session
      if (cachedProvider === 'supabase' && cachedUserId) {
        storage.setUserId(cachedUserId);
        emit('signed_in');
        return 'signed_in';
      }
    }
  }

  // Check local session
  const localId = await AsyncStorage.getItem(LOCAL_ID_KEY) || cachedUserId;
  if (localId && cachedProvider === 'local') {
    storage.setUserId(localId);
    emit('local');
    return 'local';
  }

  emit('signed_out');
  return 'signed_out';
}

export async function startSupabaseSession(userId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, userId);
  await AsyncStorage.setItem(AUTH_PROVIDER_KEY, 'supabase');
  storage.setUserId(userId);
  emit('signed_in');
}

export async function startLocalSession(id = 'local_user_default'): Promise<void> {
  await AsyncStorage.setItem(LOCAL_ID_KEY, id);
  await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, id);
  await AsyncStorage.setItem(AUTH_PROVIDER_KEY, 'local');
  storage.setUserId(id);
  emit('local');
}

/** Signs out and clears the persisted session. Local records stay on device, scoped to the user id. */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error during Supabase signout:', e);
    }
  }
  await AsyncStorage.removeItem(LOCAL_ID_KEY);
  await AsyncStorage.removeItem(ACTIVE_USER_ID_KEY);
  await AsyncStorage.removeItem(AUTH_PROVIDER_KEY);
  storage.setUserId('local_user_default');
  emit('signed_out');
}
