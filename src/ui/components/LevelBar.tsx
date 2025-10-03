import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";

type Props = {
  level: number;
  current: number; // xp into current level
  next: number;    // xp needed to reach next level
};

export default function LevelBar({ level, current, next }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const pct = useMemo(() => {
    const denom = Math.max(1, next);
    const p = Math.max(0, Math.min(1, current / denom));
    return p;
  }, [current, next]);

  const progressPercentage = Math.round(pct * 100);

  return (
    <View
      style={{ gap: spacing.xs }}
      accessibilityLabel={`Level ${level}. Progress: ${Math.floor(current)} out of ${next} experience points. ${progressPercentage} percent complete.`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: next, now: current }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{
          color: colors.text.primary,
          fontWeight: typography.weight.extrabold,
          fontSize: typography.size.base,
        }}>
          ⭐ Level {level}
        </Text>
        <Text style={{
          color: colors.text.secondary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.medium,
        }}>
          {Math.floor(current)}/{next} XP
        </Text>
      </View>

      <View
        style={{
          height: 12,
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.full,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.gray[300],
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            backgroundColor: colors.primary[500],
            borderRadius: borderRadius.full,
          }}
        />
      </View>
    </View>
  );
}
