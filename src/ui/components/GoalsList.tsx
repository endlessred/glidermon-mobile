// ui/components/GoalsList.tsx
import React, { useEffect, useMemo } from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { useHudVM } from "../../data/hooks/useHudVM";
import { useSettingsStore } from "../../data/stores/settingsStore";
import { useGoalsStore, selectVisibleGoals } from "../../data/stores/goalsStore";
import GoalCard from "./GoalCard";

/** Vertical stack of GoalCard rows -- the "goals system" on Home. */
export default function GoalsList() {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const { mgdl } = useHudVM();
  const low = useSettingsStore((s) => s.low);
  const high = useSettingsStore((s) => s.high);
  const veryHigh = useSettingsStore((s) => s.veryHigh);

  const resetDailyIfNeeded = useGoalsStore((s) => s.resetDailyIfNeeded);
  // `activeGoals` is a stable reference until a store action replaces it, so
  // memoizing the derived visible list here (rather than selecting a
  // freshly-built array straight out of the store) keeps React's snapshot
  // comparison happy.
  const activeGoals = useGoalsStore((s) => s.activeGoals);
  const visibleGoals = useMemo(() => selectVisibleGoals(activeGoals), [activeGoals]);

  // Generates today's batch once, if the day has rolled over. Deliberately
  // not re-run on every glucose tick -- the goal list is a fixed daily
  // batch, not a live-reactive one (see goalsStore.ts).
  useEffect(() => {
    resetDailyIfNeeded({ mgdl, low, high, veryHigh });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Batch not generated yet (e.g. the instant before the mount effect
  // above runs) -- nothing to show, don't flash any messaging.
  if (activeGoals.length === 0) return null;

  if (visibleGoals.length === 0) {
    const allResolved = activeGoals.every((g) => g.status !== "pending");
    return (
      <View style={{
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        alignItems: "center",
      }}>
        <Text style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold as any, color: colors.text.secondary }}>
          {allResolved ? "All done for today! 🎉" : "Nothing to do right now -- check back soon"}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {visibleGoals.map((goal) => (
        <GoalCard key={goal.instanceId} goal={goal} />
      ))}
    </View>
  );
}
