// ui/components/DailyGoalRow.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { useHudVM } from "../../data/hooks/useHudVM";
import { useSettingsStore } from "../../data/stores/settingsStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useGoalsStore, ActiveGoalWithDef } from "../../data/stores/goalsStore";
import { useAcornSource } from "../hooks/useAcornSource";
import { useCharacterReactionStore } from "../../data/stores/characterReactionStore";
import { CraftPanel, CheckBadge, INK, INK_MUTED, CREAM, GOLD, PALE_GREEN } from "./handcrafted";

let PhosphorIcons: any = {};
try {
  PhosphorIcons = require("phosphor-react-native");
} catch {
  // Fallback if phosphor is not installed yet
}

const TAP_SLOP = { top: 8, right: 8, bottom: 8, left: 8 };
// How long the completion pop/float plays before the row actually leaves
// the board (completeGoal removes it from the visible list) -- long enough
// to read as a satisfying beat, short enough to stay non-blocking.
const COMPLETE_ANIM_MS = 480;

type Props = {
  goal: ActiveGoalWithDef;
};

/** One goal as a small paper strip inside DailyGoalBoard: icon, title, a
 * plain reward amount, a "⋯" button, and a material completion control
 * (rightmost -- the primary, most-reachable action). "⋯" swaps that segment
 * for inline Skip/Snooze/Cancel, same interaction as before. */
export default function DailyGoalRow({ goal }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [completing, setCompleting] = useState(false);

  const grantAcorns = useProgressionStore((s) => s.grantAcorns);
  const completeGoal = useGoalsStore((s) => s.completeGoal);
  const skipGoal = useGoalsStore((s) => s.skipGoal);
  const snoozeGoal = useGoalsStore((s) => s.snoozeGoal);

  const { mgdl } = useHudVM();
  const low = useSettingsStore((s) => s.low);
  const high = useSettingsStore((s) => s.high);
  const veryHigh = useSettingsStore((s) => s.veryHigh);
  const ctx = { mgdl, low, high, veryHigh };

  const { sourceRef, spawnFromRef } = useAcornSource();

  // Fade in when a fresh goal instance mounts (e.g. as a refill replacement)
  // so it doesn't just pop into the list.
  const mountOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(mountOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [mountOpacity]);

  const popScale = useRef(new Animated.Value(1)).current;
  const rewardFloat = useRef(new Animated.Value(0)).current;

  const Icon = PhosphorIcons[goal.def.icon];
  const isGlucoseResponse = goal.def.category === "glucose_response";

  const handleComplete = () => {
    if (completing) return;
    setCompleting(true);

    Animated.sequence([
      Animated.timing(popScale, { toValue: 1.05, duration: 140, useNativeDriver: true }),
      Animated.timing(popScale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    Animated.timing(rewardFloat, {
      toValue: 1,
      duration: COMPLETE_ANIM_MS,
      useNativeDriver: true,
    }).start();

    // A short, non-disruptive positive reaction on Glidermon if he's on
    // screen -- layers on top of whatever he's currently doing rather than
    // interrupting it (see characterReactionStore/playReaction).
    useCharacterReactionStore.getState().triggerReaction("proudCheerPlus");

    // Let the pop/float play out before the row actually leaves the board
    // (completeGoal removes it from the visible list and refills the slot).
    setTimeout(() => {
      const amount = completeGoal(goal.instanceId, ctx);
      if (amount > 0) {
        grantAcorns(amount);
        spawnFromRef(amount);
      }
    }, COMPLETE_ANIM_MS);
  };

  const rewardStyle = {
    opacity: rewardFloat.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 1, 0] }),
    transform: [
      { translateY: rewardFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
    ],
  };

  return (
    <Animated.View style={{ opacity: mountOpacity, transform: [{ scale: popScale }] }}>
      <CraftPanel
        texture="paper"
        stitched={false}
        shadow="card"
        grainOpacity={0.08}
        inset={15}
        contentStyle={styles.content}
        style={[
          isGlucoseResponse && !completing && styles.actionable,
          completing && styles.completedTint,
        ]}
      >
        {Icon ? (
          <Icon size={20} weight="duotone" color={INK} />
        ) : (
          <Text style={{ fontSize: 18 }}>{goal.def.emojiFallback}</Text>
        )}

        <Text
          numberOfLines={1}
          style={[styles.title, completing && styles.titleDone]}
        >
          {goal.def.title}
        </Text>

        <View ref={sourceRef} style={styles.rewardAnchor}>
          <Animated.View style={rewardStyle}>
            <Text style={styles.reward}>+{goal.def.acorns} 🌰</Text>
          </Animated.View>
        </View>

        {revealed && !completing ? (
          <>
            <Pressable onPress={() => skipGoal(goal.instanceId, ctx)} style={styles.miniBtn}>
              <Text style={styles.miniBtnText}>Skip</Text>
            </Pressable>
            <Pressable onPress={() => snoozeGoal(goal.instanceId, ctx)} style={styles.miniBtn}>
              <Text style={styles.miniBtnText}>Snooze</Text>
            </Pressable>
            <Pressable onPress={() => setRevealed(false)} hitSlop={TAP_SLOP} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </>
        ) : (
          <>
            {!completing && (
              <Pressable onPress={() => setRevealed(true)} hitSlop={TAP_SLOP} style={styles.moreBtn}>
                <Text style={styles.moreBtnText}>⋯</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleComplete}
              hitSlop={TAP_SLOP}
              disabled={completing}
              style={styles.checkWrap}
              accessibilityRole="button"
              accessibilityLabel={completing ? "Completed" : "Mark goal complete"}
            >
              {completing ? <CheckBadge size={38} /> : <View style={styles.checkEmpty} />}
            </Pressable>
          </>
        )}
      </CraftPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  actionable: {
    borderLeftWidth: 5,
    borderLeftColor: GOLD,
  },
  completedTint: {
    backgroundColor: PALE_GREEN,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: INK,
  },
  titleDone: {
    color: INK_MUTED,
  },
  rewardAnchor: {
    minWidth: 38,
    alignItems: "flex-end",
  },
  reward: {
    fontSize: 13,
    fontWeight: "800",
    color: INK_MUTED,
  },
  miniBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: CREAM,
    borderWidth: 1.5,
    borderColor: INK_MUTED,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: INK,
  },
  closeBtn: {
    paddingHorizontal: 2,
  },
  closeBtnText: {
    fontSize: 15,
    color: INK_MUTED,
  },
  // Quieter than the completion control -- a secondary action, not a second
  // circular button competing for attention. No background/border of its
  // own; relies on hitSlop (see TAP_SLOP) to stay comfortably tappable
  // despite the smaller visual footprint.
  moreBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtnText: {
    fontSize: 15,
    color: INK_MUTED,
    opacity: 0.85,
  },
  checkWrap: {
    marginLeft: 3,
  },
  // A touch stronger than the row's own outline so it clearly reads as
  // tappable, without approaching the completed state's full-strength
  // felt-green treatment.
  checkEmpty: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CREAM,
    borderWidth: 2.5,
    borderColor: INK,
  },
});
