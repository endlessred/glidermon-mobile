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
  /** epoch ms when the goal's window began */
  startMs: number;
  /** epoch ms when the goal's window ends (startMs + GLUCOSE_GOAL_DURATION_MS) */
  endMs: number;
};

export type LifestyleGoalCategory = "meal" | "activity";

export type LifestyleGoal = {
  category: LifestyleGoalCategory;
  text: string;
};

export type CheckInSlot = "morning" | "midday" | "evening";

/**
 * The check-in that sets today's glucose + lifestyle goals. Whichever of the
 * three daily slots happens first holds this -- morning/midday/evening are
 * no longer fixed roles, just named time windows.
 */
export type GoalSettingCheckIn = {
  kind: "goal_setting";
  completedAt: string; // ISO timestamp
  glucoseGoal: GlucoseGoal;
  lifestyleGoals: LifestyleGoal[];
};

/** A later check-in that reports on the goal set earlier in the day. */
export type GradingCheckIn = {
  kind: "grading";
  completedAt: string;
  lifestyleProgress: number[]; // 0, 0.5, or 1 per goal-setting's lifestyleGoals
  glucoseAdherence: number;    // 0–1, computed from CGM trail
};

export type SlotCheckIn = GoalSettingCheckIn | GradingCheckIn;

export type DailyCheckIns = {
  date: string; // YYYY-MM-DD
  morning: SlotCheckIn | null;
  midday: SlotCheckIn | null;
  evening: SlotCheckIn | null;
};

// ─── Time windows (hours, local time) ────────────────────────────────────────

const WINDOWS: Record<CheckInSlot, [number, number]> = {
  morning: [6, 11],   // 6:00 AM – 11:00 AM
  midday:  [11, 16],  // 11:00 AM – 4:00 PM
  evening: [17, 24],  // 5:00 PM – midnight
};

const SLOT_ORDER: CheckInSlot[] = ["morning", "midday", "evening"];

/** How long a glucose goal's window lasts, from whichever check-in sets it. */
export const GLUCOSE_GOAL_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours

// Reward amounts stay tied to the slot name (time-of-day), regardless of
// whether that slot ends up holding goal-setting or grading content.
// Exported so the UI can display the real numbers instead of hardcoding them.
export const CHECK_IN_XP: Record<CheckInSlot, number> = { morning: 50, midday: 30, evening: 80 };
export const CHECK_IN_ACORNS: Record<CheckInSlot, number> = { morning: 5, midday: 3, evening: 8 };

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
 * Whichever of today's slots set the glucose/lifestyle goals, if any -- at
 * most one slot is ever `kind: "goal_setting"` per day.
 */
export function findTodayGoalSetting(today: DailyCheckIns): GoalSettingCheckIn | null {
  for (const slot of SLOT_ORDER) {
    const rec = today[slot];
    if (rec && rec.kind === "goal_setting") return rec;
  }
  return null;
}

/** The most recently completed grading check-in, in slot order. */
export function latestGrading(today: DailyCheckIns): GradingCheckIn | null {
  let latest: GradingCheckIn | null = null;
  for (const slot of SLOT_ORDER) {
    const rec = today[slot];
    if (rec && rec.kind === "grading") latest = rec;
  }
  return latest;
}

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
 * Recomputes the full cap multiplier from today's completed check-ins: a
 * flat +0.17 per completed slot (regardless of kind), plus adherence/
 * lifestyle bonuses from the most recent grading check-in once one exists.
 */
function computeCapMultiplier(today: DailyCheckIns): number {
  let m = 1.0;

  for (const slot of SLOT_ORDER) {
    if (today[slot]) m += 0.17;
  }

  const grading = latestGrading(today);
  if (grading) {
    m += grading.glucoseAdherence * 0.10;

    const goalSetting = findTodayGoalSetting(today);
    goalSetting?.lifestyleGoals.forEach((goal, i) => {
      const progress = grading.lifestyleProgress[i] ?? 0;
      m += progress * (goal.category === "meal" ? 0.10 : 0.06);
    });
  }

  return Math.min(1.77, m);
}

// ─── Store type ───────────────────────────────────────────────────────────────

