import { NativeModulesProxy } from 'expo-modules-core';

/**
 * Polyfill/shim for missing native modules when running in Expo Go on Android.
 *
 * Specifically, `ExpoTopicSubscriptionModule` (FCM topic subscription) is omitted from
 * Expo Go's internal package picker (known issue expo/expo#52175).
 * When `expo-notifications` is imported, `TopicSubscriptionModule.android.ts` calls
 * `requireNativeModule('ExpoTopicSubscriptionModule')`.
 * By attaching this fallback to `NativeModulesProxy`, `requireNativeModule` finds it
 * and does not throw an Uncaught Error.
 */
export function applyExpoGoShims(): void {
  try {
    if (NativeModulesProxy && !NativeModulesProxy.ExpoTopicSubscriptionModule) {
      NativeModulesProxy.ExpoTopicSubscriptionModule = {
        addListener: () => {},
        removeListeners: () => {},
        subscribeToTopicAsync: async () => null,
        unsubscribeFromTopicAsync: async () => null,
      };
    }
  } catch (err) {
    console.warn('Failed to apply Expo Go native module shims:', err);
  }
}

// Auto-execute upon import
applyExpoGoShims();
