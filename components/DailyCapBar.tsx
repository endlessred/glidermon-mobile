import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { useTheme } from "../hooks/useTheme";

type Props = {
  value: number;  // earned today that counts toward cap
  cap: number;    // daily cap
  rested: number; // overflow bucket (not in bar, just shown)
};

export default function DailyCapBar({ value, cap, rested }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const pct = useMemo(() => {
    const denom = Math.max(1, cap);
    const p = Math.max(0, Math.min(1, value / denom));
    return p;
  }, [value, cap]);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{
          color: colors.text.primary,
          fontWeight: typography.weight.bold,
          fontSize: typography.size.base,
        }}>
          🎯 Daily Progress
        </Text>
        <Text style={{
          color: colors.text.secondary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.medium,
        }}>
          {value.toLocaleString()} / {cap.toLocaleString()}
        </Text>
      </View>

      <View
        style={{
          height: 10,
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
            backgroundColor: colors.health[500],
            borderRadius: borderRadius.full,
          }}
        />
      </View>

      <Text style={{
        color: colors.text.tertiary,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
      }}>
        💤 Rested bonus: {rested.toLocaleString()} 🌰
      </Text>
    </View>
  );
}
