// ui/components/adventureBoard/AdventureBoardA11y.tsx
//
// The in-world board's text is now a GL texture, so it isn't reachable by a
// screen reader. This renders a NON-VISUAL accessibility summary (zero-size,
// clipped) while the Goals camera is active. It never affects visual depth.
import React from "react";
import { View, StyleSheet } from "react-native";
import { useAdventureBoardModel } from "../../../data/selectors/adventureBoard";

type Props = {
  /** Only mount while the Goals camera frames the board. */
  active: boolean;
  /** Present when tapping the board would start a check-in. */
  onStartCheckIn?: () => void;
};

export default function AdventureBoardA11y({ active, onStartCheckIn }: Props) {
  const model = useAdventureBoardModel();
  if (!active) return null;

  const parts: string[] = ["Today's Adventures board."];
  if (model.state === "not-planned") {
    parts.push("No plan yet.");
  } else if (model.primary) {
    const p = model.primary;
    const metric =
      p.displayKind === "tir-pct"
        ? `${p.displayMetric}% in range${p.targetPct != null ? `, target ${p.targetPct}%` : ""}`
        : `${p.displayMetric} ${p.displayKind === "highs-count" ? "highs" : "lows"}`;
    const status = p.windowEnded
      ? p.evaluation === "met"
        ? "goal met"
        : "goal missed"
      : p.onTrack
      ? "on track"
      : "off track";
    parts.push(`${p.label}: ${metric}, ${status}.`);
  }
  const done = model.minorGoals.filter((g) => g.done).length;
  const left = model.minorGoals.length - done;
  if (model.minorGoals.length > 0) {
    parts.push(`${done} of ${model.minorGoals.length} smaller goals done, ${left} remaining.`);
  }
  parts.push(`${model.dailyAcorns} acorns earned today.`);

  const label = parts.join(" ");
  const canStart = model.state === "not-planned" && !!onStartCheckIn;

  return (
    <View style={styles.host} pointerEvents="box-none" importantForAccessibility="yes">
      <View
        accessible
        accessibilityRole={canStart ? "button" : "summary"}
        accessibilityLabel={label}
        accessibilityHint={canStart ? "Opens the Morning Check-In" : undefined}
        onAccessibilityTap={canStart ? onStartCheckIn : undefined}
        style={styles.node}
      />
    </View>
  );
}

// Zero visual footprint: 1x1, clipped, top-left. Screen readers still reach it.
const styles = StyleSheet.create({
  host: { position: "absolute", top: 0, left: 0, width: 1, height: 1, overflow: "hidden" },
  node: { width: 1, height: 1 },
});
