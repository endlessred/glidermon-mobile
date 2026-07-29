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

/**
 * Reads the gameStore CGM trail and returns a 0–1 adherence score for a goal.
 * Returns 0.5 (neutral partial credit) if fewer than 3 readings exist in the window.
 */
function computeGlucoseAdherence(
  goal: GlucoseGoal,
  fromMs: number,
  toMs: number
): number {
  const trail = useGameStore.getState().engine.trail;
  const readings = trail.filter(r => r.ts >= fromMs && r.ts <= toMs);

  if (readings.length < 3) return 0.5;

  switch (goal.type) {
    case "tir": {
      const inRange = readings.filter(r => r.mgdl >= 70 && r.mgdl <= 180).length;
      const actualPct = (inRange / readings.length) * 100;
      return Math.min(1.0, actualPct / goal.target);
    }
    case "no_highs": {
      const above = readings.filter(r => r.mgdl > goal.target).length;
      return 1.0 - above / readings.length;
    }
    case "no_lows": {
      const below = readings.filter(r => r.mgdl < goal.target).length;
      return 1.0 - below / readings.length;
    }
  }
}

/**
 * Recomputes the full cap multiplier from today's completed check-ins.
 * Adherence bonuses are only applied once evening is completed.
 */
function computeCapMultiplier(today: DailyCheckIns): number {
  let m = 1.0;

  if (today.morning) m += 0.17;
  if (today.midday)  m += 0.17;

  if (today.evening) {
    m += 0.17;
    // Glucose adherence bonus (up to 0.10) from full-day window
    m += today.evening.glucoseAdherence * 0.10;

    // Lifestyle adherence from evening's final self-report
    if (today.morning) {
      today.morning.lifestyleGoals.forEach((goal, i) => {
        const met = today.evening!.lifestyleProgress[i] ?? false;
        if (goal.category === "meal")     m += met ? 0.10 : 0;
        if (goal.category === "activity") m += met ? 0.06 : 0;
      });
    }
  }

  return Math.min(1.77, m);
}

// ─── Store type ───────────────────────────────────────────────────────────────

export type CheckInState = {
  today: DailyCheckIns;

  // Actions
  resetDailyIfNeeded: () => void;
  availableSlot: () => CheckInSlot | null;
  completeMorningCheckIn: (glucoseGoal: GlucoseGoal, lifestyleGoals: LifestyleGoal[]) => void;
  completeMiddayCheckIn: (lifestyleProgress: boolean[]) => void;
  completeEveningCheckIn: (lifestyleProgress: boolean[]) => void;
};

const STORE_VERSION = 2;

export const useCheckInStore = create<CheckInState>()(
  persist(
    (set, get) => ({
      today: emptyDay(),

      resetDailyIfNeeded: () => {
        const today = ymd();
        const s = get();
        if (s.today.date !== today) {
          set({ today: emptyDay() });
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

      completeMorningCheckIn: (glucoseGoal: GlucoseGoal, lifestyleGoals: LifestyleGoal[]) => {
        get().resetDailyIfNeeded();
        const morningData: MorningCheckIn = {
          completedAt: new Date().toISOString(),
          glucoseGoal: { ...glucoseGoal, startMs: Date.now() },
          lifestyleGoals,
        };
        const nextToday = { ...get().today, morning: morningData };
        set({ today: nextToday });

        // Slot completion bonus only — adherence unknown until evening
        useProgressionStore.getState().setCheckInCapMultiplier(
          computeCapMultiplier(nextToday)
        );
        // XP burst + small acorn celebration
        useProgressionStore.getState().grantCheckInXp(50, 5);
      },

      completeMiddayCheckIn: (lifestyleProgress: boolean[]) => {
        const s = get();
        if (!s.today.morning) return; // can't check in midday without morning

        const morningGoal = s.today.morning.glucoseGoal;
        const adherence = computeGlucoseAdherence(
          morningGoal,
          morningGoal.startMs,
          Date.now()
        );

        const midday: MidEveningCheckIn = {
          slot: "midday",
          completedAt: new Date().toISOString(),
          lifestyleProgress,
          glucoseAdherence: adherence,
        };
        const nextToday = { ...s.today, midday };
        set({ today: nextToday });

        useProgressionStore.getState().setCheckInCapMultiplier(
          computeCapMultiplier(nextToday)
        );
        useProgressionStore.getState().grantCheckInXp(30, 3);
      },

      completeEveningCheckIn: (lifestyleProgress: boolean[]) => {
        const s = get();
        if (!s.today.morning) return;

        const morningGoal = s.today.morning.glucoseGoal;
        const adherence = computeGlucoseAdherence(
          morningGoal,
          morningGoal.startMs,
          Date.now()
        );

        const evening: MidEveningCheckIn = {
          slot: "evening",
          completedAt: new Date().toISOString(),
          lifestyleProgress,
          glucoseAdherence: adherence,
        };
        const nextToday = { ...s.today, evening };
        set({ today: nextToday });

        // Full multiplier including all adherence bonuses
        useProgressionStore.getState().setCheckInCapMultiplier(
          computeCapMultiplier(nextToday)
        );
        useProgressionStore.getState().grantCheckInXp(80, 8);
      },
    }),
    {
      name: "glidermon/checkin-v1",
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        today: s.today,
      }),
      migrate: (persisted: any) => {
        const s = persisted ?? {};
        s.today = s.today ?? emptyDay();
        delete s.streak;
        return s;
      },
    }
  )
);
