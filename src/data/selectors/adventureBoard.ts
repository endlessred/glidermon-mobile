// data/selectors/adventureBoard.ts
//
// Read-only projection of the existing daily-goal stores into the shape the
// Daily Adventure Board UI renders. There is NO adventure-board store -- the
// board is a view of goalsStore + checkInStore + progressionStore + gameStore.
// Morning Check-In writes the normal stores; the house board reacts here.
//
// Business logic (CGM math, goal eligibility, reward aggregation) stays in the
// stores/engine -- this file only selects and reshapes.
import { useMemo } from "react";
import { useGoalsStore, selectVisibleGoals } from "../stores/goalsStore";
import {
  useCheckInStore,
  findTodayGoalSetting,
  latestGrading,
  evaluateGlucoseGoal,
  GlucoseGoal,
  CHECK_IN_ACORNS,
  CheckInSlot,
} from "../stores/checkInStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useGameStore } from "../stores/gameStore";
import { getGoalDef } from "../goals/goalCatalog";
import type { ActiveGoal } from "../stores/goalsStore";
import type { DailyCheckIns } from "../stores/checkInStore";

export type DailyAdventureBoardState = "not-planned" | "active" | "complete";
export type PrimaryEvaluation = "in-progress" | "met" | "missed";

export interface PrimaryGoalView {
  /** Short board label. */
  label: string;
  /** TIR target %, or null for no_highs / no_lows goals. */
  targetPct: number | null;
  /** The ACTUAL user-facing number (never normalized adherence): in-range %
   * for tir, or the count of out-of-bounds readings for no_highs / no_lows. */
  displayMetric: number;
  displayKind: "tir-pct" | "highs-count" | "lows-count";
  /** Provisional "doing well so far" flag while the window is still open. */
  onTrack: boolean;
  /** True once the 5-hour evaluation window has elapsed. */
  windowEnded: boolean;
  /** "in-progress" until windowEnded; then "met" / "missed". */
  evaluation: PrimaryEvaluation;
}

export interface MinorGoalView {
  id: string;
  title: string;
  icon: string;
  emojiFallback: string;
  done: boolean;
}

export interface AdventureBoardModel {
  state: DailyAdventureBoardState;
  primary: PrimaryGoalView | null;
  /** Every relevant minor goal today (pending first, then completed). The
   * component slices this for display and derives "+N more" from the length. */
  minorGoals: MinorGoalView[];
  /** Acorns earned *today* (not the account balance). */
  dailyAcorns: number;
}

/**
 * A stable string key of everything the board's *rendering* depends on. Used
 * to memoize the generated in-world board texture -- it must NOT change when
 * Glidermon moves, the camera pans, or Home re-renders for unrelated state.
 * Glucose progress is bucketed (nearest 2%) so tiny CGM wobble doesn't churn
 * the GPU texture.
 */
export function serializeAdventureBoardState(m: AdventureBoardModel): string {
  const p = m.primary
    ? [
        m.primary.label,
        m.primary.targetPct ?? "-",
        Math.round(m.primary.displayMetric / 2) * 2,
        m.primary.displayKind,
        m.primary.onTrack ? 1 : 0,
        m.primary.windowEnded ? 1 : 0,
        m.primary.evaluation,
      ].join(":")
    : "none";
  const minor = m.minorGoals.map((g) => `${g.id}${g.done ? "✓" : ""}`).join(",");
  return `${m.state}|${p}|${m.dailyAcorns}|${minor}`;
}

// Short labels -- the board is narrow, and the "% / Target / status" context
// already makes the goal unambiguous.
function primaryLabel(type: GlucoseGoal["type"]): string {
  return type === "tir" ? "In Range" : type === "no_highs" ? "Avoid Highs" : "Avoid Lows";
}

const CHECK_IN_SLOTS: CheckInSlot[] = ["morning", "midday", "evening"];

/**
 * Acorns earned *today* (never the account balance / lifetime XP). Derived
 * from existing reward state -- no new store:
 *   - `progressionStore.dailyEarned` : the CGM-tick earnings (resets on the
 *     daily boundary in progressionStore.resetDailyIfNeeded).
 *   - completed daily goals today     : `goalsStore` resets daily, so every
 *     `completed` entry is from today; `grantAcorns` credits the balance but
 *     NOT `dailyEarned`, so add each goal's own reward here.
 *   - completed check-in slots today  : `CHECK_IN_ACORNS` per slot;
 *     `grantCheckInXp`'s bonus acorns likewise skip `dailyEarned`.
 */
export function computeAcornsEarnedToday(
  cgmEarnedToday: number,
  activeGoals: ActiveGoal[],
  today: DailyCheckIns
): number {
  let total = cgmEarnedToday;
  for (const g of activeGoals) {
    if (g.status !== "completed") continue;
    const def = getGoalDef(g.defId);
    if (def) total += def.acorns;
  }
  for (const slot of CHECK_IN_SLOTS) {
    if (today[slot]) total += CHECK_IN_ACORNS[slot];
  }
  return total;
}

