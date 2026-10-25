/**
 * HerHealth Notification Service
 * Schedules local notifications for medicines and appointments with strict privacy protection.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export class NotificationService {
  /**
   * Request permission for notifications
   */
  public async requestPermissions(): Promise<boolean> {
    try {
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
        await Notifications.setNotificationChannelAsync('herhealth-reminders', {
          name: 'Health & Medication Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#237F78',
        });
      }

      return true;
    } catch (e) {
      console.warn('Notification permission error:', e);
      return false;
    }
  }

  /**
   * Schedule Medication Dose Reminder
   */
  public async scheduleMedicationReminder(
    medicationId: string,
    medicationName: string,
    timeString: string, // "08:00:00" or "08:00"
    privacyPreserving: boolean = true
  ): Promise<string | null> {
    try {
      const parts = timeString.split(':');
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);

      const title = 'HerHealth Reminder';
      const body = privacyPreserving
        ? 'You have a scheduled health reminder.'
        : `Time to take your scheduled dose: ${medicationName}`;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'medication', medicationId },
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
   * Schedule Appointment Reminder (e.g. 24h or 2h before)
   */
  public async scheduleAppointmentReminder(
    appointmentId: string,
    doctorOrClinic: string,
    appointmentDate: Date,
    privacyPreserving: boolean = true
  ): Promise<string | null> {
    try {
      // 2 hours before appointment
      const triggerDate = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
      if (triggerDate.getTime() <= Date.now()) {
        return null;
      }

      const title = 'HerHealth Appointment Alert';
      const body = privacyPreserving
        ? 'You have an upcoming appointment scheduled today.'
        : `Upcoming consultation with ${doctorOrClinic} in 2 hours.`;

      const id = await Notifications.scheduleNotificationAsync({
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
   * Cancel a scheduled notification
   */
  public async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('Cancel notification error:', e);
    }
  }

  /**
   * Cancel all reminders
   */
  public async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Cancel all notifications error:', e);
    }
  }
}

export const notificationService = new NotificationService();
