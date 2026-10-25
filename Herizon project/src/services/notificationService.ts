/**
 * HerHealth Notification Service
 * Schedules local notifications for medicines and appointments with strict privacy protection.
 * Implements deterministic notification IDs, cancellation cleanup, and monthly recurring checkup reminders.
 */

import { Platform } from 'react-native';
import { applyExpoGoShims } from '../utils/expoGoShims';

type NotificationsModule = typeof import('expo-notifications');

/**
 * expo-notifications is loaded lazily. On Android in Expo Go, ExpoTopicSubscriptionModule
 * is not bundled, so we apply our Expo Go shims before requiring it to prevent
 * unhandled native module errors.
 */
let cached: NotificationsModule | null | undefined;
let handlerSet = false;

function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    applyExpoGoShims();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('expo-notifications unavailable (use a development build for reminders):', e);
    cached = null;
  }
  if (cached && !handlerSet) {
    handlerSet = true;
    try {
      cached.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: cached!.AndroidNotificationPriority.HIGH,
        }),
      });
    } catch (e) {
      console.warn('Could not set notification handler:', e);
    }
  }
  return cached;
}

export class NotificationService {
  /**
   * Request permission for notifications and configure Android notification channel.
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return false;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('herhealth-reminders', {
            name: 'Health & Medication Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#237F78',
          });
        } catch (channelErr) {
          console.warn('Failed to set notification channel:', channelErr);
        }
      }

      return true;
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  }

  /**
   * Schedule Medication Dose Reminder with deterministic identifier.
   */
  public async scheduleMedicationReminder(
    medicationId: string,
    medicationName: string,
    timeString: string, // "08:00:00" or "08:00"
    privacyPreserving: boolean = true
  ): Promise<string | null> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return null;
      const parts = timeString.split(':');
      const hour = parseInt(parts[0], 10) || 8;
      const minute = parseInt(parts[1], 10) || 0;

      const title = 'HerHealth Reminder';
      const body = privacyPreserving
        ? 'You have a scheduled health reminder.'
        : `Time to take your scheduled dose: ${medicationName}`;

      const identifier = `med_${medicationId}_${hour}_${minute}`;

      const id = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: { type: 'medication', medicationId, time: timeString },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      return id;
    } catch (e) {
      console.warn('Failed to schedule medication reminder:', e);
      return null;
    }
  }

  /**
   * Cancel all scheduled reminders for a specific medication.
   */
  public async cancelMedicationReminders(medicationId: string): Promise<void> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return;
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const targetPrefix = `med_${medicationId}_`;
      for (const req of scheduled) {
        if (
          req.identifier?.startsWith(targetPrefix) ||
          req.content?.data?.medicationId === medicationId
        ) {
          await Notifications.cancelScheduledNotificationAsync(req.identifier);
        }
      }
    } catch (e) {
      console.warn('Failed to cancel medication reminders:', e);
    }
  }

  /**
   * Schedule Appointment Reminder (2 hours before appointment).
   */
  public async scheduleAppointmentReminder(
    appointmentId: string,
    doctorOrClinic: string,
    appointmentDate: Date,
    privacyPreserving: boolean = true
  ): Promise<string | null> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return null;
      // 2 hours before appointment
      const triggerDate = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
      if (triggerDate.getTime() <= Date.now()) {
        return null;
      }

      const title = 'HerHealth Appointment Alert';
      const body = privacyPreserving
        ? 'You have an upcoming appointment scheduled today.'
        : `Upcoming consultation with ${doctorOrClinic} in 2 hours.`;

      const identifier = `apt_${appointmentId}`;

      const id = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: { type: 'appointment', appointmentId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return id;
    } catch (e) {
      console.warn('Failed to schedule appointment reminder:', e);
      return null;
    }
  }

  /**
   * Schedule Recurring Monthly Doctor / Routine Checkup Reminder.
   * e.g., on the same day of each month at specified time.
   */
  public async scheduleMonthlyDoctorReminder(
    appointmentId: string,
    doctorOrClinic: string,
    dayOfMonth: number, // 1 - 31
    timeString: string = '09:00',
    privacyPreserving: boolean = true
  ): Promise<string | null> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return null;
      const parts = timeString.split(':');
      const hour = parseInt(parts[0], 10) || 9;
      const minute = parseInt(parts[1], 10) || 0;
      const clampedDay = Math.max(1, Math.min(31, dayOfMonth));

      const title = 'HerHealth Monthly Checkup';
      const body = privacyPreserving
        ? 'You have a recurring monthly health checkup scheduled.'
        : `Monthly routine checkup reminder with ${doctorOrClinic}.`;

      const identifier = `apt_monthly_${appointmentId}`;

      const id = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: { type: 'appointment_monthly', appointmentId, doctorOrClinic },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: clampedDay,
          hour,
          minute,
        },
      });

      return id;
    } catch (e) {
      console.warn('Failed to schedule monthly checkup reminder:', e);
      return null;
    }
  }

  /**
   * Cancel all scheduled reminders for a specific appointment (standard & monthly).
   */
  public async cancelAppointmentReminders(appointmentId: string): Promise<void> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return;
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const stdPrefix = `apt_${appointmentId}`;
      const monthlyPrefix = `apt_monthly_${appointmentId}`;
      for (const req of scheduled) {
        if (
          req.identifier === stdPrefix ||
          req.identifier === monthlyPrefix ||
          req.identifier?.startsWith(stdPrefix) ||
          req.content?.data?.appointmentId === appointmentId
        ) {
          await Notifications.cancelScheduledNotificationAsync(req.identifier);
        }
      }
    } catch (e) {
      console.warn('Failed to cancel appointment reminders:', e);
    }
  }

  /**
   * Cancel a scheduled notification by exact ID
   */
  public async cancelNotification(notificationId: string): Promise<void> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return;
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('Cancel notification error:', e);
    }
  }

  /**
   * Cancel all scheduled reminders
   */
  public async cancelAllReminders(): Promise<void> {
    try {
      const Notifications = getNotifications();
      if (!Notifications) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Cancel all notifications error:', e);
    }
  }
}

export const notificationService = new NotificationService();