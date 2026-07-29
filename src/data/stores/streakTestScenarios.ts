// stores/streakTestScenarios.ts
// Dev-only helpers that force the streak store into a specific state, used by
// both StreakTestButton.tsx (on-screen panel) and the glidermon://streak/<kind>
// deep links in App.tsx, so both share one source of truth for each scenario.
import { useProgressionStore } from "./progressionStore";
import { useStreakStore, ymd, DAILY_GOAL_ACORNS } from "./streakStore";

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

export function resetFresh() {
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: 0,
    longestStreak: 0,
    freezesAvailable: 0,
    lastGoalMetDate: null,
    lastEvaluatedDate: ymd(),
    lastSplashShownDate: null,
    pendingSplash: null,
    hasCommitted: false,
  });
}

export function hitTodaysGoal() {
  // Real path: bumping dailyEarned fires streakStore's subscribe -> evaluate().
  useProgressionStore.setState({ dailyEarned: DAILY_GOAL_ACORNS });
}

export function triggerStartedSplash() {
  resetFresh();
  useStreakStore.setState({ hasCommitted: true }); // isolate: only the splash, not the commitment modal too
  hitTodaysGoal();
}

export function triggerContinuedSplash() {
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: 3,
    longestStreak: 3,
    freezesAvailable: 0,
    lastGoalMetDate: daysAgo(1),
    lastEvaluatedDate: daysAgo(1),
    pendingSplash: null,
    hasCommitted: true,
  });
  hitTodaysGoal();
}

export function simulateSkippedDay() {
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: 5,
    longestStreak: 5,
    freezesAvailable: 0,
    lastGoalMetDate: daysAgo(3),
    lastEvaluatedDate: daysAgo(2),
    pendingSplash: null,
  });
  useStreakStore.getState().evaluate();
}

export function simulateFrozenGap() {
  // 1-day gap (yesterday missed), 1 freeze available -> should be covered.
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: 5,
    longestStreak: 5,
    freezesAvailable: 1,
    lastGoalMetDate: daysAgo(2),
    lastEvaluatedDate: daysAgo(1),
    pendingSplash: null,
  });
  useStreakStore.getState().evaluate();
}

export function simulateInsufficientFreezeGap() {
  // 2-day gap, only 1 freeze available -> not enough, streak should still break.
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: 5,
    longestStreak: 5,
    freezesAvailable: 1,
    lastGoalMetDate: daysAgo(3),
    lastEvaluatedDate: daysAgo(2),
    pendingSplash: null,
  });
  useStreakStore.getState().evaluate();
}

export function setStreakNearMilestone() {
  // Streak at 6, yesterday counted -> call hitTodaysGoal() next to trigger the 7-day freeze-earn.
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: 6,
    longestStreak: 6,
    freezesAvailable: 0,
    lastGoalMetDate: daysAgo(1),
    lastEvaluatedDate: daysAgo(1),
    pendingSplash: null,
  });
}

/** Sets streak to tier-1 (yesterday counted) and immediately hits today's goal, landing exactly on the milestone tier. */
export function triggerMilestone(tier: number) {
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: tier - 1,
    longestStreak: tier - 1,
    freezesAvailable: 0,
    lastGoalMetDate: daysAgo(1),
    lastEvaluatedDate: daysAgo(1),
    pendingSplash: null,
    hasCommitted: true,
  });
  hitTodaysGoal();
}

export function triggerCommitmentModal() {
  useProgressionStore.setState({ dailyEarned: 0 });
  useStreakStore.setState({
    currentStreak: 1,
    longestStreak: 1,
    pendingSplash: null,
    hasCommitted: false,
  });
}
