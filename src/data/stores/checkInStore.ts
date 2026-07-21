import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGameStore } from "./gameStore";
import { useProgressionStore } from "./progressionStore";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GlucoseGoalType = "tir" | "no_highs" | "no_lows";

export type GlucoseGoal = {
  type: GlucoseGoalType;
  /** TIR% for 'tir', ceiling mg/dL for 'no_highs', floor mg/dL for 'no_lows' */
  target: number;
  /** epoch ms when goal window began (set at morning completion) */
  startMs: number;
};

export type LifestyleGoalCategory = "meal" | "activity";

export type LifestyleGoal = {
  category: LifestyleGoalCategory;
  text: string;
};

export type CheckInSlot = "morning" | "midday" | "evening";

export type MorningCheckIn = {
  completedAt: string;   // ISO timestamp
  glucoseGoal: GlucoseGoal;
  lifestyleGoals: LifestyleGoal[];
};

export type MidEveningCheckIn = {
  slot: "midday" | "evening";
  completedAt: string;
  lifestyleProgress: boolean[];  // one per morning.lifestyleGoals
  glucoseAdherence: number;      // 0–1, computed from CGM trail
};

export type DailyCheckIns = {
  date: string;          // YYYY-MM-DD
  morning: MorningCheckIn | null;
  midday: MidEveningCheckIn | null;
  evening: MidEveningCheckIn | null;
};

// ─── Time windows (hours, local time) ────────────────────────────────────────

const WINDOWS: Record<CheckInSlot, [number, number]> = {
  morning: [6, 11],    // 6:00 AM – 11:00 AM
  midday:  [11, 16],   // 11:00 AM – 4:00 PM
  evening: [17, 24],   // 5:00 PM – midnight
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ymd = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const emptyDay = (): DailyCheckIns => ({
  date: ymd(),
  morning: null,
  midday: null,
  evening: null,
});

// ─── Store type ───────────────────────────────────────────────────────────────

export type CheckInState = {
  today: DailyCheckIns;
  streak: number;

  // Actions
  resetDailyIfNeeded: () => void;
  availableSlot: () => CheckInSlot | null;
  completeMorningCheckIn: (glucoseGoal: GlucoseGoal, lifestyleGoals: LifestyleGoal[]) => void;
  completeMiddayCheckIn: (lifestyleProgress: boolean[]) => void;
  completeEveningCheckIn: (lifestyleProgress: boolean[]) => void;
};

const STORE_VERSION = 1;

export const useCheckInStore = create<CheckInState>()(
  persist(
    (set, get) => ({
      today: emptyDay(),
      streak: 0,

      resetDailyIfNeeded: () => {
        const today = ymd();
        const s = get();
        if (s.today.date !== today) {
          const hadFullDay =
            s.today.morning !== null &&
            s.today.midday !== null &&
            s.today.evening !== null;
          set({
            today: emptyDay(),
            streak: hadFullDay ? s.streak + 1 : 0,
          });
        }
      },

      availableSlot: () => {
        const s = get();
        const now = new Date();
        const h = now.getHours() + now.getMinutes() / 60;

        if (h >= WINDOWS.morning[0] && h < WINDOWS.morning[1] && !s.today.morning) {
          return "morning";
        }
        if (h >= WINDOWS.midday[0] && h < WINDOWS.midday[1] && !s.today.midday && s.today.morning) {
          return "midday";
        }
        if (h >= WINDOWS.evening[0] && h < WINDOWS.evening[1] && !s.today.evening && s.today.morning) {
          return "evening";
        }
        return null;
      },

      // Stubs — implemented in Tasks 3 & 4
      completeMorningCheckIn: () => {},
      completeMiddayCheckIn: () => {},
      completeEveningCheckIn: () => {},
    }),
    {
      name: "glidermon/checkin-v1",
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        today: s.today,
        streak: s.streak,
      }),
      migrate: (persisted: any) => {
        const s = persisted ?? {};
        s.today = s.today ?? emptyDay();
        s.streak = typeof s.streak === "number" ? s.streak : 0;
        return s;
      },
    }
  )
);
