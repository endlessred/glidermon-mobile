// stores/streakStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProgressionStore } from "./progressionStore";
import { requestPermission, scheduleReminderForToday, cancelReminder } from "../../notifications/streakReminder";

/** Acorns earned today needed to keep the streak alive. ~12.5% of the default 2400 daily cap. */
export const DAILY_GOAL_ACORNS = 300;

/** Max streak freezes a player can hold at once. Earn-only (7-day milestones), no purchase. */
export const MAX_FREEZES = 2;

/** Streak-day tiers that get a distinct celebration + Acorn reward instead of the plain "continued" splash. */
export const MILESTONE_REWARDS: Record<number, number> = {
  7: 100,
  30: 500,
  100: 2000,
  365: 10000,
};

const milestoneRewardFor = (streak: number): number | undefined => MILESTONE_REWARDS[streak];

/** Milestone tiers in ascending order, e.g. [7, 30, 100, 365]. */
export const MILESTONE_TIERS = Object.keys(MILESTONE_REWARDS).map(Number).sort((a, b) => a - b);

export type MilestoneProgress = {
  previousTier: number;
  nextTier: number | null; // null once every tier has been reached
  stretchLength: number;   // days between previousTier and nextTier
  daysIntoStretch: number; // days completed since previousTier
  daysLeft: number;        // days remaining until nextTier
};

/** Progress through the current milestone stretch (resets at each tier), for the streak detail screen. */
export function getMilestoneProgress(currentStreak: number): MilestoneProgress {
  const previousTier = [0, ...MILESTONE_TIERS].filter((t) => t <= currentStreak).pop() ?? 0;
  const nextTier = MILESTONE_TIERS.find((t) => t > currentStreak) ?? null;
  const stretchLength = nextTier ? nextTier - previousTier : 0;
  const daysIntoStretch = currentStreak - previousTier;
  const daysLeft = nextTier ? nextTier - currentStreak : 0;
  return { previousTier, nextTier, stretchLength, daysIntoStretch, daysLeft };
}

export type SplashKind = "continued" | "started" | "lost" | "frozen" | "milestone";
export type PendingSplash = {
  kind: SplashKind;
  streak: number;
  lostFrom?: number;
  freezesUsed?: number;
  milestoneReward?: number;
};

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  lastGoalMetDate: string | null;
  lastEvaluatedDate: string;
  lastSplashShownDate: string | null;
  pendingSplash: PendingSplash | null;
  hasCommitted: boolean;
  remindersEnabled: boolean;
  reminderHour: number;
  notificationPermission: "unknown" | "granted" | "denied";

  evaluate: () => void;
  dismissSplash: () => void;
  markCommitted: (reminderHour: number, granted: boolean) => void;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
  setReminderHour: (hour: number) => void;
};

const STORE_VERSION = 1;

export const ymd = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const parseYmd = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const yesterdayOf = (dateStr: string) => {
  const dt = parseYmd(dateStr);
  dt.setDate(dt.getDate() - 1);
  return ymd(dt);
};

