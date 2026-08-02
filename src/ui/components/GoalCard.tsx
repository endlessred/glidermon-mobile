// ui/components/GoalCard.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { useHudVM } from "../../data/hooks/useHudVM";
import { useSettingsStore } from "../../data/stores/settingsStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useGoalsStore, ActiveGoalWithDef } from "../../data/stores/goalsStore";
import { useAcornSource } from "../hooks/useAcornSource";

let PhosphorIcons: any = {};
try {
  PhosphorIcons = require("phosphor-react-native");
} catch {
  // Fallback if phosphor is not installed yet
}

const TAP_SLOP = { top: 8, right: 8, bottom: 8, left: 8 };

type Props = {
  goal: ActiveGoalWithDef;
};

/** One goal per row: icon, title, acorn reward chip, a "⋯" button, and a
 * checkmark (rightmost -- the primary, most-reachable action). "⋯" swaps
 * that segment for inline Skip/Snooze/Cancel. */
export default function GoalCard({ goal }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [revealed, setRevealed] = useState(false);

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
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);

  const Icon = PhosphorIcons[goal.def.icon];
  const CheckIcon = PhosphorIcons.Check;
  const isGlucoseResponse = goal.def.category === "glucose_response";

  const handleComplete = () => {
    const amount = completeGoal(goal.instanceId, ctx);
    if (amount > 0) {
      grantAcorns(amount);
      spawnFromRef(amount);
    }
  };

  return (
    <Animated.View
      style={{
        opacity,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: revealed ? colors.accent.lavender + "14" : colors.background.secondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray[200],
        borderLeftWidth: isGlucoseResponse ? 3 : 1,
        borderLeftColor: isGlucoseResponse ? colors.accent.coral : colors.gray[200],
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
      }}
    >
      {Icon ? (
        <Icon size={22} weight="duotone" color={colors.primary[500]} />
      ) : (
        <Text style={{ fontSize: 20 }}>{goal.def.emojiFallback}</Text>
      )}

      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold as any,
          color: colors.text.primary,
        }}
      >
        {goal.def.title}
      </Text>

      {!revealed && (
        <View
          ref={sourceRef}
          style={{
            backgroundColor: colors.accent.lavender + "22",
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.xs,
            paddingVertical: 2,
          }}
        >
          <Text style={{
            fontSize: typography.size.xs,
            fontWeight: typography.weight.bold as any,
            color: colors.text.secondary,
          }}>
            +{goal.def.acorns} 🌰
          </Text>
        </View>
      )}

      {revealed ? (
        <>
          <Pressable
            onPress={() => skipGoal(goal.instanceId, ctx)}
            style={{
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.background.tertiary,
            }}
          >
            <Text style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold as any, color: colors.text.secondary }}>
              Skip
            </Text>
          </Pressable>
          <Pressable
            onPress={() => snoozeGoal(goal.instanceId, ctx)}
            style={{
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.background.tertiary,
            }}
          >
            <Text style={{ fontSize: typography.size.xs, fontWeight: typography.weight.semibold as any, color: colors.text.secondary }}>
              Snooze
            </Text>
          </Pressable>
          <Pressable onPress={() => setRevealed(false)} hitSlop={TAP_SLOP} style={{ paddingHorizontal: 2 }}>
            <Text style={{ fontSize: typography.size.base, color: colors.text.tertiary }}>✕</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            onPress={() => setRevealed(true)}
            hitSlop={TAP_SLOP}
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.md,
              backgroundColor: colors.background.tertiary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: typography.size.base, color: colors.text.secondary }}>⋯</Text>
          </Pressable>
          <Pressable
            onPress={handleComplete}
            hitSlop={TAP_SLOP}
            style={{
              width: 44,
              height: 44,
              borderRadius: borderRadius.full,
              backgroundColor: colors.primary[500],
              alignItems: "center",
              justifyContent: "center",
              marginLeft: spacing.xs,
            }}
          >
            {CheckIcon ? (
              <CheckIcon size={20} weight="bold" color="#fff" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>✓</Text>
            )}
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}
