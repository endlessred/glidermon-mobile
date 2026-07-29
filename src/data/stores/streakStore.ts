// stores/streakStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProgressionStore } from "./progressionStore";
import { scheduleReminderForToday, cancelReminder } from "../../notifications/streakReminder";

/** Acorns earned today needed to keep the streak alive. ~12.5% of the default 2400 daily cap. */
export const DAILY_GOAL_ACORNS = 300;

export type SplashKind = "continued" | "started" | "lost";
export type PendingSplash = { kind: SplashKind; streak: number; lostFrom?: number };

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastGoalMetDate: string | null;
  lastEvaluatedDate: string;
  lastSplashShownDate: string | null;
  pendingSplash: PendingSplash | null;
  hasCommitted: boolean;
  reminderHour: number;
  notificationPermission: "unknown" | "granted" | "denied";

  evaluate: () => void;
  dismissSplash: () => void;
  markCommitted: (reminderHour: number, granted: boolean) => void;
};

const STORE_VERSION = 1;

export const ymd = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const yesterdayOf = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return ymd(dt);
};

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastGoalMetDate: null,
      lastEvaluatedDate: ymd(),
      lastSplashShownDate: null,
      pendingSplash: null,
      hasCommitted: false,
      reminderHour: 20,
      notificationPermission: "unknown",

      evaluate: () => {
        const s = get();
        const today = ymd();

        if (s.lastGoalMetDate !== today) {
          const dailyEarned = useProgressionStore.getState().dailyEarned;
          const goalMetToday = dailyEarned >= DAILY_GOAL_ACORNS;

          if (goalMetToday) {
            const yesterday = yesterdayOf(today);
            const continuing = s.lastGoalMetDate === yesterday;
            const nextStreak = continuing ? s.currentStreak + 1 : 1;

            set({
              currentStreak: nextStreak,
              longestStreak: Math.max(s.longestStreak, nextStreak),
              lastGoalMetDate: today,
              lastEvaluatedDate: today,
              pendingSplash: { kind: continuing ? "continued" : "started", streak: nextStreak },
            });

            cancelReminder();
          } else {
            // Goal not met yet today. Did an entire day get skipped since the last one we counted?
            const wasActiveStreak = s.currentStreak > 0;
            const dayWasSkipped =
              s.lastGoalMetDate !== null &&
              s.lastGoalMetDate !== today &&
              s.lastGoalMetDate !== yesterdayOf(today);

            if (wasActiveStreak && dayWasSkipped) {
              set({
                pendingSplash: { kind: "lost", streak: 0, lostFrom: s.currentStreak },
                currentStreak: 0,
                lastEvaluatedDate: today,
              });
            } else if (s.lastEvaluatedDate !== today) {
              set({ lastEvaluatedDate: today });
            }

            if (get().hasCommitted && get().notificationPermission === "granted") {
              scheduleReminderForToday(get().reminderHour);
            }
          }
        } else if (s.lastEvaluatedDate !== today) {
          set({ lastEvaluatedDate: today });
        }
      },

      dismissSplash: () => {
        set({ pendingSplash: null, lastSplashShownDate: ymd() });
      },

      markCommitted: (reminderHour, granted) => {
        set({
          hasCommitted: true,
          reminderHour,
          notificationPermission: granted ? "granted" : "denied",
        });
        if (granted) {
          scheduleReminderForToday(reminderHour);
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
        lastGoalMetDate: s.lastGoalMetDate,
        lastEvaluatedDate: s.lastEvaluatedDate,
        lastSplashShownDate: s.lastSplashShownDate,
        hasCommitted: s.hasCommitted,
        reminderHour: s.reminderHour,
        notificationPermission: s.notificationPermission,
      }),
      migrate: (persisted: any) => {
        const s = persisted ?? {};
        s.currentStreak = typeof s.currentStreak === "number" ? s.currentStreak : 0;
        s.longestStreak = typeof s.longestStreak === "number" ? s.longestStreak : 0;
        s.lastGoalMetDate = s.lastGoalMetDate ?? null;
        s.lastEvaluatedDate = s.lastEvaluatedDate ?? ymd();
        s.lastSplashShownDate = s.lastSplashShownDate ?? null;
        s.hasCommitted = !!s.hasCommitted;
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
