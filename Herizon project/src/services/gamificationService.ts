/**
 * HerHealth Gamification Service
 * Gentle, non-judgmental milestones celebrating logging consistency and self-organization.
 * Never rewards a specific weight, lab result, or medical outcome.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymptomLog, SleepLog, ActivityLog, MedicalDocument, Appointment, MedicationDoseLog } from '../types';

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  category: 'logging' | 'records' | 'care' | 'sleep' | 'activity';
  isUnlocked: boolean;
  unlockedAt?: string;
  iconName: string;
}

const BADGES_KEY = '@herhealth_milestone_badges';

export const INITIAL_BADGES: MilestoneBadge[] = [
  {
    id: 'first_log',
    title: 'First Step',
    description: 'Recorded your very first daily health journal entry.',
    category: 'logging',
    isUnlocked: false,
    iconName: 'Sparkles',
  },
  {
    id: 'streak_3_days',
    title: 'Mindful Tracker',
    description: 'Kept a consistent health journal for 3 consecutive days.',
    category: 'logging',
    isUnlocked: false,
    iconName: 'Flame',
  },
  {
    id: 'streak_7_days',
    title: '7-Day Reflection',
    description: 'Logged symptoms and wellness across a full 7-day period.',
    category: 'logging',
    isUnlocked: false,
    iconName: 'Award',
  },
  {
    id: 'report_organizer',
    title: 'Report Organizer',
    description: 'Uploaded and filed your first medical record or lab test in the vault.',
    category: 'records',
    isUnlocked: false,
    iconName: 'FileText',
  },
  {
    id: 'sleep_starter',
    title: 'Sleep Conscious',
    description: 'Logged sleep duration and nighttime rest patterns.',
    category: 'sleep',
    isUnlocked: false,
    iconName: 'Moon',
  },
  {
    id: 'appointment_prepared',
    title: 'Consultation Ready',
    description: 'Added an appointment with prepared questions for your doctor.',
    category: 'care',
    isUnlocked: false,
    iconName: 'CalendarCheck',
  },
  {
    id: 'movement_milestone',
    title: 'Daily Movement',
    description: 'Reached your personal physical activity goal.',
    category: 'activity',
    isUnlocked: false,
    iconName: 'Footprints',
  },
];

export class GamificationService {
  public async getBadges(): Promise<MilestoneBadge[]> {
    try {
      const stored = await AsyncStorage.getItem(BADGES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return INITIAL_BADGES;
  }

  public async evaluateMilestones(data: {
    symptoms: SymptomLog[];
    sleepLogs: SleepLog[];
    documents: MedicalDocument[];
    appointments: Appointment[];
    activityLogs: ActivityLog[];
  }): Promise<{ updatedBadges: MilestoneBadge[]; newlyUnlocked: MilestoneBadge[] }> {
    const current = await this.getBadges();
    const newlyUnlocked: MilestoneBadge[] = [];

    const updated = current.map((b) => {
      if (b.isUnlocked) return b;

      let unlock = false;
      if (b.id === 'first_log' && data.symptoms.length >= 1) {
        unlock = true;
      } else if (b.id === 'streak_3_days' && data.symptoms.length >= 3) {
        unlock = true;
      } else if (b.id === 'streak_7_days' && data.symptoms.length >= 7) {
        unlock = true;
      } else if (b.id === 'report_organizer' && data.documents.length >= 1) {
        unlock = true;
      } else if (b.id === 'sleep_starter' && data.sleepLogs.length >= 1) {
        unlock = true;
      } else if (b.id === 'appointment_prepared' && data.appointments.some((a) => a.questions_to_ask && a.questions_to_ask.length > 0)) {
        unlock = true;
      } else if (b.id === 'movement_milestone' && data.activityLogs.some((a) => a.step_count >= 5000)) {
        unlock = true;
      }

      if (unlock) {
        const item: MilestoneBadge = { ...b, isUnlocked: true, unlockedAt: new Date().toISOString() };
        newlyUnlocked.push(item);
        return item;
      }
      return b;
    });

    if (newlyUnlocked.length > 0) {
      await AsyncStorage.setItem(BADGES_KEY, JSON.stringify(updated));
    }

    return { updatedBadges: updated, newlyUnlocked };
  }
}

export const gamificationService = new GamificationService();