/** Narrow subscription: true before today's plan is set (checkInStore.today only). */
export function useAdventureBoardNotPlanned(): boolean {
  return useCheckInStore((s) => findTodayGoalSetting(s.today) === null);
}

/** Centralized "acorns earned today" selector (see computeAcornsEarnedToday). */
export function useDailyAcorns(): number {
  const cgm = useProgressionStore((s) => s.dailyEarned);
  const activeGoals = useGoalsStore((s) => s.activeGoals);
  const today = useCheckInStore((s) => s.today);
  return useMemo(
    () => computeAcornsEarnedToday(cgm, activeGoals, today),
    [cgm, activeGoals, today]
  );
}

/**
 * The board's view model. Subscribes only to the store slices it needs:
 * goalsStore.activeGoals, checkInStore.today, progressionStore.dailyEarned, and
 * the CGM trail (for live primary-goal progress). Memoized against those
 * references so it doesn't rebuild on unrelated store churn.
 */
export function useAdventureBoardModel(): AdventureBoardModel {
  const activeGoals = useGoalsStore((s) => s.activeGoals);
  const today = useCheckInStore((s) => s.today);
  const cgmEarnedToday = useProgressionStore((s) => s.dailyEarned);
  const trail = useGameStore((s) => s.engine.trail);

  return useMemo(() => {
    const dailyAcorns = computeAcornsEarnedToday(cgmEarnedToday, activeGoals, today);

    // --- minor goals -----------------------------------------------------
    // Completed first (most recent first -- celebrate what's done, and it's
    // stable since goalsStore appends), then the still-pending ones. The
    // component slices this for display and derives "+N more" from the length.
    const minorGoals: MinorGoalView[] = [];
    for (let i = activeGoals.length - 1; i >= 0; i--) {
      const g = activeGoals[i];
      if (g.status !== "completed") continue;
      const def = getGoalDef(g.defId);
      if (!def) continue;
      minorGoals.push({
        id: g.instanceId,
        title: def.title,
        icon: def.icon,
        emojiFallback: def.emojiFallback,
        done: true,
      });
    }
    for (const g of selectVisibleGoals(activeGoals)) {
      minorGoals.push({
        id: g.instanceId,
        title: g.def.title,
        icon: g.def.icon,
        emojiFallback: g.def.emojiFallback,
        done: false,
      });
    }

    // --- primary glucose goal -------------------------------------------
    const goalSetting = findTodayGoalSetting(today);
    if (!goalSetting) {
      return { state: "not-planned", primary: null, minorGoals, dailyAcorns };
    }

    const goal = goalSetting.glucoseGoal;
    const now = Date.now();
    const windowEnded = now >= goal.endMs;

    // Live/so-far metrics over [startMs, min(now, endMs)].
    const soFar = evaluateGlucoseGoal(goal, goal.startMs, Math.min(now, goal.endMs));

    // Once the window has closed, prefer an authoritative grading result
    // recorded at/after the window end; otherwise evaluate the full window.
    let finalAdherence = soFar.adherence;
    if (windowEnded) {
      const grading = latestGrading(today);
      const authoritative =
        grading && Date.parse(grading.completedAt) >= goal.endMs ? grading.glucoseAdherence : null;
      finalAdherence =
        authoritative ?? evaluateGlucoseGoal(goal, goal.startMs, goal.endMs).adherence;
    }

    const onTrack =
      goal.type === "tir"
        ? soFar.actualInRangePct >= goal.target
        : goal.type === "no_highs"
        ? soFar.highsCount === 0
        : soFar.lowsCount === 0;

    const displayKind =
      goal.type === "tir" ? "tir-pct" : goal.type === "no_highs" ? "highs-count" : "lows-count";
    const displayMetric =
      goal.type === "tir"
        ? Math.round(soFar.actualInRangePct)
        : goal.type === "no_highs"
        ? soFar.highsCount
        : soFar.lowsCount;

    const evaluation: PrimaryEvaluation = !windowEnded
      ? "in-progress"
      : finalAdherence >= 1.0
      ? "met"
      : "missed";

    const primary: PrimaryGoalView = {
      label: primaryLabel(goal.type),
      targetPct: goal.type === "tir" ? goal.target : null,
      displayMetric,
      displayKind: displayKind as PrimaryGoalView["displayKind"],
      onTrack,
      windowEnded,
      evaluation,
    };

    const allMinorDone = minorGoals.length > 0 && minorGoals.every((g) => g.done);
    const state: DailyAdventureBoardState =
      evaluation === "met" && allMinorDone ? "complete" : "active";

    return { state, primary, minorGoals, dailyAcorns };
    // trail is a dep so live progress updates on each CGM tick.
  }, [activeGoals, today, cgmEarnedToday, trail]);
}
