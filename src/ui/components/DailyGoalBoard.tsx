// ui/components/DailyGoalBoard.tsx
import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useHudVM } from "../../data/hooks/useHudVM";
import { useSettingsStore } from "../../data/stores/settingsStore";
import { useGoalsStore, selectVisibleGoals } from "../../data/stores/goalsStore";
import DailyGoalRow from "./DailyGoalRow";
import { CraftPanel, INK, INK_MUTED } from "./handcrafted";

// KRAFT_TAN (#C9A06B) darkened ~8% so the cream goal strips separate from
// the board a little more -- a local override on this one panel, not a new
// shared texture/token (HomeHeader still uses plain kraft).
const BOARD_KRAFT = "#B99362";

/** One coherent handcrafted "Today's Goals" board -- replaces the old stack
 * of separate white app cards with a single kraft-paper panel holding a
 * DailyGoalRow per visible goal. */
export default function DailyGoalBoard() {
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

  // Subtle progress readout in the header -- "N left" while there's
  // still-outstanding work today (pending, whether currently visible or
  // snoozed), or "✓ Done" once nothing's left pending. Deliberately not an
  // "N / total" count: refills keep appending to activeGoals all day, so
  // there's no stable daily total to divide against.
  const pendingCount = useMemo(
    () => activeGoals.filter((g) => g.status === "pending").length,
    [activeGoals]
  );

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

  return (
    <CraftPanel
      texture="kraft"
      stitched={false}
      shadow="panel"
      grainOpacity={0.1}
      inset={16}
      style={[styles.wrap, { backgroundColor: BOARD_KRAFT }]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Today's Goals</Text>
        <Text style={styles.progress}>
          {pendingCount > 0 ? `${pendingCount} left` : "✓ Done"}
        </Text>
      </View>
      {visibleGoals.length === 0 ? (
        <Text style={styles.empty}>
          {activeGoals.every((g) => g.status !== "pending")
            ? "All done for today! 🎉"
            : "Nothing to do right now -- check back soon"}
        </Text>
      ) : (
        <View style={styles.rows}>
          {visibleGoals.map((goal) => (
            <DailyGoalRow key={goal.instanceId} goal={goal} />
          ))}
        </View>
      )}
    </CraftPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: INK,
  },
  progress: {
    fontSize: 12,
    fontWeight: "700",
    color: INK_MUTED,
  },
  rows: {
    gap: 10,
  },
  empty: {
    fontSize: 13,
    fontWeight: "600",
    color: INK_MUTED,
    textAlign: "center",
    paddingVertical: 8,
  },
});
