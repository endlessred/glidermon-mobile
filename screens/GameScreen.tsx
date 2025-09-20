import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../hooks/useTheme";

export default function GameScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background.primary,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    }}>
      <View style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing['2xl'],
        alignItems: "center",
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <Text style={{
          fontSize: typography.size['4xl'],
          marginBottom: spacing.lg,
        }}>
          🎮
        </Text>
        <Text style={{
          color: colors.text.primary,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.bold,
          textAlign: "center",
          marginBottom: spacing.sm,
        }}>
          Game moved to HUD!
        </Text>
        <Text style={{
          color: colors.text.secondary,
          fontSize: typography.size.base,
          textAlign: "center",
          lineHeight: typography.lineHeight.relaxed,
        }}>
          Your pet now lives on the HUD tab alongside your health stats. Check there to see your glider in action! 🐾
        </Text>
      </View>
    </View>
  );
}
