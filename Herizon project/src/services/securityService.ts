/**
 * HerHealth Security Service
 * Biometric authentication & Secure PIN management using Expo LocalAuthentication,
 * Expo Crypto, and Expo SecureStore.
 * 
 * Never stores plaintext PIN or biometric templates.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_HASH_KEY = 'herhealth_pin_hash';
const PIN_SALT_KEY = 'herhealth_pin_salt';
const LOCK_STATE_KEY = 'herhealth_lock_enabled';
const LAST_ACTIVE_KEY = 'herhealth_last_active';

export class SecurityService {
  /**
   * Helper to determine whether native SecureStore is supported.
   * SecureStore requires Keychain on iOS and Keystore on Android.
   * On Web, it falls back gracefully to AsyncStorage.
   */
  private async isSecureStoreAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  private async setSecureItem(key: string, value: string): Promise<void> {
    try {
      if (await this.isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch (e) {
      console.warn('SecureStore setItem failed, falling back to AsyncStorage:', e);
    }
    await AsyncStorage.setItem(`@secure_${key}`, value);
  }

  private async getSecureItem(key: string): Promise<string | null> {
    try {
      if (await this.isSecureStoreAvailable()) {
        return await SecureStore.getItemAsync(key);
      }
    } catch (e) {
      console.warn('SecureStore getItem failed, falling back to AsyncStorage:', e);
    }
    return await AsyncStorage.getItem(`@secure_${key}`);
  }

  private async deleteSecureItem(key: string): Promise<void> {
    try {
      if (await this.isSecureStoreAvailable()) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {}
    try {
      await AsyncStorage.removeItem(`@secure_${key}`);
    } catch {}
  }

  /**
   * Check if device hardware supports biometrics
   */
  public async isBiometricsAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (e) {
      console.warn('Biometric check failed:', e);
      return false;
    }
  }

  /**
   * Prompt biometric authentication
   */
  public async authenticateWithBiometrics(promptMessage: string = 'Unlock HerHealth'): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Passcode / PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (e) {
      console.warn('Biometric auth failed:', e);
      return false;
    }
  }

  /**
   * Hash PIN with SHA-256 and store securely
   */
  public async setPin(pin: string): Promise<boolean> {
    try {
      if (!pin || pin.length < 4) return false;
      let salt = '';
      try {
        const randomBytes = await Crypto.getRandomBytesAsync(16);
        salt = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      } catch {
        salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      }

      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${salt}_${pin}`
      );

      await this.setSecureItem(PIN_SALT_KEY, salt);
      await this.setSecureItem(PIN_HASH_KEY, hash);
      await this.setSecureItem(LOCK_STATE_KEY, 'true');
      return true;
    } catch (e) {
      console.error('Failed to set PIN securely:', e);
      return false;
    }
  }

  /**
   * Verify entered PIN against stored hash
   */
  public async verifyPin(enteredPin: string): Promise<boolean> {
    try {
      const salt = await this.getSecureItem(PIN_SALT_KEY);
      const storedHash = await this.getSecureItem(PIN_HASH_KEY);

      if (!salt || !storedHash) return false;

      const enteredHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${salt}_${enteredPin}`
      );

      return enteredHash === storedHash;
    } catch (e) {
      console.error('PIN verification error:', e);
      return false;
    }
  }

  /**
   * Check if PIN is currently set and active
   */
  public async isPinConfigured(): Promise<boolean> {
    try {
      const hash = await this.getSecureItem(PIN_HASH_KEY);
      return Boolean(hash && hash.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Record last active timestamp for auto-lock
   */
  public async updateLastActiveTimestamp(): Promise<void> {
    try {
      await this.setSecureItem(LAST_ACTIVE_KEY, Date.now().toString());
    } catch {}
  }

  /**
   * Check if app should be locked based on inactivity duration
   */
  public async shouldLockApp(autoLockMinutes: number = 5): Promise<boolean> {
    try {
      const isPinSet = await this.isPinConfigured();
      if (!isPinSet) return false;

      const lastActiveStr = await this.getSecureItem(LAST_ACTIVE_KEY);
      if (!lastActiveStr) return true;

      const lastActive = parseInt(lastActiveStr, 10);
      const diffMinutes = (Date.now() - lastActive) / (1000 * 60);
      return diffMinutes >= autoLockMinutes;
    } catch {
      return false;
    }
  }

  /**
   * Remove PIN and disable lock
   */
  public async removePin(): Promise<void> {
    await this.deleteSecureItem(PIN_HASH_KEY);
    await this.deleteSecureItem(PIN_SALT_KEY);
    await this.deleteSecureItem(LOCK_STATE_KEY);
  }
}

export const securityService = new SecurityService();