export type CheckInPayload =
  | { kind: "goal_setting"; glucoseGoal: Pick<GlucoseGoal, "type" | "target">; lifestyleGoals: LifestyleGoal[] }
  | { kind: "grading"; lifestyleProgress: number[] };

export type CheckInState = {
  today: DailyCheckIns;

  // Actions
  resetDailyIfNeeded: () => void;
  availableSlot: () => CheckInSlot | null;
  completeCheckIn: (slot: CheckInSlot, payload: CheckInPayload) => void;
};

const STORE_VERSION = 3;

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

        // Each slot only depends on its own window and its own null-ness now
        // -- a missed slot no longer blocks the ones after it.
        if (h >= WINDOWS.morning[0] && h < WINDOWS.morning[1] && !s.today.morning) {
          return "morning";
        }
        if (h >= WINDOWS.midday[0] && h < WINDOWS.midday[1] && !s.today.midday) {
          return "midday";
        }
        if (h >= WINDOWS.evening[0] && h < WINDOWS.evening[1] && !s.today.evening) {
          return "evening";
        }
        return null;
      },

      completeCheckIn: (slot, payload) => {
        get().resetDailyIfNeeded();
        const s = get();

        let record: SlotCheckIn;
        if (payload.kind === "goal_setting") {
          const startMs = Date.now();
          record = {
            kind: "goal_setting",
            completedAt: new Date().toISOString(),
            glucoseGoal: { ...payload.glucoseGoal, startMs, endMs: startMs + GLUCOSE_GOAL_DURATION_MS },
            lifestyleGoals: payload.lifestyleGoals,
          };
        } else {
          const goalSetting = findTodayGoalSetting(s.today);
          const goal = goalSetting?.glucoseGoal;
          const adherence = goal
            ? computeGlucoseAdherence(goal, goal.startMs, Math.min(Date.now(), goal.endMs))
            : 0.5;
          record = {
            kind: "grading",
            completedAt: new Date().toISOString(),
            lifestyleProgress: payload.lifestyleProgress,
            glucoseAdherence: adherence,
          };
        }

        const nextToday = { ...s.today, [slot]: record };
        set({ today: nextToday });

        useProgressionStore.getState().setCheckInCapMultiplier(computeCapMultiplier(nextToday));
        useProgressionStore.getState().grantCheckInXp(CHECK_IN_XP[slot], CHECK_IN_ACORNS[slot]);
      },
    }),
    {
      name: "glidermon/checkin-v1",
      version: STORE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        today: s.today,
      }),
      migrate: (persisted: any, fromVersion: number) => {
        const s = persisted ?? {};
        s.today = s.today ?? emptyDay();
        delete s.streak;

        if (fromVersion < 3) {
          const convertSlot = (rec: any): SlotCheckIn | null => {
            if (!rec) return null;
            if (rec.kind === "goal_setting" || rec.kind === "grading") return rec; // already migrated
            if ("glucoseGoal" in rec) {
              // old MorningCheckIn shape
              const goal = rec.glucoseGoal ?? {};
              return {
                kind: "goal_setting",
                completedAt: rec.completedAt,
                glucoseGoal: {
                  type: goal.type ?? "tir",
                  target: goal.target ?? 70,
                  startMs: goal.startMs ?? Date.now(),
                  endMs: (goal.startMs ?? Date.now()) + GLUCOSE_GOAL_DURATION_MS,
                },
                lifestyleGoals: rec.lifestyleGoals ?? [],
              };
            }
            // old MidEveningCheckIn shape (boolean[] progress)
            return {
              kind: "grading",
              completedAt: rec.completedAt,
              lifestyleProgress: Array.isArray(rec.lifestyleProgress)
                ? rec.lifestyleProgress.map((b: unknown) => (b ? 1 : 0))
                : [],
              glucoseAdherence: rec.glucoseAdherence ?? 0.5,
            };
          };
          s.today.morning = convertSlot(s.today.morning);
          s.today.midday = convertSlot(s.today.midday);
          s.today.evening = convertSlot(s.today.evening);
        }

        return s;
      },
    }
  )
);
