import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { useCheckInStore } from "../../data/stores/checkInStore";
import { useTheme } from "../../data/hooks/useTheme";

const SLOT_LABELS = {
  morning: { emoji: "🌅", label: "Morning Check-In", sub: "GliderMon wants to plan your day!" },
  midday:  { emoji: "☀️", label: "Midday Check-In",  sub: "How's the morning goal going?" },
  evening: { emoji: "🌙", label: "Evening Check-In", sub: "Let's see how today went!" },
} as const;

type Props = {
  onPress: () => void;
};

export function CheckInCard({ onPress }: Props) {
  const slot = useCheckInStore(s => s.availableSlot());
  const { colors, spacing, typography, borderRadius } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!slot) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [slot]);

  if (!slot) return null;

  const { emoji, label, sub } = SLOT_LABELS[slot];
  const accentColor = colors.accent.lavender;

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [accentColor + "66", accentColor],
  });

  return (
    <Animated.View style={{
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor,
      backgroundColor: accentColor + "15",
      padding: spacing.md,
      marginVertical: spacing.sm,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: typography.size.md, fontWeight: typography.weight.bold as any, color: colors.text.primary }}>
            {emoji} {label}
          </Text>
          <Text style={{ fontSize: typography.size.sm, color: colors.text.secondary, marginTop: 2 }}>
            {sub}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={{
            backgroundColor: accentColor,
            borderRadius: borderRadius.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            marginLeft: spacing.md,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: typography.weight.bold as any, fontSize: typography.size.sm }}>
            Let's go
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
