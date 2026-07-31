// ui/components/GoalCard.tsx
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
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

/** One goal per row: icon, title, acorn reward chip, a checkmark button, and
 * a "⋯" button that swaps the checkmark+⋯ segment for inline Skip/Snooze. */
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

  const Icon = PhosphorIcons[goal.def.icon];
  const CheckIcon = PhosphorIcons.Check;

  const handleComplete = () => {
    const amount = completeGoal(goal.instanceId, ctx);
    if (amount > 0) {
      grantAcorns(amount);
      spawnFromRef(amount);
    }
  };

  return (
    <View
      ref={sourceRef}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.gray[200],
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
        <View style={{
          backgroundColor: colors.accent.lavender + "22",
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
        }}>
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
            onPress={handleComplete}
            hitSlop={TAP_SLOP}
            style={{
              width: 32,
              height: 32,
              borderRadius: borderRadius.full,
              backgroundColor: colors.primary[500],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {CheckIcon ? (
              <CheckIcon size={16} weight="bold" color="#fff" />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>✓</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setRevealed(true)}
            hitSlop={TAP_SLOP}
            style={{
              width: 28,
              height: 28,
              borderRadius: borderRadius.md,
              backgroundColor: colors.background.tertiary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: typography.size.sm, color: colors.text.secondary }}>⋯</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
