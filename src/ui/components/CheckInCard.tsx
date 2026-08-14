import React, { useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { useCheckInStore } from "../../data/stores/checkInStore";
import { CraftPanel, INK, CREAM_LIGHT } from "./handcrafted";
import { LAVENDER_PAPER, LAVENDER_CTA } from "./handcrafted/tokens";

const SLOT_LABELS = {
  morning: { emoji: "🌅", label: "Morning Check-In", sub: "GliderMon wants to plan your day!" },
  midday:  { emoji: "☀️", label: "Midday Check-In",  sub: "How's the morning goal going?" },
  evening: { emoji: "🌙", label: "Evening Check-In", sub: "Let's see how today went!" },
} as const;

type Props = {
  onPress: () => void;
};

// A deliberate, special-feeling interaction rather than a generic banner --
// pale lavender cardstock with one restrained tape accent, styled like a
// note pinned above Today's Goals.
export function CheckInCard({ onPress }: Props) {
  const slot = useCheckInStore(s => s.availableSlot());
  const ctaScale = useRef(new Animated.Value(1)).current;

  if (!slot) return null;

  const { emoji, label, sub } = SLOT_LABELS[slot];

  // A very small tactile press response -- scale down on touch, spring back
  // on release -- rather than opening the check-in flow with no feedback.
  // Reuses RN's Animated (already used throughout Home), no new system.
  const handlePressIn = () => {
    Animated.timing(ctaScale, { toValue: 0.94, duration: 80, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(ctaScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  };

  return (
    <CraftPanel
      texture="paper"
      stitched={false}
      shadow="card"
      grainOpacity={0.1}
      inset={19}
      style={styles.wrap}
      contentStyle={styles.content}
      accessibilityLabel={`${label}. ${sub}`}
    >
      <View style={styles.tape} pointerEvents="none" />
      <View style={styles.textCol}>
        <Text style={styles.title}>{emoji} {label}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} hitSlop={8}>
        <Animated.View style={[styles.cta, { transform: [{ scale: ctaScale }] }]}>
          <Text style={styles.ctaText}>Check in</Text>
        </Animated.View>
      </Pressable>
    </CraftPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: LAVENDER_PAPER,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  tape: {
    position: "absolute",
    top: 4,
    left: 22,
    width: 46,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(74,49,44,0.25)",
    transform: [{ rotate: "-4deg" }],
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: INK,
  },
  sub: {
    fontSize: 12,
    color: INK,
    opacity: 0.75,
    marginTop: 7,
  },
  cta: {
    backgroundColor: LAVENDER_CTA,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ctaText: {
    color: CREAM_LIGHT,
    fontWeight: "800",
    fontSize: 13,
  },
});