/** Number of full calendar days strictly between two YYYY-MM-DD dates. */
const daysBetweenExclusive = (fromDateStr: string, toDateStr: string) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((parseYmd(toDateStr).getTime() - parseYmd(fromDateStr).getTime()) / msPerDay);
  return Math.max(0, diff - 1);
};

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      freezesAvailable: 0,
      lastGoalMetDate: null,
      lastEvaluatedDate: ymd(),
      lastSplashShownDate: null,
      pendingSplash: null,
      hasCommitted: false,
      remindersEnabled: false,
      reminderHour: 20,
      notificationPermission: "unknown",

      evaluate: () => {
        const s = get();
        const today = ymd();

        if (s.lastGoalMetDate === today) {
          if (s.lastEvaluatedDate !== today) set({ lastEvaluatedDate: today });
          return;
        }

        const yesterday = yesterdayOf(today);
        const gapDays =
          s.lastGoalMetDate === null || s.lastGoalMetDate === yesterday
            ? 0
            : daysBetweenExclusive(s.lastGoalMetDate, today);

        const dailyEarned = useProgressionStore.getState().dailyEarned;
        const goalMetToday = dailyEarned >= DAILY_GOAL_ACORNS;

        if (goalMetToday) {
          if (gapDays === 0) {
            const nextStreak = s.currentStreak + 1;
            const earnedFreeze = nextStreak % 7 === 0;
            const milestoneReward = milestoneRewardFor(nextStreak);
            set({
              currentStreak: nextStreak,
              longestStreak: Math.max(s.longestStreak, nextStreak),
              freezesAvailable: earnedFreeze ? Math.min(MAX_FREEZES, s.freezesAvailable + 1) : s.freezesAvailable,
              lastGoalMetDate: today,
              lastEvaluatedDate: today,
              pendingSplash: milestoneReward
                ? { kind: "milestone", streak: nextStreak, milestoneReward }
                : { kind: s.lastGoalMetDate === null ? "started" : "continued", streak: nextStreak },
            });
            // Grant after set(): lastGoalMetDate is now today, so the recursive
            // evaluate() this triggers (via the progressionStore subscribe) hits
            // the early-return guard instead of re-entering this same branch.
            if (milestoneReward) useProgressionStore.getState().grantAcorns(milestoneReward);
          } else if (s.freezesAvailable >= gapDays) {
            const nextStreak = s.currentStreak + 1;
            const earnedFreeze = nextStreak % 7 === 0;
            const freezesLeft = s.freezesAvailable - gapDays;
            const milestoneReward = milestoneRewardFor(nextStreak);
            set({
              currentStreak: nextStreak,
              longestStreak: Math.max(s.longestStreak, nextStreak),
              freezesAvailable: earnedFreeze ? Math.min(MAX_FREEZES, freezesLeft + 1) : freezesLeft,
              lastGoalMetDate: today,
              lastEvaluatedDate: today,
              pendingSplash: milestoneReward
                ? { kind: "milestone", streak: nextStreak, freezesUsed: gapDays, milestoneReward }
                : { kind: "continued", streak: nextStreak, freezesUsed: gapDays },
            });
            if (milestoneReward) useProgressionStore.getState().grantAcorns(milestoneReward);
          } else {
            set({
              currentStreak: 1,
              longestStreak: Math.max(s.longestStreak, 1),
              lastGoalMetDate: today,
              lastEvaluatedDate: today,
              pendingSplash: { kind: "started", streak: 1, lostFrom: s.currentStreak > 0 ? s.currentStreak : undefined },
            });
          }
          cancelReminder();
        } else {
          if (gapDays > 0 && s.freezesAvailable >= gapDays) {
            set({
              freezesAvailable: s.freezesAvailable - gapDays,
              // Bridge the gap so re-evaluation (e.g. the next tick) sees gapDays===0
              // instead of re-deciding the same already-spent freeze every call.
              lastGoalMetDate: yesterday,
              pendingSplash: { kind: "frozen", streak: s.currentStreak, freezesUsed: gapDays },
              lastEvaluatedDate: today,
            });
          } else if (s.currentStreak > 0 && gapDays > 0) {
            set({
              pendingSplash: { kind: "lost", streak: 0, lostFrom: s.currentStreak },
              currentStreak: 0,
              lastEvaluatedDate: today,
            });
          } else if (s.lastEvaluatedDate !== today) {
            set({ lastEvaluatedDate: today });
          }

          if (get().remindersEnabled) {
            scheduleReminderForToday(get().reminderHour);
          }
        }
      },

      dismissSplash: () => {
        set({ pendingSplash: null, lastSplashShownDate: ymd() });
      },

      markCommitted: (reminderHour, granted) => {
        set({
          hasCommitted: true,
          reminderHour,
          remindersEnabled: granted,
          notificationPermission: granted ? "granted" : "denied",
        });
        if (granted) {
          scheduleReminderForToday(reminderHour);
        }
      },

      setRemindersEnabled: async (enabled: boolean) => {
        if (!enabled) {
          set({ remindersEnabled: false });
          cancelReminder();
          return;
        }

        let granted = get().notificationPermission === "granted";
        if (!granted) {
          granted = await requestPermission();
        }

        set({
          hasCommitted: true,
          remindersEnabled: granted,
          notificationPermission: granted ? "granted" : "denied",
        });
        if (granted) {
          scheduleReminderForToday(get().reminderHour);
        }
      },

      setReminderHour: (hour: number) => {
        set({ reminderHour: hour });
        if (get().remindersEnabled) {
          scheduleReminderForToday(hour);
        }
      },
    }),
    {
      name: "glidermon/streak-v1",
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
        freezesAvailable: s.freezesAvailable,
        lastGoalMetDate: s.lastGoalMetDate,
        lastEvaluatedDate: s.lastEvaluatedDate,
        lastSplashShownDate: s.lastSplashShownDate,
        hasCommitted: s.hasCommitted,
        remindersEnabled: s.remindersEnabled,
        reminderHour: s.reminderHour,
        notificationPermission: s.notificationPermission,
      }),
      migrate: (persisted: any) => {
        const s = persisted ?? {};
        s.currentStreak = typeof s.currentStreak === "number" ? s.currentStreak : 0;
        s.longestStreak = typeof s.longestStreak === "number" ? s.longestStreak : 0;
        s.freezesAvailable = typeof s.freezesAvailable === "number" ? s.freezesAvailable : 0;
        s.lastGoalMetDate = s.lastGoalMetDate ?? null;
        s.lastEvaluatedDate = s.lastEvaluatedDate ?? ymd();
        s.lastSplashShownDate = s.lastSplashShownDate ?? null;
        s.hasCommitted = !!s.hasCommitted;
        s.remindersEnabled = typeof s.remindersEnabled === "boolean" ? s.remindersEnabled : s.notificationPermission === "granted";
        s.reminderHour = typeof s.reminderHour === "number" ? s.reminderHour : 20;
        s.notificationPermission = s.notificationPermission ?? "unknown";
        return s;
      },
    }
  )
);

// Catch a goal-met moment in near-real-time as ticks land throughout the day.
// evaluate() is idempotent and cheap (bails immediately once today is already recorded),
// so re-running it on every progressionStore change is fine.
useProgressionStore.subscribe(() => {
  useStreakStore.getState().evaluate();
});
