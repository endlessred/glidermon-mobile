import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";

type Props = { count: number };

export default function AcornBadge({ count }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const safe = typeof count === "number" ? count : 0;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.accent.cream,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.accent.peach,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
      accessibilityLabel={`You have ${safe} acorns`}
      accessibilityRole="text"
      accessibilityHint="Acorns are the currency used to purchase items in the shop"
    >
      <Text style={{ fontSize: typography.size.lg }}>🌰</Text>
      <Text style={{
        color: colors.text.primary,
        fontWeight: typography.weight.extrabold,
        fontSize: typography.size.base,
      }}>
        {safe.toLocaleString()}
      </Text>
    </View>
  );
}
