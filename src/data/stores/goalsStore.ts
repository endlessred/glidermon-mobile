// stores/goalsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoalDef,
  GoalEligibilityContext,
  getGoalDef,
  pickDailyGoals,
  pickReplacementGoal,
} from "../goals/goalCatalog";

export type GoalStatus = "pending" | "completed" | "skipped";

export type ActiveGoal = {
  instanceId: string;
  defId: string;
  status: GoalStatus;
  /** epoch ms; set while snoozed, cleared implicitly once it's in the past */
  snoozedUntil?: number;
};

export type ActiveGoalWithDef = ActiveGoal & { def: GoalDef };

const DAILY_GOAL_COUNT = 4;
const SNOOZE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

type GoalsState = {
  activeGoals: ActiveGoal[];
  lastResetDay: string; // YYYY-MM-DD
  _hasHydrated: boolean;

  /** Generates a fresh daily batch if the day has rolled over since the last visit. */
  resetDailyIfNeeded: (ctx: GoalEligibilityContext) => void;
  /** Marks the goal completed and refills its slot. Returns the acorn reward (0 if not found/already resolved). */
  completeGoal: (instanceId: string, ctx: GoalEligibilityContext) => number;
  /** Marks the goal skipped for today and refills its slot. */
  skipGoal: (instanceId: string, ctx: GoalEligibilityContext) => void;
  /** Hides the goal for ~3h (it stays pending, just filtered out of the visible set) and refills a visible slot. */
  snoozeGoal: (instanceId: string, ctx: GoalEligibilityContext) => void;
};

const ymd = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

let instanceSeq = 0;
const makeInstanceId = () => `goal-${Date.now()}-${instanceSeq++}`;

const toActiveGoals = (defs: GoalDef[]): ActiveGoal[] =>
  defs.map((def) => ({ instanceId: makeInstanceId(), defId: def.id, status: "pending" as const }));

/**
 * Appends one replacement goal to keep the row populated. Excludes every
 * defId already seen today (pending, completed, or skipped) -- not just
 * pending ones -- so a goal you just completed doesn't immediately reappear
 * as its own replacement (pickReplacementGoal falls back to repeats only
 * once the catalog is genuinely exhausted for the day).
 */
function refill(activeGoals: ActiveGoal[], ctx: GoalEligibilityContext): ActiveGoal[] {
  const excludeIds = activeGoals.map((g) => g.defId);
  const replacement = pickReplacementGoal(ctx, excludeIds);
  if (!replacement) return activeGoals;
  return [...activeGoals, ...toActiveGoals([replacement])];
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      activeGoals: [],
      lastResetDay: "",
      _hasHydrated: false,

      resetDailyIfNeeded: (ctx) => {
        const today = ymd();
        if (get().lastResetDay === today) return;
        set({
          activeGoals: toActiveGoals(pickDailyGoals(ctx, DAILY_GOAL_COUNT)),
          lastResetDay: today,
        });
      },

      completeGoal: (instanceId, ctx) => {
        const goal = get().activeGoals.find((g) => g.instanceId === instanceId);
        if (!goal || goal.status !== "pending") return 0;
        const def = getGoalDef(goal.defId);
        if (!def) return 0;

        set((s) => ({
          activeGoals: refill(
            s.activeGoals.map((g) =>
              g.instanceId === instanceId ? { ...g, status: "completed" as const } : g
            ),
            ctx
          ),
        }));
        return def.acorns;
      },

      skipGoal: (instanceId, ctx) => {
        const goal = get().activeGoals.find((g) => g.instanceId === instanceId);
        if (!goal || goal.status !== "pending") return;

        set((s) => ({
          activeGoals: refill(
            s.activeGoals.map((g) =>
              g.instanceId === instanceId ? { ...g, status: "skipped" as const } : g
            ),
            ctx
          ),
        }));
      },

      snoozeGoal: (instanceId, ctx) => {
        const goal = get().activeGoals.find((g) => g.instanceId === instanceId);
        if (!goal || goal.status !== "pending") return;

        set((s) => ({
          activeGoals: refill(
            s.activeGoals.map((g) =>
              g.instanceId === instanceId ? { ...g, snoozedUntil: Date.now() + SNOOZE_DURATION_MS } : g
            ),
            ctx
          ),
        }));
      },
    }),
    {
      name: "glidermon/goals-v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({
        activeGoals: s.activeGoals,
        lastResetDay: s.lastResetDay,
      }),
      migrate: (persisted: any) => {
        const s = persisted ?? {};
        s.activeGoals = Array.isArray(s.activeGoals) ? s.activeGoals : [];
        s.lastResetDay = typeof s.lastResetDay === "string" ? s.lastResetDay : "";
        return s;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    }
  )
);

/**
 * Goals visible in the row: pending and not currently snoozed. Completed/
 * skipped goals stay in `activeGoals` (harmless bookkeeping) but are
 * filtered out here. A snoozed goal reappears once its timer passes the
 * next time this selector runs (re-evaluated on store updates / re-renders,
 * not on a background timer).
 *
 * Pure function of `activeGoals` alone (not the whole store) so callers can
 * memoize it against that array reference -- a store selector that builds a
 * new array every call breaks React's snapshot-caching and infinite-loops.
 */
export function selectVisibleGoals(activeGoals: ActiveGoal[]): ActiveGoalWithDef[] {
  const now = Date.now();
  const visible: ActiveGoalWithDef[] = [];
  for (const g of activeGoals) {
    if (g.status !== "pending") continue;
    if (g.snoozedUntil && g.snoozedUntil > now) continue;
    const def = getGoalDef(g.defId);
    if (def) visible.push({ ...g, def });
  }
  return visible;
}
